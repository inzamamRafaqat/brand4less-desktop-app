import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Barcode,
  Layers,
  FileText,
  Check,
  Download,
  Tag,
  Copy,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getCode128BarWidths, generateCode128Svg } from '../../lib/code128';

export interface BarcodeItem {
  name: string;
  categoryName?: string;
  color?: string;
  size?: string;
  sellingPrice: number;
  sku: string;
  barcode: string;
  quantity?: number;
}

interface BarcodeLabelModalProps {
  items: BarcodeItem[];
  onClose: () => void;
}

/**
 * Generates an SVG React element representation of standard Code-128 barcode
 */
const renderBarcodeSvg = (code: string) => {
  const cleanCode = (code || '000000').toUpperCase();
  const { widths, totalModules } = getCode128BarWidths(cleanCode);
  const quietZone = 10;
  const totalGrid = totalModules + quietZone * 2;
  const svgWidth = 240;
  const unitWidth = svgWidth / totalGrid;
  const height = 40;

  let currentX = quietZone * unitWidth;
  const rects: React.ReactNode[] = [];
  let isBar = true;

  widths.forEach((w, idx) => {
    const barW = w * unitWidth;
    if (isBar) {
      rects.push(
        <rect
          key={idx}
          x={currentX}
          y={0}
          width={Math.max(1, barW)}
          height={height}
          fill="#000000"
        />
      );
    }
    currentX += barW;
    isBar = !isBar;
  });

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full h-10 mx-auto block"
      preserveAspectRatio="none"
    >
      {rects}
    </svg>
  );
};

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ items, onClose }) => {
  const [printMode, setPrintMode] = useState<'A4_SHEET' | 'THERMAL_ROLL'>('THERMAL_ROLL');
  const [copiesOption, setCopiesOption] = useState<'ONE_PER_VARIANT' | 'MATCH_STOCK' | 'CUSTOM'>('CUSTOM');
  const [storeHeader, setStoreHeader] = useState('Brands 4 Less');
  const [bulkQty, setBulkQty] = useState<number>(1);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((item, idx) => {
      initial[item.sku || String(idx)] = 1;
    });
    return initial;
  });

  const handleCopiesOptionChange = (option: 'ONE_PER_VARIANT' | 'MATCH_STOCK' | 'CUSTOM') => {
    setCopiesOption(option);
    const updated: Record<string, number> = {};
    items.forEach((item, idx) => {
      const key = item.sku || String(idx);
      if (option === 'ONE_PER_VARIANT') {
        updated[key] = 1;
      } else if (option === 'MATCH_STOCK') {
        updated[key] = Math.max(1, item.quantity || 1);
      } else {
        updated[key] = bulkQty;
      }
    });
    setQuantities(updated);
  };

  const updateItemQty = (key: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(1, (prev[key] || 1) + delta),
    }));
    setCopiesOption('CUSTOM');
  };

  const setItemQty = (key: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(1, isNaN(qty) ? 1 : qty),
    }));
    setCopiesOption('CUSTOM');
  };

  const handleBulkQtyChange = (qty: number) => {
    const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
    setBulkQty(validQty);
    const updated: Record<string, number> = {};
    items.forEach((item, idx) => {
      updated[item.sku || String(idx)] = validQty;
    });
    setQuantities(updated);
    setCopiesOption('CUSTOM');
  };

  // Compute final printable label list
  const labelsToPrint: BarcodeItem[] = [];
  items.forEach((item, idx) => {
    const key = item.sku || String(idx);
    const count = quantities[key] ?? 1;
    for (let i = 0; i < count; i++) {
      labelsToPrint.push(item);
    }
  });

  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('VIRTUAL_TSC_SIMULATOR');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'TSPL' | 'VALIDATE'>('PREVIEW');
  const [tsplPayload, setTsplPayload] = useState<string>('');
  const [tsplValidation, setTsplValidation] = useState<any>(null);
  const [tsplMessage, setTsplMessage] = useState<string>('');

  useEffect(() => {
    const loadPrinters = async () => {
      try {
        let detected: any[] = [];
        if (window.electronAPI?.getPrinters) {
          detected = await window.electronAPI.getPrinters();
        } else {
          const res = await api.get('/hardware/printers');
          detected = res.printers || [];
        }
        if (detected.length > 0) {
          setPrinters(detected);
          const tsc = detected.find(
            (p: any) =>
              p.name.toLowerCase().includes('tsc') ||
              p.name.toLowerCase().includes('label') ||
              p.name.toLowerCase().includes('barcode') ||
              p.name.toLowerCase().includes('xprinter') ||
              p.name.toLowerCase().includes('te200')
          );
          if (tsc) {
            setSelectedPrinter(tsc.name);
          }
        }
      } catch (err) {
        console.error('Failed to load printers:', err);
      }
    };
    loadPrinters();
  }, []);

  /**
   * Primary Production Print Handler for TSC TTP-244 Pro:
   * Dispatches exact binary RAW TSPL string to Win32 spooler via POST /hardware/print-tspl
   */
  const handlePrintLabels = async () => {
    if (labelsToPrint.length === 0) return;
    setIsPrinting(true);

    try {
      const res = await api.post('/hardware/print-tspl', {
        items: labelsToPrint,
        printerName: selectedPrinter || undefined,
        widthMm: 50,
        heightMm: 30,
        gapMm: 2,
      });

      if (res && res.success) {
        setTsplPayload(res.payload || '');
        setTsplValidation(res.validation || null);
        setTsplMessage(res.message || 'RAW job submitted successfully');
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3500);

        if (selectedPrinter === 'VIRTUAL_TSC_SIMULATOR') {
          setActiveTab('TSPL');
        }
        setIsPrinting(false);
        return;
      }
    } catch (err: any) {
      console.warn('TSPL direct RAW dispatch failed:', err);
      setTsplMessage(`Printer Warning: ${err.message || 'Dispatch failed'}`);
    }

    setIsPrinting(false);
  };

  const handleBrowserPrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = generateLabelHtml(true);
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportPdf = async () => {
    if (labelsToPrint.length === 0) return;
    setIsExportingPdf(true);
    try {
      if (window.electronAPI?.exportPdf) {
        const html = generateLabelHtml(false);
        await window.electronAPI.exportPdf({
          htmlContent: html,
          defaultFilename: `Brand4Less_Labels_${Date.now()}.pdf`,
          pageSize: printMode === 'A4_SHEET' ? undefined : { width: 50000, height: 30000 },
        });
      } else {
        handleBrowserPrint();
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto font-sans">
      <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative my-auto border border-slate-200/80 dark:border-slate-800 space-y-5 transition-colors">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-sm">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                TSC Barcode Label Studio & RAW TSPL Engine
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Win32 RAW Winspool printing for TSC TTP-244 Pro, Virtual Simulator & PDF exporter
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tab Switching Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Preview Label
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tsplPayload) handlePrintLabels();
                  setActiveTab('TSPL');
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'TSPL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                View TSPL
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tsplPayload) handlePrintLabels();
                  setActiveTab('VALIDATE');
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'VALIDATE'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Validate TSPL
              </button>
            </div>

            {/* Copies Option Preset */}
            <select
              value={copiesOption}
              onChange={(e) => handleCopiesOptionChange(e.target.value as any)}
              className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="CUSTOM">Custom Quantity</option>
              <option value="ONE_PER_VARIANT">1 Sticker per Variant</option>
              <option value="MATCH_STOCK">Match Current Stock Qty</option>
            </select>

            {/* Printer Selector Dropdown */}
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[190px] truncate"
              title="Label Printer Target"
            >
              <option value="VIRTUAL_TSC_SIMULATOR">Virtual TSC Printer (Simulator)</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Save PDF Button */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              title="Save printable labels to a PDF file on your computer"
            >
              {isExportingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Save PDF</span>
            </button>

            {/* TSPL RAW Print Button */}
            <button
              onClick={handlePrintLabels}
              disabled={isPrinting}
              className={`px-4 py-2 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm text-white ${
                printSuccess
                  ? 'bg-emerald-600'
                  : 'bg-slate-950 dark:bg-white dark:text-slate-950 hover:bg-slate-850 dark:hover:bg-slate-200'
              }`}
            >
              {isPrinting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>
                {isPrinting ? 'Dispatching...' : printSuccess ? 'Job Submitted!' : `Print Labels (${labelsToPrint.length})`}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Status Banner */}
        {tsplMessage && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span>{tsplMessage}</span>
            <span className="text-[10px] text-slate-400 font-sans font-semibold">Transport: Win32 RAW Winspool</span>
          </div>
        )}

        {/* ── MAIN TAB VIEW CONTAINERS ──────────────────────────────────────── */}
        {activeTab === 'PREVIEW' && (
          <div className="max-h-[56vh] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {labelsToPrint.map((item, idx) => {
                return (
                  <div
                    key={`${item.sku || 'thermal'}-${idx}`}
                    className="bg-white dark:bg-[#111827] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-1.5 shadow-2xs"
                    style={{ minHeight: '160px' }}
                  >
                    {/* Store Name Header */}
                    <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="text-[10px] font-black tracking-wider uppercase text-slate-900 dark:text-white">
                        {storeHeader}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                        {item.categoryName || 'Garment'}
                      </span>
                    </div>

                    {/* Product Title & Attributes */}
                    <div className="w-full">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {item.color ? `${item.color} ` : ''}{item.size ? `| Size: ${item.size}` : ''}
                      </p>
                    </div>

                    {/* High-Resolution Scannable Barcode */}
                    <div className="w-full px-1">
                      {renderBarcodeSvg(item.barcode || item.sku)}
                      <span className="font-mono text-[9px] font-bold text-slate-950 dark:text-white tracking-widest block text-center mt-0.5">
                        {item.barcode || item.sku}
                      </span>
                    </div>

                    {/* Retail Price & SKU */}
                    <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
                        {item.sku}
                      </span>
                      <span className="text-xs font-black text-slate-950 dark:text-white">
                        PKR {Number(item.sellingPrice).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RAW TSPL INSPECTOR VIEW ───────────────────────────────────────── */}
        {activeTab === 'TSPL' && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 font-mono text-xs space-y-3 max-h-[56vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-[11px] text-slate-400 font-sans font-bold">
              <span>TSPL 2.0 RAW Command String</span>
              <span>Byte Length: {Buffer.from(tsplPayload || '', 'utf-8').length} bytes</span>
            </div>
            <pre className="p-3 bg-slate-900/80 rounded-xl overflow-x-auto text-emerald-400 text-[11px] leading-relaxed select-all">
              {tsplPayload || (
                <span className="text-slate-500 italic">Click "Print Labels" or "View TSPL" to generate native TSPL output.</span>
              )}
            </pre>
          </div>
        )}

        {/* ── TSPL SYNTAX VALIDATOR VIEW ────────────────────────────────────── */}
        {activeTab === 'VALIDATE' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-h-[56vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">TSPL Hardware Command Validator</h4>
                <p className="text-xs text-slate-500">Validates required TSPL syntax before hardware dispatch</p>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black ${
                  tsplValidation?.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {tsplValidation?.isValid ? 'SYNTAX VALID' : 'SYNTAX CHECK'}
              </span>
            </div>

            {tsplValidation?.checks ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400">SIZE Command</div>
                  <div className="font-mono text-xs font-black text-emerald-600 mt-1">
                    {tsplValidation.checks.hasSize ? '✓ SIZE 50 mm,30 mm' : '✗ Missing'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400">GAP Command</div>
                  <div className="font-mono text-xs font-black text-emerald-600 mt-1">
                    {tsplValidation.checks.hasGap ? '✓ GAP 2 mm,0' : '✗ Missing'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400">CLS Command</div>
                  <div className="font-mono text-xs font-black text-emerald-600 mt-1">
                    {tsplValidation.checks.hasCls ? '✓ Buffer Cleared' : '✗ Missing'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400">Barcode Type</div>
                  <div className="font-mono text-xs font-black text-emerald-600 mt-1">
                    {tsplValidation.checks.isBarcode128 ? '✓ Code 128 ("128")' : '✗ Invalid Type'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400">Barcode Content</div>
                  <div className="font-mono text-xs font-black text-emerald-600 mt-1">
                    {tsplValidation.checks.hasBarcodeData ? '✓ Present' : '✗ Empty'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-400">PRINT Command</div>
                  <div className="font-mono text-xs font-black text-emerald-600 mt-1">
                    {tsplValidation.checks.hasPrint ? '✓ PRINT 1,1' : '✗ Missing'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                Click "View TSPL" or "Print Labels" to run automatic TSPL syntax validation.
              </div>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Stickers can be scanned directly with any standard 1D / 2D laser barcode reader.</span>
          <span className="font-bold text-slate-600 dark:text-slate-400">{labelsToPrint.length} labels ready to print</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to render SVG bars in raw HTML for popup print window
 */
function renderBarcodeSvgString(code: string): string {
  const cleanCode = (code || '000000').toUpperCase();
  const { widths, totalModules } = getCode128BarWidths(cleanCode);
  const quietZone = 10;
  const totalGrid = totalModules + quietZone * 2;
  const svgWidth = 240;
  const unitWidth = svgWidth / totalGrid;

  let currentX = quietZone * unitWidth;
  let rects = '';
  let isBar = true;

  widths.forEach((w) => {
    const barW = w * unitWidth;
    if (isBar) {
      rects += `<rect x="${currentX.toFixed(1)}" y="0" width="${Math.max(1, barW).toFixed(1)}" height="35" fill="#000000" />`;
    }
    currentX += barW;
    isBar = !isBar;
  });

  return rects;
}
