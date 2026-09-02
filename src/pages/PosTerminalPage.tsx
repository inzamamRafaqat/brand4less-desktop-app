import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Tag,
  Percent,
  Receipt,
  PauseCircle,
  PlayCircle,
  X,
  CreditCard,
  Banknote,
  Building2,
  BookOpen,
  ChevronDown,
  Sparkles,
  Barcode,
  Check,
  HelpCircle,
  Edit3,
  User,
  Phone,
  UserCheck,
} from 'lucide-react';
import { CategoryAvatar } from '../components/common/CategoryAvatar';
import { ThermalReceiptModal } from '../components/common/ThermalReceiptModal';
import { AdminPinModal } from '../components/common/AdminPinModal';
import { useSpeedXScanner } from '../hooks/useSpeedXScanner';

interface Variant {
  id: string;
  product_id: string;
  sku: string;
  barcode: string;
  color?: string;
  size?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  product_name: string;
  category_name?: string;
  category_icon?: string;
  brand?: string;
  origin?: string;
  image_url?: string;
}

interface GroupedProduct {
  id: string;
  name: string;
  brand?: string;
  origin?: string;
  category_name?: string;
  category_icon?: string;
  image_url?: string;
  variants: Variant[];
  selectedSize?: string;
  selectedColor?: string;
  availableSizes: string[];
  availableColors: string[];
}

interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  color?: string;
  size?: string;
  categoryName?: string;
  categoryIcon?: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  availableStock: number;
  discountAmount: number;
  imageUrl?: string;
}

interface PaymentEntry {
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'KHATA';
  amount: number;
  referenceNote?: string;
}

