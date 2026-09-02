import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Receipt,
  Search,
  Calendar,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Banknote,
  Building2,
  BookOpen,
  Printer,
  Eye,
  FileSpreadsheet,
  TrendingUp,
  User,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { ThermalReceiptModal } from '../components/common/ThermalReceiptModal';
import { CategoryAvatar } from '../components/common/CategoryAvatar';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (paymentMethodFilter !== 'ALL') params.append('paymentMethod', paymentMethodFilter);
      if (paymentStatusFilter !== 'ALL') params.append('paymentStatus', paymentStatusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '100');

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.sales) {
        setSales(res.sales);
        setTotalCount(res.total || res.sales.length);
      }
    } catch (e) {
      console.error('Failed to load sales history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, paymentMethodFilter, paymentStatusFilter, startDate, endDate]);

  const handleOpenReceipt = async (sale: any) => {
    try {
      const res = await api.get(`/sales/${sale.id}/receipt`);
      if (res.receipt) {
        setReceiptData(res.receipt);
        setIsReceiptOpen(true);
      }
    } catch (e) {
      alert('Failed to load receipt: ' + (e as any).message);
    }
  };

  const handleOpenDetails = async (sale: any) => {
    try {
      const res = await api.get(`/sales/${sale.id}`);
      if (res.sale) {
        setSelectedSaleForDetails(res.sale);
      }
    } catch (e) {
      alert('Failed to load sale details: ' + (e as any).message);
    }
  };

  // Quick Date Filters
  const setQuickDate = (range: 'TODAY' | '7DAYS' | 'THIS_MONTH' | 'ALL') => {
    const now = new Date();
    if (range === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (range === '7DAYS') {
      const past = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setStartDate(past);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (range === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(now.toISOString().slice(0, 10));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // KPI Calculations
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.net_total || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + Number(s.total_profit || 0), 0);
  const totalUnitsSold = sales.reduce((sum, s) => sum + Number(s.total_units || 0), 0);
  const avgOrderValue = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>Sales & Order History</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              {totalCount} Orders
            </span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Review completed retail customer transactions, customer Khata charges, and reprint thermal receipts
          </p>
        </div>
      </div>

      {/* ── KPI STAT CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Filtered Sales</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            PKR {totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{sales.length} completed transactions</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Units Sold</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {totalUnitsSold.toLocaleString()} units
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Garments & Accessories</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Average Order Value (AOV)</span>
          <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
            PKR {avgOrderValue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Per customer ticket</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Estimated Gross Margin</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            PKR {totalProfit.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">
            {totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0}% Margin
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow transition-colors">
        <div className="flex space-x-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'ALL', label: 'All Payments' },
            { id: 'CASH', label: 'Cash Only' },
            { id: 'CARD', label: 'Card / POS' },
            { id: 'KHATA', label: 'Khata (Credit)' },
            { id: 'BANK_TRANSFER', label: 'Bank IBFT' },
            { id: 'SPLIT', label: 'Split' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPaymentMethodFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                paymentMethodFilter === tab.id
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, customer, phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition"
            />
          </div>

          <div className="flex space-x-1">
            <button
              onClick={() => setQuickDate('TODAY')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDate('THIS_MONTH')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
            >
              Month
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => setQuickDate('ALL')}
                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SALES ORDERS TABLE ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items / Units</th>
                <th className="p-4 text-right">Subtotal</th>
                <th className="p-4 text-right">Discount</th>
                <th className="p-4 text-right">Net Total (PKR)</th>
                <th className="p-4 text-center">Payment Method</th>
                <th className="p-4">Cashier</th>
                <th className="p-4 text-right">Receipt / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    No sales found for the selected filters.
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const methodColor =
                    s.payment_method === 'CASH'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : s.payment_method === 'CARD'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      : s.payment_method === 'KHATA'
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {s.invoice_number}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(s.created_at).toLocaleString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="p-4">
                        {s.customer_name ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{s.customer_name}</div>
                            {s.customer_phone && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                {s.customer_phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Walk-in Customer</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                          {s.total_units || s.items_count || 1} units ({s.items_count || 1} items)
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400 text-xs">
                        PKR {Number(s.subtotal || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-right font-mono text-xs">
                        {s.discount_amount > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            - PKR {Number(s.discount_amount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right font-black text-slate-900 dark:text-white font-mono text-xs">
                        PKR {Number(s.net_total || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border uppercase tracking-wider inline-block ${methodColor}`}
                        >
                          {s.payment_method}
                        </span>
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                        {s.cashier_name || s.cashier_username || 'Staff'}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenDetails(s)}
                            title="View Itemized Breakdown"
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenReceipt(s)}
                            title="Reprint Thermal Receipt"
                            className="px-3 py-1.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs transition flex items-center space-x-1 shadow-2xs"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ITEMIZED SALE DETAILS MODAL ──────────────────────────────────── */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Sale Order Breakdown #{selectedSaleForDetails.invoice_number}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(selectedSaleForDetails.created_at).toLocaleString()} • Cashier: {selectedSaleForDetails.cashier_name}
                </p>
              </div>
              <button onClick={() => setSelectedSaleForDetails(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Line Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {selectedSaleForDetails.items?.map((item: any) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <CategoryAvatar
                      categoryIcon={item.category_icon}
                      categoryName={item.category_name}
                      productName={item.product_name}
                      size="sm"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{item.product_name}</h4>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-mono">
                        {item.color ? `${item.color} ` : ''}{item.size ? `(${item.size}) ` : ''}• SKU: {item.sku}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.quantity} × PKR {Number(item.unit_price).toLocaleString()} = PKR {Number(item.subtotal).toLocaleString()}
                    </div>
                    {item.discount_amount > 0 && (
                      <span className="text-rose-600 text-[10px]">
                        Discount: -PKR {Number(item.discount_amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono">PKR {Number(selectedSaleForDetails.subtotal).toLocaleString()}</span>
              </div>
              {selectedSaleForDetails.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Total Discount</span>
                  <span className="font-mono">- PKR {Number(selectedSaleForDetails.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-950 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Net Total Paid</span>
                <span className="font-mono">PKR {Number(selectedSaleForDetails.net_total).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  handleOpenReceipt(selectedSaleForDetails);
                  setSelectedSaleForDetails(null);
                }}
                className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── THERMAL RECEIPT MODAL ────────────────────────────────────────── */}
      {isReceiptOpen && receiptData && (
        <ThermalReceiptModal
          receiptData={receiptData}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
