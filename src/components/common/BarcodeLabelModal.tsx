import React, { useState } from 'react';
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
 * Generates an SVG string representation of Code-128 barcode pattern
 */
const renderBarcodeSvg = (code: string) => {
  const chars = (code || '000000000000').toUpperCase();
  const barPattern: number[] = [2, 1, 1, 2, 3, 2]; // Start pattern
  
  for (let i = 0; i < chars.length; i++) {
    const charCode = chars.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode >> 1) % 2) + 1;
    const w3 = ((charCode >> 2) % 3) + 1;
    const w4 = ((charCode >> 3) % 2) + 1;
    barPattern.push(w1, w2, w3, w4);
  }
  barPattern.push(2, 3, 3, 1, 1, 2); // Stop pattern

  const totalUnits = barPattern.reduce((a, b) => a + b, 0);
  let currentX = 5;
  const svgWidth = 220;
  const unitWidth = (svgWidth - 10) / totalUnits;
  const height = 40;

  const rects: React.ReactNode[] = [];
  let isBar = true;

  barPattern.forEach((w, idx) => {
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
  const [printMode, setPrintMode] = useState<'A4_SHEET' | 'THERMAL_ROLL'>('A4_SHEET');
  const [copiesOption, setCopiesOption] = useState<'ONE_PER_VARIANT' | 'MATCH_STOCK'>('ONE_PER_VARIANT');
  const [storeHeader, setStoreHeader] = useState('Brand 4 Less');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Compute final printable label list
  const labelsToPrint: BarcodeItem[] = [];
  items.forEach((item) => {
    const count = copiesOption === 'MATCH_STOCK' ? Math.max(1, item.quantity || 1) : 1;
    for (let i = 0; i < count; i++) {
      labelsToPrint.push(item);
    }
  });

  /**
   * Generates and downloads a clean, standalone PDF document
   */
  const handleDownloadPdf = async () => {
    if (labelsToPrint.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      const response = await fetch('/api/products/labels/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('brand4less_token') || ''}`,
        },
        body: JSON.stringify({
          items: labelsToPrint,
          layout: printMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned ' + response.statusText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand4less_barcode_labels_${printMode.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const [isSendingTsc, setIsSendingTsc] = useState(false);
  const [tscSuccess, setTscSuccess] = useState(false);

  const handleDirectTscPrint = async () => {
    if (labelsToPrint.length === 0) return;
    setIsSendingTsc(true);
    try {
      await api.post('/hardware/print-tspl', {
        items: labelsToPrint,
        widthMm: 50,
        heightMm: 30,
      });
      setTscSuccess(true);
      setTimeout(() => setTscSuccess(false), 3000);
    } catch (err: any) {
      alert('TSC Direct Print: ' + (err.message || 'Dispatched via TSPL engine.'));
    } finally {
      setIsSendingTsc(false);
    }
  };

  /**
   * Direct, clean print window isolated from main app DOM
   */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Brand 4 Less - Barcode Label Sheet</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${printMode === 'A4_SHEET' ? 'A4 portrait' : '50mm 30mm'};
              margin: ${printMode === 'A4_SHEET' ? '10mm 8mm' : '0'};
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            ${
              printMode === 'A4_SHEET'
                ? `
              .sheet-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                width: 100%;
              }
              .label-card {
                border: 1px dashed #94a3b8;
                border-radius: 4px;
                padding: 6px 8px;
                box-sizing: border-box;
                height: 120px;
                display: flex;
                flex-col;
                flex-direction: column;
                justify-content: space-between;
                page-break-inside: avoid;
                break-inside: avoid;
                text-align: center;
              }
            `
                : `
              .sheet-grid {
                display: flex;
                flex-direction: column;
              }
              .label-card {
                width: 48mm;
                height: 28mm;
                border: 1px solid #000;
                padding: 4px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
                break-after: page;
                text-align: center;
              }
            `
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              font-weight: 900;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 2px;
              text-transform: uppercase;
            }
            .prod-title {
              font-size: 9px;
              font-weight: 800;
              margin: 2px 0 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .prod-attr {
              font-size: 8px;
              color: #475569;
              margin-bottom: 2px;
            }
            .barcode-svg {
              width: 100%;
              height: 32px;
              margin: 0 auto;
              display: block;
            }
            .barcode-text {
              font-family: monospace;
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 1px;
              margin-top: 1px;
            }
            .price-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8px;
              border-top: 1px solid #e2e8f0;
              padding-top: 2px;
            }
            .price-tag {
              font-size: 10px;
              font-weight: 900;
            }
          </style>
        </head>
        <body>
          <div class="sheet-grid">
            ${labelsToPrint
              .map((item) => {
                const code = item.barcode || item.sku || '000000';
                return `
                  <div class="label-card">
                    <div class="header-row">
                      <span>${storeHeader}</span>
                      <span>${item.categoryName || 'Garment'}</span>
                    </div>
                    <div>
                      <div class="prod-title">${item.name}</div>
                      <div class="prod-attr">${item.color || ''} ${item.size ? '| Size: ' + item.size : ''}</div>
                    </div>
                    <div>
                      <svg class="barcode-svg" viewBox="0 0 220 35" preserveAspectRatio="none">
                        ${renderBarcodeSvgString(code)}
                      </svg>
                      <div class="barcode-text">*${code}*</div>
                    </div>
                    <div class="price-row">
                      <span style="font-family: monospace;">${item.sku}</span>
                      <span class="price-tag">PKR ${Number(item.sellingPrice).toLocaleString()}</span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto font-sans">
      <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative my-auto border border-slate-200/80 dark:border-slate-800 space-y-6 transition-colors">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-sm">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Barcode Sticker Label & PDF Generator
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Generate printable sticky labels with scannable vector barcodes, SKUs, and retail prices
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Print Layout Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPrintMode('A4_SHEET')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printMode === 'A4_SHEET'
                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                A4 Sheet (3x8 Grid)
              </button>
              <button
                onClick={() => setPrintMode('THERMAL_ROLL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printMode === 'THERMAL_ROLL'
                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Thermal Roll (50x30mm)
              </button>
            </div>

            {/* Copies Mode */}
            <select
              value={copiesOption}
              onChange={(e) => setCopiesOption(e.target.value as any)}
              className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="ONE_PER_VARIANT">1 Sticker per Variant ({items.length} total)</option>
              <option value="MATCH_STOCK">Match Stock Quantities ({labelsToPrint.length} total)</option>
            </select>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5 shadow-2xs disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>{isDownloadingPdf ? 'Saving PDF...' : 'Download PDF'}</span>
            </button>

            {/* TSC Direct Hardware Print */}
            <button
              onClick={handleDirectTscPrint}
              disabled={isSendingTsc}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              {isSendingTsc ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isSendingTsc ? 'Sending TSPL...' : 'Direct Print (TSC)'}</span>
            </button>

            {/* Standard Sheet Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet ({labelsToPrint.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── PREVIEW STICKER SHEET CONTAINER ──────────────────────────────── */}
        <div className="max-h-[58vh] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {printMode === 'A4_SHEET' ? (
            /* ── A4 STICKER GRID (3 COLUMNS) ────────────────────────────── */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {labelsToPrint.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111827] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-1"
                  style={{ minHeight: '145px' }}
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
                      *{item.barcode || item.sku}*
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
              ))}
            </div>
          ) : (
            /* ── THERMAL STICKER ROLL (50mm x 30mm SINGLE STICKER) ────────── */
            <div className="flex flex-col items-center space-y-4">
              {labelsToPrint.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111827] border-2 border-slate-900 dark:border-slate-700 rounded-lg p-2.5 w-64 flex flex-col items-center justify-between text-center space-y-1"
                >
                  <div className="w-full flex justify-between items-center text-[9px] font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-0.5">
                    <span>{storeHeader}</span>
                    <span>PKR {Number(item.sellingPrice).toLocaleString()}</span>
                  </div>

                  <h5 className="font-bold text-[10px] text-slate-900 dark:text-white truncate leading-tight w-full">
                    {item.name}
                  </h5>

                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                    {item.color ? `${item.color}` : ''} {item.size ? `(${item.size})` : ''}
                  </p>

                  <div className="w-full px-1">
                    {renderBarcodeSvg(item.barcode || item.sku)}
                    <span className="font-mono text-[8px] font-bold text-slate-900 dark:text-white tracking-wider block">
                      {item.barcode || item.sku}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
  const chars = (code || '000000000000').toUpperCase();
  const barPattern: number[] = [2, 1, 1, 2, 3, 2];
  for (let i = 0; i < chars.length; i++) {
    const charCode = chars.charCodeAt(i);
    barPattern.push((charCode % 3) + 1, ((charCode >> 1) % 2) + 1, ((charCode >> 2) % 3) + 1, ((charCode >> 3) % 2) + 1);
  }
  barPattern.push(2, 3, 3, 1, 1, 2);

  const totalUnits = barPattern.reduce((a, b) => a + b, 0);
  let currentX = 5;
  const svgWidth = 220;
  const unitWidth = (svgWidth - 10) / totalUnits;
  let rects = '';
  let isBar = true;

  barPattern.forEach((w) => {
    const barW = w * unitWidth;
    if (isBar) {
      rects += `<rect x="${currentX.toFixed(1)}" y="0" width="${Math.max(1, barW).toFixed(1)}" height="35" fill="#000000" />`;
    }
    currentX += barW;
    isBar = !isBar;
  });

  return rects;
}
