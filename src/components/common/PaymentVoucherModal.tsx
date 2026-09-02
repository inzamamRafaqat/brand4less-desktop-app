import React from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  CreditCard,
  Banknote,
  FileText,
  Paperclip,
  Download,
} from 'lucide-react';

export interface VoucherData {
  voucherType: 'SUPPLIER_PAYMENT' | 'PURCHASE_BILL' | 'CUSTOMER_KHATA_PAYMENT';
  voucherNumber: string;
  partyName: string;
  companyName?: string;
  phone?: string;
  address?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  previousBalance?: number;
  newBalance?: number;
  referenceNote?: string;
  items?: { description: string; quantity: number; unitPrice: number; total: number }[];
  attachmentUrl?: string;
  recordedBy?: string;
}

interface PaymentVoucherModalProps {
  data: VoucherData;
  onClose: () => void;
}

export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({ data, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const isSupplier = data.voucherType === 'SUPPLIER_PAYMENT' || data.voucherType === 'PURCHASE_BILL';
  const isPurchase = data.voucherType === 'PURCHASE_BILL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl relative my-auto border border-gray-100 space-y-6 font-sans">
        {/* Top Actions Bar (Hidden on Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs">
              B4L
            </div>
            <span className="font-bold text-xs text-gray-700">Official Transaction Receipt</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-black hover:bg-gray-850 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── PRINTABLE VOUCHER AREA ─────────────────────────────────────── */}
        <div id="payment-voucher-area" className="space-y-6 text-gray-900">
          {/* Brand Header */}
          <div className="text-center pb-4 border-b-2 border-gray-900">
            <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">Brand 4 Less</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Clothing & Fashion Accessories Retailer
            </p>
            <div className="mt-3 inline-block px-3 py-1 bg-gray-100 rounded-full font-black text-xs uppercase tracking-wider text-gray-900 border border-gray-200">
              {isPurchase
                ? 'PURCHASE GOODS INVOICE'
                : isSupplier
                ? 'SUPPLIER PAYMENT VOUCHER'
                : 'CUSTOMER KHATA PAYMENT RECEIPT'}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {isSupplier ? 'Supplier / Factory' : 'Customer Account'}
              </span>
              <div className="font-bold text-sm text-gray-900 mt-0.5">{data.partyName}</div>
              {data.companyName && <p className="text-gray-500 font-medium">{data.companyName}</p>}
              {data.phone && <p className="text-gray-500 font-mono text-[11px]">Phone: {data.phone}</p>}
              {data.address && <p className="text-gray-400 text-[10px]">{data.address}</p>}
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Voucher / Ref #</span>
                <p className="font-mono font-bold text-gray-900">{data.voucherNumber}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</span>
                <p className="font-mono text-gray-600">{data.date}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Mode</span>
                <p className="font-bold text-gray-800">{data.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Items Breakdown if Purchase Bill */}
          {data.items && data.items.length > 0 && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Rate</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium">{item.description}</td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">PKR {item.unitPrice.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">PKR {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary Box */}
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Previous Balance:</span>
              <span className="font-mono font-bold">
                PKR {Number(data.previousBalance || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>{isPurchase ? 'Bill Total Amount:' : 'Amount Paid / Transacted:'}</span>
              <span className="font-black text-lg text-emerald-600 font-mono">
                PKR {Number(data.amount).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600 pt-1 border-t border-gray-200">
              <span>Remaining Balance:</span>
              <span className="font-mono font-bold text-gray-900">
                PKR {Number(data.newBalance || 0).toLocaleString()}
              </span>
            </div>

            {data.referenceNote && (
              <div className="pt-2 text-[11px] text-gray-500 italic">
                <strong>Remarks / Notes:</strong> {data.referenceNote}
              </div>
            )}
          </div>

          {/* Attached Paper Receipt Thumbnail if any */}
          {data.attachmentUrl && (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
              <div className="flex items-center space-x-2 text-gray-700 font-bold mb-2">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attached Original Paper Receipt Image</span>
              </div>
              <img
                src={data.attachmentUrl}
                alt="Receipt Document"
                className="max-h-48 rounded-xl object-contain border border-gray-200 bg-white"
              />
            </div>
          )}

          {/* Signature Lines */}
          <div className="pt-8 flex justify-between items-end text-xs text-gray-500 border-t border-gray-200">
            <div className="text-center w-36">
              <div className="border-b border-gray-400 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Party Signature</span>
            </div>
            <div className="text-center w-36">
              <div className="border-b border-gray-400 mb-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Authorized Officer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
