/**
 * Moving Weighted Average Cost (WAC) Calculator
 */
export function calculateMovingWAC(
  currentStock: number,
  currentCost: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  if (incomingQty <= 0) return currentCost;
  
  // If no existing stock or negative stock, new incoming cost becomes the baseline cost
  if (currentStock <= 0) {
    return Number(incomingUnitCost.toFixed(2));
  }

  const existingValue = currentStock * currentCost;
  const incomingValue = incomingQty * incomingUnitCost;
  const totalQty = currentStock + incomingQty;

  const wac = (existingValue + incomingValue) / totalQty;
  return Number(wac.toFixed(2));
}

/**
 * Currency Formatter based on Organization Settings
 */
export interface OrgCurrencyConfig {
  symbol?: string;
  code?: string;
  position?: 'BEFORE' | 'AFTER';
  decimalPlaces?: number;
}

export function formatCurrency(
  amount: number,
  config: OrgCurrencyConfig = { symbol: 'Rs.', position: 'BEFORE', decimalPlaces: 0 }
): string {
  const decimals = config.decimalPlaces ?? 0;
  const formattedNumber = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbol = config.symbol || 'Rs.';
  if (config.position === 'AFTER') {
    return `${formattedNumber} ${symbol}`;
  }
  return `${symbol} ${formattedNumber}`;
}

/**
 * POS Line Item & Invoice Totals Calculator
 */
export function calculateInvoiceTotals(
  items: { quantity: number; unitPrice: number; discountAmount?: number }[],
  overallDiscountAmount: number = 0,
  taxRatePercent: number = 0
) {
  const subtotal = items.reduce((sum, it) => {
    const lineGross = it.quantity * it.unitPrice;
    const lineDiscount = it.discountAmount || 0;
    return sum + (lineGross - lineDiscount);
  }, 0);

  const discountedSubtotal = Math.max(0, subtotal - overallDiscountAmount);
  const taxAmount = (discountedSubtotal * taxRatePercent) / 100;
  const netTotal = Math.round(discountedSubtotal + taxAmount);

  return {
    subtotal: Math.round(subtotal),
    overallDiscount: Math.round(overallDiscountAmount),
    taxAmount: Math.round(taxAmount),
    netTotal,
  };
}
