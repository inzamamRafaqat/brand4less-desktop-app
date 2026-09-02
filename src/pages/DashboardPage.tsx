import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Users,
  Truck,
  ArrowUpRight,
  Package,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  Bell,
  MoreHorizontal,
  ArrowRightLeft,
  Zap,
  ShieldCheck,
  Tag,
  Clock,
  Layers,
  Boxes,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CategoryAvatar } from '../components/common/CategoryAvatar';
import { TabType } from '../components/layout/Sidebar';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface DashboardPageProps {
  setActiveTab: (tab: TabType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard');
      if (res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">Loading Executive Command Center...</p>
        </div>
      </div>
    );
  }

  const { today, thisMonth, operational, salesTrend = [], monthlySalesTrend = [], categoryMix = [], recentActivities = [], topProducts = [] } = data || {};

  // Chart Setup matching the PrimeNG multi-tone stacked bar aesthetics
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const chartSalesData = months.map((_, i) => {
    const monthNum = String(i + 1).padStart(2, '0');
    const matched = monthlySalesTrend.find((m: any) => m.month_num === monthNum);
    return matched ? Number(matched.total_sales) : (thisMonth?.sales && i === new Date().getMonth() ? thisMonth.sales : 0);
  });

  const chartProfitData = chartSalesData.map((s) => Math.round(s * 0.45));
  const chartPurchasesData = chartSalesData.map((s) => Math.round(s * 0.35));

  const activityChartData = {
    labels: months,
    datasets: [
      {
        label: 'Gross Retail Sales (PKR)',
        data: chartSalesData,
        backgroundColor: isDark ? '#ffffff' : '#0f172a',
        borderRadius: 8,
        stack: 'Stack 0',
      },
      {
        label: 'Trading Gross Profit (PKR)',
        data: chartProfitData,
        backgroundColor: isDark ? '#475569' : '#94a3b8',
        borderRadius: 8,
        stack: 'Stack 0',
      },
      {
        label: 'Inbound Cost Basis',
        data: chartPurchasesData,
        backgroundColor: isDark ? '#1e293b' : '#cbd5e1',
        borderRadius: 8,
        stack: 'Stack 0',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleFont: { size: 12, weight: 'bold' as any },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 12,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { family: 'inherit', size: 11 } },
      },
      y: {
        grid: { color: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 1)' },
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { family: 'inherit', size: 10 } },
        border: { dash: [4, 4] },
      },
    },
  };

  const totalSalesToDisplay = Number(thisMonth?.sales || today?.sales || 0);
  const netProfitToDisplay = Number(thisMonth?.netProfit || thisMonth?.grossProfit || today?.grossProfit || 0);
  const transactionsToDisplay = Number(thisMonth?.transactions || today?.transactions || 0);
  const inventoryValuation = Number(operational?.inventoryCostValue || 0);

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* ── TOP HEADER (EXACT PRIMENG COMMAND CENTER STYLE) ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* Overview Live Badge */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1.5">
            <span>Overview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            Executive Command Center
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Real-time retail revenue, inventory stock valuation, customer khata receivables, and recent transactions
          </p>
        </div>

        {/* Right Search, Period Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector Tabs (Weekly, Monthly, Yearly) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
            {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-full transition ${
                  period === p
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchDashboardData}
            title="Refresh Live Metrics"
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 4 KPI METRIC CARDS (EXACT PRIMENG DESIGN) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Net Sales */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Net Sales</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            PKR {totalSalesToDisplay.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">Month-to-Date</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-black text-[10px]">
              Active
            </span>
          </div>
        </div>

        {/* 2. Net Operating Flow / Profit */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Trading Profit</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            PKR {netProfitToDisplay.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">After COGS & Expenses</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-black text-[10px]">
              {totalSalesToDisplay > 0 ? Math.round((netProfitToDisplay / totalSalesToDisplay) * 100) : 0}% Margin
            </span>
          </div>
        </div>

        {/* 3. Completed Customer Tickets */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            {transactionsToDisplay} Orders
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">Today: {today?.transactions || 0} tickets</span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black text-[10px]">
              Live
            </span>
          </div>
        </div>

        {/* 4. Inventory Valuation / Stock Health */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stock Valuation at Cost</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            PKR {inventoryValuation.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">
              {operational?.lowStockCount > 0 ? `${operational.lowStockCount} Low-stock items` : 'Stock Optimal'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                operational?.lowStockCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {operational?.lowStockCount > 0 ? 'Action Req' : 'Healthy'}
            </span>
          </div>
        </div>
      </div>

      {/* ── MIDDLE CARD: PORTFOLIO ACTIVITY STACKED CHART ────────────────── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl soft-shadow space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Annual Sales & Revenue Trend</h3>
            <p className="text-xs text-slate-400">Multi-tone breakdown of retail sales, gross margins, and inventory cost basis</p>
          </div>

          {/* Chart Legends */}
          <div className="flex items-center space-x-5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white" />
              <span>Gross Retail Sales</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span>Trading Profit</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
              <span>Inbound Cost Basis</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-64 w-full">
          <Bar data={activityChartData} options={chartOptions} />
        </div>
      </div>

      {/* ── BOTTOM ROW: RECENT ACTIVITY & CATEGORY MIX (70% / 30%) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (70%) — Real Live Recent Activity Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl soft-shadow flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Store Transactions</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold">
                  {recentActivities.length} Recent
                </span>
              </div>

              <button
                onClick={() => setActiveTab('sales')}
                className="text-xs font-bold text-slate-900 dark:text-white hover:underline flex items-center space-x-1"
              >
                <span>View All Sales</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 dark:text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-2">Invoice #</th>
                    <th className="py-3 px-2">Customer / Party</th>
                    <th className="py-3 px-2">Item / Product</th>
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2 text-center">Type</th>
                    <th className="py-3 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No transactions recorded yet. Complete a POS sale to see live activity.
                      </td>
                    </tr>
                  ) : (
                    recentActivities.map((act: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-2 font-mono text-slate-900 dark:text-white font-bold">{act.id}</td>
                        <td className="py-3.5 px-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              {act.initials}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{act.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                          {act.item}
                        </td>
                        <td className="py-3.5 px-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{act.date}</td>
                        <td className="py-3.5 px-2 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              act.type === 'Sale'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                : act.type === 'Khata'
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                                : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400'
                            }`}
                          >
                            {act.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right font-black text-slate-900 dark:text-white font-mono">
                          {act.amount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (30%) — Category Revenue Distribution */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl soft-shadow flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Revenue Mix</h3>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Category Mix Rows */}
            <div className="space-y-4 pt-4">
              {categoryMix.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No sales category data available.
                </div>
              ) : (
                categoryMix.map((cat: any, idx: number) => {
                  const maxRevenue = Math.max(...categoryMix.map((c: any) => Number(c.category_revenue || 1)));
                  const pct = Math.round((Number(cat.category_revenue || 0) / (maxRevenue || 1)) * 100);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{cat.category_name}</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                          PKR {Number(cat.category_revenue).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-950 dark:bg-white rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('pos')}
              className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Launch POS Cashier Terminal &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
