import React, { useState } from 'react';
import { useOrgConfig } from '../context/OrgConfigContext';
import { api } from '../lib/api';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
} from 'lucide-react';

export const DynamicImportPage: React.FC = () => {
  const { schemaAttributes } = useOrgConfig();
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Column Mapping State
  const [productNameCol, setProductNameCol] = useState('');
  const [categoryCol, setCategoryCol] = useState('');
  const [brandCol, setBrandCol] = useState('');
  const [costPriceCol, setCostPriceCol] = useState('');
  const [sellingPriceCol, setSellingPriceCol] = useState('');
  const [stockQuantityCol, setStockQuantityCol] = useState('');
  const [skuCol, setSkuCol] = useState('');
  const [barcodeCol, setBarcodeCol] = useState('');
  const [customAttrMapping, setCustomAttrMapping] = useState<Record<string, string>>({});

  // Ingestion State
  const [isCommitting, setIsCommitting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setAnalysisResult(null);
    setImportSummary(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', selected);

      const res = await api.post('/import/analyze', formData);
      setAnalysisResult(res);

      // Populate suggested mappings
      if (res.suggestedMapping) {
        setProductNameCol(res.suggestedMapping.productName || res.headers[0] || '');
        setCategoryCol(res.suggestedMapping.category || '');
        setBrandCol(res.suggestedMapping.brand || '');
        setCostPriceCol(res.suggestedMapping.costPrice || '');
        setSellingPriceCol(res.suggestedMapping.sellingPrice || '');
        setStockQuantityCol(res.suggestedMapping.stockQuantity || '');
        setSkuCol(res.suggestedMapping.sku || '');
        setBarcodeCol(res.suggestedMapping.barcode || '');
      }
    } catch (err: any) {
      alert(`Spreadsheet analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!file || !productNameCol || !sellingPriceCol) {
      alert('Please map at least Product Name and Selling Price columns.');
      return;
    }

    setIsCommitting(true);
    setImportSummary(null);

    try {
      const mapping = {
        productName: productNameCol,
        category: categoryCol || undefined,
        brand: brandCol || undefined,
        costPrice: costPriceCol,
        sellingPrice: sellingPriceCol,
        stockQuantity: stockQuantityCol,
        sku: skuCol || undefined,
        barcode: barcodeCol || undefined,
        customAttributes: customAttrMapping,
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const res = await api.post('/import/commit', formData);
      setImportSummary(res);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Universal Data Pipeline</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Dynamic Excel & CSV Product Importer
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload any supplier spreadsheet, visually map columns to your store's custom product attributes, and import inventory with automatic Moving WAC costing.
        </p>
      </div>

      {/* Step 1: Upload Box */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center space-x-2">
          <span>Step 1: Upload Supplier Spreadsheet (.xlsx, .xls, .csv)</span>
        </h3>

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50 dark:bg-slate-800/40 transition-colors">
          <input
            type="file"
            id="spreadsheet-upload"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="spreadsheet-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {file ? file.name : 'Click to select spreadsheet file'}
            </span>
            <span className="text-xs text-slate-400">Supports standard supplier catalogs & custom Excel files</span>
          </label>
        </div>
      </div>

      {/* Step 2: Visual Column Mapper */}
      {analysisResult && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Step 2: Interactive Column Mapping
              </h3>
              <p className="text-xs text-slate-500">
                Found <span className="font-bold text-emerald-600">{analysisResult.totalRows}</span> rows in{' '}
                <span className="font-mono">{file?.name}</span>. Map spreadsheet columns to store attributes.
              </p>
            </div>

            <button
              onClick={handleCommitImport}
              disabled={isCommitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/25"
            >
              <Database className="w-4 h-4" />
              <span>{isCommitting ? 'Importing Rows...' : 'Commit & Ingest Data'}</span>
            </button>
          </div>

          {/* Standard Fields Mapping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Product Title / Name *
              </label>
              <select
                value={productNameCol}
                onChange={(e) => setProductNameCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select Header --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Selling Price *</label>
              <select
                value={sellingPriceCol}
                onChange={(e) => setSellingPriceCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select Header --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Cost Price (WAC)</label>
              <select
                value={costPriceCol}
                onChange={(e) => setCostPriceCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- None / Default 0 --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Stock Quantity</label>
              <select
                value={stockQuantityCol}
                onChange={(e) => setStockQuantityCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- None / Default 0 --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Category Column</label>
              <select
                value={categoryCol}
                onChange={(e) => setCategoryCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- None / Default General --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Brand / Vendor</label>
              <select
                value={brandCol}
                onChange={(e) => setBrandCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- None --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">SKU / Item Code</label>
              <select
                value={skuCol}
                onChange={(e) => setSkuCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Auto-Generate SKU --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Barcode / UPC</label>
              <select
                value={barcodeCol}
                onChange={(e) => setBarcodeCol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Auto-Generate Barcode --</option>
                {analysisResult.headers.map((h: string) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Custom Schema Attributes Mapping */}
          {schemaAttributes.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                Map Dynamic Custom Schema Attributes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {schemaAttributes.map((attr) => (
                  <div key={attr.id} className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {attr.name} ({attr.code})
                    </label>
                    <select
                      value={customAttrMapping[attr.code] || ''}
                      onChange={(e) =>
                        setCustomAttrMapping((prev) => ({
                          ...prev,
                          [attr.code]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Do Not Map --</option>
                      {analysisResult.headers.map((h: string) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Rows Preview Table */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
              Sample Data Preview (Top 5 Rows)
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px]">
                  <tr>
                    {analysisResult.headers.map((h: string) => (
                      <th key={h} className="py-2 px-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {analysisResult.sampleRows.map((row: any, idx: number) => (
                    <tr key={idx}>
                      {analysisResult.headers.map((h: string) => (
                        <td key={h} className="py-1.5 px-3 whitespace-nowrap">
                          {String(row[h] || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Success Feedback Summary */}
      {importSummary && (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base">Spreadsheet Ingestion Complete!</h3>
          </div>
          <p className="text-xs font-mono">
            Successfully imported <span className="font-bold">{importSummary.importedCount}</span> new product variants and updated{' '}
            <span className="font-bold">{importSummary.updatedCount}</span> existing items with Moving WAC calculations.
          </p>
        </div>
      )}
    </div>
  );
};
