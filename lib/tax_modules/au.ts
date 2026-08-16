/**
 * Australian tax module - progressive brackets plus the Medicare levy.
 *
 * The Medicare levy was previously fetched from the tax-config API but never
 * actually applied anywhere in the tax calculation - this module is also the
 * fix for that: the levy rate is threaded in via extras.medicareLevyRatePercent
 * (sourced from config/tax_brackets_au.json through routes/api/tax-config.ts)
 * and applied on top of bracket tax.
 */

import type { TaxBracket } from "../../types/financial.ts";
import type {
  CountryTaxExtras,
  CountryTaxModule,
} from "../../types/country_module.ts";
import { calculateTaxWithBrackets } from "../tax_bracket_utils.ts";

/** Default Medicare levy rate (%) if no server config was loaded. */
const DEFAULT_MEDICARE_LEVY_RATE_PERCENT = 2.0;

export const auTaxModule: CountryTaxModule = {
  code: "AU",
  label: "Australia",
  retirementAccountLabel: "Superannuation",
  retirementAccountShortLabel: "Super",
  retirementAccessRule: {
    accessAge: 60,
    hardGate: true,
    earlyWithdrawalPenaltyRate: 0,
    pensionAge: 67,
  },
  capitalGainsRule: {
    longTermThresholdDays: 365,
    // AU 50% CGT discount for assets held over 12 months, then the
    // discounted gain stacks on ordinary taxable income (no separate rate).
    longTermDiscount: 0.5,
    longTermFlatRate: 0,
  },
  dividendsTaxedAsOrdinaryIncome: true,
  // AU superannuation withdrawals (pension or lump sum) are tax-free once
  // the preservation age/condition of release is met - already reflected by
  // the hard gate above, so nothing further to tax here.
  retirementWithdrawalsTaxedAsIncome: false,
  calculateTax(
    taxableIncome: number,
    brackets: TaxBracket[],
    extras?: CountryTaxExtras,
  ): number {
    const bracketTax = calculateTaxWithBrackets(taxableIncome, brackets);
    const levyRatePercent = extras?.medicareLevyRatePercent ??
      DEFAULT_MEDICARE_LEVY_RATE_PERCENT;
    const levy = taxableIncome > 0
      ? taxableIncome * (levyRatePercent / 100)
      : 0;
    return bracketTax + levy;
  },
};
