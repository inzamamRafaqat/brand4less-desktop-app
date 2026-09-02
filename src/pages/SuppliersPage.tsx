import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  Truck,
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
} from 'lucide-react';
import { PaymentVoucherModal, VoucherData } from '../components/common/PaymentVoucherModal';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [supplierLedger, setSupplierLedger] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isPaySupplierOpen, setIsPaySupplierOpen] = useState(false);
  const [activeVoucherData, setActiveVoucherData] = useState<VoucherData | null>(null);

  // New Supplier Form
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    companyName: '',
    phone: '',
    address: '',
  });

  // New Purchase Form
  const [allVariants, setAllVariants] = useState<any[]>([]);
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

  // Supplier Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD'>('BANK_TRANSFER');
  const [paymentNotes, setPaymentNotes] = useState('');

  const receiptInputRef = useRef<HTMLInputElement>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const [supRes, purRes] = await Promise.all([
        api.get(`/suppliers?query=${encodeURIComponent(searchQuery)}`),
        api.get('/purchases'),
      ]);

      if (supRes.suppliers) {
        setSuppliers(supRes.suppliers);
        if (!selectedSupplier && supRes.suppliers.length > 0) {
          loadSupplierDetails(supRes.suppliers[0]);
        }
      }
      if (purRes.purchases) setPurchases(purRes.purchases);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery]);

  const loadSupplierDetails = async (sup: any) => {
    setSelectedSupplier(sup);
    try {
      const res = await api.get(`/suppliers/${sup.id}/ledger`);
      if (res.entries) setSupplierLedger(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadVariants = async () => {
    try {
      const res = await api.get('/products?limit=200');
      if (res.products) {
        const variantsList: any[] = [];
        res.products.forEach((p: any) => {
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
      console.error(e);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.phone) return;
    try {
      const res = await api.post('/suppliers', newSupplier);
      if (res.supplier) {
        setIsAddSupplierOpen(false);
        setNewSupplier({ name: '', companyName: '', phone: '', address: '' });
        fetchSuppliers();
        loadSupplierDetails(res.supplier);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier');
    }
  };

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
    if (!purchaseData.supplierId || purchaseData.items.length === 0) return;

    try {
      const res = await api.post('/purchases', purchaseData);
      setIsNewPurchaseOpen(false);

      const totalBill = purchaseData.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

      setActiveVoucherData({
        voucherType: 'PURCHASE_BILL',
        voucherNumber: purchaseData.purchaseInvoiceNo,
        partyName: selectedSupplier?.name || 'Supplier',
        companyName: selectedSupplier?.company_name,
        phone: selectedSupplier?.phone,
        address: selectedSupplier?.address,
        date: new Date().toLocaleString(),
        amount: totalBill,
        paymentMethod: purchaseData.paidAmount > 0 ? `${purchaseData.paymentMethod} (Paid: PKR ${purchaseData.paidAmount})` : 'Credit Purchase',
        previousBalance: selectedSupplier?.current_payable || 0,
        newBalance: (selectedSupplier?.current_payable || 0) + totalBill - purchaseData.paidAmount,
        referenceNote: purchaseData.notes,
        attachmentUrl: purchaseData.receiptAttachmentUrl,
      });

      fetchSuppliers();
      if (selectedSupplier) loadSupplierDetails(selectedSupplier);
    } catch (err: any) {
      alert(err.message || 'Purchase creation failed');
    }
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || paymentAmount <= 0) return;

    try {
      await api.post(`/suppliers/${selectedSupplier.id}/payments`, {
        amount: paymentAmount,
        paymentMethod,
        notes: paymentNotes,
      });

      setIsPaySupplierOpen(false);

      setActiveVoucherData({
        voucherType: 'SUPPLIER_PAYMENT',
        voucherNumber: `PV-${Date.now().toString().slice(-6)}`,
        partyName: selectedSupplier.name,
        companyName: selectedSupplier.company_name,
        phone: selectedSupplier.phone,
        address: selectedSupplier.address,
        date: new Date().toLocaleString(),
        amount: paymentAmount,
        paymentMethod: paymentMethod,
        previousBalance: selectedSupplier.current_payable,
        newBalance: Math.max(0, selectedSupplier.current_payable - paymentAmount),
        referenceNote: paymentNotes,
      });

      setPaymentAmount(0);
      setPaymentNotes('');
      fetchSuppliers();
      loadSupplierDetails(selectedSupplier);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const openLedgerRowVoucher = (entry: any) => {
    if (!selectedSupplier) return;
    const isPayment = entry.debit > 0;
    const amount = isPayment ? entry.debit : entry.credit;

    setActiveVoucherData({
      voucherType: isPayment ? 'SUPPLIER_PAYMENT' : 'PURCHASE_BILL',
      voucherNumber: entry.reference_id || `SUP-${entry.id?.slice(0, 8)}`,
      partyName: selectedSupplier.name,
      companyName: selectedSupplier.company_name,
      phone: selectedSupplier.phone,
      address: selectedSupplier.address,
      date: new Date(entry.created_at).toLocaleString(),
      amount: amount,
      paymentMethod: isPayment ? 'Recorded Supplier Payment' : 'Purchase Bill',
      newBalance: entry.running_payable,
      referenceNote: entry.notes,
    });
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col lg:flex-row h-full overflow-hidden font-sans transition-colors">
      {/* ── LEFT PANEL: SUPPLIER DIRECTORY (35%) ─────────────────────────── */}
      <div className="w-full lg:w-96 bg-white dark:bg-[#0B0F19] border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-hidden soft-shadow transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Truck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Suppliers & Payables</span>
            </h3>
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="px-3.5 py-1.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-full transition flex items-center space-x-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suppliers or companies..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition"
            />
          </div>
        </div>

        {/* Suppliers List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {suppliers.map((s) => {
            const isSelected = selectedSupplier?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => loadSupplierDetails(s)}
                className={`w-full p-3.5 rounded-2xl text-left transition flex items-center justify-between border ${
                  isSelected
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-sm'
                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                }`}
              >
                <div className="overflow-hidden pr-2">
                  <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'}`}>
                    {s.name}
                  </h4>
                  <p className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
                    {s.company_name || s.phone}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-xs font-black block ${
                      isSelected
                        ? 'text-white dark:text-slate-950'
                        : s.current_payable > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    PKR {s.current_payable.toLocaleString()}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                    Payable Balance
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: SUPPLIER DETAILS & PURCHASES (65%) ───────────────── */}
      <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col h-full overflow-hidden p-8 transition-colors">
        {selectedSupplier ? (
          <div className="flex flex-col h-full space-y-4">
            {/* Supplier Banner */}
            <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4 soft-shadow transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{selectedSupplier.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    <span>Company: {selectedSupplier.company_name || 'N/A'}</span>
                    <span className="font-mono">Phone: {selectedSupplier.phone}</span>
                    {selectedSupplier.address && <span>Address: {selectedSupplier.address}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Current Payable</span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    PKR {selectedSupplier.current_payable.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => {
                    loadVariants();
                    setPurchaseData({ ...purchaseData, supplierId: selectedSupplier.id });
                    setIsNewPurchaseOpen(true);
                  }}
                  className="px-4 py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-full shadow-sm transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Purchase Bill</span>
                </button>

                <button
                  onClick={() => setIsPaySupplierOpen(true)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-full border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Make Payment</span>
                </button>
              </div>
            </div>

            {/* Supplier Ledger Table */}
            <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col soft-shadow transition-colors">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Supplier Ledger & Purchases History (Click any entry to view/print receipt)
                </h4>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Entry Type</th>
                      <th className="p-3.5">Invoice / Ref #</th>
                      <th className="p-3.5 text-right">Bill Amount (+)</th>
                      <th className="p-3.5 text-right">Payment (-)</th>
                      <th className="p-3.5 text-right">Running Payable</th>
                      <th className="p-3.5">Notes</th>
                      <th className="p-3.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {supplierLedger?.entries?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          No purchases or payments recorded for this supplier yet.
                        </td>
                      </tr>
                    ) : (
                      supplierLedger?.entries?.map((e: any) => (
                        <tr
                          key={e.id}
                          onClick={() => openLedgerRowVoucher(e)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                        >
                          <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {new Date(e.created_at).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {e.entry_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-900 dark:text-white font-bold">
                            {e.reference_id}
                          </td>
                          <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {e.credit > 0 ? `+ PKR ${e.credit.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {e.debit > 0 ? `- PKR ${e.debit.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-950 dark:text-white font-black">
                            PKR {e.running_payable.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-slate-400 dark:text-slate-500 text-[11px]">{e.notes || '—'}</td>
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
            <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Select a supplier to manage purchases and ledger</p>
          </div>
        )}
      </div>

      {/* ── NEW PURCHASE BILL MODAL ──────────────────────────────────────── */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Record New Purchase Bill</h3>
              <button onClick={() => setIsNewPurchaseOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseData.purchaseInvoiceNo}
                    onChange={(e) => setPurchaseData({ ...purchaseData, purchaseInvoiceNo: e.target.value })}
                    placeholder="e.g. PUR-98214"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
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
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Line Items (Auto WAC Recalculation)</span>
                  <button
                    type="button"
                    onClick={() => setPurchaseData({
                      ...purchaseData,
                      items: [...purchaseData.items, { variantId: '', quantity: 10, unitCost: 1000 }],
                    })}
                    className="text-xs text-slate-900 dark:text-white font-bold hover:underline"
                  >
                    + Add Row
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
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
                          className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
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
                          className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
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
                          className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
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
                    placeholder="0 if on credit"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Attach Paper Receipt Photo / PDF
                  </label>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md mt-3"
              >
                Confirm Purchase & Update Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── PAY SUPPLIER MODAL ───────────────────────────────────────────── */}
      {isPaySupplierOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Payment to Supplier</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSupplier.name}</p>
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
                  className="w-full text-lg font-black py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Voucher / Reference Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Online IBFT transfer reference"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md"
              >
                Record Supplier Payment & View Voucher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── NEW SUPPLIER MODAL ───────────────────────────────────────────── */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Add New Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Supplier / Representative Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="e.g. Ali Garments"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Company / Factory Name
                </label>
                <input
                  type="text"
                  value={newSupplier.companyName}
                  onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })}
                  placeholder="e.g. Ali Garments Ltd"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder="e.g. 03019876543"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder="e.g. Textile Market, Faisalabad"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md"
              >
                Save Supplier
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
