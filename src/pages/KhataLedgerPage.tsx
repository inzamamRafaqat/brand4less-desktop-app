import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import {
  Users,
  Search,
  Plus,
  Building,
  CreditCard,
  Phone,
  FileText,
  DollarSign,
  X,
  CheckCircle2,
} from 'lucide-react';

export const KhataLedgerPage: React.FC = () => {
  const { formatPrice } = useOrgConfig();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Payment Voucher Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/customers?query=${encodeURIComponent(searchQuery)}&limit=100`);
      if (res.customers) {
        setCustomers(res.customers);
        if (!selectedCustomerId && res.customers.length > 0) {
          handleSelectCustomer(res.customers[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load Khata customers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const handleSelectCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    try {
      const res = await api.get(`/customers/${id}/ledger`);
      setLedgerData(res);
    } catch (e) {
      console.error('Failed to load ledger:', e);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || paymentAmount <= 0) return;

    try {
      await api.post(`/customers/${selectedCustomerId}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
      setPaymentNotes('');
      await handleSelectCustomer(selectedCustomerId);
      await fetchCustomers();
    } catch (err: any) {
      alert(`Payment record failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Customer Khata & Credit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Double-entry credit accounting, cash recoveries, and customer balance statements.
          </p>
        </div>

        {selectedCustomerId && (
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment Voucher</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Accounts List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account..."
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {customers.map((cust) => {
              const isSelected = selectedCustomerId === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{cust.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cust.phone || 'No phone'}</p>
                    </div>
                    <span
                      className={`font-mono text-xs font-extrabold ${
                        cust.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatPrice(cust.current_balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Ledger Audit Statement */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          {ledgerData?.customer ? (
            <div className="space-y-5">
              {/* Account Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    {ledgerData.customer.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{ledgerData.customer.phone}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Balance Due</span>
                  <div
                    className={`text-2xl font-black font-mono mt-0.5 ${
                      ledgerData.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatPrice(ledgerData.currentBalance)}
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction</th>
                      <th className="py-2.5 px-3">Ref / Notes</th>
                      <th className="py-2.5 px-3 text-right">Debit (Sale)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-800 dark:text-slate-200">
                    {ledgerData.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No transactions recorded in this Khata account.
                        </td>
                      </tr>
                    ) : (
                      ledgerData.ledger.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[11px]">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] ${
                                entry.transaction_type === 'DEBIT'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-emerald-500/10 text-emerald-600'
                              }`}
                            >
                              {entry.transaction_type === 'DEBIT' ? 'Credit Sale' : 'Payment Received'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-xs font-sans">
                            {entry.notes || entry.reference_id || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            {entry.transaction_type === 'DEBIT' ? formatPrice(entry.amount) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {entry.transaction_type === 'CREDIT' ? formatPrice(entry.amount) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-slate-100">
                            {formatPrice(entry.running_balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400 font-mono">
              Select a customer from the left to view their Khata ledger.
            </div>
          )}
        </div>
      </div>

      {/* RECORD PAYMENT VOUCHER MODAL */}
      {isPaymentModalOpen && ledgerData?.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Record Payment Voucher</h3>
                <p className="text-xs text-slate-500">Customer: {ledgerData.customer.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount Received *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-bold font-mono text-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="CARD">Bank / POS Card</option>
                  <option value="IBFT">Online Transfer / Raast</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Voucher Memo</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cleared August bill via Cash"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
                >
                  Confirm & Credit Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
