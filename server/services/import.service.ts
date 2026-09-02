import ExcelJS from 'exceljs';
import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateInternalSku, formatQrPayload } from '../domain/sku-generator.js';
import { AuditService } from './audit.service.js';

export interface ColumnMapping {
  name: string;
  category: string;
  color?: string;
  size?: string;
  origin?: string;
  brand?: string;
  costPrice?: string;
  sellingPrice: string;
  quantity?: string;
  sku?: string;
  barcode?: string;
  minStockLevel?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  data: Record<string, any>;
  mapped: {
    name: string;
    category: string;
    color?: string;
    size?: string;
    origin?: string;
    brand?: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    sku?: string;
    barcode?: string;
    minStockLevel?: number;
  };
  isValid: boolean;
  errors: string[];
}

export class ImportService {
  /**
   * Reads headers from an Excel/CSV file and suggests field mappings.
   */
  static async analyzeFile(filePath: string): Promise<{ headers: string[]; suggestedMapping: Record<string, string>; sampleRows: any[] }> {
    const workbook = new ExcelJS.Workbook();
    if (filePath.endsWith('.csv')) {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('File contains no worksheets');

    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value?.toString().trim();
      if (val) headers.push(val);
    });

    const suggestedMapping = this.autoDetectMapping(headers);

    const sampleRows: any[] = [];
    for (let r = 2; r <= Math.min(worksheet.rowCount, 10); r++) {
      const row = worksheet.getRow(r);
      const rowData: Record<string, any> = {};
      headers.forEach((header, idx) => {
        const cellVal = row.getCell(idx + 1).value;
        rowData[header] = cellVal !== null && cellVal !== undefined ? cellVal.toString() : '';
      });
      if (Object.values(rowData).some((v) => v !== '')) {
        sampleRows.push(rowData);
      }
    }

