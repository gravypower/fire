/**
 * Validation helper functions for financial parameters
 * Validates: Requirements 1.2, 1.3, 1.4
 */

import type {
  IncomeSource,
  Loan,
  ParameterBounds,
  Person,
  SuperAccount,
  TaxBracket,
  UserParameters,
  ValidationResult,
} from "../types/financial.ts";
import type { ExpenseItem } from "../types/expenses.ts";
import type { InvestmentHolding } from "../types/investments.ts";
import type { HousePurchase } from "../types/property.ts";

/**
 * Validates that a numeric value is positive
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns ValidationResult indicating success or failure
 */
export function validatePositiveNumber(
  value: number,
  fieldName: string,
): ValidationResult {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (value < 0) {
    return {
      isValid: false,
      error: `${fieldName} must be positive`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a rate that compounds each period (return/interest/appreciation
 * rate) - unlike a plain percentage, these can legitimately be negative
 * (a market downturn) or exceed 100, but a rate at or below -100% makes the
 * compounding formula `(1 + rate/100) ^ n` undefined (NaN for a negative
 * base with a fractional exponent), which then silently propagates through
 * every subsequent period of the simulation.
 * @param value - The rate to validate, as a percentage (e.g. 7 for 7%)
 * @param fieldName - Name of the field for error messages
 * @returns ValidationResult indicating success or failure
 */
export function validateRate(
  value: number,
  fieldName: string,
): ValidationResult {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (value <= -100) {
    return {
      isValid: false,
      error: `${fieldName} must be greater than -100%`,
    };
  }

  return { isValid: true };
}

/**
 * Validates that a numeric value is within specified bounds
 * @param value - The value to validate
 * @param bounds - The bounds to check against
 * @returns ValidationResult indicating success or failure
 */
export function validateBounds(
  value: number,
  bounds: ParameterBounds,
): ValidationResult {
  const positiveCheck = validatePositiveNumber(value, bounds.fieldName);
  if (!positiveCheck.isValid) {
    return positiveCheck;
  }

  if (value < bounds.min) {
    return {
      isValid: false,
      error: `${bounds.fieldName} must be at least ${bounds.min}`,
    };
  }

  if (value > bounds.max) {
    return {
      isValid: false,
      error: `${bounds.fieldName} must not exceed ${bounds.max}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a percentage value (0-100)
 * @param value - The percentage value to validate
 * @param fieldName - Name of the field for error messages
 * @returns ValidationResult indicating success or failure
 */
export function validatePercentage(
  value: number,
  fieldName: string,
): ValidationResult {
  return validateBounds(value, {
    min: 0,
    max: 100,
    fieldName,
  });
}

/**
 * Validates an age value (reasonable human age range)
 * @param value - The age to validate
 * @param fieldName - Name of the field for error messages
 * @returns ValidationResult indicating success or failure
 */
export function validateAge(
  value: number,
  fieldName: string,
): ValidationResult {
  return validateBounds(value, {
    min: 0,
    max: 120,
    fieldName,
  });
}

/**
 * Validates that retirement age is greater than current age
 * @param currentAge - The current age
 * @param retirementAge - The target retirement age
 * @returns ValidationResult indicating success or failure
 */
export function validateRetirementAge(
  currentAge: number,
  retirementAge: number,
): ValidationResult {
  const currentAgeCheck = validateAge(currentAge, "Current age");
  if (!currentAgeCheck.isValid) {
    return currentAgeCheck;
  }

  const retirementAgeCheck = validateAge(retirementAge, "Retirement age");
  if (!retirementAgeCheck.isValid) {
    return retirementAgeCheck;
  }

  if (retirementAge <= currentAge) {
    return {
      isValid: false,
      error: "Retirement age must be greater than current age",
    };
  }

  return { isValid: true };
}

/**
 * Validates simulation years parameter
 * @param years - Number of years to simulate
 * @returns ValidationResult indicating success or failure
 */
export function validateSimulationYears(years: number): ValidationResult {
  return validateBounds(years, {
    min: 1,
    max: 100,
    fieldName: "Simulation years",
  });
}

// ---------------------------------------------------------------------
// Modern per-entity validation (people[], expenseItems[],
// investmentHoldings[], loans[], housePurchases[], taxBrackets[]) - the
// simulation engine uses these instead of the legacy top-level fields
// whenever they're populated (see e.g. peopleHaveIncomeSources in
// lib/processors.ts), which is the normal case via the Configure UI, so
// they need the same scrutiny as the legacy fields validated above.
// ---------------------------------------------------------------------

export function validateIncomeSource(
  source: IncomeSource,
  context: string,
): ValidationResult[] {
  const errors: ValidationResult[] = [];
  const amountCheck = validatePositiveNumber(
    source.amount,
    `${context} amount`,
  );
  if (!amountCheck.isValid) errors.push(amountCheck);
  return errors;
}

export function validateSuperAccount(
  account: SuperAccount,
  context: string,
): ValidationResult[] {
  const errors: ValidationResult[] = [];
  const balanceCheck = validatePositiveNumber(
    account.balance,
    `${context} balance`,
  );
  if (!balanceCheck.isValid) errors.push(balanceCheck);

  const contributionCheck = validatePercentage(
    account.contributionRate,
    `${context} contribution rate`,
  );
  if (!contributionCheck.isValid) errors.push(contributionCheck);

  const returnCheck = validateRate(account.returnRate, `${context} return rate`);
  if (!returnCheck.isValid) errors.push(returnCheck);

  return errors;
}

export function validatePerson(
  person: Person,
  context: string,
): ValidationResult[] {
  const errors: ValidationResult[] = [];

  const retirementAgeCheck = validateRetirementAge(
    person.currentAge,
    person.retirementAge,
  );
  if (!retirementAgeCheck.isValid) {
    errors.push({
      isValid: false,
      error: `${context}: ${retirementAgeCheck.error}`,
    });
  }

  for (const source of person.incomeSources ?? []) {
    errors.push(
      ...validateIncomeSource(
        source,
        `${context}'s income source "${source.label}"`,
      ),
    );
  }

  for (const account of person.superAccounts ?? []) {
    errors.push(
      ...validateSuperAccount(
        account,
        `${context}'s super account "${account.label}"`,
      ),
    );
  }

  return errors;
}

export function validateExpenseItem(
  item: ExpenseItem,
  context: string,
): ValidationResult[] {
  const errors: ValidationResult[] = [];
  const amountCheck = validatePositiveNumber(item.amount, `${context} amount`);
  if (!amountCheck.isValid) errors.push(amountCheck);
  return errors;
}

export function validateInvestmentHolding(
  holding: InvestmentHolding,
  context: string,
): ValidationResult[] {
  const errors: ValidationResult[] = [];

  const valueCheck = validatePositiveNumber(
    holding.currentValue,
    `${context} current value`,
  );
  if (!valueCheck.isValid) errors.push(valueCheck);

  const returnCheck = validateRate(holding.returnRate, `${context} return rate`);
  if (!returnCheck.isValid) errors.push(returnCheck);

  if (holding.dividendYieldRate !== undefined) {
    const dividendCheck = validatePercentage(
      holding.dividendYieldRate,
      `${context} dividend yield rate`,
    );
    if (!dividendCheck.isValid) errors.push(dividendCheck);
  }

  if (holding.contributionAmount !== undefined) {
    const contributionCheck = validatePositiveNumber(
      holding.contributionAmount,
      `${context} contribution amount`,
    );
    if (!contributionCheck.isValid) errors.push(contributionCheck);
  }

  return errors;
}

export function validateLoan(loan: Loan, context: string): ValidationResult[] {
  const errors: ValidationResult[] = [];

  const principalCheck = validatePositiveNumber(
    loan.principal,
    `${context} principal`,
  );
  if (!principalCheck.isValid) errors.push(principalCheck);

  const interestCheck = validateRate(
    loan.interestRate,
    `${context} interest rate`,
  );
  if (!interestCheck.isValid) errors.push(interestCheck);

  const paymentCheck = validatePositiveNumber(
    loan.paymentAmount,
    `${context} payment amount`,
  );
  if (!paymentCheck.isValid) errors.push(paymentCheck);

  return errors;
}

export function validateHousePurchase(
  house: HousePurchase,
  context: string,
): ValidationResult[] {
  const errors: ValidationResult[] = [];

  const priceCheck = validatePositiveNumber(house.price, `${context} price`);
  if (!priceCheck.isValid) errors.push(priceCheck);

  const depositCheck = validatePositiveNumber(
    house.depositAmount,
    `${context} deposit amount`,
  );
  if (!depositCheck.isValid) errors.push(depositCheck);

  const buyingCostsCheck = validatePositiveNumber(
    house.buyingCosts,
    `${context} buying costs`,
  );
  if (!buyingCostsCheck.isValid) errors.push(buyingCostsCheck);

  const appreciationCheck = validateRate(
    house.appreciationRate,
    `${context} appreciation rate`,
  );
  if (!appreciationCheck.isValid) errors.push(appreciationCheck);

  const mortgageRateCheck = validateRate(
    house.mortgageInterestRate,
    `${context} mortgage interest rate`,
  );
  if (!mortgageRateCheck.isValid) errors.push(mortgageRateCheck);

  const mortgagePaymentCheck = validatePositiveNumber(
    house.mortgagePaymentAmount,
    `${context} mortgage payment amount`,
  );
  if (!mortgagePaymentCheck.isValid) errors.push(mortgagePaymentCheck);

  return errors;
}

/**
 * Validates a set of tax brackets: each bracket's own values, and that
 * they're free of overlaps/gaps once sorted by min. calculateTaxWithBrackets
 * sorts defensively before applying them, so malformed order alone can't
 * silently zero out tax anymore - this still catches brackets that are
 * nonsensical even sorted (e.g. a negative rate, or a max below its own min).
 */
export function validateTaxBrackets(
  brackets: TaxBracket[],
): ValidationResult[] {
  const errors: ValidationResult[] = [];

  const sorted = [...brackets].sort((a, b) => a.min - b.min);

  for (const [i, bracket] of sorted.entries()) {
    const context = `Tax bracket #${i + 1}`;

    const minCheck = validatePositiveNumber(bracket.min, `${context} min`);
    if (!minCheck.isValid) errors.push(minCheck);

    const rateCheck = validatePercentage(bracket.rate, `${context} rate`);
    if (!rateCheck.isValid) errors.push(rateCheck);

    if (bracket.max !== null && bracket.max <= bracket.min) {
      errors.push({
        isValid: false,
        error: `${context}: max must be greater than min`,
      });
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const previousMax = sorted[i - 1].max;
    if (previousMax !== null && sorted[i].min < previousMax) {
      errors.push({
        isValid: false,
        error: `Tax brackets #${i} and #${
          i + 1
        } overlap - each bracket's min should be at or after the previous bracket's max`,
      });
    }
  }

  return errors;
}

/**
 * Validates all user parameters
 * @param params - The user parameters to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateUserParameters(
  params: UserParameters,
): ValidationResult[] {
  const errors: ValidationResult[] = [];

  // Income validation
  const salaryCheck = validatePositiveNumber(
    params.annualSalary,
    "Annual salary",
  );
  if (!salaryCheck.isValid) errors.push(salaryCheck);

  // Expense validation
  const livingExpensesCheck = validatePositiveNumber(
    params.monthlyLivingExpenses,
    "Monthly living expenses",
  );
  if (!livingExpensesCheck.isValid) errors.push(livingExpensesCheck);

  const rentMortgageCheck = validatePositiveNumber(
    params.monthlyRentOrMortgage,
    "Monthly rent or mortgage",
  );
  if (!rentMortgageCheck.isValid) errors.push(rentMortgageCheck);

  // Loan validation
  const loanPrincipalCheck = validatePositiveNumber(
    params.loanPrincipal,
    "Loan principal",
  );
  if (!loanPrincipalCheck.isValid) errors.push(loanPrincipalCheck);

  const loanInterestCheck = validatePercentage(
    params.loanInterestRate,
    "Loan interest rate",
  );
  if (!loanInterestCheck.isValid) errors.push(loanInterestCheck);

  const loanPaymentCheck = validatePositiveNumber(
    params.loanPaymentAmount,
    "Loan payment amount",
  );
  if (!loanPaymentCheck.isValid) errors.push(loanPaymentCheck);

  // Investment validation
  const investmentContributionCheck = validatePositiveNumber(
    params.monthlyInvestmentContribution,
    "Monthly investment contribution",
  );
  if (!investmentContributionCheck.isValid) {
    errors.push(investmentContributionCheck);
  }

  const investmentReturnCheck = validatePercentage(
    params.investmentReturnRate,
    "Investment return rate",
  );
  if (!investmentReturnCheck.isValid) errors.push(investmentReturnCheck);

  const investmentBalanceCheck = validatePositiveNumber(
    params.currentInvestmentBalance,
    "Current investment balance",
  );
  if (!investmentBalanceCheck.isValid) errors.push(investmentBalanceCheck);

  // Superannuation validation
  const superContributionCheck = validatePercentage(
    params.superContributionRate,
    "Super contribution rate",
  );
  if (!superContributionCheck.isValid) errors.push(superContributionCheck);

  const superReturnCheck = validatePercentage(
    params.superReturnRate,
    "Super return rate",
  );
  if (!superReturnCheck.isValid) errors.push(superReturnCheck);

  const superBalanceCheck = validatePositiveNumber(
    params.currentSuperBalance,
    "Current super balance",
  );
  if (!superBalanceCheck.isValid) errors.push(superBalanceCheck);

  // Retirement validation
  const retirementIncomeCheck = validatePositiveNumber(
    params.desiredAnnualRetirementIncome,
    "Desired annual retirement income",
  );
  if (!retirementIncomeCheck.isValid) errors.push(retirementIncomeCheck);

  const retirementAgeCheck = validateRetirementAge(
    params.currentAge,
    params.retirementAge,
  );
  if (!retirementAgeCheck.isValid) errors.push(retirementAgeCheck);

  // Simulation validation
  const simulationYearsCheck = validateSimulationYears(
    params.simulationYears,
  );
  if (!simulationYearsCheck.isValid) errors.push(simulationYearsCheck);

  // Modern per-entity validation - runs whenever the corresponding array is
  // populated, in addition to the legacy checks above, since the engine
  // uses whichever is actually populated (see peopleHaveIncomeSources etc.
  // in lib/processors.ts) and both can otherwise coexist in a request.
  if (params.people && params.people.length > 0) {
    for (const [i, person] of params.people.entries()) {
      errors.push(
        ...validatePerson(person, person.name || `Person #${i + 1}`),
      );
    }
  }

  if (params.expenseItems && params.expenseItems.length > 0) {
    for (const item of params.expenseItems) {
      errors.push(...validateExpenseItem(item, `Expense "${item.name}"`));
    }
  }

  if (params.investmentHoldings && params.investmentHoldings.length > 0) {
    for (const holding of params.investmentHoldings) {
      errors.push(
        ...validateInvestmentHolding(holding, `Investment "${holding.name}"`),
      );
    }
  }

  if (params.loans && params.loans.length > 0) {
    for (const loan of params.loans) {
      errors.push(...validateLoan(loan, `Loan "${loan.label}"`));
    }
  }

  if (params.housePurchases && params.housePurchases.length > 0) {
    for (const house of params.housePurchases) {
      errors.push(
        ...validateHousePurchase(house, `House purchase "${house.name}"`),
      );
    }
  }

  if (params.taxBrackets && params.taxBrackets.length > 0) {
    errors.push(...validateTaxBrackets(params.taxBrackets));
  }

  return errors;
}

/**
 * Checks if all validations passed
 * @param validationResults - Array of validation results
 * @returns true if all validations passed
 */
export function isValid(validationResults: ValidationResult[]): boolean {
  return validationResults.every((result) => result.isValid);
}

/**
 * Gets all error messages from validation results
 * @param validationResults - Array of validation results
 * @returns Array of error messages
 */
export function getErrorMessages(
  validationResults: ValidationResult[],
): string[] {
  return validationResults
    .filter((result) => !result.isValid)
    .map((result) => result.error!)
    .filter((error) => error !== undefined);
}
