import { getDb } from '../database/db.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { calculatePeriodNetProfit } from '../domain/calculation.js';
import { CONFIG } from '../config/index.js';

export class ReportService {
  /**
   * Executive Real-time Dashboard KPIs
   */
  static getDashboardSummary(): any {
    const db = getDb();
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthPrefix = todayStr.slice(0, 7);

    // 1. Today's metrics
    const todaySales = db.prepare(`
      SELECT 
        COALESCE(SUM(net_total), 0) as total_sales,
        COALESCE(SUM(total_profit), 0) as gross_profit,
        COUNT(id) as transaction_count
      FROM sales
      WHERE created_at >= ? AND status != 'CANCELLED'
    `).get(`${todayStr} 00:00:00`) as any;

    // 2. Month-to-date metrics
    const monthSales = db.prepare(`
      SELECT 
        COALESCE(SUM(net_total), 0) as total_sales,
        COALESCE(SUM(total_profit), 0) as gross_profit,
        COUNT(id) as transaction_count
      FROM sales
      WHERE created_at >= ? AND status != 'CANCELLED'
    `).get(`${monthPrefix}-01 00:00:00`) as any;

    const monthExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE expense_date >= ?
    `).get(`${monthPrefix}-01`) as { total_expenses: number };

    const monthReturns = db.prepare(`
      SELECT COALESCE(SUM(total_refund_amount), 0) as total_returns
      FROM returns
      WHERE created_at >= ?
    `).get(`${monthPrefix}-01 00:00:00`) as { total_returns: number };

    const monthNetProfit = calculatePeriodNetProfit(
      monthSales.gross_profit,
      0, // Item costs already captured in sale profit
      monthExpenses.total_expenses,
      0 // Salaries already posted into expenses
    );

    // 3. Operational Balances
    const receivables = db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM customers WHERE current_balance > 0').get() as { total: number };
    const payables = db.prepare('SELECT COALESCE(SUM(current_payable), 0) as total FROM suppliers WHERE current_payable > 0').get() as { total: number };
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM product_variants WHERE stock_quantity <= min_stock_level AND is_active = 1').get() as { count: number };
    const totalInventoryValue = db.prepare('SELECT COALESCE(SUM(stock_quantity * cost_price), 0) as cost_val, COALESCE(SUM(stock_quantity * selling_price), 0) as retail_val FROM product_variants WHERE is_active = 1').get() as any;

    // 4. Last 7 Days Daily Sales Trend
    const last7Days = db.prepare(`
      SELECT 
        substr(created_at, 1, 10) as sale_date,
        COALESCE(SUM(net_total), 0) as daily_sales,
        COALESCE(SUM(total_profit), 0) as daily_profit,
        COUNT(id) as transactions
      FROM sales
      WHERE created_at >= date('now', '-6 days') AND status != 'CANCELLED'
      GROUP BY substr(created_at, 1, 10)
      ORDER BY sale_date ASC
    `).all();

    // 5. Top 5 Best Selling Products
    const topProducts = db.prepare(`
      SELECT 
        p.name as product_name,
        c.name as category_name,
        c.icon_type as category_icon,
        SUM(si.quantity) as total_sold_qty,
        SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN product_variants v ON si.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY total_sold_qty DESC
      LIMIT 5
    `).all();

    // 6. Real Live Recent Activities from Sales, Khata & Purchases
    const recentSales = db.prepare(`
      SELECT 
        s.id,
        s.invoice_number,
        COALESCE(c.name, 'Walk-in Customer') as party_name,
        s.net_total as amount,
        s.payment_method,
        s.created_at,
        'SALE' as activity_type,
        (SELECT p.name FROM sale_items si JOIN product_variants v ON si.variant_id = v.id JOIN products p ON v.product_id = p.id WHERE si.sale_id = s.id LIMIT 1) as item_title
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 8
    `).all() as any[];

    const recentActivities = recentSales.map((s, idx) => ({
      id: s.invoice_number || `#${1000 + idx}`,
      name: s.party_name,
      initials: (s.party_name.split(' ').map((w: string) => w[0]).join('') || 'CU').slice(0, 2).toUpperCase(),
      item: s.item_title || 'Retail Apparel Item',
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      type: s.payment_method === 'KHATA' ? 'Khata' : 'Sale',
      amount: `PKR ${Number(s.amount).toLocaleString()}`,
    }));

    // 7. Real 12-Month Sales Trend Data
    const currentYear = new Date().getFullYear().toString();
    const monthlySalesTrend = db.prepare(`
      SELECT 
        strftime('%m', created_at) as month_num,
        COALESCE(SUM(net_total), 0) as total_sales,
        COALESCE(SUM(total_profit), 0) as total_profit
      FROM sales
      WHERE strftime('%Y', created_at) = ? AND status != 'CANCELLED'
      GROUP BY strftime('%m', created_at)
      ORDER BY month_num ASC
    `).all(currentYear) as any[];

    // 8. Real Category Revenue Distribution Mix
    const categoryMix = db.prepare(`
      SELECT 
        c.name as category_name,
        COALESCE(SUM(si.subtotal), 0) as category_revenue
      FROM sale_items si
      JOIN product_variants v ON si.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY category_revenue DESC
      LIMIT 5
    `).all() as any[];

    return {
      today: {
        sales: todaySales.total_sales,
        grossProfit: todaySales.gross_profit,
        transactions: todaySales.transaction_count,
      },
      thisMonth: {
        sales: monthSales.total_sales,
        grossProfit: monthSales.gross_profit,
        expenses: monthExpenses.total_expenses,
        returns: monthReturns.total_returns,
        netProfit: monthNetProfit.netOperatingProfit,
        transactions: monthSales.transaction_count,
      },
      operational: {
        customerReceivables: receivables.total,
        supplierPayables: payables.total,
        lowStockCount: lowStockCount.count,
        inventoryCostValue: totalInventoryValue.cost_val,
        inventoryRetailValue: totalInventoryValue.retail_val,
      },
      salesTrend: last7Days,
      monthlySalesTrend,
      categoryMix,
      recentActivities,
      topProducts,
    };
  }

  /**
   * Comprehensive Profit & Loss Financial Statement
   */
  static getProfitAndLoss(startDate?: string, endDate?: string): any {
    const db = getDb();
    let salesWhere = "WHERE s.status != 'CANCELLED'";
    let expWhere = 'WHERE 1=1';
    let retWhere = 'WHERE 1=1';
    const salesParams: any[] = [];
    const expParams: any[] = [];
    const retParams: any[] = [];

    if (startDate) {
      salesWhere += ' AND s.created_at >= ?';
      salesParams.push(`${startDate} 00:00:00`);
      expWhere += ' AND e.expense_date >= ?';
      expParams.push(startDate);
      retWhere += ' AND r.created_at >= ?';
      retParams.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      salesWhere += ' AND s.created_at <= ?';
      salesParams.push(`${endDate} 23:59:59`);
      expWhere += ' AND e.expense_date <= ?';
      expParams.push(endDate);
      retWhere += ' AND r.created_at <= ?';
      retParams.push(`${endDate} 23:59:59`);
    }

    const salesTotals = db.prepare(`
      SELECT 
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(net_total), 0) as net_sales,
        COALESCE(SUM(total_cost), 0) as total_cogs,
        COALESCE(SUM(total_profit), 0) as gross_profit
      FROM sales s
      ${salesWhere}
    `).get(...salesParams) as any;

    const returnsTotals = db.prepare(`
      SELECT COALESCE(SUM(total_refund_amount), 0) as total_returns
      FROM returns r
      ${retWhere}
    `).get(...retParams) as { total_returns: number };

    // Expenses breakdown by category
    const expensesByCategory = db.prepare(`
      SELECT 
        ec.name as category_name,
        COALESCE(SUM(e.amount), 0) as category_total
      FROM expense_categories ec
      JOIN expenses e ON ec.id = e.category_id
      ${expWhere}
      GROUP BY ec.id
      ORDER BY category_total DESC
    `).all(...expParams) as { category_name: string; category_total: number }[];

    const totalExpenses = expensesByCategory.reduce((sum, c) => sum + c.category_total, 0);

    const netOperatingProfit = Number((salesTotals.gross_profit - totalExpenses).toFixed(2));
    const grossMarginPercent = salesTotals.net_sales > 0 ? Number(((salesTotals.gross_profit / salesTotals.net_sales) * 100).toFixed(1)) : 0;
    const netMarginPercent = salesTotals.net_sales > 0 ? Number(((netOperatingProfit / salesTotals.net_sales) * 100).toFixed(1)) : 0;

    return {
      period: { startDate: startDate || 'All Time', endDate: endDate || 'Current' },
      revenue: {
        grossSales: salesTotals.gross_sales,
        discounts: salesTotals.total_discounts,
        tax: salesTotals.total_tax,
        netSales: salesTotals.net_sales,
        cogs: salesTotals.total_cogs,
        grossProfit: salesTotals.gross_profit,
        grossMarginPercent,
      },
      returns: {
        totalReturnsAmount: returnsTotals.total_returns,
      },
      expenses: {
        breakdown: expensesByCategory,
        totalExpenses,
      },
      netProfit: {
        netOperatingProfit,
        netMarginPercent,
      },
    };
  }

  /**
   * Detailed Sales Report
   */
  static getSalesReport(filters?: { startDate?: string; endDate?: string; paymentMethod?: string; cashierId?: string; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.startDate) {
      whereClause += ' AND s.created_at >= ?';
      params.push(`${filters.startDate} 00:00:00`);
    }
    if (filters?.endDate) {
      whereClause += ' AND s.created_at <= ?';
      params.push(`${filters.endDate} 23:59:59`);
    }
    if (filters?.paymentMethod) {
      whereClause += ' AND s.payment_method = ?';
      params.push(filters.paymentMethod);
    }
    if (filters?.cashierId) {
      whereClause += ' AND s.cashier_id = ?';
      params.push(filters.cashierId);
    }

    const count = db.prepare(`SELECT COUNT(*) as count FROM sales s ${whereClause}`).get(...params) as { count: number };
    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(net_total), 0) as total_revenue,
        COALESCE(SUM(total_profit), 0) as total_profit,
        COALESCE(SUM(discount_amount), 0) as total_discounts
      FROM sales s
      ${whereClause}
    `).get(...params) as any;

    const sales = db.prepare(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.phone as customer_phone,
        u.full_name as cashier_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.cashier_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      sales,
      total: count.count,
      summary: totals,
    };
  }

  /**
   * Complete Stock Movement Audit Trail
   */
  static getStockMovements(filters?: { variantId?: string; movementType?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.variantId) {
      whereClause += ' AND m.variant_id = ?';
      params.push(filters.variantId);
    }
    if (filters?.movementType) {
      whereClause += ' AND m.movement_type = ?';
      params.push(filters.movementType);
    }
    if (filters?.startDate) {
      whereClause += ' AND m.created_at >= ?';
      params.push(`${filters.startDate} 00:00:00`);
    }
    if (filters?.endDate) {
      whereClause += ' AND m.created_at <= ?';
      params.push(`${filters.endDate} 23:59:59`);
    }

    const count = db.prepare(`SELECT COUNT(*) as count FROM stock_movements m ${whereClause}`).get(...params) as { count: number };

    const movements = db.prepare(`
      SELECT 
        m.*,
        v.sku,
        v.color,
        v.size,
        p.name as product_name,
        p.brand,
        c.name as category_name,
        u.full_name as user_name
      FROM stock_movements m
      JOIN product_variants v ON m.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN users u ON m.user_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      movements,
      total: count.count,
    };
  }

  /**
   * Inventory Valuation Report
   */
  static getInventoryValuation(): any {
    const db = getDb();
    const items = db.prepare(`
      SELECT 
        v.*,
        p.name as product_name,
        p.brand,
        p.origin,
        c.name as category_name,
        (v.stock_quantity * v.cost_price) as total_cost_value,
        (v.stock_quantity * v.selling_price) as total_retail_value,
        ((v.stock_quantity * v.selling_price) - (v.stock_quantity * v.cost_price)) as potential_profit
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE v.is_active = 1 AND p.is_active = 1
      ORDER BY total_cost_value DESC
    `).all();

    const totals = db.prepare(`
      SELECT 
        COUNT(id) as total_variants,
        COALESCE(SUM(stock_quantity), 0) as total_units,
        COALESCE(SUM(stock_quantity * cost_price), 0) as total_cost_valuation,
        COALESCE(SUM(stock_quantity * selling_price), 0) as total_retail_valuation
      FROM product_variants
      WHERE is_active = 1
    `).get() as any;

    return {
      items,
      summary: {
        ...totals,
        potentialProfit: totals.total_retail_valuation - totals.total_cost_valuation,
      },
    };
  }

  /**
   * Export Sales Report to Excel
   */
  static async exportSalesExcel(startDate?: string, endDate?: string): Promise<Buffer> {
    const data = this.getSalesReport({ startDate, endDate, limit: 5000 });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Invoice #', key: 'invoice', width: 22 },
      { header: 'Date & Time', key: 'date', width: 22 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Items Qty', key: 'items', width: 12 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 },
      { header: 'Net Total', key: 'netTotal', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 },
      { header: 'Payment Method', key: 'method', width: 18 },
      { header: 'Cashier', key: 'cashier', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF15803D' },
    };

    data.sales.forEach((s: any) => {
      worksheet.addRow({
        invoice: s.invoice_number,
        date: s.created_at,
        customer: s.customer_name || 'Walk-in Customer',
        items: s.items_count,
        subtotal: s.subtotal,
        discount: s.discount_amount,
        netTotal: s.net_total,
        profit: s.total_profit,
        method: s.payment_method,
        cashier: s.cashier_name,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
