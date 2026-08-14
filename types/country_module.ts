/**
 * Country tax/retirement-account module types.
 * A CountryTaxModule captures the rule *shape* that differs by country -
 * not just bracket numbers, but how a retirement account (superannuation,
 * 401k/IRA, etc.) can be accessed before its normal access age.
 */

import type { TaxBracket } from "./financial.ts";

export type CountryCode = "AU" | "US";

/**
 * Governs whether/how a retirement account can be withdrawn from before its
 * normal access age. Australian superannuation hard-blocks any access before
 * the preservation age; a US 401k/IRA allows early withdrawal but deducts a
 * penalty - these are different rule shapes, not just different numbers.
 */
export interface RetirementAccountAccessRule {
  /** Age at which the account becomes fully accessible with no penalty. */
  accessAge: number;
  /** true = withdrawals blocked entirely before accessAge (AU super).
   *  false = withdrawals allowed before accessAge, minus a penalty (US 401k/IRA). */
  hardGate: boolean;
  /** Only meaningful when hardGate is false - fraction (e.g. 0.10) deducted
   *  from any amount withdrawn before accessAge. */
  earlyWithdrawalPenaltyRate: number;
  /** Age at which a hard-gated account (AU super) opens up further, beyond
   *  accessAge - modeling AU's Age Pension eligibility age loosening access.
   *  For a non-hard-gated module (US), set equal to accessAge - the account
   *  is never actually gated, so this has no additional effect. */
  pensionAge: number;
}

/**
 * Extra country-specific numbers needed alongside brackets to compute tax -
 * sourced from the tax-config API response and carried on UserParameters,
 * the same way taxBrackets/preservationAge already are. Which fields matter
 * depends on the active module (AU reads medicareLevyRatePercent, US reads
 * standardDeduction); modules ignore fields that don't apply to them.
 */
export interface CountryTaxExtras {
  medicareLevyRatePercent?: number;
  standardDeduction?: number;
}

export interface CountryTaxModule {
  code: CountryCode;
  /** Display name, e.g. "Australia" */
  label: string;
  /** Display name for the retirement account concept, e.g. "Superannuation" */
  retirementAccountLabel: string;
  /** Short form, e.g. "Super" */
  retirementAccountShortLabel: string;
  retirementAccessRule: RetirementAccountAccessRule;
  /**
   * Computes total tax owed on taxable income, given this country's bracket
   * set (fetched separately, since brackets vary by tax year) and any extra
   * country-specific numbers. Includes any levy/surcharge/deduction beyond
   * the brackets themselves.
   */
  calculateTax(
    taxableIncome: number,
    brackets: TaxBracket[],
    extras?: CountryTaxExtras,
  ): number;
}
