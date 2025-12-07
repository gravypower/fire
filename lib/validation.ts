/**
 * Validation helper functions for financial parameters
 * Validates: Requirements 1.2, 1.3, 1.4
 */

import type {
  ParameterBounds,
  UserParameters,
  ValidationResult,
} from "../types/financial.ts";

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
  if (typeof value !== "number" || isNaN(value)) {
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
