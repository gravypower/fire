/**
 * Resolves planned house purchases into their concrete effects on the rest
 * of UserParameters: a real mortgage Loan (with a startDate so it stays
 * dormant until purchase), a clamped end date on any linked rent expense,
 * and a recurring expense for ongoing holding costs.
 *
 * This runs once, before the simulation loop starts (like
 * resolveParametersForDate pre-resolves transitions) rather than mutating
 * state mid-run - calculateTimeStep never mutates params, so anything that
 * needs to change params (as opposed to FinancialState) has to be resolved
 * ahead of time.
 */

import type { Loan, UserParameters } from "../types/financial.ts";
import type { ExpenseItem } from "../types/expenses.ts";

/**
 * Builds the mortgage Loan for a house purchase. Exported separately so the
 * PROPERTY phase and tests can derive the same loan id/principal without
 * duplicating the construction logic.
 */
export function mortgageLoanId(houseId: string): string {
  return `mortgage-${houseId}`;
}

export function houseHoldingCostsExpenseId(houseId: string): string {
  return `house-costs-${houseId}`;
}

export function resolveHousePurchaseEffects(
  params: UserParameters,
): UserParameters {
  if (!params.housePurchases || params.housePurchases.length === 0) {
    return params;
  }

  const loans: Loan[] = params.loans ? [...params.loans] : [];
  let expenseItems: ExpenseItem[] = params.expenseItems
    ? [...params.expenseItems]
    : [];

  for (const house of params.housePurchases) {
    loans.push({
      id: mortgageLoanId(house.id),
      label: `${house.name} Mortgage`,
      principal: Math.max(0, house.price - house.depositAmount),
      interestRate: house.mortgageInterestRate,
      paymentAmount: house.mortgagePaymentAmount,
      paymentFrequency: house.mortgagePaymentFrequency,
      hasOffset: house.hasOffset,
      offsetBalance: house.offsetBalance,
      isDebtRecycling: house.isDebtRecycling,
      startDate: house.purchaseDate,
    });

    if (house.movingIn && house.linkedRentExpenseId) {
      expenseItems = expenseItems.map((item) => {
        if (item.id !== house.linkedRentExpenseId) {
          return item;
        }
        const clampedEndDate = item.endDate && item.endDate < house.purchaseDate
          ? item.endDate
          : house.purchaseDate;
        return { ...item, endDate: clampedEndDate };
      });
    }

    if (house.monthlyHoldingCosts > 0) {
      expenseItems.push({
        id: houseHoldingCostsExpenseId(house.id),
        name: `${house.name} Holding Costs`,
        amount: house.monthlyHoldingCosts,
        frequency: "monthly",
        category: "housing",
        enabled: true,
        startDate: house.purchaseDate,
      });
    }
  }

  return { ...params, loans, expenseItems };
}
