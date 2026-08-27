/**
 * Unit tests for MilestoneDetector
 * Tests core milestone detection functionality
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MilestoneDetector } from "../../lib/milestone_detector.ts";
import type { FinancialState, UserParameters } from "../../types/financial.ts";

Deno.test("MilestoneDetector - Basic instantiation", () => {
  const detector = new MilestoneDetector();
  assertExists(detector);

  const config = detector.getConfig();
  assertEquals(config.detectLoanPayoffs, true);
  assertEquals(config.detectOffsetCompletion, true);
  assertEquals(config.detectRetirementEligibility, true);
  assertEquals(config.detectParameterTransitions, true);
});

Deno.test("MilestoneDetector - Loan payoff detection", () => {
  const detector = new MilestoneDetector();

  // Create test data with a loan being paid off. Balances are large enough
  // that the real interest accrued at loanInterestRate clears the detector's
  // minimum impact threshold ($1000) - a smaller loan paid off quickly
  // wouldn't actually accrue that much real interest.
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 500000, // Starting with $500k loan
      offsetBalance: 0,
      netWorth: -349000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 0,
      propertyValue: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 250000, // Loan reduced to $250k
      offsetBalance: 0,
      netWorth: -99000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 0,
      propertyValue: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 0, // Loan paid off!
      offsetBalance: 0,
      netWorth: 151000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 0,
      propertyValue: 0,
    },
  ];

  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 500000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  const result = detector.detectMilestones(states, params);

  assertEquals(result.errors.length, 0);
  assertEquals(result.milestones.length, 1);
  assertEquals(result.milestones[0].type, "loan_payoff");
  assertEquals(result.milestones[0].title, "Primary Loan Paid Off");
});

Deno.test("MilestoneDetector - loan payoff interest is consistent regardless of simulation length", () => {
  // detectLoanPayoffs takes a different code path for small (<=50 states,
  // linear search) vs large (>50 states, binary search) simulations. Both
  // paths should report the same total interest paid for the same payoff
  // event - previously they used two different hardcoded formulas, neither
  // based on the loan's actual rate, and disagreed by an order of magnitude.
  const startingBalance = 300000;
  const monthlyDecrement = 10000;
  const periodsToPayoff = 30; // balance hits 0 at index 30

  function buildLoanStates(totalLength: number): FinancialState[] {
    const states: FinancialState[] = [];
    for (let i = 0; i <= totalLength; i++) {
      const balance = i <= periodsToPayoff
        ? Math.max(0, startingBalance - i * monthlyDecrement)
        : 0;
      states.push({
        date: new Date(2024, i, 1),
        cash: 1000,
        investments: 50000,
        superannuation: 100000,
        loanBalance: balance,
        offsetBalance: 0,
        netWorth: 151000 - balance,
        cashFlow: 1000,
        taxPaid: 500,
        expenses: 2000,
        interestSaved: 0,
        propertyValue: 0,
      });
    }
    return states;
  }

  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: startingBalance,
    loanInterestRate: 6,
    loanPaymentAmount: 10000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  const shortStates = buildLoanStates(30); // length 31, linear-search path
  const longStates = buildLoanStates(60); // length 61, binary-search path

  const shortMilestones = new MilestoneDetector().detectLoanPayoffs(
    shortStates,
    params,
  );
  const longMilestones = new MilestoneDetector().detectLoanPayoffs(
    longStates,
    params,
  );

  assertEquals(shortMilestones.length, 1);
  assertEquals(longMilestones.length, 1);

  const shortMilestone = shortMilestones[0];
  const longMilestone = longMilestones[0];

  assertEquals(shortMilestone.monthsToPayoff, longMilestone.monthsToPayoff);
  assertEquals(
    shortMilestone.finalPaymentAmount,
    longMilestone.finalPaymentAmount,
  );
  // Both paths should agree to within rounding, not differ by an order of magnitude
  assertEquals(
    Math.round(shortMilestone.totalInterestPaid),
    Math.round(longMilestone.totalInterestPaid),
  );
});

Deno.test("MilestoneDetector - Offset completion detection", () => {
  const detector = new MilestoneDetector({ minimumImpactThreshold: 100 }); // Lower threshold for test

  // Create test data with offset completing
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 10000,
      offsetBalance: 5000, // Offset at $5k
      netWorth: 146000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 100,
      propertyValue: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 9500,
      offsetBalance: 9500, // Offset now equals loan balance!
      netWorth: 151000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 200,
      propertyValue: 0,
    },
  ];

  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 10000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: true,
    currentOffsetBalance: 5000,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  const result = detector.detectMilestones(states, params);

  assertEquals(result.errors.length, 0);
  assertEquals(result.milestones.length, 1);
  assertEquals(result.milestones[0].type, "offset_completion");
  assertEquals(result.milestones[0].title, "Primary Loan Offset Complete");
});

Deno.test("MilestoneDetector - Empty states handling", () => {
  const detector = new MilestoneDetector();

  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 10000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  const result = detector.detectMilestones([], params);

  assertEquals(result.errors.length, 0);
  assertEquals(result.milestones.length, 0);
});
