/**
 * US federal tax module - progressive brackets on income after the standard
 * deduction. State income tax and FICA/payroll tax are not modeled (see
 * config/tax_brackets_us.json's description).
 *
 * The retirement account (401k/IRA) has no hard age gate on the account
 * itself - early withdrawals are allowed but incur a 10% penalty before
 * age 59.5, which is why hardGate is false here (unlike AU superannuation).
 */

import type { TaxBracket } from "../../types/financial.ts";
import type {
  CountryTaxExtras,
  CountryTaxModule,
} from "../../types/country_module.ts";
import { calculateTaxWithBrackets } from "../tax_bracket_utils.ts";

/** Default 2024 single-filer standard deduction, if no server config was loaded. */
const DEFAULT_STANDARD_DEDUCTION = 14600;

export const usTaxModule: CountryTaxModule = {
  code: "US",
  label: "United States",
  retirementAccountLabel: "401k / IRA",
  retirementAccountShortLabel: "401k",
  retirementAccessRule: {
    accessAge: 59.5,
    hardGate: false,
    earlyWithdrawalPenaltyRate: 0.10,
    pensionAge: 59.5,
  },
  capitalGainsRule: {
    longTermThresholdDays: 365,
    // US long-term capital gains use a separate preferential rate instead
    // of stacking on ordinary brackets - simplified here to a single
    // representative rate rather than the real 0/15/20% bracket structure.
    longTermDiscount: 0,
    longTermFlatRate: 0.15,
  },
  dividendsTaxedAsOrdinaryIncome: true,
  // Traditional 401k/IRA withdrawals are ordinary taxable income regardless
  // of age, on top of the early-withdrawal penalty modeled by
  // retirementAccessRule above.
  retirementWithdrawalsTaxedAsIncome: true,
  calculateTax(
    taxableIncome: number,
    brackets: TaxBracket[],
    extras?: CountryTaxExtras,
  ): number {
    const standardDeduction = extras?.standardDeduction ??
      DEFAULT_STANDARD_DEDUCTION;
    const taxableAfterDeduction = Math.max(
      0,
      taxableIncome - standardDeduction,
    );
    return calculateTaxWithBrackets(taxableAfterDeduction, brackets);
  },
};
