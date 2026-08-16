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

/**
 * Governs how realized capital gains on sold investments are taxed. A gain
 * is "long term" once the holding has been held at least
 * longTermThresholdDays. Two different real-world shapes are supported:
 *  - AU: long-term gains get a discount (50%) then stack on top of ordinary
 *    taxable income and are taxed at the household's marginal rate
 *    (longTermDiscount: 0.5, longTermFlatRate: 0).
 *  - US: long-term gains are taxed at a separate preferential flat rate
 *    instead of stacking on ordinary brackets (longTermDiscount: 0,
 *    longTermFlatRate: e.g. 0.15). This is a simplification of the real US
 *    0/15/20% long-term bracket structure down to a single representative
 *    rate.
 * Short-term gains (held < longTermThresholdDays) always stack on ordinary
 * taxable income at the marginal rate, in both shapes.
 */
export interface CapitalGainsRule {
  /** Days held before a gain qualifies as "long term" (365 for AU and US). */
  longTermThresholdDays: number;
  /** Discount applied to long-term gains before stacking on ordinary taxable
   *  income. 0 if this country instead uses longTermFlatRate. */
  longTermDiscount: number;
  /** Flat rate (0-1) applied directly to long-term gains instead of stacking
   *  on ordinary income. 0 if this country instead uses longTermDiscount. */
  longTermFlatRate: number;
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
  /** How realized capital gains on investment sales are taxed. */
  capitalGainsRule: CapitalGainsRule;
  /** Whether dividend/distribution income is taxed as ordinary income
   *  stacked with salary at the marginal rate. True for both AU and US in
   *  this model - AU franking credits are not modeled (a documented
   *  simplification). */
  dividendsTaxedAsOrdinaryIncome: boolean;
  /** Whether withdrawals from the country's retirement account, once
   *  accessible, are taxed as ordinary income. AU superannuation
   *  (pension/lump sum after preservation age): false, it's tax-free. US
   *  401k/IRA (traditional): true, the whole distribution is ordinary
   *  income regardless of age. */
  retirementWithdrawalsTaxedAsIncome: boolean;
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
