import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import { useSpeedXScanner } from '../hooks/useSpeedXScanner';
import { UniversalReceiptModal } from '../components/common/UniversalReceiptModal';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Building,
  UserCheck,
  Zap,
  Percent,
  X,
  Smartphone,
} from 'lucide-react';

interface CartItem {
  variantId: string;
  name: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountAmount: number;
  stockQuantity: number;
  customAttributes: Record<string, any>;
}

export const PosTerminalPage: React.FC = () => {
  const { formatPrice, org } = useOrgConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Customer State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'IBFT' | 'KHATA' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Receipt Modal State
  const [completedReceiptData, setCompletedReceiptData] = useState<any | null>(null);

  // Scanner Alert Banner
  const [scannerAlert, setScannerAlert] = useState<{ text: string; time: number } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchCatalog = async (q: string = '') => {
    try {
      const [posRes, catRes] = await Promise.all([
        api.get(`/pos/search?query=${encodeURIComponent(q)}`),
        api.get('/categories'),
      ]);
      if (posRes.variants) setProducts(posRes.variants);
      if (catRes.categories) setCategories(catRes.categories);
    } catch (e) {
      console.error('Failed to load POS catalog:', e);
    }
  };

  useEffect(() => {
    fetchCatalog(searchQuery);
  }, [searchQuery]);

  // SpeedX Barcode Hardware Interceptor
  useSpeedXScanner({
    onScan: (scannedCode) => {
      handleBarcodeScan(scannedCode);
    },
  });

  const handleBarcodeScan = async (code: string) => {
    try {
      const res = await api.get(`/pos/search?query=${encodeURIComponent(code)}`);
      const matched = res.variants?.find((v: any) => v.barcode === code || v.sku === code) || res.variants?.[0];

      if (matched) {
        addToCart(matched);
        setScannerAlert({ text: `SpeedX Scanned: ${matched.product_name} (${matched.sku})`, time: Date.now() });
        setTimeout(() => setScannerAlert(null), 3000);
      } else {
        alert(`No product found for scanned barcode: ${code}`);
      }
    } catch (e) {
      console.error('Scanner lookup failed:', e);
    }
  };

  const addToCart = (v: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === v.variant_id || item.variantId === v.id);
      if (existing) {
        return prev.map((item) =>
          item.variantId === (v.variant_id || v.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          variantId: v.variant_id || v.id,
          name: v.product_name || v.name,
          sku: v.sku,
          barcode: v.barcode,
          unitPrice: Number(v.selling_price || 0),
          costPrice: Number(v.cost_price || 0),
          quantity: 1,
          discountAmount: 0,
          stockQuantity: Number(v.stock_quantity || 0),
          customAttributes: v.custom_attributes || {},
        },
      ];
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from current cart?')) {
      setCart([]);
      setOverallDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, it) => sum + (it.quantity * it.unitPrice) - it.discountAmount, 0);
  const discountedSubtotal = Math.max(0, subtotal - overallDiscount);
  const taxRate = org?.tax_rate || 0;
  const taxAmount = Math.round((discountedSubtotal * taxRate) / 100);
  const grandTotal = Math.round(discountedSubtotal + taxAmount);
  const changeDue = Math.max(0, cashTendered - grandTotal);

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add products to checkout.');
      return;
    }
    setCashTendered(grandTotal);
    setIsCheckoutOpen(true);
  };

  const handleFinalizeSale = async () => {
    if (paymentMethod === 'KHATA' && !customerPhone.trim()) {
      alert('Customer mobile phone is required for Khata Credit sales.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payments = [
        {
          method: paymentMethod === 'SPLIT' ? 'CASH' : paymentMethod,
          amount: grandTotal,
        },
      ];

      const checkoutPayload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountAmount: it.discountAmount,
        })),
        overallDiscount,
        taxRatePercent: taxRate,
        payments,
      };

      const res = await api.post('/pos/checkout', checkoutPayload);

      // Reset cart and open receipt
      setCart([]);
      setOverallDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setIsCheckoutOpen(false);

      if (res.receiptData) {
        setCompletedReceiptData(res.receiptData);
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category_name !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-[#090D16]">
      {/* Scanner Alert Notification */}
      {scannerAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4 fill-current" />
          <span>{scannerAlert.text}</span>
        </div>
      )}

      {/* LEFT COLUMN: Product Catalog Grid & Search */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-[#0E131F]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, barcode, SKU, batch no, IMEI... (SpeedX Ready)"
              className="w-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Items
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === c.name
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const attrList = Object.entries(p.custom_attributes || {}).slice(0, 2);
            return (
              <div
                key={p.variant_id}
                onClick={() => addToCart(p)}
                className="bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3.5 cursor-pointer transition-all flex flex-col justify-between shadow-sm active:scale-95 group"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span className="truncate">{p.sku}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${p.stock_quantity > 5 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {p.stock_quantity} left
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2 leading-tight">
                    {p.product_name}
                  </h4>

                  {attrList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {attrList.map(([k, v], idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 text-[9px] font-semibold rounded">
                          {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    {formatPrice(p.selling_price)}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Billing Register Cart */}
      <div className="w-full lg:w-96 xl:w-[420px] flex flex-col h-full bg-white dark:bg-[#0E131F] border-l border-slate-200 dark:border-slate-800 shadow-xl">
        {/* Cart Header & Customer Form */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Cart Items ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Customer Fast Fields */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (Optional)"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (Auto Khata)"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart className="w-12 h-12 stroke-[1.5]" />
              <p className="text-xs font-bold">Cart is empty</p>
              <p className="text-[11px] text-slate-500">Scan a barcode or click a product</p>
            </div>
          ) : (
            cart.map((it) => (
              <div
                key={it.variantId}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="font-extrabold text-slate-900 dark:text-slate-100 truncate">{it.name}</h5>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>{it.sku}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatPrice(it.unitPrice)}</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(it.variantId, -1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs font-mono">{it.quantity}</span>
                  <button
                    onClick={() => updateQuantity(it.variantId, 1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right flex-shrink-0 w-16">
                  <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 font-mono">
                    {formatPrice(it.quantity * it.unitPrice)}
                  </p>
                  <button
                    onClick={() => removeFromCart(it.variantId)}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Invoice Summary & Checkout Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Subtotal:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatPrice(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Bill Discount:</span>
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 text-xs">Rs.</span>
              <input
                type="number"
                min={0}
                value={overallDiscount || ''}
                onChange={(e) => setOverallDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-right font-bold font-mono focus:outline-none"
              />
            </div>
          </div>

          {taxRate > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Tax ({org?.tax_label || 'GST'} {taxRate}%):</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatPrice(taxAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-extrabold">
            <span className="text-slate-900 dark:text-slate-100">GRAND TOTAL:</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-lg font-mono">{formatPrice(grandTotal)}</span>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Charge {formatPrice(grandTotal)}</span>
          </button>
        </div>
      </div>

      {/* TENDER / PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Select Payment Tender</h3>
                <p className="text-xs text-slate-500">Amount Due: <span className="font-bold font-mono text-emerald-600">{formatPrice(grandTotal)}</span></p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: DollarSign },
                { id: 'CARD', label: 'Card / POS', icon: CreditCard },
                { id: 'IBFT', label: 'Online / Raast', icon: Smartphone },
                { id: 'KHATA', label: 'Khata Credit', icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Tendered & Change Area */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Cash Received from Customer:</label>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-bold font-mono text-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex gap-2">
                  {[grandTotal, Math.ceil(grandTotal / 500) * 500, Math.ceil(grandTotal / 1000) * 1000, 5000].map((amt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCashTendered(amt)}
                      className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-bold rounded-lg font-mono"
                    >
                      {formatPrice(amt)}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Change to Return:</span>
                  <span className="text-sm font-mono text-amber-600">{formatPrice(changeDue)}</span>
                </div>
              </div>
            )}

            {paymentMethod === 'KHATA' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-bold">Khata Ledger Credit Account</p>
                <p>This sale will be recorded as an unpaid debit balance under customer <span className="font-bold underline">{customerName || 'Customer'}</span> ({customerPhone || 'No Phone'}).</p>
              </div>
            )}

            <button
              onClick={handleFinalizeSale}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Finalizing Invoice...' : `Complete Sale & Print Receipt`}</span>
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {completedReceiptData && (
        <UniversalReceiptModal
          receiptData={completedReceiptData}
          onClose={() => setCompletedReceiptData(null)}
        />
      )}
    </div>
  );
};
