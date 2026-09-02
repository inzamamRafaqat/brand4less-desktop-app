import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { PosService, PosCheckoutInput } from './pos.service.js';
import { AuditService } from './audit.service.js';
import { calculateExchangeDifference } from '../domain/calculation.js';

export interface ReturnItemInput {
  saleItemId?: string;
  variantId: string;
  quantity: number;
  refundUnitPrice: number;
  reason?: string;
}

export interface ProcessReturnInput {
  originalSaleId?: string;
  customerId?: string;
  items: ReturnItemInput[];
  refundMethod: 'CASH' | 'KHATA_CREDIT' | 'EXCHANGE_OFFSET';
  reason?: string;
}

export interface ProcessExchangeInput {
  returnDetails: ProcessReturnInput;
  newSaleDetails: PosCheckoutInput;
}

export class ReturnsService {
  private static generateReturnNumber(db: any): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RET-${today}-`;
    const last = db.prepare(`SELECT return_number FROM returns WHERE return_number LIKE ? ORDER BY created_at DESC LIMIT 1`).get(`${prefix}%`) as { return_number: string } | undefined;
    let seq = 1;
    if (last?.return_number) {
      const parts = last.return_number.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private static generateExchangeNumber(db: any): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `EXC-${today}-`;
    const last = db.prepare(`SELECT exchange_number FROM exchanges WHERE exchange_number LIKE ? ORDER BY created_at DESC LIMIT 1`).get(`${prefix}%`) as { exchange_number: string } | undefined;
    let seq = 1;
    if (last?.exchange_number) {
      const parts = last.exchange_number.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Process product returns linked to a sale.
   */
  static processReturn(input: ProcessReturnInput, userId: string): any {
    return runTransaction((db) => {
      if (!input.items || input.items.length === 0) {
        throw new Error('No items specified for return.');
      }

      const returnId = uuidv4();
      const returnNumber = this.generateReturnNumber(db);
      let totalRefundAmount = 0;

      // Check original sale if provided
      let sale: any = null;
      if (input.originalSaleId) {
        sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(input.originalSaleId);
      }

      const customerId = input.customerId || (sale ? sale.customer_id : null);

      const insertReturnItem = db.prepare(`
        INSERT INTO return_items (id, return_id, sale_item_id, variant_id, quantity, refund_unit_price, unit_cost, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE product_variants
        SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, variant_id, movement_type, quantity_change, cost_per_unit, resulting_stock, reference_id, notes, user_id
        ) VALUES (?, ?, 'SALE_RETURN', ?, ?, ?, ?, ?, ?)
      `);

      // Calculate total refund amount first
      for (const item of input.items) {
        totalRefundAmount += item.quantity * item.refundUnitPrice;
      }

      // Record parent Return first for foreign key integrity
      db.prepare(`
        INSERT INTO returns (id, return_number, original_sale_id, customer_id, total_refund_amount, refund_method, reason, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        returnId,
        returnNumber,
        input.originalSaleId || null,
        customerId,
        totalRefundAmount,
        input.refundMethod,
        input.reason || null,
        userId
      );

      for (const item of input.items) {
        const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variantId) as any;
        if (!variant) throw new Error(`Product variant ${item.variantId} not found.`);

        const itemSubtotal = item.quantity * item.refundUnitPrice;

        // Restore stock
        updateStock.run(item.quantity, item.variantId);
        const newStock = variant.stock_quantity + item.quantity;

        // Log return stock movement
        insertMovement.run(
          uuidv4(),
          item.variantId,
          item.quantity,
          variant.cost_price,
          newStock,
          returnNumber,
          `Return ${returnNumber}: ${item.reason || input.reason || 'Customer Return'}`,
          userId
        );