    return { headers, suggestedMapping, sampleRows };
  }

  /**
   * Fuzzy matches headers to system entity fields.
   */
  private static autoDetectMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    const findMatch = (candidates: string[]): string | undefined => {
      return headers.find((h) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return candidates.some((c) => clean.includes(c) || c.includes(clean));
      });
    };

    const nameMatch = findMatch(['productname', 'itemname', 'product', 'item', 'title', 'name', 'description']);
    if (nameMatch) mapping['name'] = nameMatch;

    const catMatch = findMatch(['category', 'cat', 'dept', 'department', 'type']);
    if (catMatch) mapping['category'] = catMatch;

    const colorMatch = findMatch(['color', 'colour', 'shade']);
    if (colorMatch) mapping['color'] = colorMatch;

    const sizeMatch = findMatch(['size', 'sizes', 'dimension']);
    if (sizeMatch) mapping['size'] = sizeMatch;

    const originMatch = findMatch(['origin', 'source', 'localimported', 'country']);
    if (originMatch) mapping['origin'] = originMatch;

    const brandMatch = findMatch(['brand', 'company', 'make', 'manufacturer']);
    if (brandMatch) mapping['brand'] = brandMatch;

    const costMatch = findMatch(['purchaseprice', 'costprice', 'buyprice', 'cost', 'purchase', 'buyingprice']);
    if (costMatch) mapping['costPrice'] = costMatch;

    const sellMatch = findMatch(['sellingprice', 'saleprice', 'retailprice', 'price', 'rate', 'retail']);
    if (sellMatch) mapping['sellingPrice'] = sellMatch;

    const qtyMatch = findMatch(['quantity', 'stock', 'qty', 'openingstock', 'inventory', 'count']);
    if (qtyMatch) mapping['quantity'] = qtyMatch;

    const skuMatch = findMatch(['sku', 'itemcode', 'code', 'productcode']);
    if (skuMatch) mapping['sku'] = skuMatch;

    const barcodeMatch = findMatch(['barcode', 'upc', 'ean', 'barcodeno']);
    if (barcodeMatch) mapping['barcode'] = barcodeMatch;

    return mapping;
  }

  /**
   * Previews and validates all rows against mapped columns.
   */
  static async previewAndValidate(filePath: string, mapping: ColumnMapping): Promise<{
    previewRows: ImportPreviewRow[];
    totalRows: number;
    validCount: number;
    errorCount: number;
  }> {
    const workbook = new ExcelJS.Workbook();
    if (filePath.endsWith('.csv')) {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const worksheet = workbook.worksheets[0];
    const previewRows: ImportPreviewRow[] = [];
    const headers: string[] = [];

    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.value?.toString().trim() || '');
    });

    const seenSkus = new Set<string>();

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const rowData: Record<string, any> = {};
      let hasData = false;

      headers.forEach((h, idx) => {
        const val = row.getCell(idx + 1).value;
        rowData[h] = val !== null && val !== undefined ? val.toString().trim() : '';
        if (rowData[h]) hasData = true;
      });

      if (!hasData) continue;

      const rawName = rowData[mapping.name] || '';
      const rawCategory = rowData[mapping.category] || 'General';
      const rawColor = mapping.color ? rowData[mapping.color] || '' : '';
      const rawSize = mapping.size ? rowData[mapping.size] || '' : '';
      const rawOrigin = mapping.origin ? rowData[mapping.origin] || 'Local' : 'Local';
      const rawBrand = mapping.brand ? rowData[mapping.brand] || '' : '';
      const rawCost = mapping.costPrice ? parseFloat(rowData[mapping.costPrice] || '0') : 0;
      const rawSell = parseFloat(rowData[mapping.sellingPrice] || '0');
      const rawQty = mapping.quantity ? parseInt(rowData[mapping.quantity] || '0', 10) : 0;
      const rawSku = mapping.sku ? rowData[mapping.sku] || '' : '';
      const rawBarcode = mapping.barcode ? rowData[mapping.barcode] || '' : '';
      const rawMinStock = mapping.minStockLevel ? parseInt(rowData[mapping.minStockLevel] || '3', 10) : 3;

      const errors: string[] = [];

      if (!rawName) errors.push('Product Name is required.');
      if (!rawCategory) errors.push('Category is required.');
      if (isNaN(rawSell) || rawSell < 0) errors.push('Selling Price must be a valid positive number.');
      if (isNaN(rawCost) || rawCost < 0) errors.push('Cost Price must be a valid number.');
      if (isNaN(rawQty) || rawQty < 0) errors.push('Quantity must be a valid non-negative integer.');

      if (rawSku) {
        if (seenSkus.has(rawSku.toUpperCase())) {
          errors.push(`Duplicate SKU "${rawSku}" found in spreadsheet.`);
        } else {
          seenSkus.add(rawSku.toUpperCase());
        }
      }

      previewRows.push({
        rowNumber: r,
        data: rowData,
        mapped: {
          name: rawName,
          category: rawCategory,
          color: rawColor || undefined,
          size: rawSize || undefined,
          origin: rawOrigin.toLowerCase().includes('imp') ? 'Imported' : 'Local',
          brand: rawBrand || undefined,
          costPrice: isNaN(rawCost) ? 0 : rawCost,
          sellingPrice: isNaN(rawSell) ? 0 : rawSell,
          quantity: isNaN(rawQty) ? 0 : rawQty,
          sku: rawSku || undefined,
          barcode: rawBarcode || undefined,
          minStockLevel: isNaN(rawMinStock) ? 3 : rawMinStock,
        },
        isValid: errors.length === 0,
        errors,
      });
    }

    const validCount = previewRows.filter((r) => r.isValid).length;
    const errorCount = previewRows.length - validCount;

    return {
      previewRows,
      totalRows: previewRows.length,
      validCount,
      errorCount,
    };
  }

  /**
   * Generates a downloadable Excel error report for rows with validation errors.
   */
  static async generateErrorReport(previewRows: ImportPreviewRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Import Errors');

    const invalidRows = previewRows.filter((r) => !r.isValid);
    if (invalidRows.length === 0) {
      worksheet.addRow(['No errors found in dataset.']);
      return (await workbook.xlsx.writeBuffer()) as Buffer;
    }

    // Get original header keys from first row data
    const sampleDataKeys = Object.keys(invalidRows[0].data);
    worksheet.columns = [
      { header: 'Row #', key: 'rowNum', width: 10 },
      { header: 'Validation Errors', key: 'errorMsg', width: 40 },
      ...sampleDataKeys.map((k) => ({ header: k, key: k, width: 20 })),
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }, // Red background
    };

    invalidRows.forEach((item) => {
      const rowObj: Record<string, any> = {
        rowNum: item.rowNumber,
        errorMsg: item.errors.join(' | '),
        ...item.data,
      };
      const addedRow = worksheet.addRow(rowObj);
      addedRow.getCell('errorMsg').font = { color: { argb: 'FFB91C1C' }, bold: true };
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Commits valid rows in a single batch transaction.
   */
  static async commitBulkImport(
    previewRows: ImportPreviewRow[],
    userId: string
  ): Promise<{ importedCount: number; categoriesCreated: number }> {
    return runTransaction((db) => {
      const validRows = previewRows.filter((r) => r.isValid);
      if (validRows.length === 0) throw new Error('No valid records to import');

      // Cache existing categories
      const existingCategories = db.prepare('SELECT id, name FROM categories').all() as { id: string; name: string }[];
      const categoryMap = new Map<string, string>();
      existingCategories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

      let categoriesCreated = 0;
      const insertCat = db.prepare(`
        INSERT INTO categories (id, name, icon_type, requires_size, requires_color, description)
        VALUES (?, ?, ?, 1, 1, ?)
      `);

      // Prepare statements
      const insertProduct = db.prepare(`
        INSERT INTO products (id, category_id, name, brand, origin, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `);

      const insertVariant = db.prepare(`
        INSERT INTO product_variants (
          id, product_id, sku, barcode, color, size, cost_price, selling_price,
          stock_quantity, min_stock_level, qr_code_data, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, variant_id, movement_type, quantity_change, cost_per_unit, resulting_stock, notes, user_id
        ) VALUES (?, ?, 'OPENING_STOCK', ?, ?, ?, 'Bulk Excel Opening Stock Import', ?)
      `);

      // Group rows by (Category + Product Name + Brand + Origin) to create unified parent products
      const productGroups = new Map<string, ImportPreviewRow[]>();

      for (const row of validRows) {
        const catKey = row.mapped.category.toLowerCase().trim();
        let catId = categoryMap.get(catKey);

        if (!catId) {
          catId = uuidv4();
          const cleanName = row.mapped.category.trim();
          let icon = 'clothing';
          const lower = cleanName.toLowerCase();
          if (lower.includes('pant') || lower.includes('jean') || lower.includes('trouser')) icon = 'pants';
          else if (lower.includes('watch')) icon = 'watch';
          else if (lower.includes('wallet')) icon = 'wallet';
          else if (lower.includes('perfume')) icon = 'perfume';
          else if (lower.includes('cap')) icon = 'cap';
          else if (lower.includes('belt')) icon = 'belt';
          else if (lower.includes('shoe') || lower.includes('slipper')) icon = 'shoes';

          insertCat.run(catId, cleanName, icon, `Imported category ${cleanName}`);
          categoryMap.set(catKey, catId);
          categoriesCreated++;
        }

        const groupKey = `${catId}___${row.mapped.name.toLowerCase().trim()}___${(row.mapped.brand || '').toLowerCase()}___${row.mapped.origin}`;
        if (!productGroups.has(groupKey)) {
          productGroups.set(groupKey, []);
        }
        productGroups.get(groupKey)!.push(row);
      }

      let importedVariantsCount = 0;
      const importedItems: any[] = [];

      for (const [, rows] of productGroups.entries()) {
        const firstRow = rows[0].mapped;
        const catId = categoryMap.get(firstRow.category.toLowerCase().trim())!;
        const productId = uuidv4();

        insertProduct.run(
          productId,
          catId,
          firstRow.name.trim(),
          firstRow.brand?.trim() || null,
          firstRow.origin || 'Local'
        );

        for (let i = 0; i < rows.length; i++) {
          const item = rows[i].mapped;
          const variantId = uuidv4();
          const sku = item.sku?.trim() || generateInternalSku({
            categoryName: item.category,
            color: item.color,
            size: item.size,
            brand: item.brand,
            sequenceNumber: i + 1,
          });
          const barcode = item.barcode?.trim() || `B4L${Math.floor(10000000 + Math.random() * 90000000)}`;
          const qrData = formatQrPayload(sku, item.sellingPrice, item.name);

          insertVariant.run(
            variantId,
            productId,
            sku,
            barcode,
            item.color?.trim() || null,
            item.size?.trim() || null,
            item.costPrice,
            item.sellingPrice,
            item.quantity,
            item.minStockLevel || 3,
            qrData
          );

          if (item.quantity > 0) {
            insertMovement.run(
              uuidv4(),
              variantId,
              item.quantity,
              item.costPrice,
              item.quantity,
              userId
            );
          }

          importedItems.push({
            id: variantId,
            productId,
            name: firstRow.name.trim(),
            productName: firstRow.name.trim(),
            categoryName: firstRow.category.trim(),
            brand: firstRow.brand?.trim() || 'Brand 4 Less',
            origin: firstRow.origin || 'Local',
            color: item.color?.trim() || '',
            size: item.size?.trim() || '',
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            sku,
            barcode,
            quantity: item.quantity,
          });

          importedVariantsCount++;
        }
      }

      AuditService.log({
        userId,
        action: 'BULK_IMPORT',
        entityType: 'PRODUCTS',
        newValue: {
          importedCount: importedVariantsCount,
          categoriesCreated,
          parentProductsCount: productGroups.size,
        },
      });

      return {
        importedCount: importedVariantsCount,
        categoriesCreated,
        importedItems,
      };
    });
  }
}
