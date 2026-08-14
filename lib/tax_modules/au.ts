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
