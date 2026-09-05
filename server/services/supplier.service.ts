import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateMovingWAC } from '../domain/calculations.js';

export class SupplierService {
  static getSuppliers() {
    return db.prepare(`
      SELECT s.*, COUNT(p.id) as total_purchases_count, COALESCE(SUM(p.grand_total), 0) as total_purchased_amount
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();
  }

  static createSupplier(data: {
    name: string;
    companyName?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO suppliers (
        id, name, company_name, phone, email, address, tax_id,
        current_balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.companyName?.trim() || null,
      data.phone?.trim() || null,
      data.email?.trim() || null,
      data.address?.trim() || null,
      data.taxId?.trim() || null,
      now,
      now
    );

    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  }

  static getPurchases() {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.company_name as supplier_company
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      ORDER BY p.received_at DESC
    `).all() as any[];

    const getItems = db.prepare(`
      SELECT pi.*, p.name as product_name, v.sku, v.barcode, v.custom_attributes_json
      FROM purchase_items pi
      JOIN product_variants v ON v.id = pi.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE pi.purchase_id = ?
    `);

    return purchases.map((p) => ({
      ...p,
      items: getItems.all(p.id).map((it: any) => ({
        ...it,
        attributes: it.custom_attributes_json ? JSON.parse(it.custom_attributes_json) : {},
      })),
    }));
  }

  static createPurchase(data: {
    supplierId: string;
    invoiceNumber?: string;
    items: {
      variantId: string;
      quantity: number;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
    }[];
    taxAmount?: number;
    shippingAmount?: number;
    discountAmount?: number;
    paidAmount?: number;
    paymentMethod?: string;
    billImageUrl?: string;
    notes?: string;
    receivedAt?: string;
    createdBy?: string;
  }) {
    const now = new Date().toISOString();
    const purchaseId = uuidv4();
    const invoiceNumber = data.invoiceNumber || `BILL-${Date.now().toString().slice(-6)}`;
    const receivedAt = data.receivedAt || now;

    return db.transaction(() => {
      const subtotal = data.items.reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);
      const taxAmount = Number(data.taxAmount || 0);
      const shippingAmount = Number(data.shippingAmount || 0);
      const discountAmount = Number(data.discountAmount || 0);
      const grandTotal = Math.round((subtotal + taxAmount + shippingAmount) - discountAmount);
      const paidAmount = Number(data.paidAmount || 0);
      const unpaidBalance = Math.max(0, grandTotal - paidAmount);

      const paymentStatus = paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      // 1. Insert Purchase
      db.prepare(`
        INSERT INTO purchases (
          id, invoice_number, supplier_id, subtotal, tax_amount,
          shipping_amount, discount_amount, grand_total, paid_amount,
          payment_status, payment_method, bill_image_url, notes,
          received_at, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        purchaseId, invoiceNumber, data.supplierId, subtotal, taxAmount,
        shippingAmount, discountAmount, grandTotal, paidAmount,
        paymentStatus, data.paymentMethod || 'CASH', data.billImageUrl || null,
        data.notes || null, receivedAt, data.createdBy || 'Manager', now
      );

      // 2. Insert Items, Increase Stock & Recalculate Moving WAC
      const insertLine = db.prepare(`
        INSERT INTO purchase_items (
          id, purchase_id, variant_id, quantity, unit_cost, subtotal,
          batch_number, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const getVariant = db.prepare('SELECT * FROM product_variants WHERE id = ?');
      const updateVariant = db.prepare(`
        UPDATE product_variants SET
          cost_price = ?,
          stock_quantity = stock_quantity + ?,
          updated_at = ?
        WHERE id = ?
      `);

      for (const item of data.items) {
        const v = getVariant.get(item.variantId) as any;
        if (!v) throw new Error(`Product variant not found: ${item.variantId}`);

        const lineSubtotal = item.quantity * item.unitCost;
        insertLine.run(
          uuidv4(), purchaseId, item.variantId, item.quantity,
          item.unitCost, lineSubtotal, item.batchNumber || null,
          item.expiryDate || null
        );

        const newWac = calculateMovingWAC(v.stock_quantity, v.cost_price, item.quantity, item.unitCost);
        updateVariant.run(newWac, item.quantity, now, item.variantId);
      }

      // 3. Update Supplier Payables if Unpaid Balance
      if (unpaidBalance > 0) {
        db.prepare(`
          UPDATE suppliers SET
            current_balance = current_balance + ?,
            updated_at = ?
          WHERE id = ?
        `).run(unpaidBalance, now, data.supplierId);

        db.prepare(`
          INSERT INTO supplier_ledger (
            id, supplier_id, transaction_type, amount, reference_type,
            reference_id, notes, created_by, created_at
          ) VALUES (?, ?, 'CREDIT', ?, 'PURCHASE_BILL', ?, 'Inbound Consignment Bill', ?, ?)
        `).run(uuidv4(), data.supplierId, unpaidBalance, purchaseId, data.createdBy || 'Manager', now);
      }

      return {
        success: true,
        purchaseId,
        invoiceNumber,
        grandTotal,
        paidAmount,
      };
    })();
  }
}
