/**
 * Unit tests for the country tax modules (AU/US) and the shared
 * retirement-account withdrawal evaluation.
 */

import { assert, assertEquals } from "$std/assert/mod.ts";
import { auTaxModule } from "../../lib/tax_modules/au.ts";
import { usTaxModule } from "../../lib/tax_modules/us.ts";
import {
  evaluateRetirementAccountWithdrawal,
  getCountryModule,
} from "../../lib/tax_modules/index.ts";
import { DEFAULT_AU_TAX_BRACKETS } from "../../lib/tax_bracket_utils.ts";
import type { TaxBracket } from "../../types/financial.ts";

const US_BRACKETS_2024: TaxBracket[] = [
  { min: 0, max: 11600, rate: 10 },
  { min: 11600, max: 47150, rate: 12 },
  { min: 47150, max: 100525, rate: 22 },
  { min: 100525, max: 191950, rate: 24 },
  { min: 191950, max: 243725, rate: 32 },
  { min: 243725, max: 609350, rate: 35 },
  { min: 609350, max: null, rate: 37 },
];

Deno.test("getCountryModule - defaults to Australia when country is undefined", () => {
  const module = getCountryModule(undefined);
  assertEquals(module.code, "AU");
});

Deno.test("getCountryModule - returns the matching module for a known code", () => {
  assertEquals(getCountryModule("AU").code, "AU");
  assertEquals(getCountryModule("US").code, "US");
});

Deno.test("auTaxModule.calculateTax - applies bracket tax plus the Medicare levy", () => {
  // $80,000 taxable income at 2024-25 AU brackets:
  // 0-18200: 0, 18200-45000: 26800*0.19=5092, 45000-80000: 35000*0.325=11375
  // bracket tax = 16467; + 2% Medicare levy on 80000 = 1600
  const tax = auTaxModule.calculateTax(80000, DEFAULT_AU_TAX_BRACKETS, {
    medicareLevyRatePercent: 2.0,
  });
  assertEquals(Math.round(tax), 16467 + 1600);
});

Deno.test("auTaxModule.calculateTax - zero income has zero tax and zero levy", () => {
  const tax = auTaxModule.calculateTax(0, DEFAULT_AU_TAX_BRACKETS, {
    medicareLevyRatePercent: 2.0,
  });
  assertEquals(tax, 0);
});

Deno.test("auTaxModule.calculateTax - falls back to the default levy rate when extras are omitted", () => {
  const withExtras = auTaxModule.calculateTax(80000, DEFAULT_AU_TAX_BRACKETS, {
    medicareLevyRatePercent: 2.0,
  });
  const withoutExtras = auTaxModule.calculateTax(
    80000,
    DEFAULT_AU_TAX_BRACKETS,
  );
  assertEquals(withExtras, withoutExtras);
});

Deno.test("usTaxModule.calculateTax - subtracts the standard deduction before applying brackets", () => {
  // $80,000 income - $14,600 standard deduction = $65,400 taxable
  // 0-11600: 10%=1160, 11600-47150: 12%*35550=4266, 47150-65400: 22%*18250=4015
  const tax = usTaxModule.calculateTax(80000, US_BRACKETS_2024, {
    standardDeduction: 14600,
  });
  assertEquals(Math.round(tax), 1160 + 4266 + 4015);
});

Deno.test("usTaxModule.calculateTax - income below the standard deduction owes no tax", () => {
  const tax = usTaxModule.calculateTax(10000, US_BRACKETS_2024, {
    standardDeduction: 14600,
  });
  assertEquals(tax, 0);
});

Deno.test("evaluateRetirementAccountWithdrawal - AU hard gate blocks fully before accessAge", () => {
  const result = evaluateRetirementAccountWithdrawal(
    auTaxModule.retirementAccessRule,
    55,
    10000,
    100000,
  );
  assertEquals(result.amountReceived, 0);
  assertEquals(result.penaltyPaid, 0);
});

Deno.test("evaluateRetirementAccountWithdrawal - AU allows full access at/after accessAge", () => {
  const result = evaluateRetirementAccountWithdrawal(
    auTaxModule.retirementAccessRule,
    60,
    10000,
    100000,
  );
  assertEquals(result.amountReceived, 10000);
  assertEquals(result.penaltyPaid, 0);
});

Deno.test("evaluateRetirementAccountWithdrawal - US allows early access with a 10% penalty", () => {
  const result = evaluateRetirementAccountWithdrawal(
    usTaxModule.retirementAccessRule,
    50,
    10000,
    100000,
  );
  assertEquals(result.amountReceived, 9000);
  assertEquals(result.penaltyPaid, 1000);
});

Deno.test("evaluateRetirementAccountWithdrawal - US has no penalty at/after accessAge", () => {
  const result = evaluateRetirementAccountWithdrawal(
    usTaxModule.retirementAccessRule,
    60,
    10000,
    100000,
  );
  assertEquals(result.amountReceived, 10000);
  assertEquals(result.penaltyPaid, 0);
});

Deno.test("evaluateRetirementAccountWithdrawal - clamps to the available balance", () => {
  const result = evaluateRetirementAccountWithdrawal(
    usTaxModule.retirementAccessRule,
    50,
    10000,
    5000, // only $5000 available
  );
  assert(result.amountReceived <= 5000);
  assertEquals(result.amountReceived, 4500); // 5000 - 10% penalty
  assertEquals(result.penaltyPaid, 500);
});
