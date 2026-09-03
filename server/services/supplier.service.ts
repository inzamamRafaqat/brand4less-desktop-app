import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateMovingWeightedAverageCost } from '../domain/calculation.js';
import { AuditService } from './audit.service.js';

export interface CreateSupplierInput {
  name: string;
  companyName?: string;
  phone: string;
  address?: string;
}

export interface PurchaseItemInput {
  variantId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseInvoiceNo?: string;
  purchaseDate?: string;
  items: PurchaseItemInput[];
  discount?: number;
  paidAmount?: number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CARD';
  receiptAttachmentUrl?: string;
  notes?: string;
}

export class SupplierService {
  // ── SUPPLIERS ───────────────────────────────────────────────────────────
  static getSuppliers(filters?: { query?: string; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.query) {
      whereClause += ' AND (name LIKE ? OR company_name LIKE ? OR phone LIKE ?)';
      const q = `%${filters.query.trim()}%`;
      params.push(q, q, q);
    }

    const count = db.prepare(`SELECT COUNT(*) as count FROM suppliers ${whereClause}`).get(...params) as { count: number };
    const suppliers = db.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as purchases_count,
        (SELECT MAX(created_at) FROM purchases WHERE supplier_id = s.id) as last_purchase_date
      FROM suppliers s
      ${whereClause}
      ORDER BY s.current_payable DESC, s.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { suppliers, total: count.count };
  }

  static getSupplierById(id: string): any {
    const db = getDb();
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  }

  static createSupplier(input: CreateSupplierInput, userId: string): any {
    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO suppliers (id, name, company_name, phone, address, current_payable)
      VALUES (?, ?, ?, ?, ?, 0.0)
    `).run(
      id,
      input.name.trim(),
      input.companyName?.trim() || null,
      input.phone.trim(),
      input.address?.trim() || null
    );

    AuditService.log({
      userId,
      action: 'CREATE_SUPPLIER',
      entityType: 'SUPPLIER',
      entityId: id,
      newValue: input,
    });

    return SupplierService.getSupplierById(id);
  }

  static updateSupplier(id: string, input: Partial<CreateSupplierInput>, userId: string): any {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) throw new Error('Supplier not found');

    db.prepare(`
      UPDATE suppliers
      SET name = COALESCE(?, name),
          company_name = COALESCE(?, company_name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      input.name?.trim() || null,
      input.companyName?.trim() || null,
      input.phone?.trim() || null,
      input.address?.trim() || null,
      id
    );

    AuditService.log({
      userId,
      action: 'UPDATE_SUPPLIER',
      entityType: 'SUPPLIER',
      entityId: id,
      oldValue: existing,
      newValue: input,
    });

    return SupplierService.getSupplierById(id);
  }

  // ── PURCHASES & WAC INVENTORY UPDATE ────────────────────────────────────
  static createPurchase(input: CreatePurchaseInput, userId: string): any {
    return runTransaction((db) => {
      if (!input.items || input.items.length === 0) {
        throw new Error('Purchase must contain at least one item.');
      }

      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(input.supplierId) as any;
      if (!supplier) throw new Error('Supplier not found');

      const purchaseId = uuidv4();
      const invoiceNo = input.purchaseInvoiceNo?.trim() || `PUR-${Date.now().toString().slice(-6)}`;
      const discount = input.discount || 0;
      const paidAmount = input.paidAmount || 0;

      // Calculate gross items total
      let itemsSubtotal = 0;
      input.items.forEach((item) => {
        itemsSubtotal += item.quantity * item.unitCost;
      });

      const totalAmount = Number(Math.max(0, itemsSubtotal - discount).toFixed(2));

      // Paying more than the bill at purchase time is a data-entry error: the
      // excess would otherwise be recorded as a payment that moves no balance,
      // desyncing the ledger from current_payable.
      if (paidAmount > totalAmount + 0.01) {
        throw new Error(
          `Paid amount (${paidAmount}) exceeds the purchase total (${totalAmount}). Enter at most the bill amount.`
        );
      }

      const balanceDue = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));

      let paymentStatus = 'UNPAID';
      if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIAL';
      }

