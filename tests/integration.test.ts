import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { ProductService } from '../server/services/product.service.js';
import { PosService } from '../server/services/pos.service.js';
import { ReturnsService } from '../server/services/returns.service.js';
import { KhataService } from '../server/services/khata.service.js';
import { SupplierService } from '../server/services/supplier.service.js';
import { ExpenseService } from '../server/services/expense.service.js';
import { ReportService } from '../server/services/report.service.js';
import { hasPermission } from '../server/domain/rbac.js';

describe('Brand 4 Less — Enterprise System Integration Tests', () => {
  let adminUser: any;
  let staffUser: any;
  let testCategory: any;
  let testProduct: any;
  let testVariant: any;
  let testCustomer: any;
  let testSupplier: any;

  beforeAll(() => {
    runMigrations();
    seedDatabase();

    const db = getDb();
    adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN'").get();
    staffUser = db.prepare("SELECT * FROM users WHERE role = 'STAFF'").get();
    testCategory = db.prepare('SELECT * FROM categories LIMIT 1').get();
  });

  describe('1. RBAC & Security Matrix', () => {
    it('should grant ADMIN full permissions and restrict sensitive actions for STAFF', () => {
      expect(hasPermission('ADMIN', 'MANAGE_PRODUCTS')).toBe(true);
      expect(hasPermission('ADMIN', 'APPROVE_SALARIES')).toBe(true);
      expect(hasPermission('ADMIN', 'VIEW_FINANCIAL_REPORTS')).toBe(true);

      expect(hasPermission('STAFF', 'POS_CHECKOUT')).toBe(true);
      expect(hasPermission('STAFF', 'VIEW_PRODUCTS')).toBe(true);
      expect(hasPermission('STAFF', 'APPROVE_SALARIES')).toBe(false);
      expect(hasPermission('STAFF', 'VIEW_FINANCIAL_REPORTS')).toBe(false);
      expect(hasPermission('STAFF', 'ADJUST_STOCK')).toBe(false);
      expect(hasPermission('STAFF', 'DELETE_PRODUCTS')).toBe(false);
    });
  });

  describe('2. Product & Inventory Management', () => {
    it('should create a product with multiple variants and initial opening stock', () => {
      testProduct = ProductService.createProductWithVariants(
        {
          name: 'Classic Oxford Casual Shirt',
          categoryId: testCategory.id,
          brand: 'Brand 4 Less',
          origin: 'Imported',
          variants: [
            { color: 'Sky Blue', size: 'M', costPrice: 1200, sellingPrice: 2200, stockQuantity: 15 },
            { color: 'Sky Blue', size: 'L', costPrice: 1200, sellingPrice: 2200, stockQuantity: 20 },
            { color: 'White', size: 'M', costPrice: 1200, sellingPrice: 2200, stockQuantity: 10 },
          ],
        },
        adminUser.id
      );

      expect(testProduct).toBeDefined();
      expect(testProduct.name).toBe('Classic Oxford Casual Shirt');
      expect(testProduct.variants.length).toBe(3);

      testVariant = testProduct.variants[0];
      expect(testVariant.sku).toBeDefined();
      expect(testVariant.stock_quantity).toBe(15);
      expect(testVariant.cost_price).toBe(1200);
      expect(testVariant.selling_price).toBe(2200);
    });

    it('should record opening stock movement in audit trail', () => {
      const db = getDb();
      const movement = db.prepare("SELECT * FROM stock_movements WHERE variant_id = ? AND movement_type = 'OPENING_STOCK'").get(testVariant.id) as any;
      expect(movement).toBeDefined();
      expect(movement.quantity_change).toBe(15);
      expect(movement.resulting_stock).toBe(15);
    });

    it('should adjust stock for damaged goods and record cost', () => {
      const adj = ProductService.adjustStock(testVariant.id, 'DAMAGED_WRITE_OFF', -2, 'Water damage during handling', adminUser.id);
      expect(adj.newStock).toBe(13);

      const db = getDb();
      const updated = db.prepare('SELECT stock_quantity FROM product_variants WHERE id = ?').get(testVariant.id) as any;
      expect(updated.stock_quantity).toBe(13);
    });
  });

  describe('3. Customer & Khata Double-Entry Ledger', () => {
    it('should create customer profile with credit limit', () => {
      const uniquePhone = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
      testCustomer = KhataService.createCustomer(
        {
          name: 'Haji Muhammad Aslam',
          phone: uniquePhone,
          cnic: '35201-1234567-1',
          creditLimit: 50000,
        },
        adminUser.id
      );

      expect(testCustomer).toBeDefined();
      expect(testCustomer.phone).toBe(uniquePhone);
      expect(testCustomer.current_balance).toBe(0);
    });
  });

  describe('4. POS Checkout & Inventory Decrement', () => {
    let completedSale: any;

    it('should complete sale with split payment (Cash + Khata Credit), deduct stock, and capture profit', () => {
      // Selling 3 units of testVariant @ 2200 = 6600. Discount 600 -> Net Total = 6000.
      // Payment: 2000 Cash, 4000 Khata Credit.
      // Cost: 3 * 1200 = 3600. Profit: 6000 - 3600 = 2400.
      completedSale = PosService.checkout(
        {
          customerId: testCustomer.id,
          items: [{ variantId: testVariant.id, quantity: 3, unitPrice: 2200, discountAmount: 600 }],
          payments: [
            { method: 'CASH', amount: 2000 },
            { method: 'KHATA', amount: 4000 },
          ],
        },
        staffUser.id
      );

      expect(completedSale).toBeDefined();
      expect(completedSale.invoice_number).toMatch(/^INV-/);
      expect(completedSale.net_total).toBe(6000);
      expect(completedSale.total_cost).toBe(3600);
      expect(completedSale.total_profit).toBe(2400);
      expect(completedSale.khata_amount).toBe(4000);

      // Verify variant inventory decremented from 13 to 10
      const db = getDb();
      const variant = db.prepare('SELECT stock_quantity FROM product_variants WHERE id = ?').get(testVariant.id) as any;
      expect(variant.stock_quantity).toBe(10);

      // Verify Customer Khata updated
      const customer = db.prepare('SELECT current_balance FROM customers WHERE id = ?').get(testCustomer.id) as any;
      expect(customer.current_balance).toBe(4000);

      // Verify Khata Ledger entry
      const ledgerEntry = db.prepare("SELECT * FROM customer_khata_ledger WHERE customer_id = ? AND entry_type = 'SALE_CREDIT'").get(testCustomer.id) as any;
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.debit).toBe(4000);
      expect(ledgerEntry.running_balance).toBe(4000);
    });

    it('should record customer payment reducing Khata balance', () => {
      const payResult = KhataService.recordPayment(testCustomer.id, 2500, 'CASH', 'Partial cash payment', staffUser.id);
      expect(payResult.newBalance).toBe(1500);

      const db = getDb();
      const customer = db.prepare('SELECT current_balance FROM customers WHERE id = ?').get(testCustomer.id) as any;
      expect(customer.current_balance).toBe(1500);
    });
  });

  describe('5. Returns & Exchanges Logic', () => {
    it('should process return, restore stock, and credit customer Khata', () => {
      const returnResult = ReturnsService.processReturn(
        {
          customerId: testCustomer.id,
          refundMethod: 'KHATA_CREDIT',
          items: [{ variantId: testVariant.id, quantity: 1, refundUnitPrice: 2000, reason: 'Size mismatch' }],
        },
        adminUser.id
      );

      expect(returnResult).toBeDefined();
      expect(returnResult.total_refund_amount).toBe(2000);

      // Stock should increase from 10 to 11
      const db = getDb();
      const variant = db.prepare('SELECT stock_quantity FROM product_variants WHERE id = ?').get(testVariant.id) as any;
      expect(variant.stock_quantity).toBe(11);

      // Customer Khata should be credited: 1500 - 2000 = -500 (store owes customer 500)
      const customer = db.prepare('SELECT current_balance FROM customers WHERE id = ?').get(testCustomer.id) as any;
      expect(customer.current_balance).toBe(-500);
    });
  });

  describe('6. Supplier Purchases & WAC Cost Recalculation', () => {
    it('should create supplier, record purchase, increment inventory, and recalculate WAC cost', () => {
      testSupplier = SupplierService.createSupplier(
        {
          name: 'Lahore Fabrics & Apparel',
          phone: '03215551234',
          companyName: 'Lahore Fabrics Ltd',
        },
        adminUser.id
      );

      // Existing stock: 11 units @ 1200 cost = 13200 value.
      // Purchase: 19 units @ 1500 cost = 28500 value.
      // Total value = 41700 / 30 units = 1390 WAC cost!
      const purchase = SupplierService.createPurchase(
        {
          supplierId: testSupplier.id,
          items: [{ variantId: testVariant.id, quantity: 19, unitCost: 1500 }],
          discount: 0,
          paidAmount: 10000,
          paymentMethod: 'BANK_TRANSFER',
        },
        adminUser.id
      );

      expect(purchase).toBeDefined();
      expect(purchase.total_amount).toBe(28500);
      expect(purchase.balance_due).toBe(18500);

      // Check recalculated WAC cost and new stock
      const db = getDb();
      const variant = db.prepare('SELECT stock_quantity, cost_price FROM product_variants WHERE id = ?').get(testVariant.id) as any;
      expect(variant.stock_quantity).toBe(30);
      expect(variant.cost_price).toBe(1390);

      // Check supplier payable: 18500
      const supplier = db.prepare('SELECT current_payable FROM suppliers WHERE id = ?').get(testSupplier.id) as any;
      expect(supplier.current_payable).toBe(18500);
    });
  });

  describe('7. Expenses & Staff Salaries Workflow', () => {
    it('should create employee, generate payroll, approve salary and auto-post to expenses', () => {
      const emp = ExpenseService.createEmployee(
        {
          name: 'Bilal Ahmed',
          phone: '03331112233',
          designation: 'Sales Cashier',
          monthlySalary: 35000,
          joiningDate: '2026-01-01',
        },
        adminUser.id
      );

      const payroll = ExpenseService.generateMonthlyPayroll('2026-08', adminUser.id);
      expect(payroll.generatedCount).toBeGreaterThanOrEqual(1);

      const db = getDb();
      const disb = db.prepare("SELECT * FROM salary_disbursements WHERE employee_id = ? AND month_year = '2026-08'").get(emp.id) as any;
      expect(disb.status).toBe('PENDING');

      // Approve salary with 2000 bonus
      const approved = ExpenseService.approveSalary(disb.id, 2000, 0, 'CASH', adminUser.id);
      expect(approved.netSalary).toBe(37000);
      expect(approved.status).toBe('DISBURSED');

      // Verify auto-created expense
      const expense = db.prepare("SELECT * FROM expenses WHERE title LIKE '%Bilal Ahmed%'").get() as any;
      expect(expense).toBeDefined();
      expect(expense.amount).toBe(37000);
    });
  });

  describe('8. Reporting & P&L Engine', () => {
    it('should generate accurate Executive Dashboard metrics and Profit & Loss report', () => {
      const dashboard = ReportService.getDashboardSummary();
      expect(dashboard).toBeDefined();
      expect(dashboard.operational.inventoryCostValue).toBeGreaterThan(0);
      expect(dashboard.operational.inventoryRetailValue).toBeGreaterThan(0);

      const pnl = ReportService.getProfitAndLoss();
      expect(pnl).toBeDefined();
      expect(pnl.revenue.grossSales).toBeGreaterThan(0);
      expect(pnl.expenses.totalExpenses).toBeGreaterThan(0);
    });
  });
});
