import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  ShoppingBag,
  Plus,
  Search,
  DollarSign,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  CreditCard,
  Banknote,
  UploadCloud,
  Receipt,
  Eye,
  Calendar,
  Truck,
  Filter,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { PaymentVoucherModal, VoucherData } from '../components/common/PaymentVoucherModal';

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allVariants, setAllVariants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isPaySupplierOpen, setIsPaySupplierOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<any>(null);
  const [activeVoucherData, setActiveVoucherData] = useState<VoucherData | null>(null);

  // New Purchase Form
  const [purchaseData, setPurchaseData] = useState({
    supplierId: '',
    purchaseInvoiceNo: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    discount: 0,
    paidAmount: 0,
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CARD',
    receiptAttachmentUrl: '',
    notes: '',
    items: [{ variantId: '', quantity: 10, unitCost: 1000 }],
  });

  // Pay Supplier Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD'>('BANK_TRANSFER');
  const [paymentNotes, setPaymentNotes] = useState('');

  const receiptInputRef = useRef<HTMLInputElement>(null);

  const fetchPurchasesData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get(`/purchases?query=${encodeURIComponent(searchQuery)}&supplierId=${selectedSupplierFilter}`),
        api.get('/suppliers'),
        api.get('/products?limit=200'),
      ]);

      if (purRes.purchases) setPurchases(purRes.purchases);
      if (supRes.suppliers) setSuppliers(supRes.suppliers);

      if (prodRes.products) {
        const variantsList: any[] = [];
        prodRes.products.forEach((p: any) => {
          p.variants?.forEach((v: any) => {
            variantsList.push({
              id: v.id,
              label: `${p.name} - ${v.sku} (${v.color || ''} ${v.size || ''})`,
              costPrice: v.cost_price,
            });
          });
        });
        setAllVariants(variantsList);
      }
    } catch (e) {
      console.error('Failed to load purchases:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchasesData();
  }, [searchQuery, selectedSupplierFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      try {
        const res = await api.post('/upload', formData);
        if (res.url) {
          setPurchaseData({ ...purchaseData, receiptAttachmentUrl: res.url });
        }
      } catch (err: any) {
        alert('File upload failed: ' + err.message);
      }
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData.supplierId || purchaseData.items.length === 0) {
      alert('Please select a supplier and add at least one line item.');
      return;
    }

    try {
      const res = await api.post('/purchases', purchaseData);
      setIsNewPurchaseOpen(false);

      const totalBill = purchaseData.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
      const chosenSup = suppliers.find((s) => s.id === purchaseData.supplierId);

      setActiveVoucherData({
        voucherType: 'PURCHASE_BILL',
        voucherNumber: purchaseData.purchaseInvoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
        partyName: chosenSup?.name || 'Supplier',
        companyName: chosenSup?.company_name,
        phone: chosenSup?.phone,
        address: chosenSup?.address,
        date: new Date().toLocaleString(),
        amount: totalBill,
        paymentMethod:
          purchaseData.paidAmount > 0
            ? `${purchaseData.paymentMethod} (Paid: PKR ${purchaseData.paidAmount})`
            : 'Credit Purchase',
        previousBalance: chosenSup?.current_payable || 0,
        newBalance: (chosenSup?.current_payable || 0) + totalBill - purchaseData.paidAmount,
        referenceNote: purchaseData.notes,
        attachmentUrl: purchaseData.receiptAttachmentUrl,
      });

      setPurchaseData({
        supplierId: '',
        purchaseInvoiceNo: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        discount: 0,
        paidAmount: 0,
        paymentMethod: 'CASH',
        receiptAttachmentUrl: '',
        notes: '',
        items: [{ variantId: '', quantity: 10, unitCost: 1000 }],
      });

      fetchPurchasesData();
    } catch (err: any) {
      alert(err.message || 'Purchase creation failed');
    }
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment || paymentAmount <= 0) return;

    try {
      await api.post(`/suppliers/${selectedPurchaseForPayment.supplier_id}/payments`, {
        amount: paymentAmount,
        paymentMethod,
        notes: `Payment for Purchase Invoice #${selectedPurchaseForPayment.purchase_invoice_no}. ${paymentNotes}`,
      });

      setIsPaySupplierOpen(false);

      setActiveVoucherData({
        voucherType: 'SUPPLIER_PAYMENT',
        voucherNumber: `PV-${Date.now().toString().slice(-6)}`,
        partyName: selectedPurchaseForPayment.supplier_name,
        companyName: selectedPurchaseForPayment.company_name,
        phone: selectedPurchaseForPayment.supplier_phone,
        date: new Date().toLocaleString(),
        amount: paymentAmount,
        paymentMethod: paymentMethod,
        referenceNote: `Payment towards Invoice #${selectedPurchaseForPayment.purchase_invoice_no}`,
      });

      setSelectedPurchaseForPayment(null);
      setPaymentAmount(0);
      setPaymentNotes('');
      fetchPurchasesData();
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const openPurchaseVoucher = (p: any) => {
    setActiveVoucherData({
      voucherType: 'PURCHASE_BILL',
      voucherNumber: p.purchase_invoice_no || `PUR-${p.id?.slice(0, 8)}`,
      partyName: p.supplier_name,
      companyName: p.company_name,
      phone: p.supplier_phone,
      date: new Date(p.created_at || p.purchase_date).toLocaleString(),
      amount: Number(p.total_amount || 0),
      paymentMethod: p.paid_amount >= p.total_amount ? 'Fully Paid' : p.paid_amount > 0 ? `Partial (Paid: PKR ${p.paid_amount})` : 'On Credit',
      newBalance: p.balance_due,
      referenceNote: p.notes,
      attachmentUrl: p.receipt_attachment_url,
    });
  };

  // KPIs
  const totalPurchaseValue = purchases.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const totalPaidValue = purchases.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const totalOutstandingDue = purchases.reduce((s, p) => s + Number(p.balance_due || 0), 0);

  // Filtered
  const filteredPurchases = purchases.filter((p) => {
    if (statusFilter === 'PAID') return p.payment_status === 'PAID' || p.balance_due <= 0;
    if (statusFilter === 'PARTIAL') return p.payment_status === 'PARTIAL' || (p.paid_amount > 0 && p.balance_due > 0);
    if (statusFilter === 'UNPAID') return p.payment_status === 'UNPAID' || (p.paid_amount === 0 && p.balance_due > 0);
    return true;
  });

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>Purchases & Vendor Invoices</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              {purchases.length} Invoices
            </span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage inbound vendor bills, automatic Moving Weighted Average Cost (WAC) recalculations, and paper receipt proofs
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewPurchaseOpen(true)}
            className="px-5 py-2.5 rounded-full bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs transition flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* ── KPI STAT CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Purchase Bills</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {purchases.length} Bills
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Inbound vendor shipments</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Inbound Inventory Value</span>
          <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
            PKR {totalPurchaseValue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Gross purchases value</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Paid to Vendors</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            PKR {totalPaidValue.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">Cash & Bank Disbursed</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Outstanding Payables Due</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            PKR {totalOutstandingDue.toLocaleString()}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block font-semibold">Vendor Credit Balance</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow transition-colors">
        <div className="flex space-x-2">
          {[
            { id: 'ALL', label: `All Invoices (${purchases.length})` },
            { id: 'PAID', label: 'Fully Paid' },
            { id: 'PARTIAL', label: 'Partially Paid' },
            { id: 'UNPAID', label: 'Unpaid / Credit' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, supplier name..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition"
            />
          </div>

          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PURCHASES INVOICES TABLE ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Supplier & Company</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Total Bill (PKR)</th>
                <th className="p-4 text-right">Paid Amount (PKR)</th>
                <th className="p-4 text-right">Balance Due</th>
                <th className="p-4 text-center">Payment Status</th>
                <th className="p-4 text-center">Proof / Paper Receipt</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    No purchase bills found. Click "Record New Purchase Bill" to add.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const isPaid = p.balance_due <= 0 || p.payment_status === 'PAID';
                  const isPartial = p.paid_amount > 0 && p.balance_due > 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {p.purchase_invoice_no}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.supplier_name}</span>
                        </div>
                        {p.company_name && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {p.company_name}
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {p.purchase_date || new Date(p.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right font-black text-slate-900 dark:text-white font-mono text-xs">
                        PKR {Number(p.total_amount || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                        PKR {Number(p.paid_amount || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-right font-black text-rose-600 dark:text-rose-400 font-mono text-xs">
                        {p.balance_due > 0 ? `PKR ${Number(p.balance_due).toLocaleString()}` : '— Settled'}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider inline-block ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : isPartial
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'ON CREDIT'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {p.receipt_attachment_url ? (
                          <a
                            href={p.receipt_attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] inline-flex items-center space-x-1 hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>View Proof</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openPurchaseVoucher(p)}
                            title="View / Print Purchase Voucher"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-950 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center space-x-1"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Voucher</span>
                          </button>

                          {p.balance_due > 0 && (
                            <button
                              onClick={() => {
                                setSelectedPurchaseForPayment(p);
                                setPaymentAmount(p.balance_due);
                                setIsPaySupplierOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:bg-slate-850 dark:hover:bg-slate-200 transition shadow-2xs"
                            >
                              Pay Due
                            </button>
                          )}
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

      {/* ── RECORD NEW PURCHASE BILL MODAL ───────────────────────────────── */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Record Inbound Purchase Bill</span>
              </h3>
              <button onClick={() => setIsNewPurchaseOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supplier / Vendor *
                  </label>
                  <select
                    required
                    value={purchaseData.supplierId}
                    onChange={(e) => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.company_name ? `(${s.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Invoice # *
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseData.purchaseInvoiceNo}
                    onChange={(e) => setPurchaseData({ ...purchaseData, purchaseInvoiceNo: e.target.value })}
                    placeholder="e.g. PUR-98214"
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={purchaseData.purchaseDate}
                    onChange={(e) => setPurchaseData({ ...purchaseData, purchaseDate: e.target.value })}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Purchased Line Items (Auto WAC Calculation)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPurchaseData({
                        ...purchaseData,
                        items: [...purchaseData.items, { variantId: '', quantity: 10, unitCost: 1000 }],
                      })
                    }
                    className="text-xs text-slate-900 dark:text-white font-bold hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-7 gap-2 text-[10px] font-bold text-slate-400 uppercase px-1">
                    <span className="col-span-3">Product Variant</span>
                    <span className="col-span-2">Quantity</span>
                    <span className="col-span-2">Unit Cost (PKR)</span>
                  </div>

                  {purchaseData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-7 gap-2 items-center text-xs">
                      <div className="col-span-3">
                        <select
                          required
                          value={item.variantId}
                          onChange={(e) => {
                            const updated = [...purchaseData.items];
                            updated[idx].variantId = e.target.value;
                            setPurchaseData({ ...purchaseData, items: updated });
                          }}
                          className="w-full py-2 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                        >
                          <option value="">Select Variant...</option>
                          {allVariants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          required
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const updated = [...purchaseData.items];
                            updated[idx].quantity = parseInt(e.target.value, 10) || 0;
                            setPurchaseData({ ...purchaseData, items: updated });
                          }}
                          className="w-full py-2 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Unit Cost"
                          required
                          value={item.unitCost || ''}
                          onChange={(e) => {
                            const updated = [...purchaseData.items];
                            updated[idx].unitCost = parseFloat(e.target.value) || 0;
                            setPurchaseData({ ...purchaseData, items: updated });
                          }}
                          className="w-full py-2 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Initial Paid Amount (PKR)
                  </label>
                  <input
                    type="number"
                    value={purchaseData.paidAmount || ''}
                    onChange={(e) => setPurchaseData({ ...purchaseData, paidAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0 if bought on credit"
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Attach Paper Receipt / Invoice PDF
                  </label>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Save Purchase & Ingest Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PAY SUPPLIER DUE MODAL ───────────────────────────────────────── */}
      {isPaySupplierOpen && selectedPurchaseForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Pay Purchase Invoice Due</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedPurchaseForPayment.supplier_name} - Invoice #{selectedPurchaseForPayment.purchase_invoice_no}
                </p>
              </div>
              <button onClick={() => setIsPaySupplierOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Payment Amount (PKR)
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 20000"
                  className="w-full text-lg font-black py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                >
                  <option value="BANK_TRANSFER">Bank IBFT Transfer</option>
                  <option value="CASH">Cash Drawer</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cleared full balance"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md mt-2"
              >
                Confirm Payment & Generate Voucher
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