      // 1. Insert Purchase
      db.prepare(`
        INSERT INTO purchases (
          id, purchase_invoice_no, supplier_id, purchase_date, total_amount, discount,
          paid_amount, balance_due, payment_status, receipt_attachment_url, notes, user_id
        ) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        purchaseId,
        invoiceNo,
        input.supplierId,
        input.purchaseDate || null,
        totalAmount,
        discount,
        paidAmount,
        balanceDue,
        paymentStatus,
        input.receiptAttachmentUrl || null,
        input.notes || null,
        userId
      );

      // 2. Insert Items, Update Stock and Recompute Weighted Average Cost (WAC)
      const insertPurchaseItem = db.prepare(`
        INSERT INTO purchase_items (id, purchase_id, variant_id, quantity, unit_cost, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateVariantWac = db.prepare(`
        UPDATE product_variants
        SET stock_quantity = stock_quantity + ?,
            cost_price = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, variant_id, movement_type, quantity_change, cost_per_unit, resulting_stock, reference_id, notes, user_id
        ) VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?)
      `);

      // An invoice-level discount lowers the landed cost of every unit received.
      // purchase_items stay at the billed (gross) unit cost to match the
      // supplier's invoice; only the inventory cost (WAC) and the stock-movement
      // cost use the discounted landed cost.
      const discountFactor = itemsSubtotal > 0 ? Math.max(0, 1 - discount / itemsSubtotal) : 1;

      for (const item of input.items) {
        const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variantId) as any;
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);

        const subtotal = item.quantity * item.unitCost;
        insertPurchaseItem.run(uuidv4(), purchaseId, item.variantId, item.quantity, item.unitCost, subtotal);

        const landedUnitCost = Number((item.unitCost * discountFactor).toFixed(2));

        // Recompute Weighted Average Cost (WAC) off the landed cost.
        const newWacCost = calculateMovingWeightedAverageCost(
          variant.stock_quantity,
          variant.cost_price,
          item.quantity,
          landedUnitCost
        );

        const newStock = variant.stock_quantity + item.quantity;
        updateVariantWac.run(item.quantity, newWacCost, item.variantId);

        // Record stock movement at the landed cost.
        insertMovement.run(
          uuidv4(),
          item.variantId,
          item.quantity,
          landedUnitCost,
          newStock,
          invoiceNo,
          `Purchase ${invoiceNo} (New WAC Cost: ${newWacCost})`,
          userId
        );
      }

