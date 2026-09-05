import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Users,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { formatPrice, org } = useOrgConfig();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/dashboard');
      setMetrics(res);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {org?.industry || 'RETAIL'} MANAGEMENT PLATFORM
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            {org?.name || 'OmniRetail'} Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time sales velocity, Khata receivables, and inventory stock valuation.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Today Gross Sales</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {formatPrice(metrics?.todayRevenue || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {metrics?.todayInvoicesCount || 0} bills finalized today
          </p>
        </div>

        {/* Month to Date Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Month-to-Date Sales</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {formatPrice(metrics?.mtdRevenue || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Current billing cycle</p>
        </div>

        {/* Outstanding Receivables (Khata) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Khata Receivables</span>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {formatPrice(metrics?.totalReceivables || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {metrics?.activeDebtorsCount || 0} active credit accounts
          </p>
        </div>

        {/* Inventory Stock Valuation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Inventory Valuation</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {formatPrice(metrics?.totalInventoryCost || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {metrics?.totalUnitsInStock || 0} total units in stock
          </p>
        </div>
      </div>

      {/* Category Breakdown & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Department & Category Revenue Mix
            </h3>
            <span className="text-xs text-slate-400 font-mono">Sales Share</span>
          </div>

          <div className="space-y-4">
            {metrics?.categoryMix && metrics.categoryMix.length > 0 ? (
              metrics.categoryMix.map((cat: any, idx: number) => {
                const totalRev = metrics.todayRevenue || metrics.mtdRevenue || 1;
                const percent = Math.min(100, Math.round((cat.sales_amount / totalRev) * 100)) || 10;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{cat.category_name}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatPrice(cat.sales_amount)} ({cat.units_sold} sold)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center font-mono">
                No category sales recorded yet. Process your first sale at the POS Terminal!
              </p>
            )}
          </div>
        </div>

        {/* Quick Retail Actions */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-3">
              Store Quick Actions
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Access high-frequency daily store operations directly.
            </p>

            <div className="space-y-2">
              <a
                href="#pos"
                className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-bold text-xs rounded-xl flex items-center justify-between border border-emerald-200 dark:border-emerald-800 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>Launch POS Checkout</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </a>

              <a
                href="#products"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>New Product & Stock In</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </a>

              <a
                href="#customers"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Customer Khata Ledger</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono">
            OmniRetail v1.0.0 • SQLite WAL Engine
          </div>
        </div>
      </div>
    </div>
  );
};
