/**
 * Pure progressive tax bracket math, shared by lib/processors.ts and
 * lib/tax_modules/*.ts. Kept in its own module (rather than processors.ts)
 * so the country tax modules can use it without an import cycle back
 * through processors.ts (which itself calls into the country modules).
 */

import type { TaxBracket } from "../types/financial.ts";

/**
 * Calculates tax using progressive tax brackets
 * @param income Annual income amount
 * @param brackets Tax brackets to apply
 * @returns Total tax amount
 */
export function calculateTaxWithBrackets(
  income: number,
  brackets: TaxBracket[],
): number {
  let totalTax = 0;

  for (const bracket of brackets) {
    const bracketMin = bracket.min;
    const bracketMax = bracket.max ?? Infinity;

    if (income <= bracketMin) {
      // Income doesn't reach this bracket
      break;
    }

    // Calculate taxable amount in this bracket
    const taxableInBracket = Math.min(income, bracketMax) - bracketMin;

    if (taxableInBracket > 0) {
      totalTax += taxableInBracket * (bracket.rate / 100);
    }
  }

  return totalTax;
}

/**
 * Default Australian tax brackets for 2024-25
 */
export const DEFAULT_AU_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0 },
  { min: 18200, max: 45000, rate: 19 },
  { min: 45000, max: 120000, rate: 32.5 },
  { min: 120000, max: 180000, rate: 37 },
  { min: 180000, max: null, rate: 45 },
];
