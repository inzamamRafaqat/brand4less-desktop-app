import React, { useState } from 'react';
import { X, Printer, Zap, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useOrgConfig } from '../../context/OrgConfigContext';

interface UniversalReceiptModalProps {
  receiptData: any;
  onClose: () => void;
}

export const UniversalReceiptModal: React.FC<UniversalReceiptModalProps> = ({
  receiptData,
  onClose,
}) => {
  const { org, formatPrice } = useOrgConfig();
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string | null>(null);

  if (!receiptData) return null;

  const sale = receiptData.sale || {};
  const items = receiptData.items || [];
  const organization = receiptData.organization || org || {};

  const handleBrowserPrint = () => {
    const printContent = document.getElementById('printable-thermal-receipt');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
      alert('Please allow popups to print receipt.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${sale.invoiceNumber}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 76mm;
              margin: 0 auto;
              padding: 6px 4px;
              font-size: 11px;
              color: #000;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-t { border-top: 1px dashed #000; }
            .border-b { border-bottom: 1px dashed #000; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { padding: 2px 0; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDirectDtsPrint = async () => {
    setIsPrintingDirect(true);
    setPrintSuccessMsg(null);
    try {
      const res = await api.post('/hardware/print-escpos', {
        sale: {
          ...sale,
          items,
        },
      });
      setPrintSuccessMsg(res.message || 'Direct thermal job sent to printer.');
      setTimeout(() => setPrintSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Direct Print Failed: ${err.message}\nFalling back to browser print.`);
      handleBrowserPrint();
    } finally {
      setIsPrintingDirect(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Sale Receipt</h3>
              <p className="text-xs text-slate-500 font-mono">Invoice #{sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {printSuccessMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{printSuccessMsg}</span>
          </div>
        )}

        {/* Receipt Paper Area */}
        <div className="p-4 overflow-y-auto flex justify-center bg-slate-100 dark:bg-slate-950">
          <div
            id="printable-thermal-receipt"
            className="w-[300px] bg-white text-black p-4 rounded shadow-sm font-mono text-[11px] leading-tight border border-slate-200"
          >
            {/* Header */}
            <div className="text-center mb-2">
              <h2 className="text-base font-bold tracking-tight uppercase">{organization.name || 'OMNIRETAIL'}</h2>
              {organization.tagline && <p className="text-[10px] text-slate-600">{organization.tagline}</p>}
              {organization.address && <p className="text-[9px] text-slate-600 mt-0.5">{organization.address}</p>}
              {organization.phone && <p className="text-[9px] text-slate-600">Ph: {organization.phone}</p>}
            </div>

            <div className="border-t border-b border-dashed border-black py-1.5 my-1.5 text-[10px]">
              <div className="flex justify-between">
                <span>Inv: {sale.invoiceNumber}</span>
                <span>{new Date(sale.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {new Date(sale.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>By: {sale.cashierName || 'Cashier'}</span>
              </div>
              {sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                <div className="mt-1 pt-1 border-t border-dotted border-slate-400">
                  <span>Cust: {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left my-2 text-[10px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-300">
                {items.map((it: any, idx: number) => {
                  const attrStr = it.attributes ? Object.values(it.attributes).join('/') : '';
                  return (
                    <tr key={idx}>
                      <td className="py-1 pr-1 font-semibold">
                        <div>{it.name}</div>
                        {attrStr && <div className="text-[9px] text-slate-600 font-normal">{attrStr}</div>}
                      </td>
                      <td className="py-1 text-center align-top">{it.quantity}</td>
                      <td className="py-1 text-right align-top">{Math.round(it.unitPrice)}</td>
                      <td className="py-1 text-right font-bold align-top">{Math.round(it.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="border-t border-dashed border-black pt-1.5 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Discount:</span>
                  <span>-{formatPrice(sale.discountAmount)}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({organization.tax_label || 'GST'}):</span>
                  <span>{formatPrice(sale.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold border-t border-black pt-1 mt-1">
                <span>NET TOTAL:</span>
                <span>{formatPrice(sale.netTotal)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Paid ({sale.paymentMethod || 'CASH'}):</span>
                <span>{formatPrice(sale.paidAmount || sale.netTotal)}</span>
              </div>
              {sale.changeAmount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Change:</span>
                  <span>{formatPrice(sale.changeAmount)}</span>
                </div>
              )}
              {sale.khataAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Khata Balance Added:</span>
                  <span>{formatPrice(sale.khataAmount)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center border-t border-dashed border-black mt-3 pt-2 text-[9px] text-slate-700">
              <p>{organization.return_policy || 'Exchange within 7 days with receipt. No cash refunds.'}</p>
              <p className="mt-1 font-bold">*** THANK YOU FOR SHOPPING ***</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <button
            onClick={handleBrowserPrint}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Browser Print</span>
          </button>

          <button
            onClick={handleDirectDtsPrint}
            disabled={isPrintingDirect}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{isPrintingDirect ? 'Printing...' : 'Direct Print (DTS)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
