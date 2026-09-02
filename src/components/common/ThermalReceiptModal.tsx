import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Download, QrCode, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { api } from '../../lib/api';

interface ThermalReceiptModalProps {
  isOpen?: boolean;
  onClose: () => void;
  receiptData?: any;
  sale?: any;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen = true,
  onClose,
  receiptData,
  sale,
}) => {
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isSendingRaw, setIsSendingRaw] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const res = await api.get('/hardware/printers');
        if (res.printers && res.printers.length > 0) {
          setPrinters(res.printers);
          // Auto-select DTS or POS thermal printer if found
          const dts = res.printers.find(
            (p: any) =>
              p.name.toLowerCase().includes('dts') ||
              p.name.toLowerCase().includes('pos') ||
              p.name.toLowerCase().includes('thermal') ||
              p.name.toLowerCase().includes('receipt') ||
              p.name.toLowerCase().includes('80')
          );
          if (dts) {
            setSelectedPrinter(dts.name);
          } else {
            setSelectedPrinter(res.printers[0].name);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchPrinters();
  }, []);

  if (isOpen === false) return null;

  // Normalize data between receiptData and sale props
  const rawSale = sale || receiptData?.invoice || receiptData?.sale || {};
  const store = receiptData?.store || {
    name: 'BRAND 4 LESS',
    tagline: 'Premium Export Leftovers & Apparel Outlet',
    address: 'Shop # 4, Main Commercial Boulevard, Gulberg III, Lahore',
    phone: '+92 300 1234567',
    currency: 'PKR',
  };

  const invoiceNumber = rawSale.invoiceNumber || rawSale.invoice_number || 'INV-0001';
  const createdAt = rawSale.createdAt || rawSale.created_at || new Date().toISOString();
  const cashierName = rawSale.cashierName || rawSale.cashier_name || 'Staff Cashier';
  const customerName = rawSale.customerName || rawSale.customer_name || 'Walk-in Customer';
  const customerPhone = rawSale.customerPhone || rawSale.customer_phone || '';
  const netTotal = Number(rawSale.netTotal || rawSale.net_total || 0);
  const subtotal = Number(rawSale.subtotal || netTotal);
  const discountAmount = Number(rawSale.discountAmount || rawSale.discount_amount || 0);
  const paidAmount = Number(rawSale.paidAmount || rawSale.paid_amount || netTotal);
  const paymentMethod = rawSale.paymentMethod || rawSale.payment_method || 'CASH';
  const items = receiptData?.items || rawSale.items || [];
  const qrDataUrl = receiptData?.qrDataUrl;
  const returnPolicy = receiptData?.returnPolicy || 'Items can be exchanged within 7 days with original receipt. No cash refund on sale items.';

  /**
   * Direct Raw ESC/POS Print to DTS Brand Thermal Printer
   */
  const handleDirectDtsPrint = async () => {
    setIsSendingRaw(true);
    try {
      await api.post('/hardware/print-escpos', {
        sale: {
          invoice_number: invoiceNumber,
          created_at: createdAt,
          cashier_name: cashierName,
          customer_name: customerName,
          customer_phone: customerPhone,
          subtotal,
          discount_amount: discountAmount,
          net_total: netTotal,
          paid_amount: paidAmount,
          payment_method: paymentMethod,
          items: items.map((it: any) => ({
            name: it.name || it.product_name || 'Item',
            quantity: it.quantity || 1,
            unit_price: it.unitPrice || it.unit_price || 0,
            subtotal: it.subtotal || (Number(it.unitPrice || it.unit_price || 0) * Number(it.quantity || 1)),
          })),
        },
        printerName: selectedPrinter || undefined,
        width: '80mm',
        autoCut: true,
        kickDrawer: paymentMethod === 'CASH',
      });

      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 3000);
    } catch (err: any) {
      // Fallback to browser print window
      handleBrowserPrint();
    } finally {
      setIsSendingRaw(false);
    }
  };

  /**
   * Isolated Browser Print Window
   */
  const handleBrowserPrint = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${invoiceNumber}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: "Courier New", Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 4mm 2mm;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .header-title { font-size: 15px; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px; text-transform: uppercase; }
            .border-dashed { border-top: 1px dashed #000; margin: 6px 0; }
            .border-double { border-top: 2px solid #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; font-size: 10px; }
            td { padding: 3px 0; vertical-align: top; }
            .grand-total { font-size: 14px; font-weight: 900; }
            .policy-box { font-size: 9px; text-align: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="header-title">${store.name}</div>
            <div>${store.tagline || ''}</div>
            <div>${store.address || ''}</div>
            <div>Tel: ${store.phone || ''}</div>
          </div>
          <div class="border-dashed"></div>
          <div>
            <div class="flex-between"><span>Invoice #:</span><span class="font-bold">${invoiceNumber}</span></div>
            <div class="flex-between"><span>Date/Time:</span><span>${new Date(createdAt).toLocaleString()}</span></div>
            <div class="flex-between"><span>Cashier:</span><span>${cashierName}</span></div>
            ${
              customerName && customerName !== 'Walk-in Customer'
                ? `<div class="flex-between"><span>Customer:</span><span class="font-bold">${customerName} ${customerPhone ? '(' + customerPhone + ')' : ''}</span></div>`
                : ''
            }
          </div>
          <div class="border-double"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Item</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Price</th>
                <th style="width: 20%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (it: any) => `
                <tr>
                  <td>${it.name || it.product_name} ${it.color ? '<br/><small>' + it.color + (it.size ? '/' + it.size : '') + '</small>' : ''}</td>
                  <td style="text-align: center;">${it.quantity || 1}</td>
                  <td style="text-align: right;">${Math.round(Number(it.unitPrice || it.unit_price || 0))}</td>
                  <td style="text-align: right;" class="font-bold">${Math.round(Number(it.subtotal || (Number(it.unitPrice || it.unit_price || 0) * Number(it.quantity || 1)))).toLocaleString()}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="border-double"></div>
          <div>
            <div class="flex-between"><span>Subtotal:</span><span>PKR ${subtotal.toLocaleString()}</span></div>
            ${discountAmount > 0 ? `<div class="flex-between"><span>Discount:</span><span>-PKR ${discountAmount.toLocaleString()}</span></div>` : ''}
            <div class="flex-between grand-total" style="margin: 4px 0;">
              <span>NET TOTAL:</span>
              <span>PKR ${netTotal.toLocaleString()}</span>
            </div>
            <div class="flex-between"><span>Payment Method:</span><span class="font-bold">${paymentMethod}</span></div>
            <div class="flex-between"><span>Paid Amount:</span><span>PKR ${paidAmount.toLocaleString()}</span></div>
          </div>
          <div class="border-dashed"></div>
          <div class="policy-box">
            ${returnPolicy}<br/><br/>
            <strong>*** THANK YOU FOR VISITING BRAND 4 LESS ***</strong>
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
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto font-sans">
      <div className="bg-slate-900 text-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative my-auto border border-slate-800 space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">DTS Thermal POS Receipt</h3>
              <p className="text-[10px] text-slate-400">ESC/POS 80mm & Standard Print Compatible</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printer Selection Bar */}
        {printers.length > 0 && (
          <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-2xl text-xs gap-2">
            <span className="text-slate-400 text-[11px] whitespace-nowrap">Target Printer:</span>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1 text-xs font-medium w-full outline-none"
            >
              {printers.map((p, idx) => (
                <option key={idx} value={p.name}>
                  {p.name} {p.name.toLowerCase().includes('dts') ? '(DTS Thermal)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── THERMAL RECEIPT PREVIEW CANVAS ──────────────────────────────── */}
        <div
          ref={receiptRef}
          className="bg-white text-slate-900 p-5 rounded-2xl shadow-inner font-mono text-xs max-h-[420px] overflow-y-auto space-y-3"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-2.5">
            <h2 className="text-base font-black uppercase tracking-wider">{store.name}</h2>
            <p className="text-[10px] text-slate-600">{store.tagline}</p>
            <p className="text-[10px] text-slate-600">{store.address}</p>
            <p className="text-[10px] font-bold text-slate-800">{store.phone}</p>
          </div>

          {/* Invoice Info */}
          <div className="text-[11px] border-b border-dashed border-slate-300 pb-2 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice:</span>
              <span className="font-bold font-mono">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{new Date(createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{cashierName}</span>
            </div>
            {customerName && customerName !== 'Walk-in Customer' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold">{customerName} {customerPhone ? `(${customerPhone})` : ''}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 pb-1">
              <span>Item Description</span>
              <span>Qty x Price</span>
              <span>Total</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {items.map((it: any, idx: number) => {
                const qty = it.quantity || 1;
                const unit = Number(it.unitPrice || it.unit_price || 0);
                const itemTotal = Number(it.subtotal || (unit * qty));
                return (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div className="max-w-[150px]">
                      <div className="font-bold text-slate-900 truncate">{it.name || it.product_name}</div>
                      {(it.color || it.size) && (
                        <div className="text-[10px] text-slate-500">
                          {it.color} {it.size ? `(${it.size})` : ''}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-600 font-mono">
                      {qty} x {Math.round(unit)}
                    </div>
                    <div className="font-bold text-slate-900 font-mono">
                      {itemTotal.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="text-[11px] space-y-1 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-bold">PKR {subtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span className="font-mono font-bold">-PKR {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200 text-slate-950">
              <span>NET TOTAL</span>
              <span className="font-mono">PKR {netTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Paid ({paymentMethod})</span>
              <span className="font-mono font-bold">PKR {paidAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-slate-500 space-y-1 pt-1">
            <p className="leading-tight">{returnPolicy}</p>
            <p className="font-bold text-slate-800">*** THANK YOU FOR SHOPPING ***</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleBrowserPrint}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Standard Print Slip</span>
          </button>

          <button
            onClick={handleDirectDtsPrint}
            disabled={isSendingRaw}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition flex items-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSendingRaw ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isSendingRaw ? 'Sending...' : 'Direct Print (DTS Thermal)'}</span>
          </button>
        </div>

        {printSuccess && (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold animate-fade-in justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sent directly to DTS Thermal Printer!</span>
          </div>
        )}
      </div>
    </div>
  );
};
