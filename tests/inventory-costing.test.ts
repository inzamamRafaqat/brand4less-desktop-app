import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { ProductService } from '../server/services/product.service.js';
import { SupplierService } from '../server/services/supplier.service.js';

/**
 * QA — WAC must reflect the purchase discount (landed cost), and a damaged
 * write-off must always hit the P&L even if the expense category was renamed.
 */
describe('Inventory costing', () => {
  let adminId: string;
  let categoryId: string;

  const makeVariant = (cost: number, price: number, stock: number) => {
    const p = ProductService.createProductWithVariants(
      {
        name: `Cost ${Math.random().toString(36).slice(2, 8)}`,
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
    categoryId = (db.prepare('SELECT id FROM categories LIMIT 1').get() as any).id;
  });

  it('applies the invoice discount to WAC landed cost, keeping purchase_items gross', () => {
    const variantId = makeVariant(0, 1000, 0);
    const supplier = SupplierService.createSupplier(
      { name: 'Costing Supplier', phone: `03${Math.floor(1e8 + Math.random() * 9e8)}` },
      adminId
    );
    // 10 @ 100 = 1000 gross, 200 invoice discount → landed 80/unit.
    const purchase = SupplierService.createPurchase(
      { supplierId: supplier.id, items: [{ variantId, quantity: 10, unitCost: 100 }], discount: 200 },
      adminId
    );
    expect(purchase.total_amount).toBe(800);

    const db = getDb();
    const variant = db.prepare('SELECT cost_price, stock_quantity FROM product_variants WHERE id = ?').get(variantId) as any;
    expect(variant.stock_quantity).toBe(10);
    expect(variant.cost_price).toBe(80); // landed, not 100

    const pi = db.prepare('SELECT unit_cost FROM purchase_items WHERE variant_id = ?').get(variantId) as any;
    expect(pi.unit_cost).toBe(100); // billed cost preserved on the line

    const mv = db
      .prepare("SELECT cost_per_unit FROM stock_movements WHERE variant_id = ? AND movement_type = 'PURCHASE'")
      .get(variantId) as any;
    expect(mv.cost_per_unit).toBe(80);
  });

  it('blends the landed cost into an existing WAC', () => {
    const variantId = makeVariant(100, 500, 10); // 10 @ 100
    const supplier = SupplierService.createSupplier(
      { name: 'Blend Supplier', phone: `03${Math.floor(1e8 + Math.random() * 9e8)}` },
      adminId
    );
    // buy 10 @ 300 with 500 discount → landed (300 * (1 - 500/3000)) = 250.
    // WAC = (10*100 + 10*250) / 20 = 175.
    SupplierService.createPurchase(
      { supplierId: supplier.id, items: [{ variantId, quantity: 10, unitCost: 300 }], discount: 500 },
      adminId
    );
    const cost = (getDb().prepare('SELECT cost_price FROM product_variants WHERE id = ?').get(variantId) as any).cost_price;
    expect(cost).toBe(175);
  });

  it('books a damaged write-off to an expense every time', () => {
    const variantId = makeVariant(500, 1200, 20);
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) c FROM expenses WHERE title LIKE 'Damaged Stock Write-off%'").get() as any).c;

    ProductService.adjustStock(variantId, 'DAMAGED_WRITE_OFF', -3, 'Flood damage', adminId);

    const rows = db
      .prepare("SELECT e.amount, ec.name FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id WHERE e.title LIKE ?")
      .all(`Damaged Stock Write-off:%`) as any[];
    const after = (db.prepare("SELECT COUNT(*) c FROM expenses WHERE title LIKE 'Damaged Stock Write-off%'").get() as any).c;
    expect(after).toBe(before + 1);
    const mine = rows.find((r) => Math.abs(r.amount - 1500) < 0.01);
    expect(mine).toBeTruthy();
    expect(/damage|shrinkage|wastage|write-off/i.test(mine.name)).toBe(true);
  });
});
