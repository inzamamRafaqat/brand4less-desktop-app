import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  BookOpen,
  Users,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Banknote,
  Receipt,
  Eye,
} from 'lucide-react';
import { PaymentVoucherModal, VoucherData } from '../components/common/PaymentVoucherModal';

export const KhataLedgerPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBalanceOnly, setHasBalanceOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [activeVoucherData, setActiveVoucherData] = useState<VoucherData | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    cnic: '',
    address: '',
    creditLimit: 50000,
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?query=${encodeURIComponent(searchQuery)}&hasBalance=${hasBalanceOnly}`);
      if (res.customers) {
        setCustomers(res.customers);
        if (!selectedCustomer && res.customers.length > 0) {
          loadLedger(res.customers[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, hasBalanceOnly]);

  const loadLedger = async (cust: any) => {
    setSelectedCustomer(cust);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/customers/${cust.id}/ledger`);
      if (res.entries) {
        setLedgerData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || paymentAmount <= 0) return;

    setPaymentError('');
    try {
      await api.post(`/customers/${selectedCustomer.id}/payments`, {
        amount: paymentAmount,
        paymentMethod,
        notes: paymentNotes,
      });

      setIsPaymentModalOpen(false);

      setActiveVoucherData({
        voucherType: 'CUSTOMER_KHATA_PAYMENT',
        voucherNumber: `REC-${Date.now().toString().slice(-6)}`,
        partyName: selectedCustomer.name,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
        date: new Date().toLocaleString(),
        amount: paymentAmount,
        paymentMethod: paymentMethod,
        previousBalance: selectedCustomer.current_balance,
        newBalance: Math.max(0, selectedCustomer.current_balance - paymentAmount),
        referenceNote: paymentNotes,
      });

      setPaymentAmount(0);
      setPaymentNotes('');
      fetchCustomers();
      loadLedger(selectedCustomer);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment recording failed');
    }
  };

  const openLedgerRowVoucher = (entry: any) => {
    if (!selectedCustomer) return;
    const isPayment = entry.credit > 0;
    const amount = isPayment ? entry.credit : entry.debit;

    setActiveVoucherData({
      voucherType: 'CUSTOMER_KHATA_PAYMENT',
      voucherNumber: entry.reference_id || `KHT-${entry.id?.slice(0, 8)}`,
      partyName: selectedCustomer.name,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      date: new Date(entry.created_at).toLocaleString(),
      amount: amount,
      paymentMethod: entry.entry_type?.replace(/_/g, ' '),
      newBalance: entry.running_balance,
      referenceNote: entry.notes,
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) return;

    try {
      const res = await api.post('/customers', newCustomer);
      if (res.customer) {
        setIsAddCustomerModalOpen(false);
        setNewCustomer({ name: '', phone: '', cnic: '', address: '', creditLimit: 50000 });
        fetchCustomers();
        loadLedger(res.customer);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const exportExcel = async () => {
    if (!selectedCustomer) return;
    try {
      const res: any = await api.get(`/customers/${selectedCustomer.id}/export-excel`);
      if (res.blob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `khata_${selectedCustomer.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const exportPdf = async () => {
    if (!selectedCustomer) return;
    try {
      const res: any = await api.get(`/customers/${selectedCustomer.id}/export-pdf`);
      if (res.blob) {
        const url = window.URL.createObjectURL(res.blob);
        window.open(url, '_blank');
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col lg:flex-row h-full overflow-hidden font-sans transition-colors">
      {/* ── LEFT PANEL: CUSTOMER DIRECTORY (35%) ─────────────────────────── */}
      <div className="w-full lg:w-96 bg-white dark:bg-[#0B0F19] border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-hidden soft-shadow transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Customer Khata</span>
            </h3>
            <button
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-full transition flex items-center space-x-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Khata</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition"
            />
          </div>

          <label className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={hasBalanceOnly}
              onChange={(e) => setHasBalanceOnly(e.target.checked)}
              className="rounded text-slate-900 dark:text-white focus:ring-0"
            />
            <span>Show Outstanding Balances Only</span>
          </label>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {customers.map((c) => {
            const isSelected = selectedCustomer?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => loadLedger(c)}
                className={`w-full p-3.5 rounded-2xl text-left transition flex items-center justify-between border ${
                  isSelected
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-sm'
                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                }`}
              >
                <div className="overflow-hidden pr-2">
                  <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'}`}>
                    {c.name}
                  </h4>
                  <p className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
                    {c.phone}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-xs font-black block ${
                      isSelected
                        ? 'text-white dark:text-slate-950'
                        : c.current_balance > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : c.current_balance < 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400'
                    }`}
                  >
                    PKR {c.current_balance.toLocaleString()}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                    {c.current_balance > 0 ? 'Receivable' : c.current_balance < 0 ? 'Advance' : 'Settled'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: LEDGER STATEMENT VIEW (65%) ─────────────────────── */}
      <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col h-full overflow-hidden p-8 transition-colors">
        {selectedCustomer ? (
          <div className="flex flex-col h-full space-y-4">
            {/* Customer Banner */}
            <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4 soft-shadow transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-black text-lg">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{selectedCustomer.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    <span className="font-mono">Phone: {selectedCustomer.phone}</span>
                    {selectedCustomer.cnic && <span>CNIC: {selectedCustomer.cnic}</span>}
                    {selectedCustomer.credit_limit > 0 && (
                      <span>Credit Limit: PKR {selectedCustomer.credit_limit.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Current Balance</span>
                  <div className="text-2xl font-black text-slate-950 dark:text-white">
                    PKR {selectedCustomer.current_balance.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-full shadow-sm transition flex items-center space-x-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Receive Payment</span>
                </button>

                <div className="flex space-x-1">
                  <button
                    onClick={exportExcel}
                    title="Export to Excel"
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </button>
                  <button
                    onClick={exportPdf}
                    title="Export to PDF"
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                  >
                    <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col soft-shadow transition-colors">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Khata Ledger Statement Transactions (Click row to view/print receipt)
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Total Debits: <strong className="text-rose-600 dark:text-rose-400">PKR {ledgerData?.totalDebit?.toLocaleString() || 0}</strong> | Total Credits: <strong className="text-emerald-600 dark:text-emerald-400">PKR {ledgerData?.totalCredit?.toLocaleString() || 0}</strong>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-3.5">Date & Time</th>
                      <th className="p-3.5">Entry Type</th>
                      <th className="p-3.5">Invoice / Ref</th>
                      <th className="p-3.5 text-right">Debit (+)</th>
                      <th className="p-3.5 text-right">Credit (-)</th>
                      <th className="p-3.5 text-right">Running Balance</th>
                      <th className="p-3.5">Notes</th>
                      <th className="p-3.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ledgerData?.entries?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          No transactions recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      ledgerData?.entries?.map((entry: any) => (
                        <tr
                          key={entry.id}
                          onClick={() => openLedgerRowVoucher(entry)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                        >
                          <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {entry.entry_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-900 dark:text-white font-bold">
                            {entry.reference_id || '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {entry.debit > 0 ? `+ PKR ${entry.debit.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {entry.credit > 0 ? `- PKR ${entry.credit.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-950 dark:text-white font-black">
                            PKR {entry.running_balance.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-slate-400 dark:text-slate-500 text-[11px]">{entry.notes || '—'}</td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-950 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition flex items-center space-x-1 ml-auto"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Select a customer from the directory to view Khata ledger</p>
          </div>
        )}
      </div>

      {/* ── RECEIVE PAYMENT MODAL ────────────────────────────────────────── */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Receive Khata Payment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedCustomer.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Payment Amount (PKR)
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="w-full text-xl font-black py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
                />
              </div>

              {selectedCustomer.current_balance > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(selectedCustomer.current_balance)}
                  className="w-full py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
                >
                  Pay Full Outstanding (PKR {selectedCustomer.current_balance.toLocaleString()})
                </button>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                    { id: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                          paymentMethod === m.id
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cash received at counter"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md"
              >
                Record Payment & View Receipt Voucher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── NEW CUSTOMER MODAL ───────────────────────────────────────────── */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Create New Customer Profile</h3>
              <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mobile Phone *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="e.g. 03211234567"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    CNIC (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomer.cnic}
                    onChange={(e) => setNewCustomer({ ...newCustomer, cnic: e.target.value })}
                    placeholder="35201-..."
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Credit Limit (PKR)
                  </label>
                  <input
                    type="number"
                    value={newCustomer.creditLimit || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: parseFloat(e.target.value) || 0 })}
                    placeholder="50000"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="e.g. Model Town, Lahore"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md mt-2"
              >
                Save Customer Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TRANSACTION / PAYMENT RECEIPT MODAL ──────────────────────────── */}
      {activeVoucherData && (
        <PaymentVoucherModal
          data={activeVoucherData}
          onClose={() => setActiveVoucherData(null)}
        />
      )}
    </div>
  );
};
