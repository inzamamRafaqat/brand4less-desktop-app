import React, { useState } from 'react';
import { useOrgConfig, SchemaAttribute } from '../context/OrgConfigContext';
import { api } from '../lib/api';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Tag,
  Receipt,
  Search,
  Check,
  X,
} from 'lucide-react';

export const CustomSchemaBuilderPage: React.FC = () => {
  const { schemaAttributes, refreshOrgConfig, org } = useOrgConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [dataType, setDataType] = useState<'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN'>('TEXT');
  const [optionsStr, setOptionsStr] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isVariantLevel, setIsVariantLevel] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);
  const [isPrintableOnLabel, setIsPrintableOnLabel] = useState(true);
  const [isPrintableOnReceipt, setIsPrintableOnReceipt] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setDataType('TEXT');
    setOptionsStr('');
    setIsRequired(false);
    setIsVariantLevel(true);
    setIsSearchable(true);
    setIsPrintableOnLabel(true);
    setIsPrintableOnReceipt(true);
    setIsModalOpen(true);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const options =
        dataType === 'SELECT' || dataType === 'MULTISELECT'
          ? optionsStr
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;

      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        dataType,
        options,
        isRequired,
        isVariantLevel,
        isSearchable,
        isPrintableOnLabel,
        isPrintableOnReceipt,
      };

      if (editingId) {
        await api.put(`/schema/attributes/${editingId}`, payload);
      } else {
        await api.post('/schema/attributes', payload);
      }

      await refreshOrgConfig();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Failed to save attribute: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttribute = async (id: string, attrName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom attribute "${attrName}"?`)) return;
    try {
      await api.delete(`/schema/attributes/${id}`);
      await refreshOrgConfig();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Product Attribute Studio</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Custom Product Schema Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Define dynamic attributes specific to your store. Add custom fields that automatically integrate with POS search, inventory matrices, and barcode stickers.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Attribute</span>
        </button>
      </div>

      {/* Schema Attributes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Attribute Name</th>
                <th className="py-3.5 px-4">Field Code</th>
                <th className="py-3.5 px-4">Data Type</th>
                <th className="py-3.5 px-4">Scope</th>
                <th className="py-3.5 px-4">Options / Values</th>
                <th className="py-3.5 px-4 text-center">POS Search</th>
                <th className="py-3.5 px-4 text-center">Label / Receipt</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {schemaAttributes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    No custom attributes defined. Click "Add Custom Attribute" to create one.
                  </td>
                </tr>
              ) : (
                schemaAttributes.map((attr) => (
                  <tr key={attr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                        <span>{attr.name}</span>
                        {attr.isRequired && (
                          <span className="text-rose-500 font-bold" title="Required Field">
                            *
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{attr.code}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {attr.dataType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          attr.isVariantLevel
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600'
                        }`}
                      >
                        {attr.isVariantLevel ? 'Variant Level' : 'Product Level'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500">
                      {attr.options ? attr.options.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {attr.isSearchable ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {attr.isPrintableOnLabel && <Tag className="w-3.5 h-3.5 text-blue-500" title="Prints on Label" />}
                        {attr.isPrintableOnReceipt && <Receipt className="w-3.5 h-3.5 text-emerald-500" title="Prints on Receipt" />}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT ATTRIBUTE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Create Custom Product Attribute
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attribute Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!code) setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                  }}
                  placeholder="e.g. Shoe Size, Batch Number, IMEI Number, Fabric"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Field Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. shoe_size, batch_no"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Type *
                  </label>
                  <select
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="TEXT">Short Text (e.g. SKU, Name)</option>
                    <option value="NUMBER">Number (e.g. Size, Weight)</option>
                    <option value="DATE">Date (e.g. Expiry Date)</option>
                    <option value="SELECT">Select Dropdown (Predefined list)</option>
                    <option value="BOOLEAN">Yes / No Toggle</option>
                  </select>
                </div>
              </div>

              {(dataType === 'SELECT' || dataType === 'MULTISELECT') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dropdown Options (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    placeholder="e.g. S, M, L, XL, XXL or Tablet, Syrup, Injection"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Checkbox Options */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Required Field</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVariantLevel}
                    onChange={(e) => setIsVariantLevel(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Variant-Specific</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSearchable}
                    onChange={(e) => setIsSearchable(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Searchable in POS</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrintableOnLabel}
                    onChange={(e) => setIsPrintableOnLabel(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Print on Labels</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
                >
                  {isSubmitting ? 'Saving...' : 'Save Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
