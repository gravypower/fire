/**
 * Unit tests for validation helper functions
 */

import { assertEquals } from "$std/assert/mod.ts";
import {
  getErrorMessages,
  isValid,
  validateAge,
  validateBounds,
  validatePercentage,
  validatePositiveNumber,
  validateRetirementAge,
  validateSimulationYears,
  validateUserParameters,
} from "../../lib/validation.ts";
import type { UserParameters } from "../../types/financial.ts";

Deno.test("validatePositiveNumber - accepts positive numbers", () => {
  const result = validatePositiveNumber(100, "Test field");
  assertEquals(result.isValid, true);
  assertEquals(result.error, undefined);
});

Deno.test("validatePositiveNumber - accepts zero", () => {
  const result = validatePositiveNumber(0, "Test field");
  assertEquals(result.isValid, true);
});

Deno.test("validatePositiveNumber - rejects negative numbers", () => {
  const result = validatePositiveNumber(-10, "Test field");
  assertEquals(result.isValid, false);
  assertEquals(result.error, "Test field must be positive");
});

Deno.test("validatePositiveNumber - rejects NaN", () => {
  const result = validatePositiveNumber(NaN, "Test field");
  assertEquals(result.isValid, false);
  assertEquals(result.error, "Test field must be a valid number");
});

Deno.test("validateBounds - accepts value within bounds", () => {
  const result = validateBounds(50, {
    min: 0,
    max: 100,
    fieldName: "Test field",
  });
  assertEquals(result.isValid, true);
});

Deno.test("validateBounds - rejects value below minimum", () => {
  const result = validateBounds(5, {
    min: 10,
    max: 100,
    fieldName: "Test field",
  });
  assertEquals(result.isValid, false);
  assertEquals(result.error, "Test field must be at least 10");
});

Deno.test("validateBounds - rejects value above maximum", () => {
  const result = validateBounds(150, {
    min: 0,
    max: 100,
    fieldName: "Test field",
  });
  assertEquals(result.isValid, false);
  assertEquals(result.error, "Test field must not exceed 100");
});

Deno.test("validatePercentage - accepts valid percentage", () => {
  const result = validatePercentage(50, "Test percentage");
  assertEquals(result.isValid, true);
});

Deno.test("validatePercentage - rejects percentage over 100", () => {
  const result = validatePercentage(150, "Test percentage");
  assertEquals(result.isValid, false);
});

Deno.test("validateAge - accepts valid age", () => {
  const result = validateAge(30, "Age");
  assertEquals(result.isValid, true);
});

Deno.test("validateAge - rejects age over 120", () => {
  const result = validateAge(150, "Age");
  assertEquals(result.isValid, false);
});

Deno.test("validateRetirementAge - accepts valid retirement age", () => {
  const result = validateRetirementAge(30, 65);
  assertEquals(result.isValid, true);
});

Deno.test("validateRetirementAge - rejects retirement age less than current age", () => {
  const result = validateRetirementAge(65, 30);
  assertEquals(result.isValid, false);
  assertEquals(result.error, "Retirement age must be greater than current age");
});

Deno.test("validateRetirementAge - rejects retirement age equal to current age", () => {
  const result = validateRetirementAge(65, 65);
  assertEquals(result.isValid, false);
});

Deno.test("validateSimulationYears - accepts valid years", () => {
  const result = validateSimulationYears(30);
  assertEquals(result.isValid, true);
});

Deno.test("validateSimulationYears - rejects zero years", () => {
  const result = validateSimulationYears(0);
  assertEquals(result.isValid, false);
});

Deno.test("validateUserParameters - validates all parameters", () => {
  const validParams: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 6,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date(),
  };

  const errors = validateUserParameters(validParams);
  assertEquals(errors.length, 0);
  assertEquals(isValid(errors), true);
});

Deno.test("validateUserParameters - detects invalid salary", () => {
  const invalidParams: UserParameters = {
    annualSalary: -1000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 6,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date(),
  };

  const errors = validateUserParameters(invalidParams);
  assertEquals(isValid(errors), false);
  const messages = getErrorMessages(errors);
  assertEquals(messages.some((msg) => msg.includes("Annual salary")), true);
});

Deno.test("getErrorMessages - extracts error messages", () => {
  const results = [
    { isValid: true },
    { isValid: false, error: "Error 1" },
    { isValid: false, error: "Error 2" },
  ];

  const messages = getErrorMessages(results);
  assertEquals(messages.length, 2);
  assertEquals(messages[0], "Error 1");
  assertEquals(messages[1], "Error 2");
});
