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
  BarChart3,
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
import { Bar, Line } from 'react-chartjs-2';

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
  const [timeFrame, setTimeFrame] = useState<'7_DAYS' | '12_MONTHS'>('7_DAYS');
  const [chartMode, setChartMode] = useState<'BAR' | 'LINE'>('BAR');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(6);
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

  const {
    today,
    thisWeek,
    thisMonth,
    thisYear,
    operational,
    salesTrend = [],
    weeklySalesTrend = [],
    monthlySalesTrend = [],
    yearlySalesTrend = [],
    categoryMix = [],
    recentActivities = [],
    topProducts = [],
  } = data || {};

  const currentMonthIdx = new Date().getMonth();

  // Dynamic KPI Card Metrics based on selected timeFrame (strictly ACTUAL data)
  let kpiTitleSales = "Weekly Retail Sales";
  let kpiSalesValue = Number(thisWeek?.sales || 0);
  let kpiSalesSubtext = "Past 7 Days Total";

  let kpiTitleProfit = "Weekly Net Profit";
  let kpiProfitValue = Number(thisWeek?.netProfit ?? thisWeek?.grossProfit ?? 0);
  let kpiProfitSubtext = "Past 7 Days Profit";

  let kpiTitleOrders = "Weekly Completed Orders";
  let kpiOrdersValue = Number(thisWeek?.transactions || 0);
  let kpiOrdersSubtext = "7-Day Volume";

  if (timeFrame === '12_MONTHS') {
    kpiTitleSales = "Annual Retail Sales";
    kpiSalesValue = Number(thisYear?.sales || thisMonth?.sales || 0);
    kpiSalesSubtext = "Year-to-Date Total";

    kpiTitleProfit = "Annual Net Profit";
    kpiProfitValue = Number(thisYear?.netProfit ?? thisMonth?.netProfit ?? 0);
    kpiProfitSubtext = "Annual Trading Margin";

    kpiTitleOrders = "Annual Completed Orders";
    kpiOrdersValue = Number(thisYear?.transactions || thisMonth?.transactions || 0);
    kpiOrdersSubtext = "Year-to-Date Volume";
  }

  // 1. Strictly REAL 7 Days Trend
  const days7List: any[] = [];
  const todayDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const found = (weeklySalesTrend || []).find((r: any) => String(r.sale_date).slice(0, 10) === dStr);
    days7List.push(
      found || {
        sale_date: dStr,
        daily_sales: 0,
        daily_profit: 0,
        transactions: 0,
      }
    );
  }

  const days7Items = days7List.map((d: any, idx: number) => {
    const isLast = idx === days7List.length - 1;
    const parts = String(d.sale_date).split('-');
    let dateObj = new Date();
    if (parts.length === 3) {
      dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    const dayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayLabel = isLast ? 'Today' : dayShort;
    const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = dateObj.getDate();
    const fullLabel = isLast ? `Today (${dayNum} ${monthShort})` : `${dayShort} (${dayNum} ${monthShort})`;

    return {
      label: dayLabel,
      fullLabel,
      sales: Number(d.daily_sales || 0),
      profit: Number(d.daily_profit || 0),
      transactions: Number(d.transactions || 0),
      isToday: isLast,
    };
  });

  // 2. Strictly REAL 12 Months Trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsList = monthNames.map((name, i) => {
    const monthNum = String(i + 1).padStart(2, '0');
    const matched = (monthlySalesTrend || []).find(
      (m: any) => String(m.month_num).padStart(2, '0') === monthNum
    );
    const currentYear = new Date().getFullYear();
    return {
      label: name,
      fullLabel: `${name} ${currentYear}`,
      sales: matched ? Number(matched.total_sales || 0) : 0,
      profit: matched ? Number(matched.total_profit || 0) : 0,
      transactions: matched ? Number(matched.transactions || 0) : 0,
      isToday: i === currentMonthIdx,
    };
  });

  const currentItems = timeFrame === '7_DAYS' ? days7Items : monthsList;
  const activeIdx = Math.min(selectedItemIdx, currentItems.length - 1);
  const activeItem = currentItems[activeIdx] || currentItems[currentItems.length - 1];
  const maxSales = Math.max(...currentItems.map((it) => it.sales), 1);

  // Compact number formatting helper matching Image 2 (e.g. 160k, 625k, 69k, 4k, 0)
  const formatCompact = (val: number) => {
    const n = Number(val) || 0;
    if (n === 0) return '0';
    if (n >= 1_000_000) {
      return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (n >= 1_000) {
      return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return n.toLocaleString();
  };

  const lineChartData = {
    labels: currentItems.map((it) => it.label),
    datasets: [
      {
        label: 'Gross Retail Sales (PKR)',
        data: currentItems.map((it) => it.sales),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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

  const totalSalesToDisplay = kpiSalesValue;
  const netProfitToDisplay = kpiProfitValue;
  const transactionsToDisplay = kpiOrdersValue;
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
          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
            <button
              onClick={() => {
                setTimeFrame('7_DAYS');
                setSelectedItemIdx(6);
              }}
              className={`px-3.5 py-1.5 rounded-full transition ${
                timeFrame === '7_DAYS'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                setTimeFrame('12_MONTHS');
                setSelectedItemIdx(currentMonthIdx);
              }}
              className={`px-3.5 py-1.5 rounded-full transition ${
                timeFrame === '12_MONTHS'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              12 Months
            </button>
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
        {/* 1. Period Retail Sales */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{kpiTitleSales}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            PKR {kpiSalesValue.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">{kpiSalesSubtext}</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-black text-[10px]">
              Live
            </span>
          </div>
        </div>

        {/* 2. Net Operating Flow / Profit */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{kpiTitleProfit}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            PKR {netProfitToDisplay.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">{kpiProfitSubtext}</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-black text-[10px]">
              {totalSalesToDisplay > 0 ? Math.round((netProfitToDisplay / totalSalesToDisplay) * 100) : 0}% Margin
            </span>
          </div>
        </div>

        {/* 3. Completed Customer Tickets */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow flex flex-col justify-between h-36 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{kpiTitleOrders}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            {transactionsToDisplay} Orders
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">{kpiOrdersSubtext}</span>
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

      {/* ── MIDDLE CARD: SALES OVERVIEW (EXACT IMAGE 2 REPLICA) ──────────── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl soft-shadow space-y-5 transition-colors">
        {/* Top Controls Bar: [Last 7 Days] [12 Months] and [Bar |||] [Line ~] */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Store Sales Performance</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Live verified database sales data — click any period to view breakdown</p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Timeframe Switcher: Last 7 Days vs 12 Months */}
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setTimeFrame('7_DAYS');
                  setSelectedItemIdx(6);
                }}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  timeFrame === '7_DAYS'
                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeFrame('12_MONTHS');
                  setSelectedItemIdx(currentMonthIdx);
                }}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  timeFrame === '12_MONTHS'
                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                12 Months
              </button>
            </div>

            {/* Chart Style Switcher: Bar vs Line */}
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('BAR')}
                title="Bar Chart"
                className={`p-1.5 rounded-xl transition ${
                  chartMode === 'BAR'
                    ? 'bg-white text-emerald-600 dark:bg-slate-900 dark:text-emerald-400 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setChartMode('LINE')}
                title="Line Trend"
                className={`p-1.5 rounded-xl transition ${
                  chartMode === 'LINE'
                    ? 'bg-white text-emerald-600 dark:bg-slate-900 dark:text-emerald-400 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Period Banner (Exact Image 2 banner) */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between transition">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {activeItem?.fullLabel || 'Today'}
              </h4>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Selected Period</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">Total Sales:</span>
            <span className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
              Rs {Number(activeItem?.sales || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Chart Visualization Area */}
        {chartMode === 'BAR' ? (
          <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl p-4 sm:p-6 border border-slate-100 dark:border-slate-800/80">
            <div className={`grid gap-2 sm:gap-4 items-end justify-center ${timeFrame === '7_DAYS' ? 'grid-cols-7 max-w-2xl mx-auto' : 'grid-cols-6 sm:grid-cols-12'}`}>
              {currentItems.map((item, idx) => {
                const isSelected = activeIdx === idx;
                const heightPct = item.sales > 0 ? Math.min(100, Math.max(12, Math.round((item.sales / maxSales) * 100))) : 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedItemIdx(idx)}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    {/* Top Value Label (Image 2 style: 160k, 625k, 69k, 4k) */}
                    <span
                      className={`text-[11px] sm:text-xs font-bold mb-2 transition-all ${
                        item.isToday
                          ? 'text-emerald-600 dark:text-emerald-400 font-black'
                          : isSelected
                          ? 'text-slate-950 dark:text-white font-black'
                          : item.sales > 0
                          ? 'text-slate-700 dark:text-slate-300 font-bold'
                          : 'text-transparent group-hover:text-slate-400'
                      }`}
                    >
                      {formatCompact(item.sales)}
                    </span>

                    {/* Background Track with Filled Bar */}
                    <div
                      className={`w-10 sm:w-14 h-40 sm:h-52 rounded-2xl p-1 flex flex-col justify-end relative overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? 'bg-slate-200/90 dark:bg-slate-700/60 ring-2 ring-emerald-500'
                          : 'bg-slate-100 dark:bg-slate-800/70 group-hover:bg-slate-200/60'
                      }`}
                    >
                      {/* Bar Fill */}
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ${
                          item.isToday
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm'
                            : item.sales > 0
                            ? 'bg-gradient-to-t from-slate-700 to-slate-600 dark:from-slate-400 dark:to-slate-300'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Bottom Day Label */}
                    <span
                      className={`text-xs font-bold mt-2.5 transition-colors ${
                        item.isToday
                          ? 'text-emerald-600 dark:text-emerald-400 font-black'
                          : isSelected
                          ? 'text-slate-900 dark:text-white font-black'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Line Mode Canvas */
          <div className="h-64 w-full bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-100 dark:border-slate-800/80">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        )}

        {/* Bottom Interactive Day Pills (Exact Image 2 bottom row) */}
        <div className={`grid gap-2 sm:gap-2.5 ${timeFrame === '7_DAYS' ? 'grid-cols-7 max-w-2xl mx-auto' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-12'}`}>
          {currentItems.map((item, idx) => {
            const isSelected = activeIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedItemIdx(idx)}
                className={`rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center border transition cursor-pointer text-center ${
                  isSelected
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md border-slate-950 dark:border-white scale-[1.03]'
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`text-[11px] sm:text-xs font-black ${isSelected ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'}`}>
                  {item.label}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-bold mt-0.5 ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                  {formatCompact(item.sales)}
                </span>
              </button>
            );
          })}
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
