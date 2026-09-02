/**
 * Pure Calculation and Costing Engine for Brand 4 Less
 * Implements strict financial math, Weighted Average Costing, Margins, and Net Profit.
 */

export interface CartItemInput {
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount?: number;
}

export interface CalculatedItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  subtotal: number;
  totalCost: number;
  profit: number;
}

export interface CalculatedSale {
  items: CalculatedItem[];
  subtotal: number;
  itemDiscountsTotal: number;
  overallDiscount: number;
  totalDiscount: number;
  taxAmount: number;
  netTotal: number;
  totalCost: number;
  totalProfit: number;
}

/**
 * Calculates new Moving Weighted Average Cost (WAC) upon stock receipt.
 * Formula: ((Existing Stock * Existing Cost) + (Incoming Qty * Incoming Unit Cost)) / (Existing Stock + Incoming Qty)
 */
export function calculateMovingWeightedAverageCost(
  existingStock: number,
  existingCost: number,
  incomingQty: number,
  incomingCost: number
): number {
  if (incomingQty <= 0) return existingCost;
  if (existingStock <= 0) return Number(incomingCost.toFixed(2));

  const totalExistingValue = existingStock * existingCost;
  const totalIncomingValue = incomingQty * incomingCost;
  const totalStock = existingStock + incomingQty;

  const newAverageCost = (totalExistingValue + totalIncomingValue) / totalStock;
  return Number(newAverageCost.toFixed(2));
}

/**
 * Calculate individual item metrics: subtotal, historical cost capture, and gross profit.
 */
export function calculateItemMetrics(
  quantity: number,
  unitPrice: number,
  unitCost: number,
  itemDiscount = 0
): { subtotal: number; totalCost: number; profit: number } {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, unitPrice);
  const safeCost = Math.max(0, unitCost);
  const safeDiscount = Math.max(0, Math.min(itemDiscount, safePrice * safeQty));

  const subtotal = Number((safePrice * safeQty - safeDiscount).toFixed(2));
  const totalCost = Number((safeCost * safeQty).toFixed(2));
  const profit = Number((subtotal - totalCost).toFixed(2));

  return { subtotal, totalCost, profit };
}

/**
 * Calculates complete sale financial totals atomically.
 */
export function calculateSaleTotals(
  rawItems: CartItemInput[],
  overallDiscount = 0,
  taxRatePercent = 0
): CalculatedSale {
  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let totalCost = 0;
  let totalProfit = 0;

  const items: CalculatedItem[] = rawItems.map((item) => {
    const itemDisc = item.discountAmount || 0;
    const { subtotal: itemSubtotal, totalCost: itemCost, profit: itemProfit } =
      calculateItemMetrics(item.quantity, item.unitPrice, item.unitCost, itemDisc);

    subtotal += item.unitPrice * item.quantity;
    itemDiscountsTotal += itemDisc;
    totalCost += itemCost;
    totalProfit += itemProfit;

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost,
      discountAmount: itemDisc,
      subtotal: itemSubtotal,
      totalCost: itemCost,
      profit: itemProfit,
    };
  });

  const totalDiscount = Number((itemDiscountsTotal + overallDiscount).toFixed(2));
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const taxAmount = Number(((discountedSubtotal * taxRatePercent) / 100).toFixed(2));
  const netTotal = Number((discountedSubtotal + taxAmount).toFixed(2));

  // Adjust total profit after overall discount
  const finalProfit = Number((totalProfit - overallDiscount).toFixed(2));

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    itemDiscountsTotal: Number(itemDiscountsTotal.toFixed(2)),
    overallDiscount: Number(overallDiscount.toFixed(2)),
    totalDiscount,
    taxAmount,
    netTotal,
    totalCost: Number(totalCost.toFixed(2)),
    totalProfit: finalProfit,
  };
}

/**
 * Calculates net profit of the business across any time window.
 * Formula: Sales Gross Profit - Returns Lost Profit - Operating Expenses - Salaries
 */
export function calculatePeriodNetProfit(
  salesGrossProfit: number,
  returnsRefundLoss: number,
  operatingExpenses: number,
  salariesPaid: number
): {
  grossProfit: number;
  netOperatingProfit: number;
  totalOperatingCosts: number;
} {
  const adjustedGrossProfit = salesGrossProfit - returnsRefundLoss;
  const totalOperatingCosts = operatingExpenses + salariesPaid;
  const netOperatingProfit = Number((adjustedGrossProfit - totalOperatingCosts).toFixed(2));

  return {
    grossProfit: Number(adjustedGrossProfit.toFixed(2)),
    netOperatingProfit,
    totalOperatingCosts: Number(totalOperatingCosts.toFixed(2)),
  };
}

/**
 * Calculate exchange difference.
 * Positive = Customer must pay extra.
 * Negative = Store must refund customer or credit Khata.
 */
export function calculateExchangeDifference(
  returnedItemsRefundTotal: number,
  newItemsSaleTotal: number
): number {
  return Number((newItemsSaleTotal - returnedItemsRefundTotal).toFixed(2));
}

/**
 * Calculate Khata running balance on debit/credit mutations.
 * Debit = Customer took credit (owes store more).
 * Credit = Customer paid cash (owes store less).
 */
export function calculateKhataRunningBalance(
  previousBalance: number,
  debit: number,
  credit: number
): number {
  return Number((previousBalance + debit - credit).toFixed(2));
}
