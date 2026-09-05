import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { SchemaService } from './schema.service.js';
import { validateCustomAttributes } from '../domain/custom-fields.js';
import PDFDocument from 'pdfkit';

export class ProductService {
  // ── CATEGORIES ──────────────────────────────────────────────────────────
  static getCategories() {
    return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  }

  static createCategory(data: { name: string; code?: string; icon?: string; color?: string; parentId?: string }) {
    const id = uuidv4();
    const code = data.code || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO categories (id, name, code, icon, color, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, code, data.icon || 'tag', data.color || '#475569', data.parentId || null, now);

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  // ── PRODUCTS & VARIANTS ─────────────────────────────────────────────────
  static getProducts(options: { query?: string; categoryId?: string; page?: number; limit?: number } = {}) {
    const { query = '', categoryId, page = 1, limit = 100 } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.is_active = 1';
    const params: any[] = [];

    if (categoryId && categoryId !== 'ALL') {
      whereClause += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    if (query.trim()) {
      whereClause += ` AND (
        p.name LIKE ? OR 
        p.brand LIKE ? OR 
        v.sku LIKE ? OR 
        v.barcode LIKE ? OR 
        v.custom_attributes_json LIKE ?
      )`;
      const q = `%${query.trim()}%`;
      params.push(q, q, q, q, q);
    }

    const countRow = db.prepare(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      ${whereClause}
    `).get(...params) as { total: number };

    const products = db.prepare(`
      SELECT DISTINCT 
        p.*, 
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    // Attach Variants & Parse Dynamic Attributes
    const getVariantsStmt = db.prepare(`
      SELECT * FROM product_variants 
      WHERE product_id = ? AND is_active = 1 
      ORDER BY created_at ASC
    `);

    const result = products.map((prod) => {
      const variants = getVariantsStmt.all(prod.id) as any[];
      return {
        ...prod,
        custom_fields: prod.custom_fields_json ? JSON.parse(prod.custom_fields_json) : {},
        variants: variants.map((v) => ({
          ...v,
          custom_attributes: v.custom_attributes_json ? JSON.parse(v.custom_attributes_json) : {},
        })),
      };
    });

    return {
      products: result,
      total: countRow.total,
      page,
      limit,
    };
  }

  static getProductById(id: string) {
    const prod = db.prepare(`
      SELECT p.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(id) as any;

    if (!prod) return null;

    const variants = db.prepare(`
      SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY created_at ASC
    `).all(id) as any[];

    return {
      ...prod,
      custom_fields: prod.custom_fields_json ? JSON.parse(prod.custom_fields_json) : {},
      variants: variants.map((v) => ({
        ...v,
        custom_attributes: v.custom_attributes_json ? JSON.parse(v.custom_attributes_json) : {},
      })),
    };
  }

  static createProduct(data: {
    name: string;
    categoryId: string;
    brand?: string;
    description?: string;
    imageUrl?: string;
    customFields?: Record<string, any>;
    variants: {
      sku?: string;
      barcode?: string;
      costPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      minStockAlert?: number;
      customAttributes?: Record<string, any>;
    }[];
  }) {
    const now = new Date().toISOString();
    const productId = uuidv4();
    const schemaDefs = SchemaService.getAttributes();

    return db.transaction(() => {
      // 1. Insert Product Master
      db.prepare(`
        INSERT INTO products (
          id, category_id, name, brand, description, image_url,
          custom_fields_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        data.categoryId,
        data.name.trim(),
        data.brand || null,
        data.description || null,
        data.imageUrl || null,
        data.customFields ? JSON.stringify(data.customFields) : null,
        now,
        now
      );

      // 2. Insert Variants
      const insertVar = db.prepare(`
        INSERT INTO product_variants (
          id, product_id, sku, barcode, cost_price, selling_price,
          stock_quantity, min_stock_alert, custom_attributes_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < data.variants.length; i++) {
        const v = data.variants[i];
        const varId = uuidv4();

        // Validate custom attributes
        const { sanitized } = validateCustomAttributes(v.customAttributes || {}, schemaDefs);

        // Generate SKU & Barcode if missing
        const skuPrefix = data.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
        const sku = v.sku || `${skuPrefix}-${Date.now().toString().slice(-4)}-${i + 1}`;
        const barcode = v.barcode || Math.floor(100000000000 + Math.random() * 900000000000).toString();

        insertVar.run(
          varId,
          productId,
          sku,
          barcode,
          Number(v.costPrice || 0),
          Number(v.sellingPrice || 0),
          Number(v.stockQuantity || 0),
          Number(v.minStockAlert || 5),
          JSON.stringify(sanitized),
          now,
          now
        );
      }

      return this.getProductById(productId);
    })();
  }

  static updateProduct(id: string, data: any) {
    const now = new Date().toISOString();
    const schemaDefs = SchemaService.getAttributes();

    return db.transaction(() => {
      db.prepare(`
        UPDATE products SET
          name = COALESCE(?, name),
          category_id = COALESCE(?, category_id),
          brand = COALESCE(?, brand),
          description = COALESCE(?, description),
          image_url = COALESCE(?, image_url),
          custom_fields_json = COALESCE(?, custom_fields_json),
          updated_at = ?
        WHERE id = ?
      `).run(
        data.name,
        data.categoryId,
        data.brand,
        data.description,
        data.imageUrl,
        data.customFields ? JSON.stringify(data.customFields) : null,
        now,
        id
      );

      if (data.variants && Array.isArray(data.variants)) {
        for (const v of data.variants) {
          if (v.id) {
            const { sanitized } = validateCustomAttributes(v.customAttributes || {}, schemaDefs);
            db.prepare(`
              UPDATE product_variants SET
                sku = COALESCE(?, sku),
                barcode = COALESCE(?, barcode),
                cost_price = COALESCE(?, cost_price),
                selling_price = COALESCE(?, selling_price),
                stock_quantity = COALESCE(?, stock_quantity),
                min_stock_alert = COALESCE(?, min_stock_alert),
                custom_attributes_json = ?,
                updated_at = ?
              WHERE id = ? AND product_id = ?
            `).run(
              v.sku, v.barcode, v.costPrice, v.sellingPrice,
              v.stockQuantity, v.minStockAlert, JSON.stringify(sanitized),
              now, v.id, id
            );
          }
        }
      }

      return this.getProductById(id);
    })();
  }

  static adjustStock(variantId: string, quantityDelta: number, reason: string = 'MANUAL_ADJUSTMENT') {
    const now = new Date().toISOString();
    return db.transaction(() => {
      db.prepare(`
        UPDATE product_variants SET
          stock_quantity = stock_quantity + ?,
          updated_at = ?
        WHERE id = ?
      `).run(quantityDelta, now, variantId);

      return db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId);
    })();
  }

  /**
   * PDF Barcode Generator
   */
  static generateBarcodeLabelsPdf(items: any[], layout: 'A4_SHEET' | 'THERMAL_ROLL' = 'A4_SHEET'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: layout === 'THERMAL_ROLL' ? [142, 85] : 'A4',
        margin: layout === 'THERMAL_ROLL' ? 4 : 20,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (layout === 'THERMAL_ROLL') {
        items.forEach((item, idx) => {
          if (idx > 0) doc.addPage({ size: [142, 85], margin: 4 });
          doc.fontSize(8).font('Helvetica-Bold').text(item.product_name || item.name || 'PRODUCT', { align: 'center' });
          doc.fontSize(7).font('Helvetica').text(`SKU: ${item.sku} | ${item.custom_text || ''}`, { align: 'center' });
          doc.fontSize(9).font('Helvetica-Bold').text(`PRICE: Rs. ${item.selling_price || item.unitPrice || 0}`, { align: 'center' });
        });
      } else {
        doc.fontSize(14).font('Helvetica-Bold').text('OmniRetail - Vector Barcode Label Sheet', { align: 'center' });
        doc.moveDown(1);
        items.forEach((it) => {
          doc.fontSize(9).font('Helvetica-Bold').text(`${it.product_name || it.name} (${it.sku}) - Price: Rs. ${it.selling_price || 0}`);
        });
      }

      doc.end();
    });
  }
}
