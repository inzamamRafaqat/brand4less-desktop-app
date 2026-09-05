import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import {
  Truck,
  Plus,
  Search,
  PackageCheck,
  DollarSign,
  Building,
  Calendar,
  X,
  CheckCircle2,
} from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const { formatPrice } = useOrgConfig();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Purchase Bill Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<any[]>([
    { variantId: '', quantity: 10, unitCost: 0 },
  ]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [notes, setNotes] = useState('');

  // New Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppCompany, setNewSuppCompany] = useState('');
  const [newSuppPhone, setNewSuppPhone] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [purRes, suppRes, prodRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/pos/search'),
      ]);
      if (purRes.purchases) setPurchases(purRes.purchases);
      if (suppRes.suppliers) {
        setSuppliers(suppRes.suppliers);
        if (!supplierId && suppRes.suppliers.length > 0) setSupplierId(suppRes.suppliers[0].id);
      }
      if (prodRes.variants) {
        setProducts(prodRes.variants);
        if (items[0] && !items[0].variantId && prodRes.variants.length > 0) {
          setItems([{ variantId: prodRes.variants[0].variant_id || prodRes.variants[0].id, quantity: 10, unitCost: prodRes.variants[0].cost_price || 0 }]);
        }
      }
    } catch (e) {
      console.error('Failed to load purchases:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { variantId: products[0]?.variant_id || '', quantity: 10, unitCost: products[0]?.cost_price || 0 },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const billSubtotal = items.reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      alert('Please select a supplier and add at least one item.');
      return;
    }

    try {
      await api.post('/purchases', {
        supplierId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        items: items.map((it) => ({
          variantId: it.variantId,
          quantity: Number(it.quantity || 0),
          unitCost: Number(it.unitCost || 0),
        })),
        paidAmount: Number(paidAmount || 0),
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(`Save purchase failed: ${err.message}`);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName.trim()) return;

    try {
      const res = await api.post('/suppliers', {
        name: newSuppName.trim(),
        companyName: newSuppCompany.trim() || undefined,
        phone: newSuppPhone.trim() || undefined,
      });
      if (res.supplier) {
        setSuppliers((prev) => [...prev, res.supplier]);
        setSupplierId(res.supplier.id);
      }
      setIsSupplierModalOpen(false);
      setNewSuppName('');
      setNewSuppCompany('');
      setNewSuppPhone('');
    } catch (err: any) {
      alert(`Save supplier failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Inbound Consignments & Supplier Bills
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Receive stock from vendors, track supplier payables, and automatically recalculate Moving WAC.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5"
          >
            <Building className="w-4 h-4" />
            <span>New Supplier</span>
          </button>

          <button
            onClick={() => {
              setPaidAmount(billSubtotal);
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>New Inbound Bill</span>
          </button>
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Bill / Invoice #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Date Received</th>
                <th className="py-3.5 px-4">Items Received</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Paid Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    No purchase bills recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {pur.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{pur.supplier_name}</div>
                      {pur.supplier_company && (
                        <div className="text-[10px] text-slate-400">{pur.supplier_company}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(pur.received_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono">{pur.items?.length || 0} line items</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          pur.payment_status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {pur.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {formatPrice(pur.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      {formatPrice(pur.paid_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW INBOUND BILL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Record Inbound Purchase Bill</h3>
                <p className="text-xs text-slate-500">Add stock consignment & recalculate moving weighted average costs.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.company_name ? `(${s.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vendor Bill / Ref #</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. BILL-99201"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Purchased Items ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3"
                    >
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500">Product Variant</label>
                        <select
                          value={it.variantId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = products.find((p) => (p.variant_id || p.id) === val);
                            setItems((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, variantId: val, unitCost: matched?.cost_price || item.unitCost } : item
                              )
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        >
                          {products.map((p) => (
                            <option key={p.variant_id || p.id} value={p.variant_id || p.id}>
                              {p.product_name || p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="text-[10px] font-bold text-slate-500">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item)));
                          }}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[10px] font-bold text-slate-500">Unit Cost</label>
                        <input
                          type="number"
                          value={it.unitCost || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, unitCost: val } : item)));
                          }}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono text-right"
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg self-end mb-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Paid Amount</label>
                  <input
                    type="number"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                  />
                </div>

                <div className="text-right flex flex-col justify-end">
                  <span className="text-xs text-slate-500">Grand Total:</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    {formatPrice(billSubtotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
                >
                  Save Inbound Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Add New Supplier</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={newSuppName}
                  onChange={(e) => setNewSuppName(e.target.value)}
                  placeholder="e.g. Aslam Khan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Mill Name</label>
                <input
                  type="text"
                  value={newSuppCompany}
                  onChange={(e) => setNewSuppCompany(e.target.value)}
                  placeholder="e.g. Lahore Garments Wholesale Ltd"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newSuppPhone}
                  onChange={(e) => setNewSuppPhone(e.target.value)}
                  placeholder="0300 0000000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
