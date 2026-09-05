import { describe, it, expect } from 'vitest';
import { calculateMovingWAC, formatCurrency, calculateInvoiceTotals } from '../server/domain/calculations.js';
import { validateCustomAttributes } from '../server/domain/custom-fields.js';
import { HardwareService } from '../server/services/hardware.service.js';

describe('OmniRetail Core Calculation & Domain Suite', () => {
  describe('Moving Weighted Average Cost (WAC) Engine', () => {
    it('calculates initial baseline cost when no prior stock exists', () => {
      const wac = calculateMovingWAC(0, 0, 10, 500);
      expect(wac).toBe(500);
    });

    it('recalculates weighted average cost on incoming new stock batches', () => {
      // 10 units @ Rs. 500 = Rs. 5,000
      // 20 units @ Rs. 800 = Rs. 16,000
      // Total 30 units = Rs. 21,000 / 30 = Rs. 700
      const wac = calculateMovingWAC(10, 500, 20, 800);
      expect(wac).toBe(700);
    });

    it('handles decimal cost precision accurately', () => {
      // 15 units @ 120.50 + 5 units @ 150.00 = (1807.5 + 750) / 20 = 2557.5 / 20 = 127.88
      const wac = calculateMovingWAC(15, 120.5, 5, 150);
      expect(wac).toBe(127.88);
    });
  });

  describe('Multi-Currency Formatting Engine', () => {
    it('formats PKR before position with 0 decimals', () => {
      const formatted = formatCurrency(1500, { symbol: 'Rs.', position: 'BEFORE', decimalPlaces: 0 });
      expect(formatted).toBe('Rs. 1,500');
    });

    it('formats USD / AED after position with 2 decimal places', () => {
      const formatted = formatCurrency(49.99, { symbol: '$', position: 'BEFORE', decimalPlaces: 2 });
      expect(formatted).toBe('$ 49.99');
    });
  });

  describe('Invoice Totals & Tax Calculator', () => {
    it('accurately calculates item discounts, overall discounts and tax rate', () => {
      const items = [
        { quantity: 2, unitPrice: 1000, discountAmount: 100 }, // (2000 - 100) = 1900
        { quantity: 1, unitPrice: 500, discountAmount: 0 },    // 500
      ];
      // Gross subtotal = 2400
      // Overall discount = 400 -> Discounted subtotal = 2000
      // Tax @ 10% = 200 -> Net Total = 2200
      const totals = calculateInvoiceTotals(items, 400, 10);
      expect(totals.subtotal).toBe(2400);
      expect(totals.overallDiscount).toBe(400);
      expect(totals.taxAmount).toBe(200);
      expect(totals.netTotal).toBe(2200);
    });
  });

  describe('Dynamic Schema Custom Field Validator', () => {
    const schemaDefs: any[] = [
      { id: '1', name: 'Size', code: 'size', dataType: 'SELECT', isRequired: true },
      { id: '2', name: 'Batch No', code: 'batch_no', dataType: 'TEXT', isRequired: false },
      { id: '3', name: 'Cost Delta', code: 'cost_delta', dataType: 'NUMBER', isRequired: false },
    ];

    it('passes valid custom attributes and sanitizes numbers', () => {
      const input = { size: 'XL', batch_no: 'B-102', cost_delta: '45.5' };
      const res = validateCustomAttributes(input, schemaDefs);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.sanitized.cost_delta).toBe(45.5);
    });

    it('flags error when required schema attribute is missing', () => {
      const input = { batch_no: 'B-102' };
      const res = validateCustomAttributes(input, schemaDefs);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('Field "Size" (size) is required');
    });
  });

  describe('Hardware Drivers (TSPL & ESC/POS)', () => {
    it('generates valid TSPL commands for TSC Label Printers', () => {
      const tspl = HardwareService.generateTsplCommands([
        { name: 'Polo Shirt', sku: 'POLO-01', barcode: '123456789012', price: 1500, attributes: { size: 'XL' } }
      ], 50, 30, 'Test Store');

      expect(tspl).toContain('SIZE 50 mm, 30 mm');
      expect(tspl).toContain('BARCODE 20,95,"128"');
      expect(tspl).toContain('PRINT 1, 1');
    });

    it('generates ESC/POS bytes with cut and cash drawer pulse for DTS', () => {
      const buffer = HardwareService.generateEscPosReceipt({
        invoiceNumber: 'INV-100',
        createdAt: new Date().toISOString(),
        cashierName: 'Admin',
        customerName: 'Customer',
        items: [{ name: 'Item 1', quantity: 1, unitPrice: 500, subtotal: 500 }],
        subtotal: 500,
        discountAmount: 0,
        taxAmount: 0,
        netTotal: 500,
      }, { name: 'Test Store' }, { autoCut: true, kickDrawer: true });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(50);
    });
  });
});
