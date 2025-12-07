/**
 * Unit tests for result aggregation and formatting utilities
 */

import { assertEquals } from "$std/assert/mod.ts";
import {
  checkSustainability,
  formatCurrency,
  groupByTimeInterval,
  isFinancialStateComplete,
} from "../../lib/result_utils.ts";
import type { FinancialState } from "../../types/financial.ts";

Deno.test("groupByTimeInterval - returns empty array for empty input", () => {
  const result = groupByTimeInterval([], "month");
  assertEquals(result.length, 0);
});

Deno.test("groupByTimeInterval - returns single state for single input", () => {
  const states: FinancialState[] = [{
    date: new Date("2024-01-01"),
    cash: 1000,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    offsetBalance: 0,
    netWorth: -4000,
    cashFlow: 500,
    taxPaid: 0,
    interestSaved: 0,
  }];

  const result = groupByTimeInterval(states, "month");
  assertEquals(result.length, 1);
  assertEquals(result[0], states[0]);
});

Deno.test("groupByTimeInterval - filters to weekly intervals", () => {
  const states: FinancialState[] = [];
  const startDate = new Date("2024-01-01");

  // Create daily states for 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    states.push({
      date,
      cash: 1000 + i,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      offsetBalance: 0,
      netWorth: -4000,
      cashFlow: 500,
      taxPaid: 0,
      interestSaved: 0,
    });
  }

  const result = groupByTimeInterval(states, "week");
  
  // Should have approximately 4-5 weekly intervals in 30 days
  // (first state + ~4 weeks + last state)
  assertEquals(result.length >= 4, true);
  assertEquals(result.length <= 6, true);
  
  // First and last states should always be included
  assertEquals(result[0], states[0]);
  assertEquals(result[result.length - 1], states[states.length - 1]);
});

Deno.test("groupByTimeInterval - filters to monthly intervals", () => {
  const states: FinancialState[] = [];
  const startDate = new Date("2024-01-01");

  // Create weekly states for 6 months
  for (let i = 0; i < 26; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (i * 7));
    states.push({
      date,
      cash: 1000 + i,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      offsetBalance: 0,
      netWorth: -4000,
      cashFlow: 500,
      taxPaid: 0,
      interestSaved: 0,
    });
  }

  const result = groupByTimeInterval(states, "month");
  
  // Should have approximately 6-7 monthly intervals
  assertEquals(result.length >= 5, true);
  assertEquals(result.length <= 8, true);
  
  // First and last states should always be included
  assertEquals(result[0], states[0]);
  assertEquals(result[result.length - 1], states[states.length - 1]);
});

Deno.test("formatCurrency - formats positive values correctly", () => {
  assertEquals(formatCurrency(1234.56), "$1,234.56");
  assertEquals(formatCurrency(1000000), "$1,000,000.00");
  assertEquals(formatCurrency(0), "$0.00");
  assertEquals(formatCurrency(0.99), "$0.99");
});

Deno.test("formatCurrency - formats negative values correctly", () => {
  assertEquals(formatCurrency(-1234.56), "-$1,234.56");
  assertEquals(formatCurrency(-1000000), "-$1,000,000.00");
  assertEquals(formatCurrency(-0.99), "-$0.99");
});

Deno.test("formatCurrency - respects custom currency symbol", () => {
  assertEquals(formatCurrency(1234.56, "€"), "€1,234.56");
  assertEquals(formatCurrency(1234.56, "£"), "£1,234.56");
  assertEquals(formatCurrency(-1234.56, "¥"), "-¥1,234.56");
});

Deno.test("formatCurrency - respects custom decimal places", () => {
  assertEquals(formatCurrency(1234.567, "$", 0), "$1,235");
  assertEquals(formatCurrency(1234.567, "$", 1), "$1,234.6");
  assertEquals(formatCurrency(1234.567, "$", 3), "$1,234.567");
});

