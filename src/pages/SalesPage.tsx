import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useOrgConfig } from '../context/OrgConfigContext';
import { UniversalReceiptModal } from '../components/common/UniversalReceiptModal';
import { Search, Receipt, Printer, Eye, Calendar, RefreshCw } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const { formatPrice, org } = useOrgConfig();
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/sales?query=${encodeURIComponent(searchQuery)}&limit=100`);
      if (res.sales) setSales(res.sales);
    } catch (e) {
      console.error('Failed to load sales history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [searchQuery]);

  const handleOpenReceipt = (sale: any) => {
    const receiptPayload = {
      organization: org,
      sale: {
        id: sale.id,
        invoiceNumber: sale.invoice_number,
        createdAt: sale.created_at,
        cashierName: sale.cashier_id || 'Staff Cashier',
        customerName: sale.customer_name || 'Walk-in Customer',
        customerPhone: sale.customer_phone || '',
        subtotal: sale.subtotal,
        discountAmount: sale.discount_amount,
        taxAmount: sale.tax_amount,
        netTotal: sale.net_total,
        paidAmount: sale.paid_amount,
        changeAmount: sale.change_amount,
        khataAmount: sale.khata_amount,
        paymentMethod: sale.payment_method,
      },
      items: (sale.items || []).map((it: any) => ({
        name: it.product_name,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        subtotal: it.subtotal,
        attributes: it.attributes || {},
      })),
    };

    setSelectedReceipt(receiptPayload);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Sales Orders & Invoice Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search past invoices, review customer purchase line items, and reprint DTS thermal receipts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="w-64 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <button
            onClick={fetchSales}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items Count</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Net Amount</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    No sales invoices found matching query.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {sale.customer_name || 'Walk-in Customer'}
                      </div>
                      {sale.customer_phone && (
                        <div className="text-[10px] text-slate-400 font-mono">{sale.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{sale.items?.length || 0} items</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {formatPrice(sale.net_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenReceipt(sale)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-1.5 mx-auto transition-colors border border-emerald-200 dark:border-emerald-800"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt && (
        <UniversalReceiptModal
          receiptData={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
