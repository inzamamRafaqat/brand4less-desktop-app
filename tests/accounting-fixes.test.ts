import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { ProductService } from '../server/services/product.service.js';
import { PosService } from '../server/services/pos.service.js';
import { KhataService } from '../server/services/khata.service.js';
import { SupplierService } from '../server/services/supplier.service.js';
import { calculateSaleTotals } from '../server/domain/calculation.js';

/**
 * Regression coverage for the contained calculation / accounting fixes
 * (QA batch 2026-09-02, items #2, #3, #7, #9, #10).
 */
describe('Accounting integrity fixes', () => {
  let adminId: string;
  let staffId: string;
  let categoryId: string;

  const uniquePhone = () => `03${Math.floor(100000000 + Math.random() * 899999999)}`;

  const makeVariant = (costPrice: number, sellingPrice: number, stock: number) => {
    const product = ProductService.createProductWithVariants(
      {
        name: `AcctFix ${Math.random().toString(36).slice(2, 8)}`,
        categoryId,
        variants: [{ color: 'Black', size: 'M', costPrice, sellingPrice, stockQuantity: stock }],
      },
      adminId
    );
    return product.variants[0].id;
  };

  beforeAll(() => {
    runMigrations();
    seedDatabase();
    const db = getDb();
    adminId = (db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").get() as any).id;
    staffId = (db.prepare("SELECT id FROM users WHERE role = 'STAFF'").get() as any).id;
    categoryId = (db.prepare('SELECT id FROM categories LIMIT 1').get() as any).id;
  });

  // ── #3 — line & invoice discount capping ──────────────────────────────────
  describe('#3 discount capping', () => {
    it('caps a line discount at the line gross in the aggregate totals', () => {
      const sale = calculateSaleTotals(
        [{ variantId: 'v1', quantity: 2, unitPrice: 1000, unitCost: 600, discountAmount: 5000 }],
        0,
        0
      );
      // Line gross 2000; discount capped to 2000, not 5000.
      expect(sale.itemDiscountsTotal).toBe(2000);
      expect(sale.totalDiscount).toBe(2000);
      expect(sale.items[0].discountAmount).toBe(2000);
      expect(sale.netTotal).toBe(0);
      expect(sale.subtotal).toBe(2000);
    });

    it('caps the invoice-level discount at the remaining gross', () => {
      const sale = calculateSaleTotals(
        [{ variantId: 'v1', quantity: 1, unitPrice: 1000, unitCost: 400, discountAmount: 100 }],
        99999,
        0
      );
      // Remaining gross after the 100 line discount is 900.
      expect(sale.overallDiscount).toBe(900);
      expect(sale.totalDiscount).toBe(1000);
      expect(sale.netTotal).toBe(0);
      expect(sale.totalProfit).toBe(-400); // profit floored by cost, never below -cost
    });

    it('persists a capped discount_amount that never exceeds sale subtotal', () => {
      const variantId = makeVariant(600, 1000, 20);
      const sale = PosService.checkout(
        {
          items: [{ variantId, quantity: 2, unitPrice: 1000, discountAmount: 999999 }],
          payments: [{ method: 'CASH', amount: 1 }],
        },
        staffId
      );
      expect(sale.discount_amount).toBeLessThanOrEqual(sale.subtotal);
      expect(sale.net_total).toBe(0);
    });
  });

  // ── #2 — overpayment is change, not revenue ───────────────────────────────
  describe('#2 overpayment handling', () => {
    it('records change_due and never books paid_amount above what is owed', () => {
      const variantId = makeVariant(500, 1000, 10);
      const sale = PosService.checkout(
        {
          items: [{ variantId, quantity: 1, unitPrice: 1000 }],
          payments: [{ method: 'CASH', amount: 1500 }],
        },
        staffId
      );
      expect(sale.net_total).toBe(1000);
      expect(sale.paid_amount).toBe(1000);
      expect(sale.change_due).toBe(500);
    });

    it('leaves change_due at 0 for an exact tender', () => {
      const variantId = makeVariant(500, 1000, 10);
      const sale = PosService.checkout(
        {
          items: [{ variantId, quantity: 1, unitPrice: 1000 }],
          payments: [{ method: 'CASH', amount: 1000 }],
        },
        staffId
      );
      expect(sale.paid_amount).toBe(1000);
      expect(sale.change_due).toBe(0);
    });
  });

  // ── #7 — credit limit of 0 means no Khata, not unlimited ──────────────────
  describe('#7 Khata credit-limit enforcement', () => {
    it('rejects a credit sale to a customer with no credit limit set', () => {
      const customer = KhataService.createCustomer(
        { name: 'No Limit Customer', phone: uniquePhone(), creditLimit: 0 },
        adminId
      );
      const variantId = makeVariant(500, 1000, 10);

      expect(() =>
        PosService.checkout(
          {
            customerId: customer.id,
            items: [{ variantId, quantity: 1, unitPrice: 1000 }],
            payments: [{ method: 'KHATA', amount: 1000 }],
          },
          staffId
        )
      ).toThrow(/no Khata credit limit/i);
    });

    it('still allows a credit sale within an explicit limit', () => {
      const customer = KhataService.createCustomer(
        { name: 'Limited Customer', phone: uniquePhone(), creditLimit: 5000 },
        adminId
      );
      const variantId = makeVariant(500, 1000, 10);
      const sale = PosService.checkout(
        {
          customerId: customer.id,
          items: [{ variantId, quantity: 1, unitPrice: 1000 }],
          payments: [{ method: 'KHATA', amount: 1000 }],
        },
        staffId
      );
      expect(sale.khata_amount).toBe(1000);
    });
  });

  // ── #9 — supplier overpayment cannot corrupt the payable ──────────────────
  describe('#9 supplier payable integrity', () => {
    it('rejects a standalone payment larger than the outstanding payable', () => {
      const supplier = SupplierService.createSupplier(
        { name: 'Acct Supplier A', phone: uniquePhone() },
        adminId
      );
      const variantId = makeVariant(500, 1000, 0);
      SupplierService.createPurchase(
        { supplierId: supplier.id, items: [{ variantId, quantity: 10, unitCost: 500 }] },
        adminId
      );
      // Payable is 5000.
      expect(() =>
        SupplierService.recordPayment(supplier.id, 8000, 'CASH', 'overpay', adminId)
      ).toThrow(/exceeds the outstanding payable/i);
    });

    it('rejects paying more than the bill at purchase time', () => {
      const supplier = SupplierService.createSupplier(
        { name: 'Acct Supplier B', phone: uniquePhone() },
        adminId
      );
      const variantId = makeVariant(500, 1000, 0);
      expect(() =>
        SupplierService.createPurchase(
          {
            supplierId: supplier.id,
            items: [{ variantId, quantity: 10, unitCost: 500 }],
            paidAmount: 9000,
          },
          adminId
        )
      ).toThrow(/exceeds the purchase total/i);
    });

    it('keeps the ledger running_payable in lockstep with current_payable', () => {
      const supplier = SupplierService.createSupplier(
        { name: 'Acct Supplier C', phone: uniquePhone() },
        adminId
      );
      const variantId = makeVariant(500, 1000, 0);
      SupplierService.createPurchase(
        {
          supplierId: supplier.id,
          items: [{ variantId, quantity: 10, unitCost: 500 }],
          paidAmount: 2000,
        },
        adminId
      );
      SupplierService.recordPayment(supplier.id, 1000, 'CASH', 'partial', adminId);

      const db = getDb();
      const row = db
        .prepare('SELECT current_payable FROM suppliers WHERE id = ?')
        .get(supplier.id) as any;
      const lastLedger = db
        .prepare(
          'SELECT running_payable FROM supplier_ledger WHERE supplier_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1'
        )
        .get(supplier.id) as any;
      expect(row.current_payable).toBe(2000); // 5000 bill - 2000 - 1000
      expect(lastLedger.running_payable).toBe(row.current_payable);
    });
  });

  // ── #10 — date-ranged Khata statement reconciles ─────────────────────────
  describe('#10 Khata statement reconciliation', () => {
    it('returns an opening balance and a closing balance that reconcile the period', () => {
      const customer = KhataService.createCustomer(
        { name: 'Statement Customer', phone: uniquePhone(), creditLimit: 100000 },
        adminId
      );
      const variantId = makeVariant(500, 1000, 50);

      // Two credit sales + one payment.
      PosService.checkout(
        {
          customerId: customer.id,
          items: [{ variantId, quantity: 2, unitPrice: 1000 }],
          payments: [{ method: 'KHATA', amount: 2000 }],
        },
        staffId
      );
      PosService.checkout(
        {
          customerId: customer.id,
          items: [{ variantId, quantity: 1, unitPrice: 1000 }],
          payments: [{ method: 'KHATA', amount: 1000 }],
        },
        staffId
      );
      KhataService.recordPayment(customer.id, 1200, 'CASH', 'part payment', staffId);

      const full = KhataService.getCustomerLedger(customer.id);
      expect(full.openingBalance).toBe(0);
      expect(
        Number((full.openingBalance + full.totalDebit - full.totalCredit).toFixed(2))
      ).toBe(full.closingBalance);
      expect(full.closingBalance).toBe(full.currentBalance);

      // A window starting in the future contains no rows but still reconciles:
      // opening carries the whole balance, closing equals it.
      const future = KhataService.getCustomerLedger(customer.id, '2099-01-01', '2099-12-31');
      expect(future.entries.length).toBe(0);
      expect(future.totalDebit).toBe(0);
      expect(future.totalCredit).toBe(0);
      expect(future.openingBalance).toBe(full.currentBalance);
      expect(future.closingBalance).toBe(full.currentBalance);
    });
  });
});
