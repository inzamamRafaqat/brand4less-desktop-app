import * as xlsx from 'xlsx';
import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { SchemaService } from './schema.service.js';
import { calculateMovingWAC } from '../domain/calculations.js';

export interface ColumnMappingConfig {
  productName: string;
  category?: string;
  brand?: string;
  costPrice: string;
  sellingPrice: string;
  stockQuantity: string;
  sku?: string;
  barcode?: string;
  minStock?: string;
  customAttributes?: Record<string, string>; // Dynamic mapping: { "size": "Header_Size", "batch_no": "Header_Batch" }
}

export class ImportService {
  /**
   * Analyze uploaded spreadsheet and return detected columns & sample rows
   */
  static analyzeSpreadsheet(fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (rawRows.length < 2) {
      throw new Error('Spreadsheet must contain a header row and at least one data row.');
    }

    const headers = rawRows[0].map((h) => String(h || '').trim()).filter(Boolean);
    const sampleRows = rawRows.slice(1, 6).map((row) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx] !== undefined ? row[idx] : '';
      });
      return rowObj;
    });

    const activeSchema = SchemaService.getAttributes();

    // Auto-match suggestions
    const suggestedMapping: Partial<ColumnMappingConfig> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('name') || lower.includes('title') || lower.includes('item') || lower.includes('product')) {
        suggestedMapping.productName = h;
      } else if (lower.includes('cat') || lower.includes('dept') || lower.includes('group')) {
        suggestedMapping.category = h;
      } else if (lower.includes('brand') || lower.includes('mfg') || lower.includes('vendor')) {
        suggestedMapping.brand = h;
      } else if (lower.includes('cost') || lower.includes('buy') || lower.includes('purchase')) {
        suggestedMapping.costPrice = h;
      } else if (lower.includes('sell') || lower.includes('price') || lower.includes('retail') || lower.includes('mrp')) {
        suggestedMapping.sellingPrice = h;
      } else if (lower.includes('qty') || lower.includes('stock') || lower.includes('quantity')) {
        suggestedMapping.stockQuantity = h;
      } else if (lower.includes('sku') || lower.includes('code') || lower.includes('itemno')) {
        suggestedMapping.sku = h;
      } else if (lower.includes('barcode') || lower.includes('upc') || lower.includes('ean')) {
        suggestedMapping.barcode = h;
      }
    });

    return {
      headers,
      totalRows: rawRows.length - 1,
      sampleRows,
      suggestedMapping,
      activeSchema,
    };
  }

  /**
   * Commit mapped rows to Database
   */
  static commitDynamicImport(fileBuffer: Buffer, mapping: ColumnMappingConfig) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet) as Record<string, any>[];

    const now = new Date().toISOString();
    const defaultCategory = db.prepare('SELECT id FROM categories LIMIT 1').get() as { id: string };
    const defaultCatId = defaultCategory ? defaultCategory.id : 'cat_general_01';

    let importedCount = 0;
    let updatedCount = 0;

    db.transaction(() => {
      for (const row of rows) {
        const prodName = String(row[mapping.productName] || '').trim();
        if (!prodName) continue;

        const cost = Number(row[mapping.costPrice] || 0);
        const price = Number(row[mapping.sellingPrice] || 0);
        const qty = Number(row[mapping.stockQuantity] || 0);
        const brand = mapping.brand ? String(row[mapping.brand] || '').trim() : null;

        // Dynamic Custom Attributes
        const customAttrs: Record<string, any> = {};
        if (mapping.customAttributes) {
          for (const [attrCode, headerName] of Object.entries(mapping.customAttributes)) {
            if (headerName && row[headerName] !== undefined) {
              customAttrs[attrCode] = String(row[headerName]).trim();
            }
          }
        }

        // Category resolution
        let categoryId = defaultCatId;
        if (mapping.category && row[mapping.category]) {
          const catName = String(row[mapping.category]).trim();
          const existingCat = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(catName) as any;
          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const newCatId = uuidv4();
            db.prepare('INSERT INTO categories (id, name, code, created_at) VALUES (?, ?, ?, ?)').run(
              newCatId,
              catName,
              catName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
              now
            );
            categoryId = newCatId;
          }
        }

        // Check if product exists
        let prod = db.prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?)').get(prodName) as any;
        let productId = prod ? prod.id : uuidv4();

        if (!prod) {
          db.prepare(`
            INSERT INTO products (id, category_id, name, brand, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
          `).run(productId, categoryId, prodName, brand, now, now);
        }

        // SKU / Barcode resolution
        const rawSku = mapping.sku && row[mapping.sku] ? String(row[mapping.sku]).trim() : null;
        const rawBarcode = mapping.barcode && row[mapping.barcode] ? String(row[mapping.barcode]).trim() : null;

        const sku = rawSku || `${prodName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        const barcode = rawBarcode || Math.floor(100000000000 + Math.random() * 900000000000).toString();

        // Check existing variant by SKU or Barcode
        const existingVariant = db.prepare('SELECT * FROM product_variants WHERE sku = ? OR barcode = ?').get(sku, barcode) as any;

        if (existingVariant) {
          const newWac = calculateMovingWAC(existingVariant.stock_quantity, existingVariant.cost_price, qty, cost);
          db.prepare(`
            UPDATE product_variants SET
              cost_price = ?,
              selling_price = ?,
              stock_quantity = stock_quantity + ?,
              custom_attributes_json = ?,
              updated_at = ?
            WHERE id = ?
          `).run(newWac, price || existingVariant.selling_price, qty, JSON.stringify(customAttrs), now, existingVariant.id);
          updatedCount++;
        } else {
          db.prepare(`
            INSERT INTO product_variants (
              id, product_id, sku, barcode, cost_price, selling_price,
              stock_quantity, custom_attributes_json, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).run(uuidv4(), productId, sku, barcode, cost, price, qty, JSON.stringify(customAttrs), now, now);
          importedCount++;
        }
      }
    })();

    return {
      success: true,
      importedCount,
      updatedCount,
      totalProcessed: importedCount + updatedCount,
    };
  }
}
