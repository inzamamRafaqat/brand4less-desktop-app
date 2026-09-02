import React, { useState, useRef } from 'react';
import { api } from '../lib/api';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle,
  FileCheck,
  Barcode,
  Printer,
} from 'lucide-react';
import { TabType } from '../components/layout/Sidebar';
import { BarcodeLabelModal, BarcodeItem } from '../components/common/BarcodeLabelModal';

interface BulkImportPageProps {
  setActiveTab: (tab: TabType) => void;
}

export const BulkImportPage: React.FC<BulkImportPageProps> = ({ setActiveTab }) => {
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'PREVIEW' | 'COMPLETE'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [importedBarcodeItems, setImportedBarcodeItems] = useState<BarcodeItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await api.post('/products/import/analyze', formData);

      if (res.headers) {
        setHeaders(res.headers);
        setSampleRows(res.sampleRows || []);
        setFilePath(res.filePath);
        setMapping(res.suggestedMapping || {});
        setStep('MAP');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read spreadsheet file');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!mapping['name'] || !mapping['category'] || !mapping['sellingPrice']) {
      setErrorMsg('Please map at least Product Name, Category, and Selling Price.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/products/import/preview', {
        filePath,
        mapping,
      });

      if (res.previewRows) {
        setPreviewData(res);
        setStep('PREVIEW');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!previewData || !previewData.previewRows) return;
    try {
      const res: any = await api.post('/products/import/error-report', {
        previewRows: previewData.previewRows,
      });

      if (res.blob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_errors_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert('Failed to download error report: ' + err.message);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || previewData.validCount === 0) return;
    setLoading(true);
    setErrorMsg('');

    try {
      // The server re-parses and re-validates from the original upload; it does
      // not trust the preview rows. Send the file reference + mapping only.
      const res = await api.post('/products/import/commit', {
        filePath,
        mapping,
      });

      setImportResult(res);

      if (res.importedItems && Array.isArray(res.importedItems)) {
        setImportedBarcodeItems(
          res.importedItems.map((item: any) => ({
            name: item.name || item.productName,
            categoryName: item.categoryName,
            color: item.color,
            size: item.size,
            sellingPrice: item.sellingPrice,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
          }))
        );
      } else {
        setImportedBarcodeItems(
          previewData.previewRows
            .filter((r: any) => r.isValid)
            .map((r: any) => ({
              name: r.mapped.name,
              categoryName: r.mapped.category,
              color: r.mapped.color,
              size: r.mapped.size,
              sellingPrice: r.mapped.sellingPrice,
              sku: r.mapped.sku || `B4L-${r.mapped.name.slice(0, 3).toUpperCase()}-001`,
              barcode: r.mapped.barcode || `B4L${Math.floor(10000000 + Math.random() * 90000000)}`,
              quantity: r.mapped.quantity || 1,
            }))
        );
      }

      setStep('COMPLETE');
    } catch (err: any) {
      setErrorMsg(err.message || 'Bulk commit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>Bulk Product Importer</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Ingest products from Excel/CSV with auto-generated SKUs & barcodes, and generate printable barcode stickers
          </p>
        </div>

        {/* Step Progression */}
        <div className="flex items-center space-x-2 text-xs font-bold">
          <span className={`px-4 py-1.5 rounded-full ${step === 'UPLOAD' ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            1. Upload
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className={`px-4 py-1.5 rounded-full ${step === 'MAP' ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            2. Map Columns
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className={`px-4 py-1.5 rounded-full ${step === 'PREVIEW' ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            3. Preview
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── STEP 1: UPLOAD ───────────────────────────────────────────────── */}
      {step === 'UPLOAD' && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center soft-shadow max-w-2xl mx-auto space-y-6 transition-colors">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700 shadow-sm">
            <UploadCloud className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Excel or CSV Product Spreadsheet</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
              Missing SKU or Barcode? No problem! The system automatically generates intelligent SKUs and scannable barcodes with printable sticker sheets.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Spreadsheet Headers...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Choose Spreadsheet File</span>
                </>
              )}
            </button>

            <a
              href={api.downloadUrl('/products/import/template')}
              download="Brand4Less_Product_Import_Template.xlsx"
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Download Excel Template</span>
            </a>
          </div>
        </div>
      )}

      {/* ── STEP 2: FIELD MAPPING ─────────────────────────────────────────── */}
      {step === 'MAP' && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 soft-shadow space-y-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Column Field Mapping</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Auto-detected matching headers. Empty SKU / Barcode columns will be automatically generated.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
              {file?.name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { field: 'name', label: 'Product Name / Title *', required: true },
              { field: 'category', label: 'Category *', required: true },
              { field: 'color', label: 'Color / Shade' },
              { field: 'size', label: 'Size (S/M/L or 32/34/36)' },
              { field: 'sellingPrice', label: 'Selling Price *', required: true },
              { field: 'costPrice', label: 'Cost / Purchase Price' },
              { field: 'quantity', label: 'Stock Quantity' },
              { field: 'brand', label: 'Brand Name' },
              { field: 'origin', label: 'Origin (Local / Imported)' },
              { field: 'sku', label: 'SKU (Leave blank to auto-generate)' },
              { field: 'barcode', label: 'Barcode (Leave blank to auto-generate)' },
            ].map((f) => (
              <div key={f.field} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {f.label}
                </label>
                <select
                  value={mapping[f.field] || ''}
                  onChange={(e) => setMapping({ ...mapping, [f.field]: e.target.value })}
                  className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
                >
                  <option value="">-- Auto-Generate by System --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep('UPLOAD')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              Back to Upload
            </button>
            <button
              onClick={handlePreview}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-sm flex items-center space-x-2"
            >
              {loading ? <span>Validating...</span> : <span>Preview & Validate Records &rarr;</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW ──────────────────────────────────────────────── */}
      {step === 'PREVIEW' && previewData && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 soft-shadow space-y-6 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                <span className="text-lg font-black">{previewData.validCount}</span>
                <span className="text-xs font-medium ml-1.5">Valid Records</span>
              </div>

              {previewData.errorCount > 0 && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center space-x-3">
                  <div>
                    <span className="text-lg font-black">{previewData.errorCount}</span>
                    <span className="text-xs font-medium ml-1.5">Invalid Rows</span>
                  </div>
                  <button
                    onClick={handleDownloadErrorReport}
                    className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 text-rose-800 dark:text-rose-300 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-700 transition flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Error Report</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setStep('MAP')}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Edit Mapping
              </button>
              <button
                onClick={handleCommitImport}
                disabled={loading || previewData.validCount === 0}
                className="px-6 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-sm flex items-center space-x-2 disabled:opacity-40"
              >
                {loading ? (
                  <span>Importing Batch into Database...</span>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Import {previewData.validCount} Valid Products</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="p-3">Row</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Color / Size</th>
                  <th className="p-3">Cost Price</th>
                  <th className="p-3">Selling Price</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Generated SKU / Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewData.previewRows.slice(0, 100).map((row: any, idx: number) => (
                  <tr key={idx} className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                    <td className="p-3 font-mono text-slate-400">{row.rowNumber}</td>
                    <td className="p-3">
                      {row.isValid ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-full font-bold text-[10px]">
                          VALID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-full font-bold text-[10px]">
                          ERROR
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{row.mapped.name || '-'}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{row.mapped.category || '-'}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{row.mapped.color || '-'} / {row.mapped.size || '-'}</td>
                    <td className="p-3 font-mono">PKR {row.mapped.costPrice}</td>
                    <td className="p-3 font-mono text-slate-900 dark:text-white font-bold">PKR {row.mapped.sellingPrice}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{row.mapped.quantity}</td>
                    <td className="p-3 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                      {row.mapped.sku || 'Auto-generated on import'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STEP 4: COMPLETE ─────────────────────────────────────────────── */}
      {step === 'COMPLETE' && importResult && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 text-center soft-shadow max-w-2xl mx-auto space-y-6 animate-fade-in transition-colors">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Bulk Import Successfully Completed!</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              All valid products and variants have been imported with unique SKUs and barcodes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Variants Imported</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {importResult.importedCount}
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Categories Created</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {importResult.categoriesCreated}
              </div>
            </div>
          </div>

          {/* BARCODE STICKER LABEL CTA */}
          <div className="p-5 bg-slate-950 dark:bg-slate-800 text-white rounded-3xl text-left flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Barcode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Print Barcode Sticky Labels</h4>
                <p className="text-xs text-slate-400">
                  Generate sticker sheets to stick on garments so cashiers can scan them at POS.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsBarcodeModalOpen(true)}
              className="px-5 py-2.5 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-950 dark:text-white font-black text-xs rounded-xl transition shadow-md flex items-center space-x-1.5 flex-shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print Barcodes</span>
            </button>
          </div>

          <div className="flex justify-center space-x-3 pt-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
            >
              View Inventory Catalog
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="px-6 py-3 rounded-2xl bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-md"
            >
              Start POS Billing &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ── BARCODE STICKER LABEL MODAL ──────────────────────────────────── */}
      {isBarcodeModalOpen && (
        <BarcodeLabelModal
          items={importedBarcodeItems}
          onClose={() => setIsBarcodeModalOpen(false)}
        />
      )}
    </div>
  );
};
