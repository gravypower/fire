/**
 * Pure helpers for maintaining an investment holding's purchase/sale ledger.
 */

import type {
  InvestmentPurchase,
  InvestmentSale,
} from "../types/investments.ts";

/**
 * Sells units from a FIFO (first-in, first-out) queue of purchase lots.
 *
 * Consumes the oldest lots first, splitting a lot when only part of it is
 * needed, and returns both the remaining purchase lots and a record of the
 * sale itself (including realized gain/loss based on the cost basis of the
 * units actually consumed).
 *
 * Precondition: unitsToSell must be > 0 and <= the total units across all
 * purchases. Callers should validate this before calling (e.g. to show a
 * user-facing error) - this function throws rather than silently clamping.
 */
export function sellFromPurchases(
  purchases: InvestmentPurchase[],
  unitsToSell: number,
  salePrice: number,
  saleDate: string,
  fees = 0,
): { remainingPurchases: InvestmentPurchase[]; sale: InvestmentSale } {
  const totalUnits = purchases.reduce((sum, p) => sum + p.units, 0);

  if (unitsToSell <= 0) {
    throw new Error("unitsToSell must be positive");
  }
  if (unitsToSell > totalUnits) {
    throw new Error(
      `Cannot sell ${unitsToSell} units; only ${totalUnits} available`,
    );
  }

  const sortedPurchases = [...purchases].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let remainingToSell = unitsToSell;
  let costBasisConsumed = 0;
  const remainingPurchases: InvestmentPurchase[] = [];

  for (const purchase of sortedPurchases) {
    if (remainingToSell <= 0) {
      remainingPurchases.push(purchase);
      continue;
    }

    const costPerUnit = purchase.totalCost / purchase.units;

    if (purchase.units <= remainingToSell) {
      // Fully consume this lot
      costBasisConsumed += purchase.totalCost;
      remainingToSell -= purchase.units;
    } else {
      // Partially consume this lot
      const unitsConsumed = remainingToSell;
      const unitsRemaining = purchase.units - unitsConsumed;
      costBasisConsumed += unitsConsumed * costPerUnit;
      remainingPurchases.push({
        ...purchase,
        units: unitsRemaining,
        totalCost: unitsRemaining * costPerUnit,
      });
      remainingToSell = 0;
    }
  }

  const totalProceeds = unitsToSell * salePrice - fees;
  const realizedGainLoss = totalProceeds - costBasisConsumed;

  const sale: InvestmentSale = {
    id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: saleDate,
    units: unitsToSell,
    pricePerUnit: salePrice,
    totalProceeds,
    fees: fees || undefined,
    costBasis: costBasisConsumed,
    realizedGainLoss,
  };

  return { remainingPurchases, sale };
}

/**
 * Sums realized gain/loss across a holding's sale history
 */
export function totalRealizedGainLoss(
  sales: InvestmentSale[] | undefined,
): number {
  return (sales ?? []).reduce((sum, sale) => sum + sale.realizedGainLoss, 0);
}
