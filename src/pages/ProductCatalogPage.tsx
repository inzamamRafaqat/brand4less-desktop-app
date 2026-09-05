import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import { DynamicFieldRenderer } from '../components/common/DynamicFieldRenderer';
import { UniversalLabelModal } from '../components/common/UniversalLabelModal';
import {
  Plus,
  Search,
  Package,
  Tag,
  Edit2,
  RefreshCw,
  X,
  PlusCircle,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export const ProductCatalogPage: React.FC = () => {
  const { formatPrice, schemaAttributes } = useOrgConfig();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for New / Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [customProductFields, setCustomProductFields] = useState<Record<string, any>>({});
  const [variants, setVariants] = useState<any[]>([
    {
      sku: '',
      barcode: '',
      costPrice: 0,
      sellingPrice: 0,
      stockQuantity: 10,
      minStockAlert: 5,
      customAttributes: {},
    },
  ]);

  // Label Printing Modal
  const [labelProduct, setLabelProduct] = useState<{ product: any; variant: any } | null>(null);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/products?query=${encodeURIComponent(searchQuery)}&categoryId=${selectedCategory}`),
        api.get('/categories'),
      ]);
      if (prodRes.products) setProducts(prodRes.products);
      if (catRes.categories) {
        setCategories(catRes.categories);
        if (!categoryId && catRes.categories.length > 0) {
          setCategoryId(catRes.categories[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, selectedCategory]);

  const handleOpenCreateModal = () => {
    setEditingProductId(null);
    setName('');
    setBrand('');
    setDescription('');
    setCustomProductFields({});
    setVariants([
      {
        sku: '',
        barcode: '',
        costPrice: 0,
        sellingPrice: 0,
        stockQuantity: 10,
        minStockAlert: 5,
        customAttributes: {},
      },
    ]);
    setIsModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: '',
        barcode: '',
        costPrice: prev[0]?.costPrice || 0,
        sellingPrice: prev[0]?.sellingPrice || 0,
        stockQuantity: 10,
        minStockAlert: 5,
        customAttributes: {},
      },
    ]);
  };

  const handleRemoveVariantRow = (idx: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      alert('Please fill in Product Name and select a Category.');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        categoryId,
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        customFields: customProductFields,
        variants: variants.map((v) => ({
          sku: v.sku?.trim() || undefined,
          barcode: v.barcode?.trim() || undefined,
          costPrice: Number(v.costPrice || 0),
          sellingPrice: Number(v.sellingPrice || 0),
          stockQuantity: Number(v.stockQuantity || 0),
          minStockAlert: Number(v.minStockAlert || 5),
          customAttributes: v.customAttributes || {},
        })),
      };

      await api.post('/products', payload);
      setIsModalOpen(false);
      await fetchCatalog();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Product & Inventory Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic schema multi-variant management, pricing, stock alerts, and barcode printing.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, barcode, or custom attributes..."
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchCatalog}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Master List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-mono">
            No products found. Click "Add New Product" to create your first item!
          </div>
        ) : (
          products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    {prod.category_name || 'General'}
                  </span>
                  {prod.brand && <span className="text-slate-400 text-[11px]">{prod.brand}</span>}
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{prod.name}</h3>
                {prod.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.description}</p>
                )}

                {/* Variants Matrix Summary */}
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Variants & Stock ({prod.variants?.length || 0})
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {prod.variants?.map((v: any) => {
                      const attrStr = Object.values(v.custom_attributes || {}).join(' / ');
                      return (
                        <div
                          key={v.id}
                          className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate">
                              {v.sku}
                            </div>
                            {attrStr && <div className="text-[10px] text-slate-500">{attrStr}</div>}
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatPrice(v.selling_price)}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                v.stock_quantity > 5
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-rose-500/10 text-rose-600'
                              }`}
                            >
                              {v.stock_quantity}
                            </span>
                            <button
                              onClick={() => setLabelProduct({ product: prod, variant: v })}
                              title="Print Barcode Label"
                              className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Add New Product Master</h3>
                <p className="text-xs text-slate-500">Configure product master details and multi-variant matrix.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              {/* Product Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Classic Cotton Polo Shirt"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Product-Level Custom Fields */}
              <DynamicFieldRenderer
                attributes={schemaAttributes}
                values={customProductFields}
                onChange={(code, val) => setCustomProductFields((prev) => ({ ...prev, [code]: val }))}
                productOnly={true}
              />

              {/* Variants Matrix */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Variants & Stock Matrix ({variants.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Cost Price</label>
                          <input
                            type="number"
                            value={v.costPrice || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, costPrice: val } : item)));
                            }}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Selling Price *</label>
                          <input
                            type="number"
                            required
                            value={v.sellingPrice || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, sellingPrice: val } : item)));
                            }}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono text-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Stock Qty</label>
                          <input
                            type="number"
                            value={v.stockQuantity || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, stockQuantity: val } : item)));
                            }}
                            placeholder="10"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                          />
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="flex-1 mr-2">
                            <label className="text-[10px] font-bold text-slate-500">Min Alert</label>
                            <input
                              type="number"
                              value={v.minStockAlert || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, minStockAlert: val } : item)));
                              }}
                              placeholder="5"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                            />
                          </div>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantRow(idx)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dynamic Variant Attributes */}
                      <DynamicFieldRenderer
                        attributes={schemaAttributes}
                        values={v.customAttributes || {}}
                        onChange={(code, val) => {
                          setVariants((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, customAttributes: { ...(item.customAttributes || {}), [code]: val } }
                                : item
                            )
                          );
                        }}
                        variantOnly={true}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
                >
                  Save Product & Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Label Modal */}
      {labelProduct && (
        <UniversalLabelModal
          product={labelProduct.product}
          variant={labelProduct.variant}
          onClose={() => setLabelProduct(null)}
        />
      )}
    </div>
  );
};
