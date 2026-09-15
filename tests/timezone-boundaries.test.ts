import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { CONFIG } from '../server/config/index.js';
import { ProductService } from '../server/services/product.service.js';
import { PosService } from '../server/services/pos.service.js';
import { ReportService } from '../server/services/report.service.js';
import { sqlLocal, localDateStr } from '../server/utils/time.js';

/**
 * QA — day/month report boundaries are the shop's wall clock (PKT, UTC+5),
 * not the UTC day. A sale at 00:30 PKT must land in that PKT day even though
 * its stored UTC timestamp is the previous calendar day.
 */
describe('Store-local report boundaries', () => {
  const OFF = CONFIG.STORE_TZ_OFFSET_HOURS;
  let adminId: string;
  let staffId: string;
  let categoryId: string;

  const toSqlUtc = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

  const pktToday = localDateStr();
  const pktYesterday = new Date(Date.parse(pktToday + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10);
  // 00:30 PKT today  ->  UTC instant
  const utcEarlyToday = toSqlUtc(Date.parse(pktToday + 'T00:30:00Z') - OFF * 3_600_000);
  // 23:30 PKT yesterday -> UTC instant
  const utcLateYesterday = toSqlUtc(Date.parse(pktYesterday + 'T23:30:00Z') - OFF * 3_600_000);

  const sell = (net: number) => {
    const p = ProductService.createProductWithVariants(
      {
        name: `TZ ${Math.random().toString(36).slice(2, 8)}`,
        categoryId,
        variants: [{ color: 'Blue', size: 'M', costPrice: 0, sellingPrice: net, stockQuantity: 5 }],
      },
      adminId
    );
    const sale = PosService.checkout(
      { items: [{ variantId: p.variants[0].id, quantity: 1, unitPrice: net }], payments: [{ method: 'CASH', amount: net }] },
      staffId
    );
    return sale.id;
  };

  beforeAll(() => {
    runMigrations();
    seedDatabase();
    const db = getDb();
    adminId = (db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").get() as any).id;
    staffId = (db.prepare("SELECT id FROM users WHERE role = 'STAFF'").get() as any).id;
    categoryId = (db.prepare('SELECT id FROM categories LIMIT 1').get() as any).id;
  });

  it('sqlLocal shifts by the configured offset', () => {
    expect(sqlLocal('created_at')).toBe(`datetime(created_at, '+${OFF} hours')`);
  });

  it("counts a 00:30 PKT sale in today's P&L and excludes a 23:30-yesterday one", () => {
    const db = getDb();
    const base = ReportService.getProfitAndLoss(pktToday, pktToday).revenue.netSalesBeforeReturns;

    const inWindow = sell(1000);
    const outOfWindow = sell(500);
    db.prepare('UPDATE sales SET created_at = ? WHERE id = ?').run(utcEarlyToday, inWindow);
    db.prepare('UPDATE sales SET created_at = ? WHERE id = ?').run(utcLateYesterday, outOfWindow);

    const after = ReportService.getProfitAndLoss(pktToday, pktToday).revenue.netSalesBeforeReturns;
    expect(Number((after - base).toFixed(2))).toBe(1000);
  });

  it("dashboard today's sales use the PKT day too", () => {
    const db = getDb();
    const base = ReportService.getDashboardSummary().today.sales;
    const id = sell(777);
    db.prepare('UPDATE sales SET created_at = ? WHERE id = ?').run(utcEarlyToday, id);
    const after = ReportService.getDashboardSummary().today.sales;
    expect(Number((after - base).toFixed(2))).toBe(777);
  });
});