Deno.test("isFinancialStateComplete - returns true for complete state", () => {
  const state: FinancialState = {
    date: new Date("2024-01-01"),
    cash: 1000,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  assertEquals(isFinancialStateComplete(state), true);
});

Deno.test("isFinancialStateComplete - returns false for invalid date", () => {
  const state: FinancialState = {
    date: new Date("invalid"),
    cash: 1000,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  assertEquals(isFinancialStateComplete(state), false);
});

Deno.test("isFinancialStateComplete - returns false for NaN values", () => {
  const state: FinancialState = {
    date: new Date("2024-01-01"),
    cash: NaN,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  assertEquals(isFinancialStateComplete(state), false);
});

Deno.test("isFinancialStateComplete - returns false for Infinity values", () => {
  const state: FinancialState = {
    date: new Date("2024-01-01"),
    cash: 1000,
    investments: Infinity,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  assertEquals(isFinancialStateComplete(state), false);
});

Deno.test("checkSustainability - returns sustainable for empty states", () => {
  const result = checkSustainability([]);
  assertEquals(result.isSustainable, true);
  assertEquals(result.hasIncreasingDebt, false);
  assertEquals(result.hasNegativeCashFlow, false);
  assertEquals(result.consecutiveNegativePeriods, 0);
  assertEquals(result.hasNetWorthGrowth, false);
});

Deno.test("checkSustainability - detects increasing debt", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 25000, // Increased debt
      netWorth: -9000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = checkSustainability(states);
  assertEquals(result.hasIncreasingDebt, true);
  assertEquals(result.isSustainable, false);
});

Deno.test("checkSustainability - detects consecutive negative cash flow", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      offsetBalance: 0,
      netWorth: -4000,
      cashFlow: -100,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      offsetBalance: 0,
      netWorth: -4100,
      cashFlow: -100,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: 800,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      offsetBalance: 0,
      netWorth: -4200,
      cashFlow: -100,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = checkSustainability(states);
  assertEquals(result.hasNegativeCashFlow, true);
  assertEquals(result.consecutiveNegativePeriods, 3);
  assertEquals(result.isSustainable, false);
});

Deno.test("checkSustainability - detects net worth growth", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 2000,
      investments: 10000,
      superannuation: 15000,
      loanBalance: 15000,
      netWorth: 12000, // Net worth grew
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = checkSustainability(states);
  assertEquals(result.hasNetWorthGrowth, true);
  assertEquals(result.isSustainable, true);
});

Deno.test("checkSustainability - handles mixed cash flow patterns", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4100,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 200,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0, // Positive cash flow breaks the streak
    },
    {
      date: new Date("2024-04-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4100,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = checkSustainability(states);
  // Only 2 consecutive negative periods, not 3+
  assertEquals(result.hasNegativeCashFlow, false);
  assertEquals(result.consecutiveNegativePeriods, 2);
});

// Tests for new warning and indicator functions

import {
  detectIncreasingDebt,
  detectNegativeCashFlow,
  detectNetWorthGrowth,
  generateWarnings,
} from "../../lib/result_utils.ts";

Deno.test("detectIncreasingDebt - returns false for empty states", () => {
  assertEquals(detectIncreasingDebt([]), false);
});

Deno.test("detectIncreasingDebt - returns false for single state", () => {
  const states: FinancialState[] = [{
    date: new Date("2024-01-01"),
    cash: 1000,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  }];

  assertEquals(detectIncreasingDebt(states), false);
});

Deno.test("detectIncreasingDebt - detects increasing debt", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 25000,
      netWorth: -9000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  assertEquals(detectIncreasingDebt(states), true);
});

Deno.test("detectIncreasingDebt - returns false for decreasing debt", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 15000,
      netWorth: 1000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  assertEquals(detectIncreasingDebt(states), false);
});

Deno.test("detectNegativeCashFlow - returns false for empty states", () => {
  const result = detectNegativeCashFlow([]);
  assertEquals(result.detected, false);
  assertEquals(result.consecutivePeriods, 0);
});

Deno.test("detectNegativeCashFlow - detects 3+ consecutive negative periods", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4100,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: 800,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4200,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = detectNegativeCashFlow(states);
  assertEquals(result.detected, true);
  assertEquals(result.consecutivePeriods, 3);
});

Deno.test("detectNegativeCashFlow - returns false for less than 3 consecutive", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4100,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 200,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = detectNegativeCashFlow(states);
  assertEquals(result.detected, false);
  assertEquals(result.consecutivePeriods, 2);
});

Deno.test("detectNegativeCashFlow - respects custom threshold", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4100,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const result = detectNegativeCashFlow(states, 2);
  assertEquals(result.detected, true);
  assertEquals(result.consecutivePeriods, 2);
});

Deno.test("detectNetWorthGrowth - returns false for empty states", () => {
  assertEquals(detectNetWorthGrowth([]), false);
});

