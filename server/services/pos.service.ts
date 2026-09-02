import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateSaleTotals, CartItemInput } from '../domain/calculation.js';
import { generateQrDataUrl } from '../domain/sku-generator.js';
import { AuditService } from './audit.service.js';
import { CONFIG } from '../config/index.js';

export interface PosCheckoutPayment {
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'KHATA';
  amount: number;
  referenceNote?: string;
}

export interface PosCheckoutInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    variantId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
  }[];
  overallDiscount?: number;
  taxRatePercent?: number;
  payments: PosCheckoutPayment[];
  notes?: string;
  cashTendered?: number;
}

export class PosService {
  /**
   * Generates a sequential, readable invoice number e.g. INV-20260901-0001
   */
  private static generateInvoiceNumber(db: any): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}-`;

    const lastSale = db.prepare(`
      SELECT invoice_number FROM sales
      WHERE invoice_number LIKE ?
      ORDER BY invoice_number DESC LIMIT 1
    `).get(`${prefix}%`) as { invoice_number: string } | undefined;

    let seq = 1;
    if (lastSale?.invoice_number) {
      const parts = lastSale.invoice_number.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Completes a POS sale atomically with ACID safety.
   */
  static checkout(input: PosCheckoutInput, cashierId: string): any {
    return runTransaction((db) => {
      if (!input.items || input.items.length === 0) {
        throw new Error('Cannot complete checkout with an empty cart.');
      }

      // Reject malformed line items and payments before touching inventory —
      // negative / non-integer quantities would otherwise corrupt stock levels
      // and negative prices would poison profit figures.
      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error('Each cart line must have a positive whole-number quantity.');
        }
        if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
          throw new Error('Each cart line must have a valid non-negative unit price.');
        }
        if (item.discountAmount !== undefined && (!Number.isFinite(item.discountAmount) || item.discountAmount < 0)) {
          throw new Error('Line discount must be a non-negative number.');
        }
      }
      if (!Array.isArray(input.payments) || input.payments.length === 0) {
        throw new Error('At least one payment entry is required.');
      }
      for (const p of input.payments) {
        if (!Number.isFinite(p.amount) || p.amount <= 0) {
          throw new Error('Each payment amount must be a positive number.');
        }
      }
      if (input.overallDiscount !== undefined && (!Number.isFinite(input.overallDiscount) || input.overallDiscount < 0)) {
        throw new Error('Overall discount must be a non-negative number.');
      }
      if (input.taxRatePercent !== undefined && (!Number.isFinite(input.taxRatePercent) || input.taxRatePercent < 0 || input.taxRatePercent > 100)) {
        throw new Error('Tax rate must be between 0 and 100.');
      }

      // Check system setting for negative stock
      const negSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'allow_negative_inventory_sales'").get() as { value: string } | undefined;
      const allowNegative = negSetting?.value === 'true';

      // 1. Fetch live variant records and snapshot current cost prices
      const variantIds = input.items.map((i) => i.variantId);
      const getVariantStmt = db.prepare(`
        SELECT v.*, p.name as product_name, p.brand, c.name as category_name
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE v.id = ? AND v.is_active = 1
      `);

      const rawCalcInputs: CartItemInput[] = [];
      const variantCache = new Map<string, any>();

      for (const item of input.items) {
        const v = getVariantStmt.get(item.variantId) as any;
        if (!v) throw new Error(`Product variant ${item.variantId} not found or inactive.`);

        if (!allowNegative && v.stock_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${v.product_name} (${v.sku})". Requested: ${item.quantity}, Available: ${v.stock_quantity}`
          );
        }

        variantCache.set(item.variantId, v);
        rawCalcInputs.push({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: v.cost_price, // Snapshot exact current cost
          discountAmount: item.discountAmount || 0,
        });
      }

      // 2. Compute sale totals via Centralized Calculation Engine
      const calcResult = calculateSaleTotals(
        rawCalcInputs,
        input.overallDiscount || 0,
        input.taxRatePercent || 0
      );

      // 3. Verify Payments
      const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
      const khataPayment = input.payments.find((p) => p.method === 'KHATA');
      const khataAmount = khataPayment ? khataPayment.amount : 0;
      const cashOrDigitalPaid = totalPaid - khataAmount;

      if (totalPaid < calcResult.netTotal - 0.01) {
        throw new Error(
          `Insufficient payment amount. Total is ${calcResult.netTotal}, but provided payments total ${totalPaid}.`
        );
      }

      // Determine main payment method classification
      let paymentMethod = 'CASH';
      if (input.payments.length > 1) {
        paymentMethod = 'SPLIT';
      } else if (input.payments.length === 1) {
        paymentMethod = input.payments[0].method;
      }

      let paymentStatus = 'PAID';
      if (khataAmount > 0) {
        paymentStatus = khataAmount >= calcResult.netTotal ? 'KHATA_UNPAID' : 'PARTIAL';
      }

      // 4. Handle Customer & Khata validation
      let customer: any = null;
      let effectiveCustomerId = input.customerId;

      if (effectiveCustomerId) {
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(effectiveCustomerId);
      } else if (input.customerPhone?.trim()) {
        const phone = input.customerPhone.trim();
        customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
        if (customer) {
          effectiveCustomerId = customer.id;
        } else if (input.customerName?.trim()) {
          effectiveCustomerId = uuidv4();
          db.prepare(`
            INSERT INTO customers (id, name, phone, current_balance, credit_limit)
            VALUES (?, ?, ?, 0.0, 50000.0)
          `).run(effectiveCustomerId, input.customerName.trim(), phone);
          customer = { id: effectiveCustomerId, name: input.customerName.trim(), phone, current_balance: 0 };
        }
      }

      if (khataAmount > 0) {
        if (!customer) {
          throw new Error('Customer profile must be selected to charge an amount to Khata (Credit).');
        }

        if (customer.credit_limit > 0) {
          const newBal = customer.current_balance + khataAmount;
          if (newBal > customer.credit_limit) {
            throw new Error(
              `Credit limit exceeded for ${customer.name}. Max limit: ${customer.credit_limit}, Current: ${customer.current_balance}, Requested Credit: ${khataAmount}`
            );
          }
        }
      }

      // 5. Generate Invoice
      const saleId = uuidv4();
      const invoiceNumber = this.generateInvoiceNumber(db);

      db.prepare(`
        INSERT INTO sales (
          id, invoice_number, customer_id, subtotal, discount_amount, tax_amount, net_total,
          total_cost, total_profit, paid_amount, khata_amount, payment_method, payment_status,
          status, cashier_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)
      `).run(
        saleId,
        invoiceNumber,
        effectiveCustomerId || null,
        calcResult.subtotal,
        calcResult.totalDiscount,
        calcResult.taxAmount,
        calcResult.netTotal,
        calcResult.totalCost,
        calcResult.totalProfit,
        cashOrDigitalPaid,
        khataAmount,
        paymentMethod,
        paymentStatus,
        cashierId,
        input.notes || null
      );

      // 6. Insert Sale Items, Decrement Inventory, and Record Stock Movements
      const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, variant_id, quantity, unit_price, unit_cost, discount_amount, subtotal, profit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE product_variants
        SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, variant_id, movement_type, quantity_change, cost_per_unit, resulting_stock, reference_id, notes, user_id
        ) VALUES (?, ?, 'SALE', ?, ?, ?, ?, ?, ?)
      `);

      for (const item of calcResult.items) {
        const v = variantCache.get(item.variantId);
        const saleItemId = uuidv4();

        insertSaleItem.run(
          saleItemId,
          saleId,
          item.variantId,
          item.quantity,
          item.unitPrice,
          item.unitCost,
          item.discountAmount,
          item.subtotal,
          item.profit
        );

        // Deduct inventory
        updateStock.run(item.quantity, item.variantId);
        const newStock = v.stock_quantity - item.quantity;

        // Record stock movement audit trail
        insertMovement.run(
          uuidv4(),
          item.variantId,
          -item.quantity,
          item.unitCost,
          newStock,
          invoiceNumber,
          `POS Sale ${invoiceNumber}`,
          cashierId
        );
      }

      // 7. Record Payment Breakdown
      const insertPayment = db.prepare(`
        INSERT INTO sale_payments (id, sale_id, payment_method, amount, reference_note)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const p of input.payments) {
        insertPayment.run(uuidv4(), saleId, p.method, p.amount, p.referenceNote || null);
      }

      // 8. Update Khata Ledger if Credit
      if (khataAmount > 0 && customer) {
        const newKhataBalance = customer.current_balance + khataAmount;
        db.prepare(`
          UPDATE customers 
          SET current_balance = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(newKhataBalance, customer.id);

        db.prepare(`
          INSERT INTO customer_khata_ledger (
            id, customer_id, entry_type, reference_id, debit, credit, running_balance, payment_method, notes, user_id
          ) VALUES (?, ?, 'SALE_CREDIT', ?, ?, 0.0, ?, 'MANUAL', ?, ?)
        `).run(
          uuidv4(),
          customer.id,
          invoiceNumber,
          khataAmount,
          newKhataBalance,
          `Credit Sale ${invoiceNumber}`,
          cashierId
        );
      }

      // 9. Audit Logging
      AuditService.log({
        userId: cashierId,
        action: 'POS_SALE',
        entityType: 'SALE',
        entityId: saleId,
        newValue: {
          invoiceNumber,
          netTotal: calcResult.netTotal,
          itemCount: calcResult.items.length,
          paymentMethod,
        },
      });

      // 10. Fetch Complete Sale for Receipt
      return PosService.getSaleById(saleId);
    });
  }

  /**
   * Retrieves full sale details with line items and customer info.
   */
  static getSaleById(saleIdOrInvoice: string): any {
    const db = getDb();
    const sale = db.prepare(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.current_balance as customer_balance,
        u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.cashier_id = u.id
      WHERE s.id = ? OR s.invoice_number = ?
    `).get(saleIdOrInvoice, saleIdOrInvoice) as any;

    if (!sale) return null;

    const items = db.prepare(`
      SELECT 
        si.*,
        v.sku,
        v.barcode,
        v.color,
        v.size,
        p.name as product_name,
        p.brand,
        c.name as category_name
      FROM sale_items si
      JOIN product_variants v ON si.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE si.sale_id = ?
    `).all(sale.id);

    const payments = db.prepare(`
      SELECT * FROM sale_payments WHERE sale_id = ?
    `).all(sale.id);

    return {
      ...sale,
      items,
      payments,
    };
  }

  /**
   * Retrieves paginated sales history with customer, cashier, and item details.
   */
  static getSales(filters?: {
    query?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.query) {
      whereClause += ' AND (s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)';
      const q = `%${filters.query.trim()}%`;
      params.push(q, q, q, q, q);
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
      whereClause += ' AND s.payment_method = ?';
      params.push(filters.paymentMethod);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      whereClause += ' AND s.payment_status = ?';
      params.push(filters.paymentStatus);
    }

    if (filters?.startDate) {
      whereClause += ' AND date(s.created_at) >= date(?)';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      whereClause += ' AND date(s.created_at) <= date(?)';
      params.push(filters.endDate);
    }

    const count = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.cashier_id = u.id
      ${whereClause}
    `).get(...params) as { count: number };

    const sales = db.prepare(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.phone as customer_phone,
        u.full_name as cashier_name,
        u.username as cashier_username,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count,
        (SELECT SUM(quantity) FROM sale_items WHERE sale_id = s.id) as total_units
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.cashier_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      sales,
      total: count.count,
      page,
      limit,
    };
  }

  /**
   * Prepares structured thermal receipt payload for ESC/POS and HTML thermal printing.
   */
  static async getReceiptPayload(saleIdOrInvoice: string): Promise<any> {
    const sale = this.getSaleById(saleIdOrInvoice);
    if (!sale) throw new Error('Sale not found');

    const db = getDb();
    const settingsRows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    settingsRows.forEach((r) => (settings[r.key] = r.value));

    // Generate QR Code for receipt
    const qrData = `B4L|INV|${sale.invoice_number}|${sale.net_total}|${sale.created_at}`;
    const qrDataUrl = await generateQrDataUrl(qrData);

    return {
      store: {
        name: settings['store_name'] || CONFIG.STORE_NAME,
        tagline: settings['store_tagline'] || CONFIG.STORE_TAGLINE,
        address: settings['store_address'] || CONFIG.STORE_ADDRESS,
        phone: settings['store_phone'] || CONFIG.STORE_PHONE,
        currency: settings['currency'] || CONFIG.CURRENCY,
      },
      invoice: {
        id: sale.id,
        invoiceNumber: sale.invoice_number,
        createdAt: sale.created_at,
        cashierName: sale.cashier_name,
        customerName: sale.customer_name || 'Walk-in Customer',
        customerPhone: sale.customer_phone || '',
        customerBalance: sale.customer_balance || 0,
        subtotal: sale.subtotal,
        discountAmount: sale.discount_amount,
        taxAmount: sale.tax_amount,
        netTotal: sale.net_total,
        paidAmount: sale.paid_amount,
        khataAmount: sale.khata_amount,
        paymentMethod: sale.payment_method,
        paymentStatus: sale.payment_status,
        status: sale.status,
      },
      items: sale.items.map((i: any) => ({
        name: i.product_name,
        sku: i.sku,
        color: i.color || '',
        size: i.size || '',
        quantity: i.quantity,
        unitPrice: i.unit_price,
        discountAmount: i.discount_amount,
        subtotal: i.subtotal,
      })),
      payments: sale.payments,
      qrDataUrl,
      returnPolicy: settings['receipt_return_policy'] || CONFIG.RECEIPT_RETURN_POLICY,
      paperWidth: settings['thermal_printer_paper_width'] || '80mm',
    };
  }
}
