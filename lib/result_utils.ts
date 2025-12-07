/**
 * Result Aggregation and Formatting Utilities
 * Provides functions for grouping, formatting, and analyzing simulation results
 * Validates: Requirements 3.1, 3.2, 3.3, 10.1
 */

import type { FinancialState, TimeInterval } from "../types/financial.ts";

/**
 * Groups simulation states by the specified time interval
 * Validates: Requirements 3.1
 * 
 * @param states Array of financial states from simulation
 * @param interval Target time interval for grouping (weekly/monthly/yearly)
 * @returns Array of financial states filtered to the specified interval
 */
export function groupByTimeInterval(
  states: FinancialState[],
  interval: TimeInterval,
): FinancialState[] {
  if (states.length === 0) {
    return [];
  }

  const result: FinancialState[] = [];
  
  // Always include the first state
  result.push(states[0]);
  
  if (states.length === 1) {
    return result;
  }

  // Determine the interval in milliseconds
  let intervalMs: number;
  switch (interval) {
    case "week":
      intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    case "month":
      intervalMs = 30 * 24 * 60 * 60 * 1000; // ~30 days (approximation)
      break;
    case "year":
      intervalMs = 365.25 * 24 * 60 * 60 * 1000; // ~365.25 days
      break;
  }

  let lastIncludedDate = states[0].date.getTime();

  // Iterate through remaining states and include those that meet the interval threshold
  for (let i = 1; i < states.length; i++) {
    const currentDate = states[i].date.getTime();
    const timeSinceLastIncluded = currentDate - lastIncludedDate;

    // Include this state if enough time has passed
    if (timeSinceLastIncluded >= intervalMs * 0.9) { // 90% threshold for flexibility
      result.push(states[i]);
      lastIncludedDate = currentDate;
    }
  }

  // Always include the last state if it's not already included
  const lastState = states[states.length - 1];
  if (result[result.length - 1] !== lastState) {
    result.push(lastState);
  }

  return result;
}

/**
 * Formats a numeric currency value with symbol and decimal precision
 * Validates: Requirements 3.3
 * 
 * @param value Numeric currency value
 * @param currencySymbol Currency symbol to use (default: '$')
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currencySymbol: string = "$",
  decimals: number = 2,
): string {
  // Handle negative values
  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);

  // Format with thousands separators and decimal precision
  const formatted = absoluteValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Add currency symbol and handle negative sign
  if (isNegative) {
    return `-${currencySymbol}${formatted}`;
  } else {
    return `${currencySymbol}${formatted}`;
  }
}

/**
 * Checks if a financial state contains all required fields
 * Validates: Requirements 3.2
 * 
 * @param state Financial state to check
 * @returns True if all required fields are present and valid, false otherwise
 */
export function isFinancialStateComplete(state: FinancialState): boolean {
  // Check that all required fields exist
  if (
    state.date === undefined ||
    state.cash === undefined ||
    state.investments === undefined ||
    state.superannuation === undefined ||
    state.loanBalance === undefined ||
    state.netWorth === undefined ||
    state.cashFlow === undefined
  ) {
    return false;
  }

  // Check that date is a valid Date object
  if (!(state.date instanceof Date) || isNaN(state.date.getTime())) {
    return false;
  }

  // Check that numeric fields are valid numbers (not NaN or Infinity)
  const numericFields = [
    state.cash,
    state.investments,
    state.superannuation,
    state.loanBalance,
    state.netWorth,
    state.cashFlow,
  ];

  for (const field of numericFields) {
    if (typeof field !== "number" || isNaN(field) || !isFinite(field)) {
      return false;
    }
  }

  return true;
}

/**
 * Result of sustainability check
 */
export interface SustainabilityResult {
  /** Whether the financial trajectory is sustainable */
  isSustainable: boolean;
  /** Whether debt is increasing over time */
  hasIncreasingDebt: boolean;
  /** Whether there are consecutive negative cash flow periods */
  hasNegativeCashFlow: boolean;
  /** Number of consecutive negative cash flow periods */
  consecutiveNegativePeriods: number;
  /** Whether net worth is growing */
  hasNetWorthGrowth: boolean;
}

