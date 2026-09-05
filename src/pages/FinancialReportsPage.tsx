import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  Layers,
  FileText,
  RefreshCw,
} from 'lucide-react';

export const FinancialReportsPage: React.FC = () => {
  const { formatPrice, org } = useOrgConfig();
  const [activeReport, setActiveReport] = useState<'PNL' | 'VALUATION'>('PNL');
  const [pnlData, setPnlData] = useState<any | null>(null);
  const [valuationData, setValuationData] = useState<any | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      if (activeReport === 'PNL') {
        const res = await api.get(`/reports/pnl?startDate=${startDate}&endDate=${endDate}`);
        if (res.pnl) setPnlData(res.pnl);
      } else {
        const res = await api.get('/reports/inventory-valuation');
        if (res.summary) setValuationData(res);
      }
    } catch (e) {
      console.error('Failed to load financial reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeReport, startDate, endDate]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Financial Analytics & P&L Statement
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Trading Profit & Loss statement based on Moving WAC COGS and live operating expenses.
          </p>
        </div>

        {/* Report Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveReport('PNL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeReport === 'PNL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
              }`}
            >
              Profit & Loss Statement
            </button>
            <button
              onClick={() => setActiveReport('VALUATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeReport === 'VALUATION' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
              }`}
            >
              Stock Valuation Audit
            </button>
          </div>

          <button
            onClick={fetchReports}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeReport === 'PNL' ? (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Accounting Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
            />
          </div>

          {pnlData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Cards */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trading Performance</span>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Gross Retail Sales:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {formatPrice(pnlData.revenue.grossSales)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-rose-500">
                    <span>Discounts Given:</span>
                    <span className="font-bold font-mono">-{formatPrice(pnlData.revenue.totalDiscounts)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-extrabold border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Net Sales Revenue:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {formatPrice(pnlData.revenue.netRevenue)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Cost of Goods Sold (COGS):</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {formatPrice(pnlData.cogs.costOfGoodsSold)}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 uppercase">Gross Profit</span>
                      <p className="text-xs font-bold text-emerald-600">{pnlData.cogs.grossMarginPercent}% Margin</p>
                    </div>
                    <span className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                      {formatPrice(pnlData.cogs.grossTradingProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operating Overheads</span>
                  <span className="font-bold font-mono text-rose-600 text-xs">
                    {formatPrice(pnlData.operatingExpenses.totalExpenses)}
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pnlData.operatingExpenses.breakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center font-mono">No expenses in this period.</p>
                  ) : (
                    pnlData.operatingExpenses.breakdown.map((exp: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">{exp.category_name}</span>
                        <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                          {formatPrice(exp.category_total)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Line Net Profit Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Final Bottom Line</span>
                  <h3 className="text-lg font-extrabold mt-1">Net Operating Profit</h3>
                  <p className="text-xs text-emerald-100 mt-1">
                    Revenue after deducting COGS and all store operating overheads.
                  </p>
                </div>

                <div className="my-6">
                  <div className="text-4xl font-black font-mono tracking-tight">
                    {formatPrice(pnlData.bottomLine.netOperatingProfit)}
                  </div>
                  <p className="text-xs font-bold text-emerald-200 mt-1">
                    {pnlData.bottomLine.netProfitMarginPercent}% Net Profit Margin
                  </p>
                </div>

                <div className="text-[11px] text-emerald-100 font-mono border-t border-emerald-500/50 pt-3">
                  Store: {org?.name} • Accurate to Moving WAC
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Stock Valuation Audit */
        <div className="space-y-6">
          {valuationData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Valuation at Cost (WAC)</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatPrice(valuationData.summary.totalValuationAtCost)}
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Valuation at Retail Price</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatPrice(valuationData.summary.totalValuationAtRetail)}
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Projected Retail Profit</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatPrice(valuationData.summary.potentialProfit)}
                </h3>
              </div>
            </div>
          )}

          {/* Items Audit Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Product / Item</th>
                    <th className="py-3.5 px-4">SKU / Barcode</th>
                    <th className="py-3.5 px-4">Stock Qty</th>
                    <th className="py-3.5 px-4 text-right">Cost (WAC)</th>
                    <th className="py-3.5 px-4 text-right">Retail Price</th>
                    <th className="py-3.5 px-4 text-right">Total Cost Value</th>
                    <th className="py-3.5 px-4 text-right">Potential Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {valuationData?.items?.map((it: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {it.product_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{it.sku}</td>
                      <td className="py-3 px-4 font-mono font-bold">{it.stock_quantity}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatPrice(it.cost_price)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatPrice(it.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        {formatPrice(it.valuation_at_cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatPrice(it.potential_profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
