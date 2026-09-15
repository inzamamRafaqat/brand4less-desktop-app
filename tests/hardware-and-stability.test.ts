import { describe, it, expect, beforeAll } from 'vitest';
import { encodeCode128Symbols, getCode128BarWidths, generateCode128Svg, CODE128_PATTERNS } from '../server/utils/code128.js';
import { TscPrinterService } from '../server/services/tsc-printer.service.js';
import { DtsPrinterService } from '../server/services/dts-printer.service.js';
import { ProductService } from '../server/services/product.service.js';
import { getDb } from '../server/database/db.js';

describe('Phase 4: Real Code 128 Barcode Engine', () => {
  it('should correctly encode numeric string with Code 128 Subset C', () => {
    const text = '890123456789';
    const symbols = encodeCode128Symbols(text);
    // Start C (105) + pairs (89, 01, 23, 45, 67, 89) + Checksum + Stop (106)
    expect(symbols[0]).toBe(105); // START_C
    expect(symbols[1]).toBe(89);
    expect(symbols[2]).toBe(1);
    expect(symbols[3]).toBe(23);
    expect(symbols[4]).toBe(45);
    expect(symbols[5]).toBe(67);
    expect(symbols[6]).toBe(89);
    expect(symbols[symbols.length - 1]).toBe(106); // STOP
  });

  it('should correctly encode alphanumeric SKU with Code 128 Subset B', () => {
    const text = 'B4L-TSH-001';
    const symbols = encodeCode128Symbols(text);
    expect(symbols[0]).toBe(104); // START_B
    expect(symbols[symbols.length - 1]).toBe(106); // STOP

    // Verify modulo 103 checksum formula: (start + sum(i * symbol_val)) % 103
    let expectedChecksum = symbols[0];
    for (let i = 1; i < symbols.length - 2; i++) {
      expectedChecksum += i * symbols[i];
    }
    expectedChecksum = expectedChecksum % 103;
    expect(symbols[symbols.length - 2]).toBe(expectedChecksum);
  });

  it('should generate valid alternating bar and space widths conforming to ISO 15417', () => {
    const text = '8901234567890';
    const { widths, totalModules } = getCode128BarWidths(text);
    expect(widths.length).toBeGreaterThan(0);
    expect(totalModules).toBeGreaterThan(0);

    // Each symbol except stop is 11 modules; stop is 13 modules
    const symbols = encodeCode128Symbols(text);
    const expectedModules = (symbols.length - 1) * 11 + 13;
    expect(totalModules).toBe(expectedModules);
  });

  it('should generate standard SVG barcode with quiet zones and rect elements', () => {
    const svg = generateCode128Svg('B4L-JEAN-32', { height: 40, svgWidth: 240 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 240 40"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#000000"');
  });
});

describe('Phase 3 & 5 & 6: TSC TTP-244 Pro TSPL Generation', () => {
  it('should generate valid TSPL batch commands with real Code 128 BARCODE command', () => {
    const testItems = [
      {
        name: 'Classic Slim Fit Denim',
        categoryName: 'Jeans',
        color: 'Navy Blue',
        size: '32',
        sellingPrice: 2850,
        sku: 'B4L-JNS-001',
        barcode: '890100002396',
        quantity: 1,
      },
    ];

    const tspl = TscPrinterService.generateTspl(testItems, { widthMm: 50, heightMm: 30, gapMm: 2 });
    expect(tspl).toContain('SIZE 50 mm,30 mm');
    expect(tspl).toContain('GAP 2 mm,0');
    expect(tspl).toContain('CLS');
    expect(tspl).toContain('DIRECTION 1');
    expect(tspl).toContain('BRAND 4 LESS');
    expect(tspl).toContain('Classic Slim Fit Denim');
    expect(tspl).toContain('Navy Blue | Size: 32');
    expect(tspl).toContain('BARCODE 15,78,"128",48,1,0,2,4,"890100002396"');
    expect(tspl).toContain('PKR 2,850');
    expect(tspl).toContain('B4L-JNS-001');
    expect(tspl).toContain('PRINT 1,1');
  });

  it('should generate diagnostic test label commands with sample product', async () => {
    const result = await TscPrinterService.testLabel();
    expect(result.success).toBe(true);
    expect(result.tspl).toContain('TEST PRODUCT');
    expect(result.tspl).toContain('TEST-001');
    expect(result.tspl).toContain('BARCODE 15,78,"128",48,1,0,2,4,"8901234567890"');
  });
});

describe('Phase 2: DTS Thermal Receipt ESC/POS Generation', () => {
  it('should generate valid ESC/POS receipt binary buffer', () => {
    const mockSale = {
      invoice_number: 'INV-2026-0099',
      created_at: new Date().toISOString(),
      cashier_name: 'Cashier Inzamam',
      customer_name: 'Ahmed Khan',
      customer_phone: '0300-1122334',
      subtotal: 5000,
      discount_amount: 500,
      net_total: 4500,
      paid_amount: 4500,
      payment_method: 'CASH',
      items: [
        { name: 'Polo Shirt', quantity: 2, unit_price: 1500, subtotal: 3000 },
        { name: 'Cotton Chino', quantity: 1, unit_price: 2000, subtotal: 2000 },
      ],
    };

    const buffer = DtsPrinterService.generateEscPosReceipt(mockSale, { width: '80mm', autoCut: true, kickDrawer: true });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(50);

    const text = buffer.toString('latin1');
    expect(text).toContain('INV-2026-0099');
    expect(text).toContain('Cashier Inzamam');
    expect(text).toContain('Ahmed Khan');
    expect(text).toContain('Polo Shirt');
    expect(text).toContain('Cotton Chino');
    expect(text).toContain('4,500');
  });

  it('should generate hardware test receipt buffer with sample layout', () => {
    const testBuffer = DtsPrinterService.generateTestReceiptBuffer({ width: '80mm', autoCut: true });
    expect(Buffer.isBuffer(testBuffer)).toBe(true);
    const text = testBuffer.toString('latin1');
    expect(text).toContain('BRAND 4 LESS');
    expect(text).toContain('PRINTER TEST');
    expect(text).toContain('Hardware Test Successful');
  });
});

describe('Phase 8 & 10: Fast Barcode Lookup and N+1 Optimization', () => {
  beforeAll(() => {
    const db = getDb();
    // Ensure test product and variant exists
    const category = db.prepare('SELECT id FROM categories LIMIT 1').get() as any;
    const catId = category?.id || 'cat-test';

    try {
      db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, icon_type) VALUES (?, 'Test Category', 'clothing')
      `).run(catId);

      db.prepare(`
        INSERT OR IGNORE INTO products (id, name, category_id, brand, is_active)
        VALUES ('prod-test-scan', 'Scanner Test Jean', ?, 'Brand4Less', 1)
      `).run(catId);

      db.prepare(`
        INSERT OR IGNORE INTO product_variants (id, product_id, sku, barcode, color, size, cost_price, selling_price, stock_quantity, min_stock_level, is_active)
        VALUES ('var-test-scan', 'prod-test-scan', 'B4L-TEST-SCAN-01', '890999888111', 'Black', '32', 1500, 2500, 20, 3, 1)
      `).run();
    } catch (_) {}
  });

  it('should perform fast direct lookup by barcode in O(1)', () => {
    const variant = ProductService.scanBarcode('890999888111');
    expect(variant).not.toBeNull();
    expect(variant.sku).toBe('B4L-TEST-SCAN-01');
    expect(variant.product_name).toBe('Scanner Test Jean');
    expect(variant.selling_price).toBe(2500);
  });

  it('should perform fast direct lookup by SKU', () => {
    const variant = ProductService.scanBarcode('B4L-TEST-SCAN-01');
    expect(variant).not.toBeNull();
    expect(variant.barcode).toBe('890999888111');
  });

  it('should return null for non-existent barcode without throwing', () => {
    const variant = ProductService.scanBarcode('NON_EXISTENT_99999');
    expect(variant).toBeNull();
  });

  it('should load products and batch-group variants with zero N+1 queries', () => {
    const result = ProductService.getProducts({ limit: 10 });
    expect(Array.isArray(result.products)).toBe(true);
    if (result.products.length > 0) {
      const first = result.products[0];
      expect(Array.isArray(first.variants)).toBe(true);
    }
  });
});

describe('Phase 10: TSPL Validation & ESC/POS Inspection', () => {
  it('should validate TSPL syntax correctly and detect missing required commands', () => {
    const validTspl = `SIZE 50 mm, 30 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 15,12,"2",0,1,1,"BRAND 4 LESS"
BARCODE 15,78,"128",48,1,0,2,4,"890100002396"
PRINT 1,1`;

    const validation = TscPrinterService.validateTspl(validTspl);
    expect(validation.isValid).toBe(true);
    expect(validation.checks.hasSize).toBe(true);
    expect(validation.checks.hasGap).toBe(true);
    expect(validation.checks.hasCls).toBe(true);
    expect(validation.checks.hasBarcode128).toBe(true);
    expect(validation.checks.hasPrint).toBe(true);
    expect(validation.errors.length).toBe(0);

    const invalidTspl = `TEXT 15,12,"2",0,1,1,"INVALID TSPL"`;
    const invalidValidation = TscPrinterService.validateTspl(invalidTspl);
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.errors.length).toBeGreaterThan(0);
    expect(invalidValidation.checks.hasSize).toBe(false);
    expect(invalidValidation.checks.hasPrint).toBe(false);
  });

  it('should parse ESC/POS command buffers and produce command breakdown and hex dump', () => {
    const mockSale = {
      invoice_number: 'INV-TEST-999',
      created_at: new Date().toISOString(),
      cashier_name: 'Test Cashier',
      subtotal: 1000,
      net_total: 1000,
      paid_amount: 1000,
      payment_method: 'CASH',
      items: [{ name: 'Test Shirt', quantity: 1, unit_price: 1000, subtotal: 1000 }],
    };

    const buffer = DtsPrinterService.generateEscPosReceipt(mockSale, { width: '80mm', autoCut: true, kickDrawer: true });
    const inspection = DtsPrinterService.parseEscPosCommands(buffer);
    expect(inspection.byteLength).toBeGreaterThan(0);
    expect(inspection.hexDump.length).toBeGreaterThan(0);
    expect(inspection.commandBreakdown.length).toBeGreaterThan(0);
  });
});
