import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';

export class CustomerService {
  static getCustomers(query: string = '', limit: number = 100) {
    let sql = `
      SELECT 
        c.*,
        COALESCE(SUM(s.net_total), 0) as total_lifetime_spent,
        COUNT(s.id) as total_purchases_count,
        MAX(s.created_at) as last_purchase_date
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id
    `;

    const params: any[] = [];
    if (query.trim()) {
      sql += ' WHERE (c.name LIKE ? OR c.phone LIKE ? OR c.cnic_or_tax_id LIKE ?)';
      const q = `%${query.trim()}%`;
      params.push(q, q, q);
    }

    sql += ' GROUP BY c.id ORDER BY total_lifetime_spent DESC, c.name ASC LIMIT ?';
    params.push(limit);

    return db.prepare(sql).all(...params);
  }

  static getCustomerById(id: string) {
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }

  static createCustomer(data: {
    name: string;
    phone?: string;
    cnicOrTaxId?: string;
    email?: string;
    address?: string;
    creditLimit?: number;
    notes?: string;
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (
        id, name, phone, cnic_or_tax_id, email, address,
        credit_limit, current_balance, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.phone?.trim() || null,
      data.cnicOrTaxId?.trim() || null,
      data.email?.trim() || null,
      data.address?.trim() || null,
      data.creditLimit || 50000.0,
      data.notes || null,
      now,
      now
    );

    return this.getCustomerById(id);
  }

  static updateCustomer(id: string, data: any) {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        cnic_or_tax_id = COALESCE(?, cnic_or_tax_id),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        credit_limit = COALESCE(?, credit_limit),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name, data.phone, data.cnicOrTaxId, data.email,
      data.address, data.creditLimit, data.notes, now, id
    );

    return this.getCustomerById(id);
  }

  static getCustomerPurchases(customerId: string) {
    const sales = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
    `).all(customerId) as any[];

    const getItems = db.prepare(`
      SELECT si.*, p.name as product_name, v.sku, v.custom_attributes_json
      FROM sale_items si
      JOIN product_variants v ON v.id = si.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE si.sale_id = ?
    `);

    return sales.map((s) => ({
      ...s,
      items: getItems.all(s.id).map((it: any) => ({
        ...it,
        attributes: it.custom_attributes_json ? JSON.parse(it.custom_attributes_json) : {},
      })),
    }));
  }

  static getCustomerLedger(customerId: string) {
    const customer = this.getCustomerById(customerId);
    const entries = db.prepare(`
      SELECT * FROM customer_ledger
      WHERE customer_id = ?
      ORDER BY created_at ASC
    `).all(customerId) as any[];

    let runningBalance = 0;
    const ledgerWithBalance = entries.map((entry) => {
      if (entry.transaction_type === 'DEBIT') {
        runningBalance += entry.amount;
      } else if (entry.transaction_type === 'CREDIT') {
        runningBalance -= entry.amount;
      }
      return {
        ...entry,
        running_balance: runningBalance,
      };
    });

    return {
      customer,
      ledger: ledgerWithBalance.reverse(),
      currentBalance: runningBalance,
    };
  }

  static recordPayment(data: {
    customerId: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
    createdBy?: string;
  }) {
    const now = new Date().toISOString();
    const voucherId = `VCH-${Date.now().toString().slice(-6)}`;

    return db.transaction(() => {
      // 1. Deduct customer balance
      db.prepare(`
        UPDATE customers SET
          current_balance = current_balance - ?,
          updated_at = ?
        WHERE id = ?
      `).run(data.amount, now, data.customerId);

      // 2. Insert ledger credit
      db.prepare(`
        INSERT INTO customer_ledger (
          id, customer_id, transaction_type, amount, reference_type,
          reference_id, notes, created_by, created_at
        ) VALUES (?, ?, 'CREDIT', ?, 'PAYMENT_VOUCHER', ?, ?, ?, ?)
      `).run(
        uuidv4(),
        data.customerId,
        data.amount,
        voucherId,
        data.notes || `Khata Credit Payment via ${data.paymentMethod || 'CASH'}`,
        data.createdBy || 'Staff',
        now
      );

      return {
        success: true,
        voucherId,
        amount: data.amount,
        createdAt: now,
      };
    })();
  }
}
