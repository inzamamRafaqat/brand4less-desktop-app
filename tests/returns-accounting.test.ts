import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { ProductService } from '../server/services/product.service.js';
import { PosService } from '../server/services/pos.service.js';
import { ReturnsService } from '../server/services/returns.service.js';
import { KhataService } from '../server/services/khata.service.js';
import { ReportService } from '../server/services/report.service.js';

/**
 * Returns / exchange accounting model (QA #1, #5, #8) — the report-layer
 * ("Option 3A") correction plus the linked-return refund proration and the
 * exchange difference settlement.
 */
describe('Returns & exchange accounting', () => {
  let adminId: string;
  let staffId: string;
  let categoryId: string;
  const today = new Date().toISOString().slice(0, 10);
  const uniquePhone = () => `03${Math.floor(100000000 + Math.random() * 899999999)}`;

  const makeVariant = (cost: number, price: number, stock: number) => {
    const p = ProductService.createProductWithVariants(
      {
        name: `RetAcct ${Math.random().toString(36).slice(2, 8)}`,
        categoryId,
        variants: [{ color: 'Blue', size: 'M', costPrice: cost, sellingPrice: price, stockQuantity: stock }],
      },
      adminId
    );
    return p.variants[0].id;
  };

  beforeAll(() => {
    runMigrations();
    seedDatabase();
    const db = getDb();
    adminId = (db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").get() as any).id;
    staffId = (db.prepare("SELECT id FROM users WHERE role = 'STAFF'").get() as any).id;
    categoryId = (db.prepare('SELECT id FROM categories LIMIT 1').get() as any).id;
  });

  // ── #1 — a return reverses revenue / COGS / profit in the reports ─────────
  it('#1 nets returned revenue, COGS and margin out of the P&L', () => {
    const variantId = makeVariant(500, 1000, 10);
    const sale = PosService.checkout(
      { items: [{ variantId, quantity: 2, unitPrice: 1000 }], payments: [{ method: 'CASH', amount: 2000 }] },
      staffId
    );

    const before = ReportService.getProfitAndLoss(today, today);
    ReturnsService.processReturn(
      { originalSaleId: sale.id, refundMethod: 'CASH', items: [{ variantId, quantity: 1, refundUnitPrice: 0 }] },
      adminId
    );
    const after = ReportService.getProfitAndLoss(today, today);

    // Revenue reversed by one unit's paid price (1000), COGS by one unit's cost (500).
    expect(Number((after.returns.revenueReversed - before.returns.revenueReversed).toFixed(2))).toBe(1000);
    expect(Number((after.returns.cogsReversed - before.returns.cogsReversed).toFixed(2))).toBe(500);
    expect(Number((after.returns.profitReversed - before.returns.profitReversed).toFixed(2))).toBe(500);

    // Net figures drop accordingly; the "before returns" figures do not.
    expect(Number((after.revenue.netSales - before.revenue.netSales).toFixed(2)))
      .toBe(Number((after.revenue.netSalesBeforeReturns - before.revenue.netSalesBeforeReturns - 1000).toFixed(2)));
    expect(after.revenue.grossProfit).toBe(
      Number((after.revenue.grossProfitBeforeReturns - after.returns.profitReversed).toFixed(2))
    );
  });

  it('#1 dashboard month profit reflects returns', () => {
    const variantId = makeVariant(400, 1200, 10);
    const sale = PosService.checkout(
      { items: [{ variantId, quantity: 2, unitPrice: 1200 }], payments: [{ method: 'CASH', amount: 2400 }] },
      staffId
    );
    const before = ReportService.getDashboardSummary().thisMonth;
    ReturnsService.processReturn(
      { originalSaleId: sale.id, refundMethod: 'CASH', items: [{ variantId, quantity: 2, refundUnitPrice: 0 }] },
      adminId
    );
    const after = ReportService.getDashboardSummary().thisMonth;
    // Whole sale returned: month sales -2400, month gross profit -(2400-800)=-1600.
    expect(Number((before.sales - after.sales).toFixed(2))).toBe(2400);
    expect(Number((before.grossProfit - after.grossProfit).toFixed(2))).toBe(1600);
  });

  // ── #5 — linked return honours the invoice-level discount ────────────────
  it('#5 refunds the amount actually paid, not the sum of line subtotals', () => {
    const variantId = makeVariant(500, 1000, 10);
    // 2 @ 1000 = 2000 gross, 400 invoice discount, no tax → net 1600.
    const sale = PosService.checkout(
      {
        items: [{ variantId, quantity: 2, unitPrice: 1000 }],
        overallDiscount: 400,
        payments: [{ method: 'CASH', amount: 1600 }],
      },
      staffId
    );
    expect(sale.net_total).toBe(1600);

    const ret = ReturnsService.processReturn(
      { originalSaleId: sale.id, refundMethod: 'CASH', items: [{ variantId, quantity: 2, refundUnitPrice: 9999 }] },
      adminId
    );
    // Full return === exactly what was paid, not 2000.
    expect(ret.total_refund_amount).toBe(1600);
  });

  // ── #8 — exchange settles only the difference ────────────────────────────
  it('#8 pricier exchange charges only the difference and applies trade-in credit', () => {
    const varA = makeVariant(500, 1000, 10);
    const varB = makeVariant(800, 1500, 10);
    const s1 = PosService.checkout(
      { items: [{ variantId: varA, quantity: 1, unitPrice: 1000 }], payments: [{ method: 'CASH', amount: 1000 }] },
      staffId
    );

    const result = ReturnsService.processExchange(
      {
        returnDetails: { originalSaleId: s1.id, refundMethod: 'CASH', items: [{ variantId: varA, quantity: 1, refundUnitPrice: 0 }] },
        newSaleDetails: { items: [{ variantId: varB, quantity: 1, unitPrice: 1500 }], payments: [{ method: 'CASH', amount: 1500 }] },
      },
      adminId
    );

    expect(result.differenceAmount).toBe(500);
    expect(result.appliedCredit).toBe(1000);
    expect(result.newSaleDetails.net_total).toBe(1500);
    expect(result.newSaleDetails.exchange_credit).toBe(1000);
    expect(result.newSaleDetails.paid_amount).toBe(500); // only the difference
    expect(result.newSaleDetails.change_due).toBe(0);
  });

  it('#8 cheaper exchange credits the customer the balance', () => {
    const varA = makeVariant(500, 1000, 10);
    const varB = makeVariant(800, 1500, 10);
    const customer = KhataService.createCustomer(
      { name: 'Exch Customer', phone: uniquePhone(), creditLimit: 50000 },
      adminId
    );
    const s2 = PosService.checkout(
      { customerId: customer.id, items: [{ variantId: varB, quantity: 1, unitPrice: 1500 }], payments: [{ method: 'CASH', amount: 1500 }] },
      staffId
    );

    const result = ReturnsService.processExchange(
      {
        returnDetails: { originalSaleId: s2.id, customerId: customer.id, refundMethod: 'CASH', items: [{ variantId: varB, quantity: 1, refundUnitPrice: 0 }] },
        newSaleDetails: { items: [{ variantId: varA, quantity: 1, unitPrice: 1000 }], payments: [{ method: 'CASH', amount: 1000 }] },
      },
      adminId
    );

    expect(result.differenceAmount).toBe(-500);
    expect(result.storeOwesCustomer).toBe(500);
    expect(result.newSaleDetails.paid_amount).toBe(0);
    expect(result.newSaleDetails.exchange_credit).toBe(1000);

    const bal = (getDb().prepare('SELECT current_balance FROM customers WHERE id = ?').get(customer.id) as any).current_balance;
    expect(bal).toBe(-500); // store owes the customer 500
  });
});
