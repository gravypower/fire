/**
 * Unit tests for financial processor modules
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  ExpenseProcessor,
  IncomeProcessor,
  InvestmentProcessor,
  LoanProcessor,
  RetirementCalculator,
} from "../../lib/processors.ts";
import type { FinancialState, UserParameters } from "../../types/financial.ts";

Deno.test("IncomeProcessor - calculateIncome for monthly interval", () => {
  const params: Partial<UserParameters> = {
    annualSalary: 120000,
    salaryFrequency: "monthly",
  };

  const income = IncomeProcessor.calculateIncome(
    params as UserParameters,
    "month",
  );

  // 120000 / 12 = 10000 per month
  assertEquals(income, 10000);
});

Deno.test("IncomeProcessor - calculateIncome for weekly interval", () => {
  const params: Partial<UserParameters> = {
    annualSalary: 52000,
    salaryFrequency: "weekly",
  };

  const income = IncomeProcessor.calculateIncome(
    params as UserParameters,
    "week",
  );

  // 52000 / 52 = 1000 per week
  assertEquals(income, 1000);
});

Deno.test("ExpenseProcessor - calculateExpenses for monthly interval", () => {
  const params: Partial<UserParameters> = {
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
  };

  const expenses = ExpenseProcessor.calculateExpenses(
    params as UserParameters,
    "month",
  );

  // (2000 + 1500) * 12 / 12 = 3500 per month
  assertEquals(expenses, 3500);
});

Deno.test("ExpenseProcessor - calculateExpenses for yearly interval", () => {
  const params: Partial<UserParameters> = {
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
  };

  const expenses = ExpenseProcessor.calculateExpenses(
    params as UserParameters,
    "year",
  );

  // (2000 + 1500) * 12 / 1 = 42000 per year
  assertEquals(expenses, 42000);
});

Deno.test("LoanProcessor - calculateLoanPayment with positive balance", () => {
  const result = LoanProcessor.calculateLoanPayment(
    10000, // balance
    0, // offsetBalance
    0.05, // 5% annual interest
    500, // payment
    "month", // interval
  );

  // Interest for one month at 5% annual ≈ 0.407% monthly
  // Interest ≈ 10000 * 0.00407 ≈ 40.74
  // Principal ≈ 500 - 40.74 ≈ 459.26
  // New balance ≈ 10000 + 40.74 - 500 = 9540.74

  assertEquals(Math.round(result.interestPaid), 41);
  assertEquals(Math.round(result.principalPaid), 459);
  assertEquals(Math.round(result.newBalance), 9541);
});

Deno.test("LoanProcessor - calculateLoanPayment with zero balance", () => {
  const result = LoanProcessor.calculateLoanPayment(
    0, // balance
    0, // offsetBalance
    0.05, // 5% annual interest
    500, // payment
    "month", // interval
  );

  assertEquals(result.interestPaid, 0);
  assertEquals(result.principalPaid, 0);
  assertEquals(result.newBalance, 0);
});

Deno.test("InvestmentProcessor - calculateInvestmentGrowth with contribution", () => {
  const newBalance = InvestmentProcessor.calculateInvestmentGrowth(
    10000, // balance
    500, // contribution
    0.07, // 7% annual return
    "month",
  );

  // Monthly rate ≈ 0.565%
  // Balance after growth ≈ 10000 * 1.00565 ≈ 10056.5
  // Contribution after growth ≈ 500 * 1.00565 ≈ 502.825
  // Total ≈ 10559.325

  assertEquals(Math.round(newBalance), 10559);
});

Deno.test("InvestmentProcessor - calculateInvestmentGrowth with zero contribution", () => {
  const newBalance = InvestmentProcessor.calculateInvestmentGrowth(
    10000, // balance
    0, // no contribution
    0.07, // 7% annual return
    "year",
  );

  // Yearly: 10000 * 1.07 = 10700
  assertEquals(newBalance, 10700);
});

Deno.test("RetirementCalculator - calculateSafeWithdrawal below preservation age", () => {
  const withdrawal = RetirementCalculator.calculateSafeWithdrawal(
    100000, // investments
    50000, // superannuation
    55, // age (below 60)
  );

  // Only investments accessible: 100000 * 0.04 = 4000
  assertEquals(withdrawal, 4000);
});

Deno.test("RetirementCalculator - calculateSafeWithdrawal at preservation age", () => {
  const withdrawal = RetirementCalculator.calculateSafeWithdrawal(
    100000, // investments
    50000, // superannuation
    60, // age (at preservation age)
  );

  // Both accessible: (100000 + 50000) * 0.04 = 6000
  assertEquals(withdrawal, 6000);
});

Deno.test("RetirementCalculator - findRetirementDate when achievable", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 10000,
      investments: 50000,
      superannuation: 30000,
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 90000,
      cashFlow: 1000,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2029-01-01"),
      cash: 20000,
      investments: 150000,
      superannuation: 100000,
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 270000,
      cashFlow: 2000,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = RetirementCalculator.findRetirementDate(
    states,
    8000, // desired income (less than 250000 * 0.04 = 10000)
    55, // current age
    60, // retirement age
  );

  // At second state (5 years later), age is 60
  // Safe withdrawal = (150000 + 100000) * 0.04 = 10000 >= 8000
  assertEquals(result.date?.toISOString(), new Date("2029-01-01").toISOString());
  assertEquals(Math.round(result.age!), 60);
});

Deno.test("RetirementCalculator - findRetirementDate when not achievable", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 10000,
      investments: 10000,
      superannuation: 5000,
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 25000,
      cashFlow: 500,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = RetirementCalculator.findRetirementDate(
    states,
    50000, // desired income (much more than available)
    55, // current age
    60, // retirement age
  );

  assertEquals(result.date, null);
  assertEquals(result.age, null);
});