        insertReturnItem.run(
          uuidv4(),
          returnId,
          item.saleItemId || null,
          item.variantId,
          item.quantity,
          item.refundUnitPrice,
          variant.cost_price,
          itemSubtotal
        );
      }

      // If Khata credit refund, reduce customer's outstanding balance
      if (input.refundMethod === 'KHATA_CREDIT' && customerId) {
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
        if (customer) {
          const newBal = customer.current_balance - totalRefundAmount;
          db.prepare('UPDATE customers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newBal, customerId);

          db.prepare(`
            INSERT INTO customer_khata_ledger (
              id, customer_id, entry_type, reference_id, debit, credit, running_balance, payment_method, notes, user_id
            ) VALUES (?, ?, 'RETURN_REFUND_CREDIT', ?, 0.0, ?, ?, 'MANUAL', ?, ?)
          `).run(
            uuidv4(),
            customerId,
            returnNumber,
            totalRefundAmount,
            newBal,
            `Refund Credit for Return ${returnNumber}`,
            userId
          );
        }
      }

      // Mark original sale status if fully or partially returned
      if (sale) {
        db.prepare("UPDATE sales SET status = 'RETURNED' WHERE id = ?").run(sale.id);
      }

      AuditService.log({
        userId,
        action: 'PROCESS_RETURN',
        entityType: 'RETURN',
        entityId: returnId,
        newValue: {
          returnNumber,
          totalRefundAmount,
          refundMethod: input.refundMethod,
          originalSaleId: input.originalSaleId,
        },
      });

      return ReturnsService.getReturnById(returnId);
    });
  }

  /**
   * Process a seamless Exchange transaction.
   */
  static processExchange(input: ProcessExchangeInput, userId: string): any {
    return runTransaction((db) => {
      // 1. Process Return portion with EXCHANGE_OFFSET
      const returnRecord = ReturnsService.processReturn(
        {
          ...input.returnDetails,
          refundMethod: 'EXCHANGE_OFFSET',
        },
        userId
      );

      const returnedAmount = returnRecord.total_refund_amount;

      // 2. Process New Sale portion
      const newSaleRecord = PosService.checkout(input.newSaleDetails, userId);
      const newSaleTotal = newSaleRecord.net_total;

      // 3. Compute difference
      const differenceAmount = calculateExchangeDifference(returnedAmount, newSaleTotal);
      const exchangeId = uuidv4();
      const exchangeNumber = this.generateExchangeNumber(db);

      db.prepare(`
        INSERT INTO exchanges (id, exchange_number, return_id, new_sale_id, difference_amount, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        exchangeId,
        exchangeNumber,
        returnRecord.id,
        newSaleRecord.id,
        differenceAmount,
        userId
      );

      // Update sale status to EXCHANGED
      db.prepare("UPDATE sales SET status = 'EXCHANGED' WHERE id = ?").run(newSaleRecord.id);

      AuditService.log({
        userId,
        action: 'PROCESS_EXCHANGE',
        entityType: 'EXCHANGE',
        entityId: exchangeId,
        newValue: {
          exchangeNumber,
          returnedAmount,
          newSaleTotal,
          differenceAmount,
        },
      });

      return {
        exchangeId,
        exchangeNumber,
        returnDetails: returnRecord,
        newSaleDetails: newSaleRecord,
        differenceAmount,
      };
    });
  }

  static getReturnById(returnId: string): any {
    const db = getDb();
    const returnRecord = db.prepare(`
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, u.full_name as user_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ? OR r.return_number = ?
    `).get(returnId, returnId) as any;

    if (!returnRecord) return null;

    const items = db.prepare(`
      SELECT ri.*, v.sku, v.color, v.size, p.name as product_name
      FROM return_items ri
      JOIN product_variants v ON ri.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE ri.return_id = ?
    `).all(returnRecord.id);

    return {
      ...returnRecord,
      items,
    };
  }

  static getReturns(filters?: { query?: string; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const count = db.prepare('SELECT COUNT(*) as count FROM returns').get() as { count: number };
    const returns = db.prepare(`
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, u.full_name as user_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return { returns, total: count.count };
  }
}
