/**
 * House purchase types
 * Models a future property purchase (deposit, buying costs, resulting
 * mortgage, ongoing holding costs, appreciation) that feeds into the
 * retirement simulation without being part of the core retirement config.
 */

import type { PaymentFrequency } from "./financial.ts";

/**
 * A planned (or already-owned, if purchaseDate is in the past) house purchase
 */
export interface HousePurchase {
  /** Unique identifier */
  id: string;

  /** Label/description, e.g. "Primary Home", "Investment Property" */
  name: string;

  /** Date of purchase/settlement */
  purchaseDate: Date;

  /** Purchase price */
  price: number;

  /** Cash deposit paid at purchase (the rest is financed via the mortgage) */
  depositAmount: number;

  /** One-off buying costs paid at purchase: stamp duty, legal fees, inspections, etc. */
  buyingCosts: number;

  /** Expected annual appreciation rate as a percentage (e.g. 4 for 4%) */
  appreciationRate: number;

  /** Whether this purchase is a home you move into (vs. an investment property) */
  movingIn: boolean;

  /** If movingIn, the ExpenseItem id (rent) to end on purchaseDate */
  linkedRentExpenseId?: string;

  /** Annual interest rate for the resulting mortgage, as a percentage */
  mortgageInterestRate: number;

  /** Regular mortgage payment amount */
  mortgagePaymentAmount: number;

  /** Mortgage payment frequency */
  mortgagePaymentFrequency: PaymentFrequency;

  /** Whether the mortgage has an offset account attached */
  hasOffset?: boolean;

  /** Current balance already sitting in the offset account, as of the
   *  simulation's start date. Only meaningful when hasOffset is true. */
  offsetBalance?: number;

  /** Whether the mortgage is used for debt recycling (interest tax deductible) */
  isDebtRecycling?: boolean;

  /** Ongoing monthly holding costs: rates, insurance, maintenance.
   *  Becomes a recurring expense starting on purchaseDate. */
  monthlyHoldingCosts: number;

  /** Optional notes */
  notes?: string;
}
