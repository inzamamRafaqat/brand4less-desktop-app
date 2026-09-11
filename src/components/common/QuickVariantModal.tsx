import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, X, Boxes } from 'lucide-react';

interface QuickVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newVariant: { id: string; label: string; costPrice: number }) => void;
}

export const QuickVariantModal: React.FC<QuickVariantModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [mode, setMode] = useState<'EXISTING' | 'NEW'>('NEW');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Fields for existing product new variant
  const [color, setColor] = useState('Black');
  const [size, setSize] = useState('M');
  const [costPrice, setCostPrice] = useState<number>(1000);
  const [sellingPrice, setSellingPrice] = useState<number>(1800);
  const [minStockLevel, setMinStockLevel] = useState<number>(3);

  // Fields for brand new product
  const [newProductName, setNewProductName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newBrand, setNewBrand] = useState('Brand 4 Less');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/categories'),
        ]);
        if (prodRes.products) {
          setProducts(prodRes.products);
          if (prodRes.products.length > 0) {
            setSelectedProductId(prodRes.products[0].id);
          }
        }
        if (catRes.categories) {
          setCategories(catRes.categories);
          if (catRes.categories.length > 0) {
            setNewCategoryId(catRes.categories[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error loading products/categories for quick variant:', err);
      }
    };
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'NEW') {
        if (!newProductName.trim() || !newCategoryId) {
          setError('Product name and category are required.');
          setLoading(false);
          return;
        }

        const payload = {
          name: newProductName.trim(),
          categoryId: newCategoryId,
          brand: newBrand.trim() || 'Brand 4 Less',
          origin: 'Local',
          variants: [
            {
              color: color.trim() || undefined,
              size: size.trim() || undefined,
              costPrice: Number(costPrice) || 0,
              sellingPrice: Number(sellingPrice) || 0,
              stockQuantity: 0,
              minStockLevel: Number(minStockLevel) || 3,
            },
          ],
        };

        const res = await api.post('/products', payload);
        if (res.product && res.product.variants && res.product.variants.length > 0) {
          const createdV = res.product.variants[0];
          onCreated({
            id: createdV.id,
            label: `${res.product.name} - ${createdV.sku} (${createdV.color || ''} ${createdV.size || ''})`,
            costPrice: Number(createdV.cost_price || costPrice),
          });
          onClose();
        }
      } else {
        const prod = products.find((p) => p.id === selectedProductId);
        if (!prod) {
          setError('Please select an existing product.');
          setLoading(false);
          return;
        }

        const existingVariants = (prod.variants || []).map((v: any) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          costPrice: Number(v.cost_price),
          sellingPrice: Number(v.selling_price),
          minStockLevel: v.min_stock_level || 3,
        }));

        const newVariantObj = {
          color: color.trim() || undefined,
          size: size.trim() || undefined,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          stockQuantity: 0,
          minStockLevel: Number(minStockLevel) || 3,
        };

        const updatePayload = {
          name: prod.name,
          categoryId: prod.category_id,
          brand: prod.brand,
          variants: [...existingVariants, newVariantObj],
        };

        const res = await api.put(`/products/${prod.id}`, updatePayload);
        if (res.product && res.product.variants) {
          const createdV = res.product.variants[res.product.variants.length - 1];
          onCreated({
            id: createdV.id,
            label: `${res.product.name} - ${createdV.sku} (${createdV.color || ''} ${createdV.size || ''})`,
            costPrice: Number(createdV.cost_price || costPrice),
          });
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create variant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add New Product Variant</h3>
              <p className="text-[10px] text-slate-400">Instantly creates variant & selects it in your purchase bill</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: New Product vs Existing Product */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('NEW')}
            className={`flex-1 py-1.5 rounded-xl transition ${
              mode === 'NEW'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Product & Variant
          </button>
          <button
            type="button"
            onClick={() => setMode('EXISTING')}
            disabled={products.length === 0}
            className={`flex-1 py-1.5 rounded-xl transition ${
              mode === 'EXISTING'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            } disabled:opacity-40`}
          >
            Existing Product ({products.length})
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'NEW' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Export Cotton Polo Shirt"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Brand 4 Less"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Select Product *
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Variant attributes */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Black / Navy / White"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. S, M, L, XL, 32"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Cost Price (PKR) *
              </label>
              <input
                type="number"
                required
                value={costPrice || ''}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                placeholder="1000"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Selling Price (PKR) *
              </label>
              <input
                type="number"
                required
                value={sellingPrice || ''}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                placeholder="1800"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loading ? 'Creating...' : 'Create & Select Variant'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