/**
 * Warning/alert message with severity level
 */
export interface FinancialWarning {
  /** Warning message text */
  message: string;
  /** Severity level: 'warning' for concerning trends, 'alert' for critical issues */
  severity: "warning" | "alert";
  /** Type of warning for categorization */
  type: "debt" | "cashflow" | "sustainability";
}

/**
 * Checks the sustainability of a financial trajectory
 * Validates: Requirements 10.1
 * 
 * Analyzes simulation states to detect:
 * - Increasing debt over time
 * - Consecutive negative cash flow periods (3+)
 * - Net worth growth
 * 
 * @param states Array of financial states from simulation
 * @returns Sustainability analysis result
 */
export function checkSustainability(
  states: FinancialState[],
): SustainabilityResult {
  // Default result for empty or single-state arrays
  if (states.length < 2) {
    return {
      isSustainable: true,
      hasIncreasingDebt: false,
      hasNegativeCashFlow: false,
      consecutiveNegativePeriods: 0,
      hasNetWorthGrowth: false,
    };
  }

  // Check for increasing debt
  const firstLoanBalance = states[0].loanBalance;
  const lastLoanBalance = states[states.length - 1].loanBalance;
  const hasIncreasingDebt = lastLoanBalance > firstLoanBalance;

  // Check for consecutive negative cash flow
  let maxConsecutiveNegative = 0;
  let currentConsecutiveNegative = 0;

  for (const state of states) {
    if (state.cashFlow < 0) {
      currentConsecutiveNegative++;
      maxConsecutiveNegative = Math.max(
        maxConsecutiveNegative,
        currentConsecutiveNegative,
      );
    } else {
      currentConsecutiveNegative = 0;
    }
  }

  const hasNegativeCashFlow = maxConsecutiveNegative >= 3;

  // Check for net worth growth
  const firstNetWorth = states[0].netWorth;
  const lastNetWorth = states[states.length - 1].netWorth;
  const hasNetWorthGrowth = lastNetWorth > firstNetWorth;

  // Determine overall sustainability
  const isSustainable = !hasIncreasingDebt && !hasNegativeCashFlow;

  return {
    isSustainable,
    hasIncreasingDebt,
    hasNegativeCashFlow,
    consecutiveNegativePeriods: maxConsecutiveNegative,
    hasNetWorthGrowth,
  };
}

/**
 * Detects if debt is increasing over time
 * Validates: Requirements 10.2
 * 
 * @param states Array of financial states from simulation
 * @returns True if loan balance at end is greater than at start
 */
export function detectIncreasingDebt(states: FinancialState[]): boolean {
  if (states.length < 2) {
    return false;
  }

  const firstLoanBalance = states[0].loanBalance;
  const lastLoanBalance = states[states.length - 1].loanBalance;
  
  return lastLoanBalance > firstLoanBalance;
}

/**
 * Detects consecutive negative cash flow periods
 * Validates: Requirements 10.4
 * 
 * @param states Array of financial states from simulation
 * @param threshold Minimum number of consecutive periods to trigger (default: 3)
 * @returns Object with detection result and count of consecutive periods
 */
export function detectNegativeCashFlow(
  states: FinancialState[],
  threshold: number = 3,
): { detected: boolean; consecutivePeriods: number } {
  if (states.length === 0) {
    return { detected: false, consecutivePeriods: 0 };
  }

  let maxConsecutiveNegative = 0;
  let currentConsecutiveNegative = 0;

  for (const state of states) {
    if (state.cashFlow < 0) {
      currentConsecutiveNegative++;
      maxConsecutiveNegative = Math.max(
        maxConsecutiveNegative,
        currentConsecutiveNegative,
      );
    } else {
      currentConsecutiveNegative = 0;
    }
  }

  return {
    detected: maxConsecutiveNegative >= threshold,
    consecutivePeriods: maxConsecutiveNegative,
  };
}

