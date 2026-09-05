import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from './organization.service.js';
import { calculateInvoiceTotals } from '../domain/calculations.js';

export interface CheckoutItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface PaymentEntry {
  method: 'CASH' | 'CARD' | 'IBFT' | 'KHATA';
  amount: number;
  referenceNumber?: string;
}

export class PosService {
  /**
   * Search products for POS billing
   */
  static searchPosProducts(query: string = '') {
    let sql = `
      SELECT 
        v.id as variant_id,
        v.sku,
        v.barcode,
        v.cost_price,
        v.selling_price,
        v.stock_quantity,
        v.custom_attributes_json,
        p.id as product_id,
        p.name as product_name,
        p.brand,
        p.image_url,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE v.is_active = 1 AND p.is_active = 1
    `;

    const params: any[] = [];
    if (query.trim()) {
      sql += ` AND (
        p.name LIKE ? OR 
        v.sku LIKE ? OR 
        v.barcode LIKE ? OR 
        v.custom_attributes_json LIKE ?
      )`;
      const q = `%${query.trim()}%`;
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY p.name ASC LIMIT 150';
    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map((r) => ({
      ...r,
      custom_attributes: r.custom_attributes_json ? JSON.parse(r.custom_attributes_json) : {},
    }));
  }

  /**
   * Execute POS Checkout
   */
  static checkout(data: {
    customerId?: string | null;
    customerName?: string;
    customerPhone?: string;
    items: CheckoutItem[];
    overallDiscount?: number;
    taxRatePercent?: number;
    payments: PaymentEntry[];
    cashierId?: string;
    notes?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Cannot checkout an empty cart.');
    }

    const org = OrganizationService.getProfile();
    const now = new Date().toISOString();
    const saleId = uuidv4();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

    return db.transaction(() => {
      // 1. Auto-create or resolve Customer
      let effectiveCustomerId = data.customerId || null;
      if (!effectiveCustomerId && data.customerPhone && data.customerPhone.trim()) {
        const phone = data.customerPhone.trim();
        const existingCust = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone) as any;
        if (existingCust) {
          effectiveCustomerId = existingCust.id;
        } else {
          const newCustId = uuidv4();
          db.prepare(`
            INSERT INTO customers (id, name, phone, current_balance, credit_limit, created_at, updated_at)
            VALUES (?, ?, ?, 0.0, 50000.0, ?, ?)
          `).run(newCustId, data.customerName?.trim() || 'Walk-in Customer', phone, now, now);
          effectiveCustomerId = newCustId;
        }
      }

      // 2. Calculate Totals
      const totals = calculateInvoiceTotals(data.items, data.overallDiscount || 0, data.taxRatePercent || org.tax_rate || 0);

      // 3. Process Payments
      const totalPaid = data.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const khataPayment = data.payments.find((p) => p.method === 'KHATA');
      const khataAmount = khataPayment ? Number(khataPayment.amount || 0) : 0;
      const cashPayment = data.payments.find((p) => p.method === 'CASH');
      const changeAmount = cashPayment && totalPaid > totals.netTotal ? totalPaid - totals.netTotal : 0;

      const primaryMethod = data.payments.length > 1 ? 'SPLIT' : data.payments[0]?.method || 'CASH';

      // 4. Insert Sale Master
      db.prepare(`
        INSERT INTO sales (
          id, invoice_number, customer_id, subtotal, discount_amount,
          tax_amount, net_total, paid_amount, change_amount, khata_amount,
          payment_method, payment_status, cashier_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId,
        invoiceNumber,
        effectiveCustomerId,
        totals.subtotal,
        totals.overallDiscount,
        totals.taxAmount,
        totals.netTotal,
        totalPaid,
        changeAmount,
        khataAmount,
        primaryMethod,
        khataAmount > 0 && totalPaid < totals.netTotal ? 'PARTIAL' : 'PAID',
        data.cashierId || 'usr_cashier_1',
        data.notes || null,
        now
      );

      // 5. Insert Line Items & Deduct Stock
      const insertLine = db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, variant_id, quantity, unit_price, unit_cost,
          discount_amount, subtotal, custom_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const deductStock = db.prepare(`
        UPDATE product_variants SET
          stock_quantity = stock_quantity - ?,
          updated_at = ?
        WHERE id = ?
      `);

      const getVariantInfo = db.prepare(`
        SELECT v.*, p.name as product_name
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ?
      `);

      const receiptItems: any[] = [];

      for (const item of data.items) {
        const vInfo = getVariantInfo.get(item.variantId) as any;
        if (!vInfo) throw new Error(`Product variant not found: ${item.variantId}`);

        const lineSubtotal = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
        insertLine.run(
          uuidv4(),
          saleId,
          item.variantId,
          item.quantity,
          item.unitPrice,
          vInfo.cost_price,
          item.discountAmount || 0,
          lineSubtotal,
          vInfo.custom_attributes_json
        );

        deductStock.run(item.quantity, now, item.variantId);

        receiptItems.push({
          name: vInfo.product_name,
          sku: vInfo.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: lineSubtotal,
          attributes: vInfo.custom_attributes_json ? JSON.parse(vInfo.custom_attributes_json) : {},
        });
      }

      // 6. Insert Split Tender Entries
      const insertPay = db.prepare(`
        INSERT INTO sale_payments (id, sale_id, payment_method, amount, reference_number, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const p of data.payments) {
        insertPay.run(uuidv4(), saleId, p.method, p.amount, p.referenceNumber || null, now);
      }

      // 7. Update Customer Khata Ledger if Credit Sale
      if (khataAmount > 0 && effectiveCustomerId) {
        db.prepare(`
          UPDATE customers SET
            current_balance = current_balance + ?,
            updated_at = ?
          WHERE id = ?
        `).run(khataAmount, now, effectiveCustomerId);

        db.prepare(`
          INSERT INTO customer_ledger (
            id, customer_id, transaction_type, amount, reference_type,
            reference_id, notes, created_by, created_at
          ) VALUES (?, ?, 'DEBIT', ?, 'SALE', ?, 'POS Credit Purchase', ?, ?)
        `).run(uuidv4(), effectiveCustomerId, khataAmount, saleId, data.cashierId || 'Staff', now);
      }

      // 8. Build Receipt Payload
      const customer = effectiveCustomerId
        ? (db.prepare('SELECT * FROM customers WHERE id = ?').get(effectiveCustomerId) as any)
        : null;

      const receiptData = {
        organization: org,
        sale: {
          id: saleId,
          invoiceNumber,
          createdAt: now,
          cashierName: data.cashierId || 'Staff Cashier',
          customerName: customer?.name || data.customerName || 'Walk-in Customer',
          customerPhone: customer?.phone || data.customerPhone || '',
          subtotal: totals.subtotal,
          discountAmount: totals.overallDiscount,
          taxAmount: totals.taxAmount,
          netTotal: totals.netTotal,
          paidAmount: totalPaid,
          changeAmount,
          khataAmount,
          paymentMethod: primaryMethod,
        },
        items: receiptItems,
        payments: data.payments,
      };

      return {
        success: true,
        saleId,
        invoiceNumber,
        receiptData,
      };
    })();
  }

  static getSales(options: { query?: string; page?: number; limit?: number } = {}) {
    const { query = '', page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (query.trim()) {
      where += ' AND (s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
      const q = `%${query.trim()}%`;
      params.push(q, q, q);
    }

    const count = db.prepare(`
      SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON c.id = s.customer_id ${where}
    `).get(...params) as { total: number };

    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ${where}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const getItems = db.prepare(`
      SELECT si.*, p.name as product_name, v.sku, v.barcode, v.custom_attributes_json
      FROM sale_items si
      JOIN product_variants v ON v.id = si.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE si.sale_id = ?
    `);

    const result = sales.map((s) => ({
      ...s,
      items: getItems.all(s.id).map((it: any) => ({
        ...it,
        attributes: it.custom_attributes_json ? JSON.parse(it.custom_attributes_json) : {},
      })),
    }));

    return {
      sales: result,
      total: count.total,
      page,
      limit,
    };
  }
}
