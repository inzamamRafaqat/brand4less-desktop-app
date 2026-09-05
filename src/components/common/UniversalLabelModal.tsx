import React, { useState } from 'react';
import { X, Tag, Zap, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useOrgConfig } from '../../context/OrgConfigContext';

interface UniversalLabelModalProps {
  product: any;
  variant?: any;
  onClose: () => void;
}

export const UniversalLabelModal: React.FC<UniversalLabelModalProps> = ({
  product,
  variant,
  onClose,
}) => {
  const { org } = useOrgConfig();
  const [copies, setCopies] = useState<number>(1);
  const [isPrintingDirect, setIsPrintingDirect] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!product) return null;

  const targetVariant = variant || product.variants?.[0] || {};
  const sku = targetVariant.sku || 'SKU-001';
  const barcode = targetVariant.barcode || '123456789012';
  const price = targetVariant.selling_price || 0;
  const customAttrs = targetVariant.custom_attributes || {};

  const handleDirectTscPrint = async () => {
    setIsPrintingDirect(true);
    setFeedbackMsg(null);
    try {
      const items = Array.from({ length: copies }).map(() => ({
        name: product.name,
        sku,
        barcode,
        price,
        attributes: customAttrs,
      }));

      const res = await api.post('/hardware/print-tspl', {
        items,
        widthMm: 50,
        heightMm: 30,
      });

      setFeedbackMsg(res.message || `Dispatched ${copies} label(s) to TSC printer.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(`TSC Direct Print Failed: ${err.message}`);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleDownloadPdf = async (layout: 'A4_SHEET' | 'THERMAL_ROLL') => {
    setIsGeneratingPdf(true);
    try {
      const items = Array.from({ length: copies }).map(() => ({
        name: product.name,
        sku,
        barcode,
        selling_price: price,
        custom_text: Object.values(customAttrs).join(' / '),
      }));

      const response = await fetch('/api/products/labels/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('omniretail_token')}`,
        },
        body: JSON.stringify({ items, layout }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labels_${sku}_${layout.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`PDF Generation failed: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Print Barcode Label</h3>
              <p className="text-xs text-slate-500 font-mono">{sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedbackMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Sticker Preview */}
        <div className="p-4 flex flex-col items-center bg-slate-100 dark:bg-slate-950">
          <div className="w-64 bg-white text-black p-3 rounded-lg border border-slate-300 shadow-sm text-center font-sans">
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
              {org?.name || 'OMNIRETAIL'}
            </p>
            <h4 className="text-xs font-bold leading-tight mt-0.5 truncate">{product.name}</h4>
            {Object.keys(customAttrs).length > 0 && (
              <p className="text-[9px] text-slate-600 truncate mt-0.5">
                {Object.entries(customAttrs).map(([k, v]) => `${v}`).join(' | ')}
              </p>
            )}

            {/* Barcode Graphic Placeholder */}
            <div className="my-2 bg-slate-100 py-1.5 rounded flex flex-col items-center justify-center">
              <div className="font-mono text-xs tracking-widest font-bold">||||| | |||| || |||</div>
              <div className="text-[9px] font-mono text-slate-600 mt-0.5">{barcode}</div>
            </div>

            <div className="flex justify-between items-center text-[10px] border-t border-slate-200 pt-1 font-mono">
              <span>SKU: {sku}</span>
              <span className="font-bold text-xs">Rs. {Number(price).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Form Controls */}
        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Label Quantity / Copies:</label>
            <input
              type="number"
              min={1}
              max={500}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-center font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleDownloadPdf('THERMAL_ROLL')}
              disabled={isGeneratingPdf}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Roll</span>
            </button>

            <button
              onClick={() => handleDownloadPdf('A4_SHEET')}
              disabled={isGeneratingPdf}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF A4 Sheet</span>
            </button>
          </div>

          <button
            onClick={handleDirectTscPrint}
            disabled={isPrintingDirect}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{isPrintingDirect ? 'Printing...' : 'Direct Print (TSC Label)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
