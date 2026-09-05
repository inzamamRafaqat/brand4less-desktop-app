import React, { useState } from 'react';
import { useOrgConfig } from '../context/OrgConfigContext';
import {
  Sparkles,
  ShoppingBag,
  Pill,
  ShoppingCart,
  Smartphone,
  Footprints,
  Package,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const OnboardingWizardPage: React.FC = () => {
  const { org, switchIndustryPreset } = useOrgConfig();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(org?.industry || 'APPAREL');
  const [isSwitching, setIsSwitching] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const presets = [
    {
      id: 'APPAREL',
      title: 'Apparel & Fashion Retail',
      icon: ShoppingBag,
      color: 'from-blue-600 to-indigo-600',
      badgeColor: 'bg-blue-500/10 text-blue-600',
      description: 'Ideal for clothing boutiques, garment chains, and fashion outlets with multi-size & color matrices.',
      attributes: ['Size (XS to 3XL)', 'Color Palette', 'Fit (Slim/Regular/Relaxed)', 'Fabric & Material', 'Season'],
      categories: ['Shirts & Polos', 'T-Shirts', 'Jeans & Denim', 'Trousers', 'Jackets & Hoodies'],
    },
    {
      id: 'PHARMACY',
      title: 'Pharmacy & Healthcare',
      icon: Pill,
      color: 'from-rose-600 to-red-600',
      badgeColor: 'bg-rose-500/10 text-rose-600',
      description: 'Strict batch tracking, expiry dates, dosage forms, generic formulas, and prescription verification.',
      attributes: ['Batch Number', 'Expiry Date', 'Dosage Form (Tab/Syrup/Inj)', 'Generic Formula', 'Rx Required'],
      categories: ['Antibiotics', 'Pain Relief', 'Cardiac Care', 'Vitamins & Supplements', 'Surgical Supplies'],
    },
    {
      id: 'SUPERMARKET',
      title: 'Supermarket & Grocery',
      icon: ShoppingCart,
      color: 'from-emerald-600 to-teal-600',
      badgeColor: 'bg-emerald-500/10 text-emerald-600',
      description: 'Weight-based billing (kg, g, ltr, pcs), weighing scale barcodes, perishable items, and multi-pack items.',
      attributes: ['Unit of Measure (kg/ltr/pcs)', 'Net Weight / Volume', 'Expiry Date', 'Perishable Flag', 'Scale Barcode Prefix'],
      categories: ['Fresh Produce', 'Dairy & Bakery', 'Beverages', 'Snacks & Sweets', 'Household & Cleaning'],
    },
    {
      id: 'ELECTRONICS',
      title: 'Mobiles & Electronics',
      icon: Smartphone,
      color: 'from-cyan-600 to-blue-600',
      badgeColor: 'bg-cyan-500/10 text-cyan-600',
      description: 'Unique IMEI / Serial tracking per device, RAM/Storage variants, warranty periods, and condition grading.',
      attributes: ['IMEI / Serial Number', 'RAM & Storage Specs', 'Color', 'Warranty Period (1-2 Years)', 'Device Condition'],
      categories: ['Smartphones & Tablets', 'Laptops & Computers', 'Audio & Smartwatches', 'Chargers & Cables'],
    },
    {
      id: 'FOOTWEAR',
      title: 'Shoes & Footwear',
      icon: Footprints,
      color: 'from-amber-600 to-orange-600',
      badgeColor: 'bg-amber-500/10 text-amber-600',
      description: 'Shoe sizing (EU 38-46 / US 6-13), widths, upper materials (leather, suede), and gender collections.',
      attributes: ['Shoe Size (EU 38-46)', 'Color', 'Upper Material (Leather/Mesh)', 'Sole Type', 'Gender (Men/Women/Kids)'],
      categories: ['Men Formal Leather', 'Casual Loafers', 'Sneakers & Running', 'Women Heels', 'Sandals & Slippers'],
    },
    {
      id: 'GENERAL',
      title: 'General Retail & Hardware',
      icon: Package,
      color: 'from-slate-600 to-zinc-700',
      badgeColor: 'bg-slate-500/10 text-slate-600',
      description: 'Flexible general merchandise, hardware, tools, stationery, and multi-purpose department stores.',
      attributes: ['Item Variant / Model', 'Unit of Measure', 'Technical Specifications'],
      categories: ['General Merchandise', 'Hardware & Tools', 'Home & Kitchen', 'Stationery & Office'],
    },
  ];

  const handleApplyPreset = async () => {
    if (!selectedIndustry) return;
    const confirmSwitch = window.confirm(
      `Switching to "${selectedIndustry}" preset will reset dynamic schema attributes and default categories to match this industry. Continue?`
    );
    if (!confirmSwitch) return;

    setIsSwitching(true);
    setSuccessMsg(null);
    try {
      await switchIndustryPreset(selectedIndustry);
      setSuccessMsg(`Successfully activated "${selectedIndustry}" Industry Schema & Preset!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Preset switch failed: ${err.message}`);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Universal Business Adaptor</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Industry Preset & Schema Wizard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Select your retail business type to automatically configure custom product attributes, category trees, and POS workflows.
          </p>
        </div>

        <button
          onClick={handleApplyPreset}
          disabled={isSwitching}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all flex-shrink-0"
        >
          <span>{isSwitching ? 'Applying Schema...' : 'Apply Selected Preset'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 font-bold text-sm flex items-center space-x-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {presets.map((p) => {
          const Icon = p.icon;
          const isSelected = selectedIndustry === p.id;
          const isCurrentActive = org?.industry === p.id;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedIndustry(p.id)}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${p.color} text-white flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isCurrentActive && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        ACTIVE STORE
                      </span>
                    )}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{p.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.description}</p>

                {/* Custom Attributes Preview */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Dynamic Attributes:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.attributes.map((attr, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium rounded-lg">
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono">
                Sample Categories: {p.categories.slice(0, 3).join(', ')}...
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
