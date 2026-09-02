import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Boxes,
  PieChart,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Building2,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'PNL' | 'VALUATION' | 'DAILY_SALES'>('PNL');
  const [pnlData, setPnlData] = useState<any>(null);
  const [valuationData, setValuationData] = useState<any>(null);
  const [dailySalesData, setDailySalesData] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (reportType === 'PNL') {
        const res = await api.get(`/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`);
        if (res.revenue || res.pnl) {
          setPnlData(res.pnl || res);
        }
      } else if (reportType === 'VALUATION') {
        const res = await api.get('/reports/inventory-valuation');
        if (res.summary || res.valuation) {
          setValuationData(res.valuation || res);
        }
      } else if (reportType === 'DAILY_SALES') {
        const res = await api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}&limit=100`);
        if (res.sales) {
          setDailySalesData(res);
        }
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, startDate, endDate]);

  const exportPnlExcel = async () => {
    try {
      const token = localStorage.getItem('brand4less_token') || '';
      const response = await fetch(`http://localhost:4000/api/reports/sales/export-excel?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand4less_financial_sales_report_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  // Quick Date Filters
  const setQuickDatePreset = (preset: 'THIS_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'ALL') => {
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'LAST_30') {
      const past = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      setStartDate(past);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'THIS_YEAR') {
      const startYear = `${now.getFullYear()}-01-01`;
      setStartDate(startYear);
      setEndDate(now.toISOString().slice(0, 10));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // P&L Metrics Extractors
  const rev = pnlData?.revenue || {};
  const exp = pnlData?.expenses || {};
  const net = pnlData?.netProfit || {};
  const ret = pnlData?.returns || {};

  const grossSales = Number(rev.grossSales || rev.netSales || 0);
  const discounts = Number(rev.discounts || 0);
  const netSales = Number(rev.netSales || 0);
  const cogs = Number(rev.cogs || 0);
  const grossProfit = Number(rev.grossProfit || (netSales - cogs));
  const grossMarginPct = rev.grossMarginPercent || (netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : 0);

  const totalExpenses = Number(exp.totalExpenses || 0);
  const expenseCategories: any[] = exp.breakdown || [];
  const returnsAmount = Number(ret.totalReturnsAmount || 0);
  const netOperatingProfit = Number(net.netOperatingProfit !== undefined ? net.netOperatingProfit : (grossProfit - totalExpenses));
  const netMarginPct = net.netMarginPercent || (netSales > 0 ? ((netOperatingProfit / netSales) * 100).toFixed(1) : 0);

  // Valuation Metrics Extractors
  const valSummary = valuationData?.summary || {};
  const valItems: any[] = valuationData?.items || [];
  const totalUnitsInStock = Number(valSummary.total_units || valSummary.totalUnits || 0);
  const totalCostValuation = Number(valSummary.total_cost_valuation || valSummary.totalCostValue || 0);
  const totalRetailValuation = Number(valSummary.total_retail_valuation || valSummary.totalRetailValue || 0);
  const potentialProfit = Number(valSummary.potentialProfit || (totalRetailValuation - totalCostValuation));

  // Daily Sales Chart Setup
  const salesItems: any[] = dailySalesData?.sales || [];
  const totalPeriodSales = salesItems.reduce((sum, s) => sum + Number(s.net_total || 0), 0);
  const totalPeriodProfit = salesItems.reduce((sum, s) => sum + Number(s.total_profit || 0), 0);

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* ── TOP HEADER & ACTIONS ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>Financial Analytics & Profit/Loss</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Trading profit & loss statement, inventory stock valuation (Moving WAC), and daily revenue trends
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportPnlExcel}
            className="px-4 py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl transition flex items-center space-x-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Statement to Excel</span>
          </button>
        </div>
      </div>

      {/* ── TABS & DATE FILTERS BAR ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow transition-colors">
        <div className="flex space-x-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setReportType('PNL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              reportType === 'PNL'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Profit & Loss (P&L) Statement
          </button>

          <button
            onClick={() => setReportType('VALUATION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              reportType === 'VALUATION'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Inventory Valuation (WAC Basis)
          </button>

          <button
            onClick={() => setReportType('DAILY_SALES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              reportType === 'DAILY_SALES'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Sales & Margin Transactions
          </button>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setQuickDatePreset('THIS_MONTH')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDatePreset('LAST_30')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setQuickDatePreset('THIS_YEAR')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
            >
              Year {new Date().getFullYear()}
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── 1. PROFIT & LOSS (P&L) STATEMENT VIEW ────────────────────────── */}
      {reportType === 'PNL' && (
        <div className="space-y-6">
          {/* 4 Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Net Sales Revenue</span>
              <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                PKR {netSales.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Gross: PKR {grossSales.toLocaleString()}</span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Cost of Goods Sold (COGS)</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                PKR {cogs.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Calculated at Moving WAC</span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Gross Trading Profit</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                PKR {grossProfit.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {grossMarginPct}% Gross Margin
              </span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Net Operating Profit</span>
              <div className={`text-2xl font-black mt-1 ${netOperatingProfit >= 0 ? 'text-slate-950 dark:text-white' : 'text-rose-600'}`}>
                PKR {netOperatingProfit.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                {netMarginPct}% Net Bottom Line
              </span>
            </div>
          </div>

          {/* Structured Income Statement Table (70% / 30% Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3): Double-Entry Income Statement */}
            <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl soft-shadow space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Income Statement (Trading & P&L)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Period: {startDate || 'All Time'} to {endDate || 'Present'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                  PKR Statement
                </span>
              </div>

              {/* Statement Rows */}
              <div className="space-y-3 text-xs">
                {/* 1. Revenue Section */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>1. Gross Sales Revenue</span>
                    <span className="font-mono">PKR {grossSales.toLocaleString()}</span>
                  </div>
                  {discounts > 0 && (
                    <div className="flex justify-between text-rose-600 pl-4">
                      <span>Less: Customer Discounts & Vouchers</span>
                      <span className="font-mono">- PKR {discounts.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-slate-950 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Net Sales Revenue</span>
                    <span className="font-mono">PKR {netSales.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. COGS Section */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl space-y-2">
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>2. Cost of Goods Sold (COGS at Moving WAC)</span>
                    <span className="font-mono">- PKR {cogs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-700 text-sm">
                    <span>Gross Trading Profit</span>
                    <span className="font-mono">PKR {grossProfit.toLocaleString()} ({grossMarginPct}%)</span>
                  </div>
                </div>

                {/* 3. Operating Expenses Section */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>3. Operating Overheads & Staff Payroll</span>
                    <span className="font-mono text-rose-600">- PKR {totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                    {expenseCategories.length === 0 ? (
                      <div className="italic">No operating expenses recorded for this period.</div>
                    ) : (
                      expenseCategories.map((c: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{c.category_name}</span>
                          <span className="font-mono">PKR {Number(c.category_total).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Net Bottom Line */}
                <div className="p-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider opacity-80 block">Net Operating Profit</span>
                    <span className="text-lg font-black font-mono">
                      PKR {netOperatingProfit.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase font-bold tracking-wider opacity-80 block">Net Margin</span>
                    <span className="text-lg font-black font-mono">{netMarginPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (1/3): Expense Distribution Breakdown */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl soft-shadow space-y-4 transition-colors">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                Operating Outflow Breakdown
              </h3>

              <div className="space-y-3 pt-2">
                {expenseCategories.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No expense data in this date range.
                  </div>
                ) : (
                  expenseCategories.map((c: any, idx: number) => {
                    const pct = totalExpenses > 0 ? Math.round((Number(c.category_total) / totalExpenses) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{c.category_name}</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            PKR {Number(c.category_total).toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-950 dark:bg-white rounded-full transition-all"
                            style={{ width: `${Math.max(6, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. INVENTORY VALUATION (WAC) VIEW ────────────────────────────── */}
      {reportType === 'VALUATION' && (
        <div className="space-y-6">
          {/* 4 Hero Valuation KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Units in Stock</span>
              <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                {totalUnitsInStock.toLocaleString()} units
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">{valItems.length} active variants</span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Stock Valuation at Cost (WAC)</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                PKR {totalCostValuation.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Inbound capital tied up</span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Stock Valuation at Retail</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                PKR {totalRetailValuation.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Gross realizable value</span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Unrealized Potential Margin</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                PKR {potentialProfit.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-1 block">
                {totalRetailValuation > 0 ? Math.round((potentialProfit / totalRetailValuation) * 100) : 0}% Margin
              </span>
            </div>
          </div>

          {/* Variant Valuation Detail Table */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Product Inventory Valuation Audit</h3>
                <p className="text-xs text-slate-400">Weighted Average Cost (WAC) basis per SKU</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs font-mono">
                {valItems.length} Variants
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">SKU / Barcode</th>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Stock Qty</th>
                    <th className="p-4 text-right">Unit Cost (WAC)</th>
                    <th className="p-4 text-right">Unit Selling Price</th>
                    <th className="p-4 text-right">Total Cost Value</th>
                    <th className="p-4 text-right">Total Retail Value</th>
                    <th className="p-4 text-right">Expected Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {valItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No product inventory found in database.
                      </td>
                    </tr>
                  ) : (
                    valItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.sku}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{item.product_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.color ? `${item.color} ` : ''}{item.size ? `(${item.size})` : ''}
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {item.category_name}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              item.stock_quantity <= item.min_stock_level
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {item.stock_quantity} units
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400">
                          PKR {Number(item.cost_price).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-900 dark:text-white font-bold">
                          PKR {Number(item.selling_price).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                          PKR {Number(item.total_cost_value).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          PKR {Number(item.total_retail_value).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-purple-600 dark:text-purple-400 font-bold">
                          PKR {Number(item.potential_profit).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SALES & MARGIN TRANSACTIONS VIEW ──────────────────────────── */}
      {reportType === 'DAILY_SALES' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Period Gross Revenue</span>
              <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                PKR {totalPeriodSales.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">{salesItems.length} completed orders</span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Period Realized Trading Profit</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                PKR {totalPeriodProfit.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {totalPeriodSales > 0 ? Math.round((totalPeriodProfit / totalPeriodSales) * 100) : 0}% Margin
              </span>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Average Customer Ticket</span>
              <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                PKR {salesItems.length > 0 ? Math.round(totalPeriodSales / salesItems.length).toLocaleString() : 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Per POS checkout</span>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
              Sales Transaction Log ({salesItems.length})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4 text-center">Items</th>
                    <th className="p-4 text-right">Net Total</th>
                    <th className="p-4 text-right">Trading Profit</th>
                    <th className="p-4 text-center">Payment</th>
                    <th className="p-4">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salesItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No sales found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    salesItems.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                          {s.invoice_number}
                        </td>
                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {s.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                            {s.items_count || 1} items
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          PKR {Number(s.net_total).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          PKR {Number(s.total_profit).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                            {s.payment_method}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {s.cashier_name || 'Staff'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
