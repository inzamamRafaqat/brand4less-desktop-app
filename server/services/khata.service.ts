import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AuditService } from './audit.service.js';
import { CONFIG } from '../config/index.js';

export interface CreateCustomerInput {
  name: string;
  phone: string;
  cnic?: string;
  address?: string;
  creditLimit?: number;
}

export class KhataService {
  // ── CUSTOMERS ───────────────────────────────────────────────────────────
  static getCustomers(filters?: { query?: string; hasBalance?: boolean; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.query) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR cnic LIKE ?)';
      const q = `%${filters.query.trim()}%`;
      params.push(q, q, q);
    }

    if (filters?.hasBalance) {
      whereClause += ' AND current_balance > 0';
    }

    const count = db.prepare(`SELECT COUNT(*) as count FROM customers ${whereClause}`).get(...params) as { count: number };
    const customers = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM sales WHERE customer_id = c.id) as total_purchases_count,
        (SELECT COALESCE(SUM(net_total), 0) FROM sales WHERE customer_id = c.id) as total_lifetime_spent,
        (SELECT MAX(created_at) FROM sales WHERE customer_id = c.id) as last_purchase_date,
        (SELECT MAX(created_at) FROM customer_khata_ledger WHERE customer_id = c.id AND entry_type = 'PAYMENT_RECEIVED') as last_payment_date
      FROM customers c
      ${whereClause}
      ORDER BY c.current_balance DESC, total_lifetime_spent DESC, c.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { customers, total: count.count };
  }

  static getCustomerPurchases(customerId: string): any[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        s.*,
        u.full_name as cashier_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
      FROM sales s
      JOIN users u ON s.cashier_id = u.id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
    `).all(customerId) as any[];

    return rows.map((s) => {
      const items = db.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          v.sku,
          v.color,
          v.size
        FROM sale_items si
        JOIN product_variants v ON si.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE si.sale_id = ?
      `).all(s.id);

      return {
        ...s,
        items,
      };
    });
  }

  static getCustomerById(id: string): any {
    const db = getDb();
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }

  static createCustomer(input: CreateCustomerInput, userId: string): any {
    const db = getDb();
    const id = uuidv4();

    // Check if phone already exists
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(input.phone.trim());
    if (existing) {
      throw new Error(`Customer with phone number ${input.phone} already exists.`);
    }

    db.prepare(`
      INSERT INTO customers (id, name, phone, cnic, address, credit_limit, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, 0.0)
    `).run(
      id,
      input.name.trim(),
      input.phone.trim(),
      input.cnic?.trim() || null,
      input.address?.trim() || null,
      input.creditLimit || 0.0
    );

    AuditService.log({
      userId,
      action: 'CREATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id,
      newValue: input,
    });

    return KhataService.getCustomerById(id);
  }

  static updateCustomer(id: string, input: Partial<CreateCustomerInput>, userId: string): any {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) throw new Error('Customer not found');

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          cnic = COALESCE(?, cnic),
          address = COALESCE(?, address),
          credit_limit = COALESCE(?, credit_limit),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      input.name?.trim() || null,
      input.phone?.trim() || null,
      input.cnic?.trim() || null,
      input.address?.trim() || null,
      input.creditLimit !== undefined ? input.creditLimit : null,
      id
    );

    AuditService.log({
      userId,
      action: 'UPDATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id,
      oldValue: existing,
      newValue: input,
    });

    return KhataService.getCustomerById(id);
  }

  // ── KHATA LEDGER ────────────────────────────────────────────────────────
  static getCustomerLedger(customerId: string, startDate?: string, endDate?: string): any {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!customer) throw new Error('Customer not found');

    let query = `
      SELECT 
        l.*,
        u.full_name as user_name
      FROM customer_khata_ledger l
      JOIN users u ON l.user_id = u.id
      WHERE l.customer_id = ?
    `;
    const params: any[] = [customerId];

    if (startDate) {
      query += ' AND l.created_at >= ?';
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      query += ' AND l.created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    query += ' ORDER BY l.created_at ASC';
    const entries = db.prepare(query).all(...params);

    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(debit), 0) as total_debit,
        COALESCE(SUM(credit), 0) as total_credit
      FROM customer_khata_ledger
      WHERE customer_id = ?
    `).get(customerId) as { total_debit: number; total_credit: number };

    return {
      customer,
      entries,
      totalDebit: totals.total_debit,
      totalCredit: totals.total_credit,
      currentBalance: customer.current_balance,
    };
  }

  /**
   * Records a cash/card/bank payment from customer towards their Khata balance.
   */
  static recordPayment(
    customerId: string,
    amount: number,
    paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE',
    notes: string,
    userId: string
  ): any {
    return runTransaction((db) => {
      if (amount <= 0) throw new Error('Payment amount must be greater than 0');

      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
      if (!customer) throw new Error('Customer not found');

      const previousBalance = customer.current_balance;
      const newBalance = previousBalance - amount;
      const receiptNo = `KHT-PAY-${Date.now().toString().slice(-6)}`;

      // Update customer balance
      db.prepare('UPDATE customers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, customerId);

      // Insert ledger entry
      db.prepare(`
        INSERT INTO customer_khata_ledger (
          id, customer_id, entry_type, reference_id, debit, credit, running_balance, payment_method, notes, user_id
        ) VALUES (?, ?, 'PAYMENT_RECEIVED', ?, 0.0, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        customerId,
        receiptNo,
        amount,
        newBalance,
        paymentMethod,
        notes || `Payment received: ${paymentMethod}`,
        userId
      );

      AuditService.log({
        userId,
        action: 'RECORD_KHATA_PAYMENT',
        entityType: 'KHATA',
        entityId: customerId,
        newValue: {
          receiptNo,
          amount,
          paymentMethod,
          previousBalance,
          newBalance,
        },
      });

      return {
        receiptNo,
        customerName: customer.name,
        customerPhone: customer.phone,
        amountPaid: amount,
        paymentMethod,
        previousBalance,
        newBalance,
        notes,
        date: new Date().toISOString(),
      };
    });
  }

  // ── EXPORT KHATA STATEMENT (EXCEL & PDF) ──────────────────────────────────
  static async exportStatementExcel(customerId: string, startDate?: string, endDate?: string): Promise<Buffer> {
    const data = this.getCustomerLedger(customerId, startDate, endDate);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Khata Statement');

    worksheet.columns = [
      { header: 'Date & Time', key: 'date', width: 22 },
      { header: 'Entry Type', key: 'type', width: 20 },
      { header: 'Reference / Invoice', key: 'ref', width: 22 },
      { header: 'Debit (+)', key: 'debit', width: 15 },
      { header: 'Credit (-)', key: 'credit', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Payment Method', key: 'method', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Cashier', key: 'user', width: 20 },
    ];

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF15803D' }, // Brand green
    };

    data.entries.forEach((e: any) => {
      worksheet.addRow({
        date: e.created_at,
        type: e.entry_type.replace(/_/g, ' '),
        ref: e.reference_id || 'N/A',
        debit: e.debit > 0 ? e.debit : '',
        credit: e.credit > 0 ? e.credit : '',
        balance: e.running_balance,
        method: e.payment_method || '-',
        notes: e.notes || '',
        user: e.user_name || '',
      });
    });

    // Summary Row
    const summaryRow = worksheet.addRow({
      date: 'CURRENT BALANCE',
      type: '',
      ref: '',
      debit: data.totalDebit,
      credit: data.totalCredit,
      balance: data.currentBalance,
      method: '',
      notes: '',
      user: '',
    });
    summaryRow.font = { bold: true };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  static async exportStatementPdf(customerId: string, startDate?: string, endDate?: string): Promise<Buffer> {
    const data = this.getCustomerLedger(customerId, startDate, endDate);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(20).text(CONFIG.STORE_NAME, { align: 'center' });
      doc.fontSize(10).text(CONFIG.STORE_ADDRESS, { align: 'center' });
      doc.text(`Phone: ${CONFIG.STORE_PHONE}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text('CUSTOMER KHATA STATEMENT', { underline: true });
      doc.moveDown(0.5);

      // Customer Info Box
      doc.fontSize(10);
      doc.text(`Customer Name: ${data.customer.name}`);
      doc.text(`Phone: ${data.customer.phone}`);
      if (data.customer.address) doc.text(`Address: ${data.customer.address}`);
      doc.text(`Current Outstanding Balance: ${CONFIG.CURRENCY} ${data.customer.current_balance.toLocaleString()}`);
      doc.moveDown();

      // Table Header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Date', 40, tableTop);
      doc.text('Type', 130, tableTop);
      doc.text('Ref #', 220, tableTop);
      doc.text('Debit', 310, tableTop, { align: 'right', width: 60 });
      doc.text('Credit', 380, tableTop, { align: 'right', width: 60 });
      doc.text('Balance', 460, tableTop, { align: 'right', width: 70 });
      doc.moveDown();
      doc.font('Helvetica');

      let yPos = doc.y;
      data.entries.forEach((e: any) => {
        if (yPos > 720) {
          doc.addPage();
          yPos = 40;
        }

        const dateStr = e.created_at.slice(0, 10);
        doc.text(dateStr, 40, yPos);
        doc.text(e.entry_type.replace(/_/g, ' '), 130, yPos);
        doc.text(e.reference_id || '-', 220, yPos);
        doc.text(e.debit > 0 ? e.debit.toFixed(0) : '-', 310, yPos, { align: 'right', width: 60 });
        doc.text(e.credit > 0 ? e.credit.toFixed(0) : '-', 380, yPos, { align: 'right', width: 60 });
        doc.text(e.running_balance.toFixed(0), 460, yPos, { align: 'right', width: 70 });

        yPos += 18;
      });

      doc.moveDown();
      doc.y = yPos + 10;
      doc.font('Helvetica-Bold');
      doc.text(`Total Debit: ${CONFIG.CURRENCY} ${data.totalDebit.toLocaleString()}`, 40);
      doc.text(`Total Credit: ${CONFIG.CURRENCY} ${data.totalCredit.toLocaleString()}`, 220);
      doc.text(`Net Balance: ${CONFIG.CURRENCY} ${data.currentBalance.toLocaleString()}`, 400);

      doc.end();
    });
  }
}
