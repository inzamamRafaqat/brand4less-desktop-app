import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Users,
  Search,
  Plus,
  Receipt,
  Phone,
  CreditCard,
  Calendar,
  ShoppingBag,
  TrendingUp,
  X,
  Printer,
  ChevronRight,
  UserCheck,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Edit2,
  DollarSign,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { ThermalReceiptModal } from '../components/common/ThermalReceiptModal';

export const CustomersPage: React.FC<{ onNavigateToKhata?: (customerId: string) => void }> = ({
  onNavigateToKhata,
}) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected customer for Purchase History drawer/modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerPurchases, setCustomerPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Receipt reprint modal
  const [reprintSale, setReprintSale] = useState<any | null>(null);

  // Add / Edit Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    id: '',
    name: '',
    phone: '',
    cnic: '',
    address: '',
    creditLimit: 50000,
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?query=${encodeURIComponent(searchQuery)}&limit=100`);
      if (res.customers) {
        setCustomers(res.customers);
        setTotalCount(res.total || res.customers.length);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const handleOpenPurchaseHistory = async (cust: any) => {
    setSelectedCustomer(cust);
    setLoadingPurchases(true);
    try {
      const res = await api.get(`/customers/${cust.id}/purchases`);
      if (res.purchases) {
        setCustomerPurchases(res.purchases);
      }
    } catch (err) {
      console.error('Failed to fetch customer purchase history:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name || !customerFormData.phone) {
      alert('Please enter customer Name and Phone Number.');
      return;
    }

    try {
      await api.post('/customers', customerFormData);
      setIsAddCustomerOpen(false);
      setCustomerFormData({ id: '', name: '', phone: '', cnic: '', address: '', creditLimit: 50000 });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.id || !customerFormData.name) return;

    try {
      await api.put(`/customers/${customerFormData.id}`, customerFormData);
      setIsEditCustomerOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    }
  };

  const openEditModal = (cust: any) => {
    setCustomerFormData({
      id: cust.id,
      name: cust.name,
      phone: cust.phone || '',
      cnic: cust.cnic || '',
      address: cust.address || '',
      creditLimit: cust.credit_limit || 50000,
    });
    setIsEditCustomerOpen(true);
  };

  // Aggregates
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + Number(c.total_lifetime_spent || 0), 0);
  const totalOutstandingKhata = customers.reduce((sum, c) => sum + Number(c.current_balance || 0), 0);
  const avgLifetimeSpend = customers.length > 0 ? Math.round(totalLifetimeSpend / customers.length) : 0;

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* ── TOP HEADER & ACTIONS ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>Customer Records & Purchase History</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Customer directory, POS auto-enrolled profiles, lifetime purchase histories, and receipt reprints
          </p>
        </div>

        <button
          onClick={() => {
            setCustomerFormData({ id: '', name: '', phone: '', cnic: '', address: '', creditLimit: 50000 });
            setIsAddCustomerOpen(true);
          }}
          className="px-5 py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* ── 4 HERO STAT CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Registered Customers</span>
          <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
            {totalCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Includes POS walk-in enrollments</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Customer Lifetime Spend</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            PKR {totalLifetimeSpend.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Cumulative sales across all profiles</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Khata Receivables</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            PKR {totalOutstandingKhata.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Total customer credit debt outstanding</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Average Customer Value (LTV)</span>
          <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
            PKR {avgLifetimeSpend.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Per registered customer profile</span>
        </div>
      </div>

      {/* ── SEARCH BAR ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow flex items-center space-x-3 transition-colors">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer by name, mobile phone number, or CNIC..."
          className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs">
            Clear
          </button>
        )}
      </div>

      {/* ── CUSTOMERS DIRECTORY TABLE ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Customer Directory & Invoices Ledger ({customers.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">Click "Purchase History" to inspect past invoices & reprint receipts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4 text-center">Orders Count</th>
                <th className="p-4 text-right">Lifetime Spend</th>
                <th className="p-4 text-right">Khata Balance</th>
                <th className="p-4">Last Order Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No customers found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{c.name}</span>
                        {c.current_balance > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold">
                            Credit Active
                          </span>
                        )}
                      </div>
                      {c.address && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{c.address}</div>
                      )}
                    </td>

                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {c.phone || '—'}
                    </td>

                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                        {c.total_purchases_count || 0} orders
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      PKR {Number(c.total_lifetime_spent || 0).toLocaleString()}
                    </td>

                    <td className="p-4 text-right font-mono font-bold">
                      {Number(c.current_balance || 0) > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          PKR {Number(c.current_balance).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">PKR 0</span>
                      )}
                    </td>

                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {c.last_purchase_date
                        ? new Date(c.last_purchase_date).toLocaleDateString()
                        : 'No orders yet'}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenPurchaseHistory(c)}
                          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1 shadow-2xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>History ({c.total_purchases_count || 0})</span>
                        </button>

                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CUSTOMER PURCHASE HISTORY DRAWER / MODAL ───────────────────────── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative my-auto border border-slate-200/80 dark:border-slate-800 space-y-5 max-h-[90vh] flex flex-col transition-colors">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-black">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedCustomer.name}'s Purchase History
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Phone: {selectedCustomer.phone || 'N/A'} • Total Spent: PKR {Number(selectedCustomer.total_lifetime_spent || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoices List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingPurchases ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading invoices...
                </div>
              ) : customerPurchases.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No previous purchases recorded for this customer.
                </div>
              ) : (
                customerPurchases.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Receipt className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {sale.invoice_number}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ({new Date(sale.created_at).toLocaleString()})
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-slate-950 dark:text-white font-mono">
                          PKR {Number(sale.net_total).toLocaleString()}
                        </span>

                        <button
                          onClick={() => setReprintSale(sale)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-950 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint DTS Receipt</span>
                        </button>
                      </div>
                    </div>

                    {/* Itemized Line Items */}
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(sale.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span className="truncate pr-2">
                            {it.quantity}x {it.product_name} {it.color ? `(${it.color})` : ''}
                          </span>
                          <span className="font-mono font-bold whitespace-nowrap">
                            PKR {Number(it.subtotal || (Number(it.unit_price) * Number(it.quantity))).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Cashier: {sale.cashier_name || 'Staff'}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Payment: {sale.payment_method} ({sale.payment_status})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTER NEW CUSTOMER MODAL ───────────────────────────────────── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto border border-slate-200/80 dark:border-slate-800 space-y-4 transition-colors"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Register New Customer</h3>
              <button type="button" onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inzamam Rafaqat"
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567"
                  value={customerFormData.phone}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNIC (Optional)</label>
                <input
                  type="text"
                  placeholder="35201-XXXXXXX-X"
                  value={customerFormData.cnic}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, cnic: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address / Area</label>
                <input
                  type="text"
                  placeholder="Gulberg III, Lahore"
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Khata Credit Limit (PKR)</label>
                <input
                  type="number"
                  value={customerFormData.creditLimit}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, creditLimit: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-xs font-bold"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── EDIT CUSTOMER MODAL ───────────────────────────────────────────── */}
      {isEditCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <form
            onSubmit={handleUpdateCustomer}
            className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto border border-slate-200/80 dark:border-slate-800 space-y-4 transition-colors"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Customer Profile</h3>
              <button type="button" onClick={() => setIsEditCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  value={customerFormData.phone}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Limit (PKR)</label>
                <input
                  type="number"
                  value={customerFormData.creditLimit}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, creditLimit: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditCustomerOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-xs font-bold"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── REPRINT THERMAL RECEIPT MODAL ─────────────────────────────────── */}
      {reprintSale && (
        <ThermalReceiptModal
          sale={reprintSale}
          onClose={() => setReprintSale(null)}
        />
      )}
    </div>
  );
};
