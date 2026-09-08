import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { ProductService } from '../server/services/product.service.js';
import { PosService } from '../server/services/pos.service.js';
import { ReturnsService } from '../server/services/returns.service.js';
import { AuthService } from '../server/services/auth.service.js';

describe('Security & integrity hardening', () => {
  let adminId: string;
  let staffId: string;
  let categoryId: string;

  beforeAll(() => {
    runMigrations();
    seedDatabase();
    const db = getDb();
    adminId = (db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").get() as any).id;
    staffId = (db.prepare("SELECT id FROM users WHERE role = 'STAFF'").get() as any).id;
    categoryId = (db.prepare('SELECT id FROM categories LIMIT 1').get() as any).id;
  });

  it('stores POS PINs as bcrypt hashes, not plaintext', () => {
    const db = getDb();
    const pins = db
      .prepare("SELECT pin_code FROM users WHERE pin_code IS NOT NULL AND pin_code != ''")
      .all() as { pin_code: string }[];
    expect(pins.length).toBeGreaterThan(0);
    for (const { pin_code } of pins) {
      expect(pin_code).toMatch(/^\$2[aby]\$/);
    }
  });

  it('verifies a seeded admin PIN via hash comparison and rejects wrong PINs', () => {
    expect(AuthService.verifyAdminPin('1234')).toBe(true);
    expect(AuthService.verifyAdminPin('0000')).toBe(false); // cashier PIN, not admin/manager
    expect(AuthService.verifyAdminPin('abcd')).toBe(false);
    expect(AuthService.loginWithPin('1234').user.role).toBe('ADMIN');
    expect(() => AuthService.loginWithPin('9998')).toThrow();
  });

  it('never returns PIN hashes from the user list', () => {
    const users = AuthService.getUsers();
    for (const u of users) {
      expect(u.pin_code).toBeUndefined();
      expect(typeof u.hasPin).toBe('boolean');
    }
  });

  it('rejects checkout lines with non-positive or fractional quantities', () => {
    const product = ProductService.createProductWithVariants(
      {
        name: 'Guard Test Tee',
        categoryId,
        variants: [{ color: 'Black', size: 'M', costPrice: 500, sellingPrice: 1000, stockQuantity: 20 }],
      },
      adminId
    );
    const variantId = product.variants[0].id;

    expect(() =>
      PosService.checkout(
        { items: [{ variantId, quantity: -3, unitPrice: 1000 }], payments: [{ method: 'CASH', amount: 1 }] },
        staffId
      )
    ).toThrow(/positive whole-number quantity/);

    expect(() =>
      PosService.checkout(
        { items: [{ variantId, quantity: 1.5, unitPrice: 1000 }], payments: [{ method: 'CASH', amount: 2000 }] },
        staffId
      )
    ).toThrow();

    // Stock must be untouched by the rejected attempts.
    const stock = (getDb().prepare('SELECT stock_quantity FROM product_variants WHERE id = ?').get(variantId) as any)
      .stock_quantity;
    expect(stock).toBe(20);
  });

  it('caps a linked return to quantity actually sold and to the price actually paid', () => {
    const product = ProductService.createProductWithVariants(
      {
        name: 'Return Guard Polo',
        categoryId,
        variants: [{ color: 'Red', size: 'L', costPrice: 800, sellingPrice: 2000, stockQuantity: 10 }],
      },
      adminId
    );
    const variantId = product.variants[0].id;

    const sale = PosService.checkout(
      { items: [{ variantId, quantity: 2, unitPrice: 2000, discountAmount: 400 }], payments: [{ method: 'CASH', amount: 3600 }] },
      staffId
    );

    // Attempt to return 5 (only 2 sold) → rejected.
    expect(() =>
      ReturnsService.processReturn(
        {
          originalSaleId: sale.id,
          refundMethod: 'CASH',
          items: [{ variantId, quantity: 5, refundUnitPrice: 999999 }],
        },
        adminId
      )
    ).toThrow(/exceeds what was sold/);

    // Return 1 at an absurd requested price → refund uses the effective paid price (1800), not 999999.
    const ret = ReturnsService.processReturn(
      {
        originalSaleId: sale.id,
        refundMethod: 'CASH',
        items: [{ variantId, quantity: 1, refundUnitPrice: 999999 }],
      },
      adminId
    );
    expect(ret.total_refund_amount).toBe(1800);

    // A second return of 2 more now exceeds remaining (1 left) → rejected.
    expect(() =>
      ReturnsService.processReturn(
        { originalSaleId: sale.id, refundMethod: 'CASH', items: [{ variantId, quantity: 2, refundUnitPrice: 1800 }] },
        adminId
      )
    ).toThrow(/exceeds what was sold/);
  });

  it('bulk import commit will not accept pre-parsed client rows (re-validates from file)', async () => {
    const { ImportService } = await import('../server/services/import.service.js');
    await expect(
      // Old, unsafe call shape: an array of "already valid" rows.
      ImportService.commitBulkImport([{ isValid: true } as any], adminId)
    ).rejects.toThrow(/original file reference/);
  });

  it('sanitises low-level errors but passes deliberate ones through', async () => {
    const { clientMessage } = await import('../server/utils/errors.js');

    expect(clientMessage(new Error('Insufficient stock for "Polo".'))).toBe('Insufficient stock for "Polo".');

    const sqliteErr = Object.assign(new Error('UNIQUE constraint failed: users.username'), {
      name: 'SqliteError',
      code: 'SQLITE_CONSTRAINT_UNIQUE',
    });
    const msg = clientMessage(sqliteErr);
    expect(msg).not.toMatch(/users\.username|constraint/i);
    expect(msg).toBe('A record with these details already exists.');

    expect(clientMessage(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(
      'Something went wrong. Please try again.'
    );
    expect(clientMessage('a bare string')).toBe('Something went wrong. Please try again.');
  });

  it('allows STAFF to VIEW_SALES while restricting VIEW_FINANCIAL_REPORTS', async () => {
    const { hasPermission } = await import('../server/domain/rbac.js');
    expect(hasPermission('STAFF', 'VIEW_SALES')).toBe(true);
    expect(hasPermission('MANAGER', 'VIEW_SALES')).toBe(true);
    expect(hasPermission('ADMIN', 'VIEW_SALES')).toBe(true);
    expect(hasPermission('STAFF', 'VIEW_FINANCIAL_REPORTS')).toBe(false);
  });

  it('allows STAFF to access /api/sales route while blocking financial reports', async () => {
    const request = (await import('supertest')).default;
    const { createApp } = await import('../server/app.js');
    const { AuthService } = await import('../server/services/auth.service.js');

    const app = createApp();
    // Cashier login
    const staffLogin = AuthService.login('cashier', 'staff123');
    const staffToken = staffLogin.token;

    // Staff can access /api/sales
    const salesRes = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(salesRes.status).toBe(200);
    expect(salesRes.body.success).toBe(true);

    // Staff cannot access /api/reports/profit-loss (requires VIEW_FINANCIAL_REPORTS)
    const reportRes = await request(app)
      .get('/api/reports/profit-loss')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(reportRes.status).toBe(403);
  });

  it('supports root /api/login and /api/login-pin route aliases', async () => {
    const request = (await import('supertest')).default;
    const { createApp } = await import('../server/app.js');

    const app = createApp();

    const loginRes = await request(app)
      .post('/api/login')
      .send({ username: 'cashier', password: 'staff123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeDefined();

    const pinRes = await request(app)
      .post('/api/login-pin')
      .send({ pin: '0000' });
    expect(pinRes.status).toBe(200);
    expect(pinRes.body.success).toBe(true);
    expect(pinRes.body.token).toBeDefined();
  });

  it('flags default seeded accounts with mustChangePassword and enforces password change workflow', async () => {
    const request = (await import('supertest')).default;
    const { createApp } = await import('../server/app.js');
    const { AuthService } = await import('../server/services/auth.service.js');
    const { getDb } = await import('../server/database/db.js');

    const app = createApp();

    // 1. Login with seeded admin account returns mustChangePassword
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    const token = loginRes.body.token;

    // 2. Reject change-password if current password wrong
    const wrongCurrentRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'BrandNewPassword2026!' });
    expect(wrongCurrentRes.status).toBe(400);
    expect(wrongCurrentRes.body.message).toMatch(/Current password is incorrect/i);

    // 3. Reject change-password if new password is too short (< 8 chars)
    const shortRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'short' });
    expect(shortRes.status).toBe(400);
    expect(shortRes.body.message).toMatch(/at least 8 characters/i);

    // 4. Reject change-password if new password is identical to current
    const sameRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'admin123' });
    expect(sameRes.status).toBe(400);
    expect(sameRes.body.message).toMatch(/different from current/i);

    // 5. Successfully update password
    const successRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'StrongAdminPassword2026!' });
    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);

    // 6. Next login reflects mustChangePassword = false
    const reloginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'StrongAdminPassword2026!' });
    expect(reloginRes.status).toBe(200);
    expect(reloginRes.body.user.mustChangePassword).toBe(false);

    // Restore admin password for any subsequent test suites
    const db = getDb();
    const adminHash = (await import('bcryptjs')).default.hashSync('admin123', 10);
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE username = 'admin'").run(adminHash);
  });
});

