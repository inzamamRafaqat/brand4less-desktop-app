import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Check,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';
import { api } from '../../lib/api';

interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSale?: any;
  onSuccess?: () => void;
}

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({
  isOpen,
  onClose,
  initialSale,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'RETURN' | 'EXCHANGE'>('EXCHANGE');
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(initialSale || null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [allVariants, setAllVariants] = useState<any[]>([]);

  // Selected items to return/exchange: map of saleItemId -> { quantity, reason, condition }
  const [returnItems, setReturnItems] = useState<Record<string, { quantity: number; reason: string; condition: string }>>({});

  // Replacement items (for EXCHANGE mode): array of { variantId, quantity, unitPrice }
  const [replacementItems, setReplacementItems] = useState<Array<{ variantId: string; quantity: number; unitPrice: number }>>([
    { variantId: '', quantity: 1, unitPrice: 0 },
  ]);

  const [refundMethod, setRefundMethod] = useState<'CASH' | 'KHATA_CREDIT'>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultSuccess, setResultSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSale) {
      loadSaleDetails(initialSale.id);
    }
    fetchVariants();
  }, [initialSale]);

  const fetchVariants = async () => {
    try {
      const res = await api.get('/products');
      if (res.products) {
        const list: any[] = [];
        res.products.forEach((p: any) => {
          p.variants?.forEach((v: any) => {
            list.push({
              id: v.id,
              sku: v.sku,
              label: `${p.name} - ${v.color || ''} ${v.size ? '(' + v.size + ')' : ''} [PKR ${v.selling_price}]`,
              sellingPrice: Number(v.selling_price),
            });
          });
        });
        setAllVariants(list);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadSaleDetails = async (saleId: string) => {
    setSaleLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.sale) {
        setSelectedSale(res.sale);
        // Pre-select first item
        if (res.sale.items && res.sale.items.length > 0) {
          const first = res.sale.items[0];
          setReturnItems({
            [first.id]: {
              quantity: 1,
              reason: 'SIZE_EXCHANGE',
              condition: 'GOOD',
            },
          });
        }
      }
    } catch (e: any) {
      setErrorMessage('Failed to load sale: ' + (e.message || 'Unknown error'));
    } finally {
      setSaleLoading(false);
    }
  };

  const handleSearchSale = async () => {
    if (!searchInvoice.trim()) return;
    setSaleLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get(`/sales?query=${encodeURIComponent(searchInvoice.trim())}`);
      if (res.sales && res.sales.length > 0) {
        await loadSaleDetails(res.sales[0].id);
      } else {
        setErrorMessage('No sale found with invoice #' + searchInvoice);
      }
    } catch (e: any) {
      setErrorMessage('Search failed: ' + e.message);
    } finally {
      setSaleLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate return credit total
  let totalReturnAmount = 0;
  if (selectedSale?.items) {
    selectedSale.items.forEach((item: any) => {
      const selection = returnItems[item.id];
      if (selection && selection.quantity > 0) {
        const unit = Number(item.unit_price || 0);
        totalReturnAmount += unit * selection.quantity;
      }
    });
  }

  // Calculate replacement total
  let totalReplacementAmount = 0;
  if (mode === 'EXCHANGE') {
    replacementItems.forEach((it) => {
      totalReplacementAmount += (it.unitPrice || 0) * (it.quantity || 1);
    });
  }

  const priceDifference = totalReplacementAmount - totalReturnAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const itemsPayload = Object.entries(returnItems)
      .filter(([_, data]) => data.quantity > 0)
      .map(([saleItemId, data]) => {
        const item = selectedSale?.items?.find((i: any) => i.id === saleItemId);
        return {
          saleItemId,
          variantId: item?.variant_id || item?.variantId,
          quantity: data.quantity,
          refundUnitPrice: Number(item?.unit_price || 0),
          reason: data.reason,
          condition: data.condition,
        };
      });

    if (itemsPayload.length === 0) {
      setErrorMessage('Please select at least 1 item to return or exchange.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'RETURN') {
        const res = await api.post('/returns', {
          originalSaleId: selectedSale.id,
          saleId: selectedSale.id,
          items: itemsPayload,
          refundMethod,
          notes: notes || 'Customer 48-Hour Return',
        });
        setResultSuccess(`Return #${res.returnNumber || 'PROCESSED'} completed! PKR ${totalReturnAmount.toLocaleString()} refunded.`);
      } else {
        // Exchange
        const validReplacements = replacementItems.filter((r) => r.variantId);
        if (validReplacements.length === 0) {
          setErrorMessage('Please select a replacement item for exchange.');
          setSubmitting(false);
          return;
        }

        const res = await api.post('/exchanges', {
          returnDetails: {
            originalSaleId: selectedSale.id,
            saleId: selectedSale.id,
            items: itemsPayload,
            refundMethod: 'EXCHANGE_OFFSET',
          },
          newSaleDetails: {
            customerId: selectedSale.customer_id,
            items: validReplacements.map((r) => ({
              variantId: r.variantId,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
            })),
            payments: priceDifference > 0 ? [{ method: 'CASH', amount: priceDifference }] : [],
          },
        });
        setResultSuccess(`Exchange processed successfully! Difference: PKR ${priceDifference.toLocaleString()}`);
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage('Transaction failed: ' + (err.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto font-sans">
      <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-auto border border-slate-200/80 dark:border-slate-800 space-y-5 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-sm">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Process 48-Hour Return & Exchange
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Restock returned goods, replace sizes/colors, and settle price balances
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold animate-fade-in">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {resultSuccess ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">{resultSuccess}</h4>
            <p className="text-xs text-slate-400">Inventory updated and stock automatically restocked.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMode('EXCHANGE')}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  mode === 'EXCHANGE'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Product Exchange (Change Size/Item)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('RETURN')}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  mode === 'RETURN'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return & Cash Refund</span>
              </button>
            </div>

            {/* Sale Search Bar if not pre-selected */}
            {!selectedSale && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter or scan Invoice # (e.g. INV-1001)..."
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  className="flex-1 py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchSale}
                  className="px-4 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find Order</span>
                </button>
              </div>
            )}

            {selectedSale && (
              <div className="space-y-4">
                {/* Sale Summary Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      Invoice #{selectedSale.invoice_number}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">
                      ({new Date(selectedSale.created_at).toLocaleDateString()} • {selectedSale.customer_name || 'Walk-in Customer'})
                    </span>
                  </div>
                  <span className="font-black text-slate-900 dark:text-white font-mono">
                    Total: PKR {Number(selectedSale.net_total).toLocaleString()}
                  </span>
                </div>

                {/* Section 1: Select Item(s) to Return / Exchange */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    1. Select Items Being Returned / Exchanged:
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-100 dark:border-slate-800 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    {selectedSale.items?.map((item: any) => {
                      const isSelected = !!returnItems[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-white dark:bg-slate-800 border-slate-950 dark:border-white shadow-2xs'
                              : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setReturnItems({
                                    ...returnItems,
                                    [item.id]: { quantity: 1, reason: 'SIZE_EXCHANGE', condition: 'GOOD' },
                                  });
                                } else {
                                  const updated = { ...returnItems };
                                  delete updated[item.id];
                                  setReturnItems(updated);
                                }
                              }}
                              className="w-4 h-4 rounded text-slate-950 border-slate-300 focus:ring-slate-950"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">{item.product_name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {item.color} {item.size ? `(${item.size})` : ''} • Max Qty: {item.quantity}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center space-x-2">
                              <select
                                value={returnItems[item.id]?.reason}
                                onChange={(e) =>
                                  setReturnItems({
                                    ...returnItems,
                                    [item.id]: { ...returnItems[item.id], reason: e.target.value },
                                  })
                                }
                                className="py-1 px-2 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                              >
                                <option value="SIZE_EXCHANGE">Size Mismatch</option>
                                <option value="COLOR_EXCHANGE">Color Exchange</option>
                                <option value="DEFECT">Defective / Damaged</option>
                                <option value="CHANGE_MIND">Customer Change of Mind</option>
                              </select>

                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] text-slate-400">Qty:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={returnItems[item.id]?.quantity || 1}
                                  onChange={(e) =>
                                    setReturnItems({
                                      ...returnItems,
                                      [item.id]: {
                                        ...returnItems[item.id],
                                        quantity: Math.min(item.quantity, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                      },
                                    })
                                  }
                                  className="w-10 text-center font-bold text-xs py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                                />
                              </div>

                              <span className="font-bold text-slate-900 dark:text-white font-mono ml-2">
                                PKR {(Number(item.unit_price) * (returnItems[item.id]?.quantity || 1)).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: If EXCHANGE mode, Select New Replacement Product */}
                {mode === 'EXCHANGE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      2. Select Replacement Product (Trade-in Exchange):
                    </label>
                    <div className="space-y-2 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                      {replacementItems.map((rep, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <select
                            required
                            value={rep.variantId}
                            onChange={(e) => {
                              const updated = [...replacementItems];
                              updated[idx].variantId = e.target.value;
                              const matched = allVariants.find((v) => v.id === e.target.value);
                              if (matched) updated[idx].unitPrice = matched.sellingPrice;
                              setReplacementItems(updated);
                            }}
                            className="flex-1 min-w-0 h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs truncate outline-none"
                          >
                            <option value="">Select Replacement Variant...</option>
                            {allVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={rep.quantity}
                            onChange={(e) => {
                              const updated = [...replacementItems];
                              updated[idx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setReplacementItems(updated);
                            }}
                            className="w-14 h-9 px-2 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs"
                          />

                          <span className="font-bold text-slate-900 dark:text-white font-mono min-w-[90px] text-right">
                            PKR {((rep.unitPrice || 0) * (rep.quantity || 1)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calculation Summary Box */}
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Trade-in / Returned Items Value:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      PKR {totalReturnAmount.toLocaleString()}
                    </span>
                  </div>

                  {mode === 'EXCHANGE' && (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>New Replacement Total:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          PKR {totalReplacementAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-black text-sm">
                        <span className={priceDifference > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {priceDifference > 0
                            ? 'Customer Pays Difference:'
                            : priceDifference < 0
                            ? 'Store Refunds Difference:'
                            : 'Even Exchange Balance:'}
                        </span>
                        <span className="font-mono">
                          PKR {Math.abs(priceDifference).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}

                  {mode === 'RETURN' && (
                    <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-black text-sm text-emerald-600">
                      <span>Total Refund to Customer:</span>
                      <span className="font-mono">PKR {totalReturnAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Submit & Cancel */}
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || totalReturnAmount === 0}
                    className="px-6 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{mode === 'EXCHANGE' ? 'Confirm Exchange' : 'Confirm Return & Refund'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
