import { db } from '../database/db.js';

export class ReportService {
  /**
   * Executive Dashboard Metrics
   */
  static getDashboardMetrics() {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    // 1. Today Sales
    const todaySales = db.prepare(`
      SELECT 
        COALESCE(SUM(net_total), 0) as today_revenue,
        COUNT(id) as today_invoices_count,
        COALESCE(SUM(discount_amount), 0) as today_discounts
      FROM sales
      WHERE created_at LIKE ?
    `).get(`${today}%`) as any;

    // 2. Month-to-date Revenue
    const mtdSales = db.prepare(`
      SELECT COALESCE(SUM(net_total), 0) as mtd_revenue FROM sales WHERE created_at LIKE ?
    `).get(`${thisMonth}%`) as any;

    // 3. Outstanding Receivables (Khata Debt)
    const receivables = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as total_receivables, COUNT(id) as active_debtors_count
      FROM customers WHERE current_balance > 0
    `).get() as any;

    // 4. Inventory Valuation
    const inventory = db.prepare(`
      SELECT 
        COUNT(id) as total_variants_count,
        COALESCE(SUM(stock_quantity), 0) as total_units_in_stock,
        COALESCE(SUM(stock_quantity * cost_price), 0) as total_inventory_cost,
        COALESCE(SUM(stock_quantity * selling_price), 0) as total_retail_value
      FROM product_variants
      WHERE is_active = 1
    `).get() as any;

    // 5. Category Breakdown
    const categoryMix = db.prepare(`
      SELECT 
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(si.subtotal), 0) as sales_amount,
        COALESCE(SUM(si.quantity), 0) as units_sold
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN sale_items si ON si.variant_id = v.id
      GROUP BY c.id
      ORDER BY sales_amount DESC
      LIMIT 6
    `).all();

    return {
      todayRevenue: todaySales.today_revenue,
      todayInvoicesCount: todaySales.today_invoices_count,
      mtdRevenue: mtdSales.mtd_revenue,
      totalReceivables: receivables.total_receivables,
      activeDebtorsCount: receivables.active_debtors_count,
      totalInventoryCost: Math.round(inventory.total_inventory_cost),
      totalRetailValue: Math.round(inventory.total_retail_value),
      totalUnitsInStock: inventory.total_units_in_stock,
      categoryMix,
    };
  }

  /**
   * Official Double-Entry Profit & Loss (P&L) Statement
   */
  static getProfitAndLoss(startDate?: string, endDate?: string) {
    let salesWhere = 'WHERE 1=1';
    let expenseWhere = 'WHERE 1=1';
    const params: any[] = [];
    const expParams: any[] = [];

    if (startDate) {
      salesWhere += ' AND s.created_at >= ?';
      expenseWhere += ' AND e.expense_date >= ?';
      params.push(startDate);
      expParams.push(startDate);
    }
    if (endDate) {
      salesWhere += ' AND s.created_at <= ?';
      expenseWhere += ' AND e.expense_date <= ?';
      params.push(`${endDate}T23:59:59`);
      expParams.push(endDate);
    }

    // 1. Trading Sales & COGS
    const trading = db.prepare(`
      SELECT 
        COALESCE(SUM(si.quantity * si.unit_price), 0) as gross_sales,
        COALESCE(SUM(si.discount_amount), 0) as item_discounts,
        COALESCE(SUM(s.discount_amount), 0) as invoice_discounts,
        COALESCE(SUM(s.net_total), 0) as net_sales_revenue,
        COALESCE(SUM(si.quantity * si.unit_cost), 0) as cost_of_goods_sold
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      ${salesWhere}
    `).get(...params) as any;

    const grossSales = Math.round(trading.gross_sales);
    const totalDiscounts = Math.round(trading.item_discounts + trading.invoice_discounts);
    const netRevenue = Math.round(trading.net_sales_revenue);
    const cogs = Math.round(trading.cost_of_goods_sold);
    const grossProfit = Math.round(netRevenue - cogs);
    const grossMarginPercent = netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(1)) : 0;

    // 2. Operating Expenses Breakdown
    const expenseBreakdown = db.prepare(`
      SELECT 
        c.name as category_name,
        c.type as category_type,
        COALESCE(SUM(e.amount), 0) as category_total
      FROM expense_categories c
      LEFT JOIN expenses e ON e.category_id = c.id ${expenseWhere.replace('WHERE 1=1', '')}
      GROUP BY c.id
      HAVING category_total > 0
      ORDER BY category_total DESC
    `).all(...expParams) as any[];

    const totalOperatingExpenses = expenseBreakdown.reduce((sum, e) => sum + Number(e.category_total || 0), 0);
    const netOperatingProfit = Math.round(grossProfit - totalOperatingExpenses);
    const netProfitMarginPercent = netRevenue > 0 ? Number(((netOperatingProfit / netRevenue) * 100).toFixed(1)) : 0;

    return {
      revenue: {
        grossSales,
        totalDiscounts,
        netRevenue,
      },
      cogs: {
        costOfGoodsSold: cogs,
        grossTradingProfit: grossProfit,
        grossMarginPercent,
      },
      operatingExpenses: {
        totalExpenses: totalOperatingExpenses,
        breakdown: expenseBreakdown,
      },
      bottomLine: {
        netOperatingProfit,
        netProfitMarginPercent,
      },
    };
  }

  /**
   * Inventory Valuation Audit
   */
  static getInventoryValuation() {
    const summary = db.prepare(`
      SELECT 
        COUNT(v.id) as total_variants,
        COALESCE(SUM(v.stock_quantity), 0) as total_quantity,
        COALESCE(SUM(v.stock_quantity * v.cost_price), 0) as total_valuation_at_cost,
        COALESCE(SUM(v.stock_quantity * v.selling_price), 0) as total_valuation_at_retail
      FROM product_variants v
      WHERE v.is_active = 1
    `).get() as any;

    const items = db.prepare(`
      SELECT 
        p.name as product_name,
        c.name as category_name,
        v.sku,
        v.barcode,
        v.custom_attributes_json,
        v.cost_price,
        v.selling_price,
        v.stock_quantity,
        (v.stock_quantity * v.cost_price) as valuation_at_cost,
        (v.stock_quantity * v.selling_price) as valuation_at_retail,
        ((v.selling_price - v.cost_price) * v.stock_quantity) as potential_profit
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE v.is_active = 1
      ORDER BY valuation_at_cost DESC
      LIMIT 100
    `).all() as any[];

    return {
      summary: {
        totalVariants: summary.total_variants,
        totalQuantity: summary.total_quantity,
        totalValuationAtCost: Math.round(summary.total_valuation_at_cost),
        totalValuationAtRetail: Math.round(summary.total_valuation_at_retail),
        potentialProfit: Math.round(summary.total_valuation_at_retail - summary.total_valuation_at_cost),
      },
      items: items.map((it) => ({
        ...it,
        attributes: it.custom_attributes_json ? JSON.parse(it.custom_attributes_json) : {},
      })),
    };
  }
}
