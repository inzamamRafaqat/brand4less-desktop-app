import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import { UniversalReceiptModal } from '../components/common/UniversalReceiptModal';
import {
  Users,
  Search,
  Plus,
  ShoppingBag,
  CreditCard,
  Printer,
  ChevronRight,
  X,
  Phone,
  RefreshCw,
} from 'lucide-react';

export const CustomerCrmPage: React.FC = () => {
  const { formatPrice, org } = useOrgConfig();
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Drawer / Invoices State
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // New Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnicOrTaxId, setCnicOrTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(50000);
  const [notes, setNotes] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/customers?query=${encodeURIComponent(searchQuery)}&limit=100`);
      if (res.customers) setCustomers(res.customers);
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const handleOpenDrawer = async (cust: any) => {
    setActiveCustomer(cust);
    setIsLoadingInvoices(true);
    try {
      const res = await api.get(`/customers/${cust.id}/purchases`);
      if (res.purchases) setCustomerInvoices(res.purchases);
    } catch (e) {
      console.error('Failed to load purchases:', e);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/customers', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        cnicOrTaxId: cnicOrTaxId.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        creditLimit: Number(creditLimit || 50000),
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      setName('');
      setPhone('');
      setCnicOrTaxId('');
      setEmail('');
      setAddress('');
      setNotes('');
      await fetchCustomers();
    } catch (err: any) {
      alert(`Failed to save customer: ${err.message}`);
    }
  };

  const handleReprintReceipt = (sale: any) => {
    const receiptPayload = {
      organization: org,
      sale: {
        id: sale.id,
        invoiceNumber: sale.invoice_number,
        createdAt: sale.created_at,
        cashierName: sale.cashier_name || 'Staff Cashier',
        customerName: activeCustomer?.name || 'Customer',
        customerPhone: activeCustomer?.phone || '',
        subtotal: sale.subtotal,
        discountAmount: sale.discount_amount,
        taxAmount: sale.tax_amount,
        netTotal: sale.net_total,
        paidAmount: sale.paid_amount,
        changeAmount: sale.change_amount,
        khataAmount: sale.khata_amount,
        paymentMethod: sale.payment_method,
      },
      items: (sale.items || []).map((it: any) => ({
        name: it.product_name,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        subtotal: it.subtotal,
        attributes: it.attributes || {},
      })),
    };

    setSelectedReceipt(receiptPayload);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Customer Directory & CRM
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track customer profiles, lifetime purchase histories, Khata credit debt, and reprint invoices.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name, phone..."
              className="w-60 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customer List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {customers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-mono">
            No customers found matching query.
          </div>
        ) : (
          customers.map((cust) => (
            <div
              key={cust.id}
              onClick={() => handleOpenDrawer(cust)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                    {cust.name}
                  </h3>
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-xs text-slate-500 flex items-center space-x-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cust.phone || 'No Phone Registered'}</span>
                </p>

                {/* KPI stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <span className="text-[10px] font-semibold text-slate-500">Lifetime Spent</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      {formatPrice(cust.total_lifetime_spent || 0)}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <span className="text-[10px] font-semibold text-slate-500">Khata Debt</span>
                    <p
                      className={`text-xs font-bold font-mono mt-0.5 ${
                        cust.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatPrice(cust.current_balance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 text-[11px] text-slate-400 font-mono flex justify-between">
                <span>Orders: {cust.total_purchases_count || 0}</span>
                <span>Limit: {formatPrice(cust.credit_limit)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CUSTOMER PURCHASE HISTORY DRAWER */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {activeCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{activeCustomer.phone || 'No Phone'}</p>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoices List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                Past Sales Invoices ({customerInvoices.length})
              </h4>

              {isLoadingInvoices ? (
                <div className="py-12 text-center text-slate-400 font-mono">Loading invoices...</div>
              ) : customerInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-mono">
                  No purchases recorded for this customer yet.
                </div>
              ) : (
                customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs font-mono text-emerald-600">
                          {inv.invoice_number}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(inv.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-sm font-mono text-slate-900 dark:text-slate-100">
                          {formatPrice(inv.net_total)}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 capitalize">{inv.payment_method}</p>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1">
                      {inv.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-slate-700 dark:text-slate-300">
                            {it.quantity}x {it.product_name}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-slate-100">
                            {formatPrice(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleReprintReceipt(inv)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Reprint Receipt</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Register Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Credit Limit</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 50000)}
                    placeholder="50000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / City"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <UniversalReceiptModal
          receiptData={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