export const PosTerminalPage: React.FC = () => {
  // Products & Grouping
  const [searchQuery, setSearchQuery] = useState('');
  const [rawVariants, setRawVariants] = useState<Variant[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cart & Calculations
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<{ id: string; name: string; items: CartItem[]; customer: any }[]>([]);
  const [discountCode, setDiscountCode] = useState<string>('');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FLAT'>('FLAT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);

  // Customer Information (Inputs directly in Cart Details)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Payment Dropdown & Checkout Modal
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'KHATA' | 'SPLIT'>('CARD');
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [splitPayments, setSplitPayments] = useState<PaymentEntry[]>([
    { method: 'CASH', amount: 0 },
    { method: 'CARD', amount: 0 },
  ]);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Product Selection Local State (Map of productId -> { selectedSize, selectedColor })
  const [cardSelections, setCardSelections] = useState<Record<string, { size?: string; color?: string }>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // ── 1. FETCH CATEGORIES & PRODUCTS ───────────────────────────────────────
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const catParam = selectedCategory === 'ALL' ? '' : selectedCategory;
      const res = await api.get(`/products/pos-search?q=${encodeURIComponent(searchQuery)}&categoryId=${catParam}`);
      if (res.variants) {
        setRawVariants(res.variants);
        groupVariantsIntoProducts(res.variants);
      }
    } catch (e) {
      console.error('Failed to load POS products', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catRes = await api.get('/categories');
        if (catRes.categories) setCategories(catRes.categories);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const groupVariantsIntoProducts = (variants: Variant[]) => {
    const map = new Map<string, GroupedProduct>();

    variants.forEach((v) => {
      const pId = v.product_id || v.id;
      if (!map.has(pId)) {
        map.set(pId, {
          id: pId,
          name: v.product_name,
          brand: v.brand,
          origin: v.origin,
          category_name: v.category_name,
          category_icon: v.category_icon,
          image_url: v.image_url,
          variants: [],
          availableSizes: [],
          availableColors: [],
        });
      }

      const prod = map.get(pId)!;
      prod.variants.push(v);
      if (v.size && !prod.availableSizes.includes(v.size)) {
        prod.availableSizes.push(v.size);
      }
      if (v.color && !prod.availableColors.includes(v.color)) {
        prod.availableColors.push(v.color);
      }
    });

    setGroupedProducts(Array.from(map.values()));
  };

  // ── 2. LIVE CUSTOMER AUTO-SUGGESTIONS ────────────────────────────────────
  const handleCustomerInputChange = async (field: 'name' | 'phone', value: string) => {
    if (field === 'name') setCustomerName(value);
    if (field === 'phone') setCustomerPhone(value);

    // If typing modifies an already selected customer, unselect to allow custom editing
    if (selectedCustomer) {
      setSelectedCustomer(null);
    }

    const query = value.trim();
    if (query.length >= 2) {
      try {
        const res = await api.get(`/customers?query=${encodeURIComponent(query)}&limit=5`);
        if (res.customers && res.customers.length > 0) {
          setCustomerSuggestions(res.customers);
          setShowSuggestions(true);
        } else {
          setCustomerSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (e) {
        // ignore
      }
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestedCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setShowSuggestions(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setShowSuggestions(false);
  };

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── 3. KEYBOARD SHORTCUTS ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openCheckoutModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === 'Escape') {
        setIsPaymentModalOpen(false);
        setIsReceiptOpen(false);
        setIsPaymentDropdownOpen(false);
        setIsDiscountModalOpen(false);
        setShowSuggestions(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer]);

  // ── SPEEDX HARDWARE BARCODE SCANNER INTEGRATION ─────────────────────────
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  const handleSpeedXBarcodeScan = async (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    // Check in loaded rawVariants array
    const found = rawVariants.find(
      (v) => (v.barcode && v.barcode.toLowerCase() === code.toLowerCase()) ||
             (v.sku && v.sku.toLowerCase() === code.toLowerCase())
    );

    if (found) {
      setLastScannedFeedback(`${found.product_name} (${found.sku})`);
      setTimeout(() => setLastScannedFeedback(null), 3000);

      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.variantId === found.id);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].quantity += 1;
          return updated;
        }

        return [
          ...prev,
          {
            variantId: found.id,
            productId: found.product_id,
            name: found.product_name,
            sku: found.sku,
            barcode: found.barcode,
            color: found.color,
            size: found.size,
            categoryName: found.category_name,
            categoryIcon: found.category_icon,
            unitPrice: found.selling_price,
            unitCost: found.cost_price,
            quantity: 1,
            availableStock: found.stock_quantity,
            discountAmount: 0,
            imageUrl: found.image_url,
          },
        ];
      });
      return;
    }

    // If not found in memory, query backend API
    try {
      const res = await api.get(`/products?query=${encodeURIComponent(code)}`);
      if (res.products && res.products.length > 0) {
        const prod = res.products[0];
        const variant = prod.variants?.find(
          (v: any) => (v.barcode && v.barcode.toLowerCase() === code.toLowerCase()) ||
                      (v.sku && v.sku.toLowerCase() === code.toLowerCase())
        ) || prod.variants?.[0];

        if (variant) {
          setLastScannedFeedback(`${prod.name} (${variant.sku})`);
          setTimeout(() => setLastScannedFeedback(null), 3000);

          setCart((prev) => {
            const existingIdx = prev.findIndex((i) => i.variantId === variant.id);
            if (existingIdx > -1) {
              const updated = [...prev];
              updated[existingIdx].quantity += 1;
              return updated;
            }

            return [
              ...prev,
              {
                variantId: variant.id,
                productId: prod.id,
                name: prod.name,
                sku: variant.sku,
                barcode: variant.barcode,
                color: variant.color,
                size: variant.size,
                categoryName: prod.category_name,
                categoryIcon: prod.category_icon,
                unitPrice: variant.selling_price,
                unitCost: variant.cost_price,
                quantity: 1,
                availableStock: variant.stock_quantity,
                discountAmount: 0,
                imageUrl: prod.image_url,
              },
            ];
          });
        }
      }
    } catch (e) {
      console.error('SpeedX scan lookup error:', e);
    }
  };

  useSpeedXScanner({
    onScan: handleSpeedXBarcodeScan,
    minChars: 3,
    maxIntervalMs: 60,
    enableBeep: true,
  });

  // ── 4. ADD TO CART FROM PRODUCT CARD ────────────────────────────────────
  const getSelectedVariantForProduct = (prod: GroupedProduct): Variant => {
    const userSelection = cardSelections[prod.id] || {};
    const chosenSize = userSelection.size || prod.availableSizes[0];
    const chosenColor = userSelection.color || prod.availableColors[0];

    const matched = prod.variants.find((v) => {
      const matchSize = chosenSize ? v.size === chosenSize : true;
      const matchColor = chosenColor ? v.color === chosenColor : true;
      return matchSize && matchColor;
    });

    return matched || prod.variants[0];
  };

  const handleSelectSize = (productId: string, size: string) => {
    setCardSelections((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), size },
    }));
  };

  const handleSelectColor = (productId: string, color: string) => {
    setCardSelections((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), color },
    }));
  };

  const handleAddToCartFromCard = (prod: GroupedProduct) => {
    const variant = getSelectedVariantForProduct(prod);
    if (!variant) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === variant.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }

      return [
        ...prev,
        {
          variantId: variant.id,
          productId: prod.id,
          name: prod.name,
          sku: variant.sku,
          barcode: variant.barcode || '',
          color: variant.color,
          size: variant.size,
          categoryName: prod.category_name,
          categoryIcon: prod.category_icon,
          unitPrice: Number(variant.selling_price),
          unitCost: Number(variant.cost_price),
          quantity: 1,
          availableStock: variant.stock_quantity,
          discountAmount: 0,
          imageUrl: prod.image_url,
        },
      ];
    });
  };

  const updateQuantity = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(idx);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCart([]);
    setOverallDiscount(0);
    setDiscountValue(0);
    setDiscountCode('');
    handleClearCustomer();
  };

  // ── 5. FINANCIAL CALCULATIONS & COUPON CODES ─────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const calculatedDiscount =
    discountType === 'PERCENT'
      ? Math.round((subtotal * discountValue) / 100)
      : Math.min(subtotal, discountValue);

  const itemDiscounts = cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const totalDiscount = itemDiscounts + calculatedDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = (taxableAmount * taxRatePercent) / 100;
  const grandTotal = Math.round(taxableAmount + taxAmount);

  const handleApplyCouponCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    setDiscountCode(clean);
    if (!clean) {
      setDiscountValue(0);
      return;
    }

    if (clean === 'B4L10') {
      setDiscountType('PERCENT');
      setDiscountValue(10);
    } else if (clean === 'VIP20') {
      setDiscountType('PERCENT');
      setDiscountValue(20);
    } else if (clean === 'FLAT500') {
      setDiscountType('FLAT');
      setDiscountValue(500);
    } else if (clean === 'KMZ-WAY-B7AA') {
      setDiscountType('PERCENT');
      setDiscountValue(15);
    } else {
      const parsedNum = parseFloat(clean);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        setDiscountType('FLAT');
        setDiscountValue(parsedNum);
      }
    }
  };

  // ── 6. CHECKOUT PROCESSING ───────────────────────────────────────────────
  const openCheckoutModal = () => {
    setCheckoutError('');
    setCashTendered(grandTotal);
    setSplitPayments([
      { method: 'CASH', amount: Math.round(grandTotal / 2) },
      { method: 'CARD', amount: Math.round(grandTotal / 2) },
    ]);
    setIsPaymentModalOpen(true);
  };

  const handleProcessCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setCheckoutError('');

    try {
      let paymentsPayload: PaymentEntry[] = [];

      if (paymentMethod === 'SPLIT') {
        const totalSplit = splitPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        if (totalSplit < grandTotal) {
          throw new Error(`Split payments sum (PKR ${totalSplit}) must equal or exceed Grand Total (PKR ${grandTotal}).`);
        }
        paymentsPayload = splitPayments.filter((p) => p.amount > 0);
      } else {
        paymentsPayload = [{ method: paymentMethod, amount: grandTotal }];
      }

      const checkoutPayload = {
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount || 0,
        })),
        overallDiscount: calculatedDiscount,
        taxRatePercent,
        payments: paymentsPayload,
        notes: checkoutNotes,
      };

      const res = await api.post('/pos/checkout', checkoutPayload);

      if (res.sale) {
        setReceiptData(res.receiptData);
        setIsPaymentModalOpen(false);
        setIsReceiptOpen(true);
        clearCart();
        fetchProducts();
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeld = {
      id: String(Date.now()),
      name: `Cart #${heldCarts.length + 1} (${cart.length} items)`,
      items: cart,
      customer: selectedCustomer || { name: customerName, phone: customerPhone },
    };
    setHeldCarts((prev) => [...prev, newHeld]);
    clearCart();
  };

  const getColorHex = (colorName?: string) => {
    if (!colorName) return '#94a3b8';
    const c = colorName.toLowerCase();
    if (c.includes('black') || c.includes('charcoal')) return '#18181b';
    if (c.includes('blue') || c.includes('navy')) return '#1e3a8a';
    if (c.includes('white') || c.includes('pure white')) return '#f8fafc';
    if (c.includes('sky')) return '#38bdf8';
    if (c.includes('green') || c.includes('olive')) return '#15803d';
    if (c.includes('brown') || c.includes('vintage')) return '#78350f';
    if (c.includes('gold') || c.includes('yellow')) return '#eab308';
    if (c.includes('khaki') || c.includes('beige')) return '#d4b996';
    if (c.includes('grey') || c.includes('gray')) return '#64748b';
    if (c.includes('red') || c.includes('maroon')) return '#991b1b';
    return '#475569';
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col lg:flex-row h-full overflow-hidden font-sans transition-colors">
      {/* ── LEFT / MAIN PRODUCT CATALOG SECTION (65%) ─────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden px-8 py-6 space-y-4">
        {/* Header Title & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Select Products
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
              Select a product & proceed to checkout
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search Input Bar */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Products..."
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-full text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition soft-shadow"
              />
            </div>

            {/* Scan Barcode Button */}
            <button
              onClick={() => searchInputRef.current?.focus()}
              className="px-4 py-2 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
            >
              <Barcode className="w-4 h-4" />
              <span>Scan Barcode</span>
            </button>
          </div>
        </div>

        {/* SpeedX Barcode Scanner Live Feedback Alert */}
        {lastScannedFeedback && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs font-bold animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>SpeedX Scanned & Added: <strong>{lastScannedFeedback}</strong></span>
          </div>
        )}

        {/* Category Underline Tabs */}
        <div className="flex space-x-8 border-b border-slate-200/70 dark:border-slate-800 select-none overflow-x-auto pb-0.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`pb-2.5 text-xs font-bold whitespace-nowrap transition-all relative ${
              selectedCategory === 'ALL'
                ? 'text-slate-950 dark:text-white font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Products
            {selectedCategory === 'ALL' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 dark:bg-white rounded-full" />
            )}
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`pb-2.5 text-xs font-bold whitespace-nowrap transition-all relative ${
                  isSelected
                    ? 'text-slate-950 dark:text-white font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.name}
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── PRODUCTS 3-COLUMN GRID ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loadingProducts ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Loading Catalog...</p>
            </div>
          ) : groupedProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {groupedProducts.map((prod) => {
                const currentVariant = getSelectedVariantForProduct(prod);
                const userSelection = cardSelections[prod.id] || {};
                const activeSize = userSelection.size || prod.availableSizes[0];
                const activeColor = userSelection.color || prod.availableColors[0];

                return (
                  <div
                    key={prod.id}
                    className="bg-white dark:bg-[#111827] rounded-3xl p-4 border border-slate-100 dark:border-slate-800 soft-shadow flex flex-col justify-between hover:shadow-md transition group relative overflow-hidden"
                  >
                    {/* Top Image Box */}
                    <div className="bg-slate-100/70 dark:bg-slate-800/60 rounded-2xl h-48 w-full flex items-center justify-center overflow-hidden mb-3 relative">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <CategoryAvatar
                          categoryIcon={prod.category_icon}
                          categoryName={prod.category_name}
                          productName={prod.name}
                          size="card"
                          className="bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      )}

                      {/* Origin Badge */}
                      {prod.origin && (
                        <span className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-200 text-[9px] font-black px-2 py-0.5 rounded-md shadow-2xs uppercase">
                          {prod.origin}
                        </span>
                      )}

                      {/* Stock Pill */}
                      <span className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                        {currentVariant?.stock_quantity || 0} in stock
                      </span>
                    </div>

                    {/* Product Details */}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-black dark:group-hover:text-white">
                        {prod.name}
                      </h3>

                      {/* Size Selector */}
                      {prod.availableSizes.length > 0 && (
                        <div className="mt-2.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                            SIZE
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {prod.availableSizes.map((s) => {
                              const isSizeActive = activeSize === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleSelectSize(prod.id, s)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    isSizeActive
                                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                                      : 'bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Colors Selector */}
                      {prod.availableColors.length > 0 && (
                        <div className="mt-2.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                            COLORS
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {prod.availableColors.map((c) => {
                              const isColorActive = activeColor === c;
                              const hex = getColorHex(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  title={c}
                                  onClick={() => handleSelectColor(prod.id, c)}
                                  style={{ backgroundColor: hex }}
                                  className={`w-5 h-5 rounded-md transition shadow-2xs border border-slate-300/40 ${
                                    isColorActive
                                      ? 'ring-2 ring-slate-950 dark:ring-white ring-offset-2 dark:ring-offset-slate-900'
                                      : 'hover:scale-110'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Price & Add Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                          PKR {Number(currentVariant?.selling_price || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                          Select size and color
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCartFromCard(prod)}
                        className="w-9 h-9 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 active:scale-95 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 select-none">
              <QrCode className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No products found</p>
              <p className="text-xs text-slate-400 dark:text-slate-600">Try selecting "All Products" or clear search</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: "CART DETAILS" SIDEBAR (35%) ──────────────────────── */}
      <div className="w-full lg:w-[420px] bg-white dark:bg-[#0B0F19] border-l border-slate-200/80 dark:border-slate-800 p-6 flex flex-col h-full justify-between flex-shrink-0 z-20 soft-shadow transition-colors">
        {/* Cart Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Cart Details</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Details of all transactions</p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 font-bold hover:underline"
              >
                Delete All
              </button>
            )}
          </div>

          {/* ── CUSTOMER NAME & PHONE INPUTS DIRECTLY IN CART DETAILS ─────── */}
          <div ref={customerDropdownRef} className="relative mb-3 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Customer Information</span>
              </span>

              {selectedCustomer && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center space-x-1">
                  <UserCheck className="w-3 h-3" />
                  <span>Khata: PKR {selectedCustomer.current_balance.toLocaleString()}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Customer Name Input */}
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleCustomerInputChange('name', e.target.value)}
                  placeholder="Customer Name..."
                  className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white font-medium"
                />
              </div>

              {/* Customer Phone Input */}
              <div className="relative">
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => handleCustomerInputChange('phone', e.target.value)}
                  placeholder="Mobile Phone..."
                  className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white font-mono"
                />
                {(customerName || customerPhone) && (
                  <button
                    onClick={handleClearCustomer}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Live Khata Auto-suggest Dropdown */}
            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-40 p-1.5 space-y-1 max-h-48 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase">
                  Existing Khata Customers
                </div>
                {customerSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectSuggestedCustomer(c)}
                    className="w-full p-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.phone}</div>
                    </div>
                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 font-mono">
                      PKR {c.current_balance.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items Count Badge */}
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            {cart.reduce((s, i) => s + i.quantity, 0)} Items Selected
          </div>
        </div>

        {/* Scrollable Cart Items List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-2">
              <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cart is Empty</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600">Select size & color above to add items</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <CategoryAvatar
                    categoryIcon={item.categoryIcon}
                    categoryName={item.categoryName}
                    productName={item.name}
                    imageUrl={item.imageUrl}
                    size="sm"
                    className="bg-transparent text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 overflow-hidden">
                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    {item.categoryName || "MEN'S WEAR"}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate leading-tight mt-0.5">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {item.color ? `Colors: ${item.color}` : ''} {item.size ? ` Size: ${item.size}` : ''}
                  </p>
                </div>

                {/* Price & Stepper */}
                <div className="text-right flex flex-col items-end space-y-1">
                  <div className="text-xs font-black text-slate-950 dark:text-white">
                    PKR {(item.unitPrice * item.quantity).toLocaleString()}
                  </div>
                  <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 shadow-2xs">
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="text-slate-400 hover:text-black dark:hover:text-white font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold text-[11px] w-3 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="text-slate-400 hover:text-black dark:hover:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Checkout & Payment Section */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {/* Payment Method Selector Dropdown Card */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              Payment Method
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                className="w-full bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-950 dark:text-blue-200 font-semibold shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
              >
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    {paymentMethod === 'CARD'
                      ? 'Visa or Debit Card / POS'
                      : paymentMethod === 'CASH'
                      ? 'Cash Payment Counter'
                      : paymentMethod === 'BANK_TRANSFER'
                      ? 'Bank IBFT Transfer'
                      : paymentMethod === 'KHATA'
                      ? 'Khata Customer Credit'
                      : 'Split Multi-Payment'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {isPaymentDropdownOpen && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xl z-30 space-y-1">
                  {[
                    { id: 'CARD', label: 'Visa or Debit Card / POS', icon: CreditCard },
                    { id: 'CASH', label: 'Cash Payment Counter', icon: Banknote },
                    { id: 'BANK_TRANSFER', label: 'Bank IBFT Transfer', icon: Building2 },
                    { id: 'KHATA', label: 'Customer Khata Credit', icon: BookOpen },
                    { id: 'SPLIT', label: 'Split Multi-Payment', icon: Percent },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setPaymentMethod(m.id as any);
                        setIsPaymentDropdownOpen(false);
                      }}
                      className="w-full p-2 rounded-xl text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 transition"
                    >
                      <m.icon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Discount Code Card & Interactive Discount Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Discount Code / Promo
              </label>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(true)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>Custom Discount</span>
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs shadow-2xs">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => handleApplyCouponCode(e.target.value)}
                placeholder="Enter coupon (e.g. B4L10, FLAT500)..."
                className="font-mono font-bold text-slate-900 dark:text-white tracking-wider bg-transparent focus:outline-none flex-1 uppercase text-xs"
              />
              {calculatedDiscount > 0 ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] flex-shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              ) : (
                <Tag className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center space-x-1">
                <span>Total Product Price</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </span>
              <span className="text-slate-900 dark:text-white font-bold">PKR {subtotal.toLocaleString()}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center space-x-1">
                  <span>Discount</span>
                  <HelpCircle className="w-3 h-3 text-emerald-500" />
                </span>
                <span>- PKR {totalDiscount.toLocaleString()}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center space-x-1">
                  <span>Product Tax</span>
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                </span>
                <span className="text-slate-900 dark:text-white font-bold">PKR {taxAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1">
                <span>Grand Total</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <span className="text-lg font-black text-slate-950 dark:text-white">
                PKR {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Proceed to Payment Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={openCheckoutModal}
            className="w-full py-4 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 active:scale-[0.99] disabled:opacity-40 text-white font-black text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-lg transition"
          >
            <Receipt className="w-4 h-4" />
            <span>Proceed to Payment</span>
          </button>
        </div>
      </div>

      {/* ── 7. INTERACTIVE DISCOUNT MODAL ─────────────────────────────────── */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Apply Sale Discount</h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Percentage Presets */}
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2">Quick Percentage Off</span>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountType('PERCENT');
                      setDiscountValue(pct);
                      setDiscountCode(`${pct}% OFF`);
                      setIsDiscountModalOpen(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      discountType === 'PERCENT' && discountValue === pct
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Custom Fixed Amount (PKR)</span>
              <input
                type="number"
                value={discountType === 'FLAT' ? discountValue || '' : ''}
                onChange={(e) => {
                  setDiscountType('FLAT');
                  const val = parseFloat(e.target.value) || 0;
                  setDiscountValue(val);
                  setDiscountCode(val > 0 ? `FLAT ${val}` : '');
                }}
                placeholder="e.g. 500 or 1000 PKR"
                className="w-full text-base font-bold py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountValue(0);
                  setDiscountCode('');
                  setIsDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Clear Discount
              </button>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-sm"
              >
                Apply &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. PAYMENT / CHECKOUT MODAL ───────────────────────────────────── */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Complete Payment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {customerName ? `Customer: ${customerName} (${customerPhone || 'Walk-in'})` : 'Walk-in Cash Sale'}
                </p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-2 text-rose-700 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Total Due Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Total Payable Amount</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  PKR {grandTotal.toLocaleString()}
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
            </div>

            {/* Payment Method Details */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Cash Tendered from Customer (PKR)
                  </label>
                  <input
                    type="number"
                    autoFocus
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                    placeholder="Enter cash received..."
                    className="w-full text-xl font-black py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
                  />
                </div>

                <div className="flex gap-2">
                  {[500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashTendered((prev) => prev + amt)}
                      className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      +{amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashTendered(grandTotal)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition shadow-2xs"
                  >
                    Exact
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Change to Return:</span>
                  <span className={`font-black text-lg ${cashTendered >= grandTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    PKR {Math.max(0, cashTendered - grandTotal).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Checkout Button */}
            <button
              onClick={handleProcessCheckout}
              disabled={isCheckingOut || (paymentMethod === 'CASH' && cashTendered < grandTotal)}
              className="w-full py-4 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 active:scale-[0.99] text-white font-black text-sm rounded-2xl transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              {isCheckingOut ? (
                <span>Recording Sale & Printing Receipt...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Payment & Print Thermal Receipt &rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {isReceiptOpen && receiptData && (
        <ThermalReceiptModal
          receiptData={receiptData}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
