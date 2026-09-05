import React from 'react';
import { SchemaAttribute } from '../../context/OrgConfigContext';

interface DynamicFieldRendererProps {
  attributes: SchemaAttribute[];
  values: Record<string, any>;
  onChange: (code: string, value: any) => void;
  variantOnly?: boolean;
  productOnly?: boolean;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  attributes,
  values,
  onChange,
  variantOnly = false,
  productOnly = false,
}) => {
  const filtered = attributes.filter((attr) => {
    if (variantOnly && !attr.isVariantLevel) return false;
    if (productOnly && attr.isVariantLevel) return false;
    return true;
  });

  if (filtered.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filtered.map((attr) => {
        const val = values[attr.code] ?? '';

        if (attr.dataType === 'SELECT' && attr.options && attr.options.length > 0) {
          return (
            <div key={attr.id} className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>{attr.name}</span>
                {attr.isRequired && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <select
                value={val}
                onChange={(e) => onChange(attr.code, e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">-- Select {attr.name} --</option>
                {attr.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (attr.dataType === 'BOOLEAN') {
          return (
            <div key={attr.id} className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id={`field_${attr.code}`}
                checked={Boolean(val)}
                onChange={(e) => onChange(attr.code, e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor={`field_${attr.code}`} className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
              </label>
            </div>
          );
        }

        return (
          <div key={attr.id} className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>{attr.name}</span>
              {attr.isRequired && <span className="text-rose-500 font-bold">*</span>}
            </label>
            <input
              type={attr.dataType === 'NUMBER' ? 'number' : attr.dataType === 'DATE' ? 'date' : 'text'}
              value={val}
              onChange={(e) => onChange(attr.code, e.target.value)}
              placeholder={`Enter ${attr.name.toLowerCase()}...`}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
        );
      })}
    </div>
  );
};