      // 3. Update Supplier Payable & Ledger — one running value, applied step by step.
      const previousPayable = Number(supplier.current_payable.toFixed(2));
      const payableAfterBill = Number((previousPayable + totalAmount).toFixed(2));
      const newPayable = Number((payableAfterBill - paidAmount).toFixed(2)); // == previousPayable + balanceDue
      db.prepare('UPDATE suppliers SET current_payable = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPayable, input.supplierId);

      // Record bill in supplier ledger
      db.prepare(`
        INSERT INTO supplier_ledger (
          id, supplier_id, entry_type, reference_id, debit, credit, running_payable, payment_method, notes, user_id
        ) VALUES (?, ?, 'PURCHASE_BILL', ?, 0.0, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        input.supplierId,
        invoiceNo,
        totalAmount,
        payableAfterBill,
        input.paymentMethod || 'MANUAL',
        `Purchase Bill ${invoiceNo}`,
        userId
      );

      // If initial payment was made at time of purchase, record payment ledger entry
      if (paidAmount > 0) {
        db.prepare(`
          INSERT INTO supplier_ledger (
            id, supplier_id, entry_type, reference_id, debit, credit, running_payable, payment_method, notes, user_id
          ) VALUES (?, ?, 'PAYMENT_MADE', ?, ?, 0.0, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          input.supplierId,
          `PAY-${invoiceNo}`,
          paidAmount,
          newPayable,
          input.paymentMethod || 'CASH',
          `Payment for Bill ${invoiceNo}`,
          userId
        );
      }

      AuditService.log({
        userId,
        action: 'CREATE_PURCHASE',
        entityType: 'PURCHASE',
        entityId: purchaseId,
        newValue: {
          invoiceNo,
          supplierName: supplier.name,
          totalAmount,
          paidAmount,
          balanceDue,
          itemsCount: input.items.length,
        },
      });

      return SupplierService.getPurchaseById(purchaseId);
    });
  }

  static getPurchaseById(id: string): any {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT 
        p.*,
        s.name as supplier_name,
        s.company_name,
        s.phone as supplier_phone,
        u.full_name as user_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? OR p.purchase_invoice_no = ?
    `).get(id, id) as any;

    if (!purchase) return null;

    const items = db.prepare(`
      SELECT 
        pi.*,
        v.sku,
        v.color,
        v.size,
        p.name as product_name,
        c.name as category_name
      FROM purchase_items pi
      JOIN product_variants v ON pi.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE pi.purchase_id = ?
    `).all(purchase.id);

    return { ...purchase, items };
  }

  static getPurchases(filters?: { query?: string; supplierId?: string; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.query) {
      whereClause += ' AND (p.purchase_invoice_no LIKE ? OR s.name LIKE ?)';
      const q = `%${filters.query.trim()}%`;
      params.push(q, q);
    }
    if (filters?.supplierId) {
      whereClause += ' AND p.supplier_id = ?';
      params.push(filters.supplierId);
    }

    const count = db.prepare(`
      SELECT COUNT(*) as count 
      FROM purchases p 
      JOIN suppliers s ON p.supplier_id = s.id 
      ${whereClause}
    `).get(...params) as { count: number };

    const purchases = db.prepare(`
      SELECT 
        p.*,
        s.name as supplier_name,
        s.company_name,
        u.full_name as user_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as items_count
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.purchase_date DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { purchases, total: count.count };
  }

  // ── SUPPLIER LEDGER & PAYMENTS ──────────────────────────────────────────
  static getSupplierLedger(supplierId: string): any {
    const db = getDb();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId) as any;
    if (!supplier) throw new Error('Supplier not found');

    const entries = db.prepare(`
      SELECT l.*, u.full_name as user_name
      FROM supplier_ledger l
      JOIN users u ON l.user_id = u.id
      WHERE l.supplier_id = ?
      ORDER BY l.created_at ASC
    `).all(supplierId);

    return {
      supplier,
      entries,
      currentPayable: supplier.current_payable,
    };
  }

  static recordPayment(
    supplierId: string,
    amount: number,
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD',
    notes: string,
    userId: string
  ): any {
    return runTransaction((db) => {
      if (amount <= 0) throw new Error('Payment amount must be greater than 0');

      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId) as any;
      if (!supplier) throw new Error('Supplier not found');

      const previousPayable = Number(supplier.current_payable.toFixed(2));

      // Never let a payment drive the payable negative — an untracked "advance"
      // would vanish from the payables KPI (which filters current_payable > 0).
      if (amount > previousPayable + 0.01) {
        throw new Error(
          `Payment (${amount}) exceeds the outstanding payable (${previousPayable}) for ${supplier.name}. ` +
            `Record at most ${previousPayable}.`
        );
      }

      const newPayable = Number((previousPayable - amount).toFixed(2));
      const receiptNo = `SUP-PAY-${Date.now().toString().slice(-6)}`;

      // Update supplier balance
      db.prepare('UPDATE suppliers SET current_payable = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPayable, supplierId);

      // Record in ledger
      db.prepare(`
        INSERT INTO supplier_ledger (
          id, supplier_id, entry_type, reference_id, debit, credit, running_payable, payment_method, notes, user_id
        ) VALUES (?, ?, 'PAYMENT_MADE', ?, ?, 0.0, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        supplierId,
        receiptNo,
        amount,
        newPayable,
        paymentMethod,
        notes || `Payment made to supplier via ${paymentMethod}`,
        userId
      );

      AuditService.log({
        userId,
        action: 'RECORD_SUPPLIER_PAYMENT',
        entityType: 'SUPPLIER',
        entityId: supplierId,
        newValue: {
          receiptNo,
          amount,
          paymentMethod,
          previousPayable,
          newPayable,
        },
      });

      return {
        receiptNo,
        supplierName: supplier.name,
        amountPaid: amount,
        paymentMethod,
        previousPayable,
        newPayable,
        notes,
      };
    });
  }
}