/**
 * Detects net worth growth over the simulation period
 * Validates: Requirements 10.5
 * 
 * @param states Array of financial states from simulation
 * @returns True if net worth at end is greater than at start
 */
export function detectNetWorthGrowth(states: FinancialState[]): boolean {
  if (states.length < 2) {
    return false;
  }

  const firstNetWorth = states[0].netWorth;
  const lastNetWorth = states[states.length - 1].netWorth;
  
  return lastNetWorth > firstNetWorth;
}

/**
 * Finds the date when the loan is paid off
 * 
 * @param states Array of financial states from simulation
 * @returns Date when loan balance reaches zero, or null if never paid off or no loan exists
 */
export function findLoanPayoffDate(states: FinancialState[]): Date | null {
  if (states.length === 0) return null;
  
  // Check if there's a loan to begin with
  if (states[0].loanBalance <= 0) return null;
  
  // Find first state where loan balance is zero or near zero
  for (const state of states) {
    if (state.loanBalance <= 0.01) { // Use small threshold for floating point comparison
      return state.date;
    }
  }
  
  return null; // Loan not paid off within simulation period
}

/**
 * Generates warnings and alerts for unsustainable financial scenarios
 * Validates: Requirements 7.3, 10.2, 10.4, 10.5
 * 
 * Analyzes simulation states and generates appropriate warnings/alerts:
 * - Debt increase warning (Requirements 10.2)
 * - Negative cash flow alert (Requirements 10.4)
 * - Net worth growth indication (Requirements 10.5)
 * - Unsustainable scenario flagging (Requirements 7.3)
 * 
 * @param states Array of financial states from simulation
 * @returns Array of financial warnings with severity levels
 */
export function generateWarnings(
  states: FinancialState[],
): FinancialWarning[] {
  const warnings: FinancialWarning[] = [];

  if (states.length < 2) {
    return warnings;
  }

  // Check for increasing debt (Requirements 10.2)
  const hasIncreasingDebt = detectIncreasingDebt(states);
  if (hasIncreasingDebt) {
    const firstBalance = states[0].loanBalance;
    const lastBalance = states[states.length - 1].loanBalance;
    const increase = lastBalance - firstBalance;
    
    warnings.push({
      message: `Loan balance is increasing over time (${formatCurrency(increase)} increase). This indicates unsustainable debt growth.`,
      severity: "warning",
      type: "debt",
    });
  }

  // Check for consecutive negative cash flow (Requirements 10.4)
  const cashFlowResult = detectNegativeCashFlow(states, 3);
  if (cashFlowResult.detected) {
    warnings.push({
      message: `Sustained negative cash flow detected (${cashFlowResult.consecutivePeriods} consecutive periods). Your expenses exceed your income.`,
      severity: "alert",
      type: "cashflow",
    });
  }

  // Check for net worth decline (inverse of Requirements 10.5)
  const hasNetWorthGrowth = detectNetWorthGrowth(states);
  if (!hasNetWorthGrowth) {
    const firstNetWorth = states[0].netWorth;
    const lastNetWorth = states[states.length - 1].netWorth;
    const decline = firstNetWorth - lastNetWorth;
    
    warnings.push({
      message: `Net worth is declining over time (${formatCurrency(decline)} decrease). Consider reducing expenses or increasing income.`,
      severity: "warning",
      type: "sustainability",
    });
  }

  // Check for unsustainable scenario where loan payments exceed available cash (Requirements 7.3)
  // Look for states where cash becomes deeply negative
  const minCash = Math.min(...states.map(s => s.cash));
  if (minCash < -1000) { // Threshold for significant negative cash
    warnings.push({
      message: `Cash reserves are severely depleted (minimum: ${formatCurrency(minCash)}). Loan payments may be exceeding available funds.`,
      severity: "alert",
      type: "sustainability",
    });
  }

  return warnings;
}