Deno.test("detectNetWorthGrowth - returns false for single state", () => {
  const states: FinancialState[] = [{
    date: new Date("2024-01-01"),
    cash: 1000,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  }];

  assertEquals(detectNetWorthGrowth(states), false);
});

Deno.test("detectNetWorthGrowth - detects positive growth", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 2000,
      investments: 10000,
      superannuation: 15000,
      loanBalance: 15000,
      netWorth: 12000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  assertEquals(detectNetWorthGrowth(states), true);
});

Deno.test("detectNetWorthGrowth - returns false for declining net worth", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: 5000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 500,
      investments: 3000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -6500,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  assertEquals(detectNetWorthGrowth(states), false);
});

Deno.test("generateWarnings - returns empty array for empty states", () => {
  const warnings = generateWarnings([]);
  assertEquals(warnings.length, 0);
});

Deno.test("generateWarnings - returns empty array for single state", () => {
  const states: FinancialState[] = [{
    date: new Date("2024-01-01"),
    cash: 1000,
    investments: 5000,
    superannuation: 10000,
    loanBalance: 20000,
    netWorth: -4000,
    cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  }];

  const warnings = generateWarnings(states);
  assertEquals(warnings.length, 0);
});

Deno.test("generateWarnings - generates warning for increasing debt", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 25000,
      netWorth: -9000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const warnings = generateWarnings(states);
  const debtWarning = warnings.find(w => w.type === "debt");
  
  assertEquals(debtWarning !== undefined, true);
  assertEquals(debtWarning?.severity, "warning");
  assertEquals(debtWarning?.message.includes("increasing"), true);
});

Deno.test("generateWarnings - generates alert for negative cash flow", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: 900,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4100,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: 800,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4200,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const warnings = generateWarnings(states);
  const cashFlowAlert = warnings.find(w => w.type === "cashflow");
  
  assertEquals(cashFlowAlert !== undefined, true);
  assertEquals(cashFlowAlert?.severity, "alert");
  assertEquals(cashFlowAlert?.message.includes("negative cash flow"), true);
});

Deno.test("generateWarnings - generates warning for net worth decline", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: 5000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 500,
      investments: 3000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -6500,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const warnings = generateWarnings(states);
  const netWorthWarning = warnings.find(w => 
    w.type === "sustainability" && w.message.includes("declining")
  );
  
  assertEquals(netWorthWarning !== undefined, true);
  assertEquals(netWorthWarning?.severity, "warning");
});

Deno.test("generateWarnings - generates alert for severely depleted cash", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: -5000, // Severely negative
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -10000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const warnings = generateWarnings(states);
  const cashAlert = warnings.find(w => 
    w.type === "sustainability" && w.message.includes("depleted")
  );
  
  assertEquals(cashAlert !== undefined, true);
  assertEquals(cashAlert?.severity, "alert");
});

Deno.test("generateWarnings - generates multiple warnings for multiple issues", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: 5000,
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-02-01"),
      cash: -2000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 25000, // Increasing debt
      netWorth: -12000, // Declining net worth
      cashFlow: -100,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-03-01"),
      cash: -3000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 26000,
      offsetBalance: 0,
      netWorth: -14000,
      cashFlow: -100, // 3 consecutive negative
      taxPaid: 0,
      interestSaved: 0,
    },
  ];

  const warnings = generateWarnings(states);
  
  // Should have multiple warnings
  assertEquals(warnings.length >= 3, true);
  
  // Should have debt warning
  assertEquals(warnings.some(w => w.type === "debt"), true);
  
  // Should have cash flow alert
  assertEquals(warnings.some(w => w.type === "cashflow"), true);
  
  // Should have sustainability warnings
  assertEquals(warnings.some(w => w.type === "sustainability"), true);
});

Deno.test("generateWarnings - no warnings for healthy financial trajectory", () => {
  const states: FinancialState[] = [
    {
      date: new Date("2024-01-01"),
      cash: 1000,
      investments: 5000,
      superannuation: 10000,
      loanBalance: 20000,
      netWorth: -4000,
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
    },
    {
      date: new Date("2024-12-01"),
      cash: 5000,
      investments: 15000,
      superannuation: 20000,
      loanBalance: 15000, // Decreasing debt
      netWorth: 25000, // Growing net worth
      cashFlow: 500,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0, // Positive cash flow
    },
  ];

  const warnings = generateWarnings(states);
  
  // Should have no warnings for a healthy trajectory
  assertEquals(warnings.length, 0);
});


