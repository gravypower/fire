/**
 * Country tax module registry. Australia is the default for any UserParameters
 * without an explicit `country` - this is what keeps every existing saved
 * config and test (which never set `country`) behaving exactly as before.
 */

import type {
  CountryCode,
  CountryTaxModule,
  RetirementAccountAccessRule,
} from "../../types/country_module.ts";
import { auTaxModule } from "./au.ts";
import { usTaxModule } from "./us.ts";

const MODULES: Record<CountryCode, CountryTaxModule> = {
  AU: auTaxModule,
  US: usTaxModule,
};

export function getCountryModule(code?: CountryCode): CountryTaxModule {
  return MODULES[code ?? "AU"] ?? auTaxModule;
}

/**
 * Evaluates a withdrawal from a retirement account against a country's
 * access rule. Before accessAge: a hard-gated account (AU super) yields
 * nothing; a penalty-gated account (US 401k/IRA) yields up to the requested
 * amount minus the penalty. At/after accessAge: full access, no penalty,
 * for either kind of rule.
 */
export function evaluateRetirementAccountWithdrawal(
  rule: RetirementAccountAccessRule,
  age: number,
  requestedAmount: number,
  availableBalance: number,
): { amountReceived: number; penaltyPaid: number } {
  const amountAvailable = Math.max(
    0,
    Math.min(requestedAmount, availableBalance),
  );

  if (age >= rule.accessAge) {
    return { amountReceived: amountAvailable, penaltyPaid: 0 };
  }

  if (rule.hardGate) {
    return { amountReceived: 0, penaltyPaid: 0 };
  }

  const penaltyPaid = amountAvailable * rule.earlyWithdrawalPenaltyRate;
  return { amountReceived: amountAvailable - penaltyPaid, penaltyPaid };
}

export { auTaxModule, usTaxModule };
export type {
  CountryCode,
  CountryTaxExtras,
  CountryTaxModule,
  RetirementAccountAccessRule,
} from "../../types/country_module.ts";
