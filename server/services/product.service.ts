import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { generateInternalSku, formatQrPayload } from '../domain/sku-generator.js';
import { AuditService } from './audit.service.js';

export interface CreateProductInput {
  name: string;
  categoryId: string;
  brand?: string;
  origin?: 'Local' | 'Imported';
  description?: string;
  imageUrl?: string;
  variants: {
    sku?: string;
    barcode?: string;
    color?: string;
    size?: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockLevel?: number;
  }[];
}

export class ProductService {
  // ── CATEGORIES ──────────────────────────────────────────────────────────
  static getCategories(): any[] {
    const db = getDb();
    return db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
  }

  static createCategory(data: { name: string; icon_type?: string; requires_size?: number; requires_color?: number; description?: string }): any {
    const db = getDb();
    const id = uuidv4();
    const insert = db.prepare(`
      INSERT INTO categories (id, name, icon_type, requires_size, requires_color, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id,
      data.name.trim(),
      data.icon_type || 'clothing',
      data.requires_size !== undefined ? data.requires_size : 1,
      data.requires_color !== undefined ? data.requires_color : 1,
      data.description || null
    );
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  // ── PRODUCTS & VARIANTS ──────────────────────────────────────────────────
  static getProducts(filters?: { query?: string; categoryId?: string; origin?: string; page?: number; limit?: number }): { products: any[]; total: number } {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.is_active = 1';
    const params: any[] = [];

    if (filters?.query) {
      whereClause += ` AND (p.name LIKE ? OR p.brand LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)`;
      const q = `%${filters.query.trim()}%`;
      params.push(q, q, q, q);
    }
    if (filters?.categoryId) {
      whereClause += ` AND p.category_id = ?`;
      params.push(filters.categoryId);
    }
    if (filters?.origin) {
      whereClause += ` AND p.origin = ?`;
      params.push(filters.origin);
    }

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id AND v.is_active = 1
      ${whereClause}
    `;
    const countResult = db.prepare(countQuery).get(...params) as { count: number };

    const dataQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        c.icon_type as category_icon,
        c.requires_size,
        c.requires_color,
        COALESCE(SUM(v.stock_quantity), 0) as total_stock,
        COUNT(v.id) as variant_count,
        MIN(v.selling_price) as min_price,
        MAX(v.selling_price) as max_price
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id AND v.is_active = 1
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const products = db.prepare(dataQuery).all(...params, limit, offset);

    // Fetch variants for each product
    const getVariants = db.prepare(`
      SELECT * FROM product_variants 
      WHERE product_id = ? AND is_active = 1
      ORDER BY color ASC, size ASC
    `);

    const enrichedProducts = products.map((prod: any) => ({
      ...prod,
      variants: getVariants.all(prod.id),
    }));

    return {
      products: enrichedProducts,
      total: countResult.count,
    };
  }

  static getProductById(id: string): any {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.icon_type as category_icon, c.requires_size, c.requires_color
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    if (!product) return null;

    const variants = db.prepare(`
      SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1
    `).all(id);

    return {
      ...(product as any),
      variants,
    };
  }

  static createProductWithVariants(input: CreateProductInput, userId: string): any {
    return runTransaction((db) => {
      const productId = uuidv4();
      const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(input.categoryId) as { name: string } | undefined;
      const categoryName = cat?.name || 'GEN';

      // 1. Insert Master Product
      db.prepare(`
        INSERT INTO products (id, category_id, name, brand, origin, description, image_url, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        productId,
        input.categoryId,
        input.name.trim(),
        input.brand?.trim() || null,
        input.origin || 'Local',
        input.description || null,
        input.imageUrl || null
      );

      // 2. Insert Variants
      const insertVariant = db.prepare(`
        INSERT INTO product_variants (
          id, product_id, sku, barcode, color, size, cost_price, selling_price,
          stock_quantity, min_stock_level, qr_code_data, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, variant_id, movement_type, quantity_change, cost_per_unit, resulting_stock, reference_id, notes, user_id
        ) VALUES (?, ?, 'OPENING_STOCK', ?, ?, ?, ?, 'Initial creation opening stock', ?)
      `);

      for (let i = 0; i < input.variants.length; i++) {
        const v = input.variants[i];
        const variantId = uuidv4();
        const sku = v.sku?.trim() || generateInternalSku({
          categoryName,
          color: v.color,
          size: v.size,
          brand: input.brand,
          sequenceNumber: i + 1,
        });
        const barcode = v.barcode?.trim() || sku;
        const qrData = formatQrPayload(sku, v.sellingPrice, input.name);

        insertVariant.run(
          variantId,
          productId,
          sku,
          barcode,
          v.color?.trim() || null,
          v.size?.trim() || null,
          v.costPrice,
          v.sellingPrice,
          v.stockQuantity,
          v.minStockLevel || 3,
          qrData
        );

        if (v.stockQuantity > 0) {
          insertMovement.run(
            uuidv4(),
            variantId,
            v.stockQuantity,
            v.costPrice,
            v.stockQuantity,
            productId,
            userId
          );
        }
      }

      AuditService.log({
        userId,
        action: 'CREATE_PRODUCT',
        entityType: 'PRODUCT',
        entityId: productId,
        newValue: { name: input.name, variantsCount: input.variants.length },
      });

      return ProductService.getProductById(productId);
    });
  }

  static updateProduct(productId: string, input: Partial<CreateProductInput>, userId: string): any {
    return runTransaction((db) => {
      const existing: any = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!existing) throw new Error('Product not found');

      db.prepare(`
        UPDATE products
        SET name = COALESCE(?, name),
            category_id = COALESCE(?, category_id),
            brand = COALESCE(?, brand),
            origin = COALESCE(?, origin),
            description = COALESCE(?, description),
            image_url = COALESCE(?, image_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        input.name?.trim() || null,
        input.categoryId || null,
        input.brand?.trim() || null,
        input.origin || null,
        input.description || null,
        input.imageUrl || null,
        productId
      );

      // If variants are supplied in the update payload, update existing and insert new ones
      if (input.variants && Array.isArray(input.variants)) {
        const catRow: any = db.prepare('SELECT name FROM categories WHERE id = ?').get(input.categoryId || existing.category_id);
        const categoryName = catRow ? catRow.name : 'General';

        const updateVariantStmt = db.prepare(`
          UPDATE product_variants
          SET color = ?,
              size = ?,
              cost_price = ?,
              selling_price = ?,
              min_stock_level = COALESCE(?, min_stock_level),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND product_id = ?
        `);

        const insertVariantStmt = db.prepare(`
          INSERT INTO product_variants (
            id, product_id, sku, barcode, color, size, cost_price, selling_price,
            stock_quantity, min_stock_level, qr_code_data, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);

        for (let i = 0; i < input.variants.length; i++) {
          const v: any = input.variants[i];
          if (v.id) {
            updateVariantStmt.run(
              v.color?.trim() || null,
              v.size?.trim() || null,
              v.costPrice,
              v.sellingPrice,
              v.minStockLevel || 3,
              v.id,
              productId
            );
          } else {
            const variantId = uuidv4();
            const sku = v.sku?.trim() || generateInternalSku({
              categoryName,
              color: v.color,
              size: v.size,
              brand: input.brand || existing.brand,
              sequenceNumber: i + 1,
            });
            const barcode = v.barcode?.trim() || sku;
            const qrData = formatQrPayload(sku, v.sellingPrice, input.name || existing.name);

            insertVariantStmt.run(
              variantId,
              productId,
              sku,
              barcode,
              v.color?.trim() || null,
              v.size?.trim() || null,
              v.costPrice,
              v.sellingPrice,
              v.stockQuantity || 0,
              v.minStockLevel || 3,
              qrData
            );
          }
        }
      }

      AuditService.log({
        userId,
        action: 'UPDATE_PRODUCT',
        entityType: 'PRODUCT',
        entityId: productId,
        oldValue: existing,
        newValue: input,
      });

      return ProductService.getProductById(productId);
    });
  }

  static deleteProduct(productId: string, userId: string): void {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!existing) throw new Error('Product not found');

    db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(productId);
    db.prepare('UPDATE product_variants SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(productId);

    AuditService.log({
      userId,
      action: 'DELETE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: productId,
      oldValue: existing,
    });
  }

  // ── INSTANT POS SEARCH ──────────────────────────────────────────────────
  static searchVariantsForPos(query: string = '', categoryId: string = ''): any[] {
    const db = getDb();
    const cleanQ = query.trim();
    const cleanCat = categoryId.trim();

    if (!cleanQ) {
      if (cleanCat && cleanCat !== 'ALL') {
        return db.prepare(`
          SELECT 
            v.*,
            p.name as product_name,
            p.brand,
            p.origin,
            p.image_url,
            c.name as category_name,
            c.icon_type as category_icon
          FROM product_variants v
          JOIN products p ON v.product_id = p.id
          JOIN categories c ON p.category_id = c.id
          WHERE p.category_id = ? AND v.is_active = 1 AND p.is_active = 1
          ORDER BY p.name ASC, v.size ASC
          LIMIT 100
        `).all(cleanCat);
      }

      return db.prepare(`
        SELECT 
          v.*,
          p.name as product_name,
          p.brand,
          p.origin,
          p.image_url,
          c.name as category_name,
          c.icon_type as category_icon
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE v.is_active = 1 AND p.is_active = 1
        ORDER BY p.name ASC, v.size ASC
        LIMIT 100
      `).all();
    }

    const isExactSku = db.prepare(`
      SELECT 
        v.*,
        p.name as product_name,
        p.brand,
        p.origin,
        p.image_url,
        c.name as category_name,
        c.icon_type as category_icon
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE (v.sku = ? OR v.barcode = ?) AND v.is_active = 1 AND p.is_active = 1
    `).all(cleanQ, cleanQ);

    if (isExactSku.length > 0) return isExactSku;

    // Fuzzy search
    const wildcard = `%${cleanQ}%`;
    if (cleanCat && cleanCat !== 'ALL') {
      return db.prepare(`
        SELECT 
          v.*,
          p.name as product_name,
          p.brand,
          p.origin,
          p.image_url,
          c.name as category_name,
          c.icon_type as category_icon
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ? AND (
          v.sku LIKE ? OR
          v.barcode LIKE ? OR
          p.name LIKE ? OR
          v.color LIKE ? OR
          v.size LIKE ? OR
          p.brand LIKE ?
        ) AND v.is_active = 1 AND p.is_active = 1
        ORDER BY p.name ASC, v.size ASC
        LIMIT 50
      `).all(cleanCat, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
    }

    return db.prepare(`
      SELECT 
        v.*,
        p.name as product_name,
        p.brand,
        p.origin,
        p.image_url,
        c.name as category_name,
        c.icon_type as category_icon
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE (
        v.sku LIKE ? OR
        v.barcode LIKE ? OR
        p.name LIKE ? OR
        v.color LIKE ? OR
        v.size LIKE ? OR
        p.brand LIKE ?
      ) AND v.is_active = 1 AND p.is_active = 1
      ORDER BY p.name ASC, v.size ASC
      LIMIT 50
    `).all(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
  }

  // ── STOCK ADJUSTMENT ────────────────────────────────────────────────────
  static adjustStock(
    variantId: string,
    movementType: 'MANUAL_ADJUSTMENT' | 'DAMAGED_WRITE_OFF' | 'OPENING_STOCK',
    quantityChange: number, // positive to add stock, negative to remove stock
    notes: string,
    userId: string
  ): any {
    return runTransaction((db) => {
      const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as any;
      if (!variant) throw new Error('Variant not found');

      const newStock = variant.stock_quantity + quantityChange;
      if (newStock < 0) {
        throw new Error(`Adjustment would result in negative stock (${newStock}). Current stock is ${variant.stock_quantity}.`);
      }

      // Update variant stock
      db.prepare(`
        UPDATE product_variants 
        SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newStock, variantId);

      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (
          id, variant_id, movement_type, quantity_change, cost_per_unit, resulting_stock, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        variantId,
        movementType,
        quantityChange,
        variant.cost_price,
        newStock,
        notes,
        userId
      );

      // If damaged write-off, record to expense for accurate profit
      if (movementType === 'DAMAGED_WRITE_OFF' && quantityChange < 0) {
        const damageCat = db.prepare("SELECT id FROM expense_categories WHERE name LIKE '%Damage%' OR name LIKE '%Shrinkage%'").get() as { id: string } | undefined;
        if (damageCat) {
          const writeOffCost = Math.abs(quantityChange) * variant.cost_price;
          if (writeOffCost > 0) {
            db.prepare(`
              INSERT INTO expenses (id, category_id, title, amount, payment_method, notes, user_id)
              VALUES (?, ?, ?, ?, 'CASH', ?, ?)
            `).run(
              uuidv4(),
              damageCat.id,
              `Damaged Stock Write-off: ${variant.sku} (Qty: ${Math.abs(quantityChange)})`,
              writeOffCost,
              notes,
              userId
            );
          }
        }
      }

      AuditService.log({
        userId,
        action: 'ADJUST_STOCK',
        entityType: 'VARIANT',
        entityId: variantId,
        oldValue: { stock: variant.stock_quantity },
        newValue: { stock: newStock, change: quantityChange, type: movementType, notes },
      });

      return {
        variantId,
        previousStock: variant.stock_quantity,
        newStock,
        quantityChange,
      };
    });
  }

  // ── LOW STOCK ───────────────────────────────────────────────────────────
  static getLowStockVariants(): any[] {
    const db = getDb();
    return db.prepare(`
      SELECT 
        v.*,
        p.name as product_name,
        p.brand,
        c.name as category_name,
        c.icon_type as category_icon
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE v.stock_quantity <= v.min_stock_level AND v.is_active = 1 AND p.is_active = 1
      ORDER BY v.stock_quantity ASC
    `).all();
  }

  /**
   * Generates a vector PDF barcode label sheet or thermal roll.
   */
  static async generateBarcodeLabelsPdf(
    items: {
      name: string;
      categoryName?: string;
      color?: string;
      size?: string;
      sellingPrice: number;
      sku: string;
      barcode: string;
    }[],
    layout: 'A4_SHEET' | 'THERMAL_ROLL' = 'A4_SHEET'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const isA4 = layout === 'A4_SHEET';
      const doc = new PDFDocument({
        size: isA4 ? 'A4' : [142, 85], // 50mm x 30mm (~142pt x 85pt) for thermal
        margin: isA4 ? 20 : 4,
        autoFirstPage: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      if (isA4) {
        // A4 Dimensions: ~595 x 842 pt. 3 Columns x 8 Rows = 24 labels per page
        const cols = 3;
        const rows = 8;
        const labelWidth = 175;
        const labelHeight = 92;
        const startX = 25;
        const startY = 25;
        const gapX = 10;
        const gapY = 8;

        let index = 0;
        items.forEach((item, itemIdx) => {
          if (itemIdx > 0 && itemIdx % (cols * rows) === 0) {
            doc.addPage({ size: 'A4', margin: 20 });
            index = 0;
          }

          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = startX + col * (labelWidth + gapX);
          const y = startY + row * (labelHeight + gapY);

          // Draw label bounding border (dashed for peeling/cutting)
          doc.save();
          doc.rect(x, y, labelWidth, labelHeight).dash(3, { space: 2 }).stroke('#94a3b8');
          doc.restore();

          // Brand & Category Header
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a');
          doc.text('BRAND 4 LESS', x + 5, y + 5, { width: labelWidth - 10, align: 'left' });
          doc.fontSize(6).font('Helvetica').fillColor('#64748b');
          doc.text((item.categoryName || 'Apparel').toUpperCase(), x + 5, y + 5, { width: labelWidth - 10, align: 'right' });

          // Product Name
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text(item.name, x + 5, y + 15, { width: labelWidth - 10, ellipsis: true });

          // Color & Size
          const variantText = [item.color ? `${item.color}` : '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ');
          doc.fontSize(6.5).font('Helvetica').fillColor('#334155');
          doc.text(variantText || 'Standard', x + 5, y + 25, { width: labelWidth - 10 });

          // Barcode Pattern Vector Bars
          const code = (item.barcode || item.sku || '000000').toUpperCase();
          const barPattern: number[] = [2, 1, 1, 2, 3, 2];
          for (let i = 0; i < code.length; i++) {
            const charCode = code.charCodeAt(i);
            barPattern.push((charCode % 3) + 1, ((charCode >> 1) % 2) + 1, ((charCode >> 2) % 3) + 1);
          }
          barPattern.push(2, 3, 3, 1, 1, 2);

          const totalUnits = barPattern.reduce((a, b) => a + b, 0);
          const barAreaWidth = labelWidth - 20;
          const unitW = barAreaWidth / totalUnits;
          let curX = x + 10;
          const barY = y + 36;
          const barHeight = 26;
          let isBar = true;

          doc.fillColor('#000000');
          barPattern.forEach((w) => {
            const wPt = w * unitW;
            if (isBar) {
              doc.rect(curX, barY, Math.max(0.6, wPt), barHeight).fill();
            }
            curX += wPt;
            isBar = !isBar;
          });

          // Barcode text below bars
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text(`*${code}*`, x + 5, y + 64, { width: labelWidth - 10, align: 'center' });

          // Price & SKU footer
          doc.fontSize(6.5).font('Helvetica').fillColor('#64748b');
          doc.text(item.sku, x + 5, y + 76, { width: 80, ellipsis: true });

          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text(`PKR ${Number(item.sellingPrice).toLocaleString()}`, x + 85, y + 75, { width: labelWidth - 90, align: 'right' });

          index++;
        });
      } else {
        // Thermal Roll (1 label per page, 50x30mm)
        items.forEach((item, idx) => {
          if (idx > 0) {
            doc.addPage({ size: [142, 85], margin: 4 });
          }

          const w = 142;
          const h = 85;

          // Border
          doc.rect(2, 2, w - 4, h - 4).stroke('#000000');

          // Header
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text('BRAND 4 LESS', 6, 5, { width: w - 12, align: 'left' });
          doc.text(`PKR ${Number(item.sellingPrice).toLocaleString()}`, 6, 5, { width: w - 12, align: 'right' });

          // Title
          doc.fontSize(7).font('Helvetica-Bold');
          doc.text(item.name, 6, 15, { width: w - 12, ellipsis: true });

          // Variant
          const variantText = [item.color || '', item.size ? `(${item.size})` : ''].filter(Boolean).join(' ');
          doc.fontSize(6).font('Helvetica');
          doc.text(variantText || 'Std', 6, 25, { width: w - 12 });

          // Barcode bars
          const code = (item.barcode || item.sku || '000000').toUpperCase();
          const barPattern: number[] = [2, 1, 1, 2, 3, 2];
          for (let i = 0; i < code.length; i++) {
            const charCode = code.charCodeAt(i);
            barPattern.push((charCode % 3) + 1, ((charCode >> 1) % 2) + 1, ((charCode >> 2) % 3) + 1);
          }
          barPattern.push(2, 3, 3, 1, 1, 2);

          const totalUnits = barPattern.reduce((a, b) => a + b, 0);
          const barAreaWidth = w - 20;
          const unitW = barAreaWidth / totalUnits;
          let curX = 10;
          const barY = 34;
          const barHeight = 24;
          let isBar = true;

          doc.fillColor('#000000');
          barPattern.forEach((bw) => {
            const wPt = bw * unitW;
            if (isBar) {
              doc.rect(curX, barY, Math.max(0.6, wPt), barHeight).fill();
            }
            curX += bwPt;
            isBar = !isBar;
          });

          // Barcode Text
          doc.fontSize(6).font('Helvetica-Bold');
          doc.text(`*${code}*`, 6, 62, { width: w - 12, align: 'center' });
        });
      }

      doc.end();
    });
  }
}
