import { describe, it, expect } from 'vitest';
import {
  calculateMovingWeightedAverageCost,
  calculateItemMetrics,
  calculateSaleTotals,
  calculatePeriodNetProfit,
  calculateExchangeDifference,
  calculateKhataRunningBalance,
} from '../server/domain/calculation.js';

describe('Centralized Calculation & Costing Engine', () => {
  describe('Moving Weighted Average Cost (WAC)', () => {
    it('should return incoming cost when existing stock is zero', () => {
      const wac = calculateMovingWeightedAverageCost(0, 0, 10, 500);
      expect(wac).toBe(500);
    });

    it('should correctly calculate weighted average cost on additional stock purchase', () => {
      // 10 units @ 500 = 5000. Buy 20 units @ 800 = 16000. Total = 21000 / 30 units = 700
      const wac = calculateMovingWeightedAverageCost(10, 500, 20, 800);
      expect(wac).toBe(700);
    });

    it('should handle fractional rounding correctly to 2 decimal places', () => {
      // 7 units @ 333.33 = 2333.31. Buy 5 units @ 450 = 2250. Total = 4583.31 / 12 = 381.94
      const wac = calculateMovingWeightedAverageCost(7, 333.33, 5, 450);
      expect(wac).toBe(381.94);
    });

    it('should return existing cost if incoming quantity is zero or negative', () => {
      const wac = calculateMovingWeightedAverageCost(10, 500, 0, 800);
      expect(wac).toBe(500);
    });
  });

  describe('Item Metrics & Gross Profit', () => {
    it('should calculate item subtotal, cost capture, and profit', () => {
      // Selling price 1200, Cost 800, Qty 2, Discount 100
      // Subtotal = (1200 * 2) - 100 = 2300
      // Total Cost = 800 * 2 = 1600
      // Profit = 2300 - 1600 = 700
      const metrics = calculateItemMetrics(2, 1200, 800, 100);
      expect(metrics.subtotal).toBe(2300);
      expect(metrics.totalCost).toBe(1600);
      expect(metrics.profit).toBe(700);
    });

    it('should prevent negative profit from exceeding cost on heavy discounts', () => {
      const metrics = calculateItemMetrics(1, 1000, 800, 1000);
      expect(metrics.subtotal).toBe(0);
      expect(metrics.totalCost).toBe(800);
      expect(metrics.profit).toBe(-800);
    });
  });

  describe('Complete Sale Totals', () => {
    it('should atomically calculate subtotal, total discount, net total, and net profit', () => {
      const items = [
        { variantId: 'v1', quantity: 2, unitPrice: 1500, unitCost: 1000, discountAmount: 200 }, // subtotal: 2800, cost: 2000, profit: 800
        { variantId: 'v2', quantity: 1, unitPrice: 3000, unitCost: 2000, discountAmount: 0 },   // subtotal: 3000, cost: 2000, profit: 1000
      ];

      const sale = calculateSaleTotals(items, 300, 0); // extra overall discount: 300
      // Subtotal = 3000 + 3000 = 6000
      // Total discount = 200 + 300 = 500
      // Net Total = 6000 - 500 = 5500
      // Total Cost = 2000 + 2000 = 4000
      // Total Profit = (800 + 1000) - 300 = 1500

      expect(sale.subtotal).toBe(6000);
      expect(sale.totalDiscount).toBe(500);
      expect(sale.netTotal).toBe(5500);
      expect(sale.totalCost).toBe(4000);
      expect(sale.totalProfit).toBe(1500);
    });
  });

  describe('Period Net Operating Profit', () => {
    it('should compute net business profit subtracting expenses and salaries', () => {
      const result = calculatePeriodNetProfit(50000, 2000, 15000, 20000);
      // Adjusted Gross Profit = 50000 - 2000 = 48000
      // Operating Costs = 15000 + 20000 = 35000
      // Net Profit = 48000 - 35000 = 13000
      expect(result.grossProfit).toBe(48000);
      expect(result.totalOperatingCosts).toBe(35000);
      expect(result.netOperatingProfit).toBe(13000);
    });
  });

  describe('Exchange & Khata Calculations', () => {
    it('should calculate customer payable on higher value exchange', () => {
      const diff = calculateExchangeDifference(1500, 2200);
      expect(diff).toBe(700); // Customer pays +700
    });

    it('should calculate store refund on lower value exchange', () => {
      const diff = calculateExchangeDifference(2500, 1800);
      expect(diff).toBe(-700); // Store refunds 700
    });

    it('should calculate Khata running balance correctly', () => {
      // Previous balance: 5000. Customer takes 3000 credit (Debit). Customer pays 2000 cash (Credit).
      // New balance = 5000 + 3000 - 2000 = 6000
      const bal = calculateKhataRunningBalance(5000, 3000, 2000);
      expect(bal).toBe(6000);
    });
  });
});
