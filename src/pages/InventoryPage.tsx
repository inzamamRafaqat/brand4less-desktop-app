import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Trash2,
  Edit2,
  Tag,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Barcode,
  Printer,
} from 'lucide-react';
import { CategoryAvatar } from '../components/common/CategoryAvatar';
import { useAuth } from '../context/AuthContext';
import { BarcodeLabelModal, BarcodeItem } from '../components/common/BarcodeLabelModal';

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOW_STOCK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeModalItems, setBarcodeModalItems] = useState<BarcodeItem[]>([]);
  const [selectedVariantForAdjust, setSelectedVariantForAdjust] = useState<any>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    movementType: 'MANUAL_ADJUSTMENT' as 'MANUAL_ADJUSTMENT' | 'DAMAGED_WRITE_OFF' | 'OPENING_STOCK',
    quantityChange: 0,
    notes: '',
  });

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    categoryId: '',
    brand: 'Brand 4 Less',
    origin: 'Local' as 'Local' | 'Imported',
    description: '',
    variants: [
      { color: 'Black', size: 'M', costPrice: 1000, sellingPrice: 1800, stockQuantity: 10, minStockLevel: 3 },
      { color: 'Black', size: 'L', costPrice: 1000, sellingPrice: 1800, stockQuantity: 10, minStockLevel: 3 },
    ],
  });

  // Edit Product Form State
  const [editProduct, setEditProduct] = useState<{
    id: string;
    name: string;
    categoryId: string;
    brand: string;
    origin: 'Local' | 'Imported';
    description: string;
    variants: any[];
  } | null>(null);

  const { hasRole } = useAuth();

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, lowRes] = await Promise.all([
        api.get(`/products?query=${encodeURIComponent(searchQuery)}&categoryId=${selectedCategory}`),
        api.get('/categories'),
        api.get('/products/low-stock'),
      ]);

      if (prodRes.products) setProducts(prodRes.products);
      if (catRes.categories) setCategories(catRes.categories);
      if (lowRes.items) setLowStockItems(lowRes.items);
    } catch (e) {
      console.error('Error fetching inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [searchQuery, selectedCategory]);

  const handleAddVariantRow = () => {
    setNewProduct((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { color: 'Navy', size: 'XL', costPrice: 1000, sellingPrice: 1800, stockQuantity: 5, minStockLevel: 3 },
      ],
    }));
  };

  const handleRemoveVariantRow = (idx: number) => {
    setNewProduct((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.categoryId || newProduct.variants.length === 0) {
      alert('Please fill product name, select category, and add at least one variant.');
      return;
    }

    try {
      await api.post('/products', newProduct);
      setIsAddModalOpen(false);
      fetchInventory();
      setNewProduct({
        name: '',
        categoryId: '',
        brand: 'Brand 4 Less',
        origin: 'Local',
        description: '',
        variants: [
          { color: 'Black', size: 'M', costPrice: 1000, sellingPrice: 1800, stockQuantity: 10, minStockLevel: 3 },
        ],
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  };

  const openEditModal = (prod: any) => {
    setEditProduct({
      id: prod.id,
      name: prod.name,
      categoryId: prod.category_id,
      brand: prod.brand || 'Brand 4 Less',
      origin: (prod.origin || 'Local') as any,
      description: prod.description || '',
      variants: (prod.variants || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        color: v.color || '',
        size: v.size || '',
        costPrice: Number(v.cost_price),
        sellingPrice: Number(v.selling_price),
        stockQuantity: v.stock_quantity,
        minStockLevel: v.min_stock_level || 3,
      })),
    });
    setIsEditModalOpen(true);
  };

  const handleAddEditVariantRow = () => {
    if (!editProduct) return;
    setEditProduct({
      ...editProduct,
      variants: [
        ...editProduct.variants,
        { color: 'Navy', size: 'XL', costPrice: 1000, sellingPrice: 1800, stockQuantity: 0, minStockLevel: 3 },
      ],
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;

    try {
      await api.put(`/products/${editProduct.id}`, {
        name: editProduct.name,
        categoryId: editProduct.categoryId,
        brand: editProduct.brand,
        origin: editProduct.origin,
        description: editProduct.description,
        variants: editProduct.variants,
      });

      setIsEditModalOpen(false);
      setEditProduct(null);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantForAdjust || adjustmentData.quantityChange === 0) return;

    try {
      await api.post('/inventory/adjust', {
        variantId: selectedVariantForAdjust.id,
        movementType: adjustmentData.movementType,
        quantityChange: adjustmentData.quantityChange,
        notes: adjustmentData.notes,
      });

      setIsAdjustModalOpen(false);
      setSelectedVariantForAdjust(null);
      setAdjustmentData({ movementType: 'MANUAL_ADJUSTMENT', quantityChange: 0, notes: '' });
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed');
    }
  };

  const printAllBarcodes = () => {
    const list: BarcodeItem[] = [];
    products.forEach((p) => {
      p.variants?.forEach((v: any) => {
        list.push({
          name: p.name,
          categoryName: p.category_name,
          color: v.color,
          size: v.size,
          sellingPrice: Number(v.selling_price),
          sku: v.sku,
          barcode: v.barcode || v.sku,
          quantity: v.stock_quantity,
        });
      });
    });

    if (list.length === 0) {
      alert('No product variants available to print barcodes for.');
      return;
    }

    setBarcodeModalItems(list);
    setIsBarcodeModalOpen(true);
  };

  const printSingleProductBarcodes = (prod: any) => {
    const list: BarcodeItem[] = [];
    prod.variants?.forEach((v: any) => {
      list.push({
        name: prod.name,
        categoryName: prod.category_name,
        color: v.color,
        size: v.size,
        sellingPrice: Number(v.selling_price),
        sku: v.sku,
        barcode: v.barcode || v.sku,
        quantity: v.stock_quantity,
      });
    });

    setBarcodeModalItems(list);
    setIsBarcodeModalOpen(true);
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Product Catalog & Inventory</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              {products.length} Products
            </span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage multi-variant garments, accessories, edit product details, adjust stock, and generate scannable barcode sticker sheets
          </p>
        </div>

        {hasRole('ADMIN', 'MANAGER') && (
          <div className="flex items-center space-x-3">
            <button
              onClick={printAllBarcodes}
              className="px-4 py-2.5 rounded-full bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-800 transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Barcode className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Print Barcode Labels</span>
            </button>

            <button
              onClick={() => {
                if (categories.length > 0 && !newProduct.categoryId) {
                  setNewProduct({ ...newProduct, categoryId: categories[0].id });
                }
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-full bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs transition flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow transition-colors">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ALL'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('LOW_STOCK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'LOW_STOCK'
                ? 'bg-amber-500 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts ({lowStockItems.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, SKU, brand..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PRODUCTS TABLE ───────────────────────────────────────────────── */}
      {activeTab === 'ALL' ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Origin / Brand</th>
                  <th className="p-4">Variants</th>
                  <th className="p-4">Total Stock</th>
                  <th className="p-4">Price Range</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No products found. Add products manually or use Bulk Excel Import.
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <CategoryAvatar
                            categoryIcon={prod.category_icon}
                            categoryName={prod.category_name}
                            productName={prod.name}
                            imageUrl={prod.image_url}
                            size="sm"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">{prod.name}</h4>
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 font-mono">
                              {prod.variants?.length || 0} variant(s)
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {prod.category_name}
                        </span>
                      </td>

                      <td className="p-4 text-slate-700 dark:text-slate-300">
                        <div className="font-medium">{prod.brand || 'Brand 4 Less'}</div>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase inline-block mt-0.5 ${
                          prod.origin === 'Imported'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {prod.origin}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {prod.variants?.map((v: any) => (
                            <span
                              key={v.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-medium"
                            >
                              {v.color ? `${v.color} ` : ''}{v.size ? `(${v.size})` : ''} -{' '}
                              <strong className="text-slate-900 dark:text-white">{v.stock_quantity}</strong>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {prod.total_stock} units
                        </span>
                      </td>

                      <td className="p-4 font-black text-slate-900 dark:text-white">
                        {prod.min_price === prod.max_price
                          ? `PKR ${Number(prod.min_price || 0).toLocaleString()}`
                          : `PKR ${Number(prod.min_price || 0).toLocaleString()} - ${Number(prod.max_price || 0).toLocaleString()}`}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => printSingleProductBarcodes(prod)}
                            title="Print Barcode Stickers"
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-950 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 transition"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(prod)}
                            className="px-3 py-1.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs transition flex items-center space-x-1 shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (prod.variants && prod.variants.length > 0) {
                                setSelectedVariantForAdjust(prod.variants[0]);
                                setIsAdjustModalOpen(true);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                          >
                            Adjust
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
      ) : (
        /* LOW STOCK ALERTS VIEW */
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Products Requiring Immediate Reorder</span>
            </div>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{lowStockItems.length} items low in stock</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Product Name</th>
                <th className="p-4">SKU Code</th>
                <th className="p-4">Color / Size</th>
                <th className="p-4">Current Stock</th>
                <th className="p-4">Min Threshold</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lowStockItems.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <CategoryAvatar categoryIcon={v.category_icon} categoryName={v.category_name} size="sm" />
                    <span>{v.product_name}</span>
                  </td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{v.sku}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{v.color || '-'} / {v.size || '-'}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-black border border-rose-200 dark:border-rose-800 text-[10px]">
                      {v.stock_quantity} left
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{v.min_stock_level} units</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedVariantForAdjust(v);
                        setIsAdjustModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs transition hover:bg-slate-850 dark:hover:bg-slate-200"
                    >
                      Restock / Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── EDIT PRODUCT MODAL ──────────────────────────────────────────── */}
      {isEditModalOpen && editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-3xl p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-slate-900 dark:text-white" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Product & Variants</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={editProduct.categoryId}
                    onChange={(e) => setEditProduct({ ...editProduct, categoryId: e.target.value })}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={editProduct.brand}
                    onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Origin
                  </label>
                  <select
                    value={editProduct.origin}
                    onChange={(e) => setEditProduct({ ...editProduct, origin: e.target.value as any })}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  >
                    <option value="Local">Local</option>
                    <option value="Imported">Imported</option>
                  </select>
                </div>
              </div>

              {/* Edit Variants Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Edit Product Variants & Retail Pricing
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEditVariantRow}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-950 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Variant</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-6 gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">
                    <span>Color</span>
                    <span>Size</span>
                    <span>Cost Price</span>
                    <span>Selling Price</span>
                    <span>Min Stock</span>
                    <span>SKU Code</span>
                  </div>

                  {editProduct.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center text-xs">
                      <input
                        type="text"
                        placeholder="Color"
                        value={v.color}
                        onChange={(e) => {
                          const updated = [...editProduct.variants];
                          updated[idx].color = e.target.value;
                          setEditProduct({ ...editProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Size"
                        value={v.size}
                        onChange={(e) => {
                          const updated = [...editProduct.variants];
                          updated[idx].size = e.target.value;
                          setEditProduct({ ...editProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={v.costPrice || ''}
                        onChange={(e) => {
                          const updated = [...editProduct.variants];
                          updated[idx].costPrice = parseFloat(e.target.value) || 0;
                          setEditProduct({ ...editProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Selling Price"
                        value={v.sellingPrice || ''}
                        onChange={(e) => {
                          const updated = [...editProduct.variants];
                          updated[idx].sellingPrice = parseFloat(e.target.value) || 0;
                          setEditProduct({ ...editProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Min Stock"
                        value={v.minStockLevel || ''}
                        onChange={(e) => {
                          const updated = [...editProduct.variants];
                          updated[idx].minStockLevel = parseInt(e.target.value, 10) || 3;
                          setEditProduct({ ...editProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate px-1">
                        {v.sku || 'Auto SKU'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD NEW PRODUCT MODAL ────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-3xl p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Create New Product & Variants</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Slim Fit Denim Jeans"
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Origin
                  </label>
                  <select
                    value={newProduct.origin}
                    onChange={(e) => setNewProduct({ ...newProduct, origin: e.target.value as any })}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  >
                    <option value="Local">Local</option>
                    <option value="Imported">Imported</option>
                  </select>
                </div>
              </div>

              {/* Variant Rows Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Product Variants & Inventory Stock
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-950 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {newProduct.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center text-xs">
                      <input
                        type="text"
                        placeholder="Color"
                        value={v.color}
                        onChange={(e) => {
                          const updated = [...newProduct.variants];
                          updated[idx].color = e.target.value;
                          setNewProduct({ ...newProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Size (M / 32)"
                        value={v.size}
                        onChange={(e) => {
                          const updated = [...newProduct.variants];
                          updated[idx].size = e.target.value;
                          setNewProduct({ ...newProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={v.costPrice || ''}
                        onChange={(e) => {
                          const updated = [...newProduct.variants];
                          updated[idx].costPrice = parseFloat(e.target.value) || 0;
                          setNewProduct({ ...newProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={v.sellingPrice || ''}
                        onChange={(e) => {
                          const updated = [...newProduct.variants];
                          updated[idx].sellingPrice = parseFloat(e.target.value) || 0;
                          setNewProduct({ ...newProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={v.stockQuantity || ''}
                        onChange={(e) => {
                          const updated = [...newProduct.variants];
                          updated[idx].stockQuantity = parseInt(e.target.value, 10) || 0;
                          setNewProduct({ ...newProduct, variants: updated });
                        }}
                        className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantRow(idx)}
                        disabled={newProduct.variants.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Save Product & Generate SKUs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ───────────────────────────────────────── */}
      {isAdjustModalOpen && selectedVariantForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Stock Adjustment</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{selectedVariantForAdjust.product_name}</div>
              <div className="text-slate-500 dark:text-slate-400 font-mono">SKU: {selectedVariantForAdjust.sku}</div>
              <div className="text-slate-900 dark:text-white font-bold">Current Stock: {selectedVariantForAdjust.stock_quantity} units</div>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentData.movementType}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, movementType: e.target.value as any })}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                >
                  <option value="MANUAL_ADJUSTMENT">Manual Inventory Correction</option>
                  <option value="DAMAGED_WRITE_OFF">Damaged Stock Write-off</option>
                  <option value="OPENING_STOCK">Opening Stock Ingestion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Quantity Change (+ to add, - to remove)
                </label>
                <input
                  type="number"
                  required
                  value={adjustmentData.quantityChange || ''}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantityChange: parseInt(e.target.value, 10) || 0 })}
                  placeholder="e.g. -2 for damage, +10 for found stock"
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                  placeholder="Explain why this inventory count changed..."
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition shadow-md"
              >
                Confirm Stock Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BARCODE LABEL MODAL ──────────────────────────────────── */}
      {isBarcodeModalOpen && (
        <BarcodeLabelModal
          items={barcodeModalItems}
          onClose={() => setIsBarcodeModalOpen(false)}
        />
      )}
    </div>
  );
};
