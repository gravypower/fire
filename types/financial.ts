/**
 * Core data models and types for the Finance Simulation Tool
 */

import type { ExpenseItem } from "./expenses.ts";

/**
 * Time interval granularity for simulation calculations
 */
export type TimeInterval = "week" | "fortnight" | "month" | "year";

/**
 * Payment frequency options
 */
export type PaymentFrequency = "weekly" | "fortnightly" | "monthly";

/**
 * Tax bracket definition
 */
export interface TaxBracket {
  /** Minimum income for this bracket (inclusive) */
  min: number;
  /** Maximum income for this bracket (exclusive, null for top bracket) */
  max: number | null;
  /** Tax rate as a percentage (e.g., 19 for 19%) */
  rate: number;
}

/**
 * Financial state at a specific point in time
 * Represents a snapshot of all financial metrics
 */
export interface FinancialState {
  /** The date of this financial state snapshot */
  date: Date;
  /** Available cash balance */
  cash: number;
  /** Total investment balance */
  investments: number;
  /** Superannuation (retirement savings) balance */
  superannuation: number;
  /** Outstanding loan balance */
  loanBalance: number;
  /** Offset account balance (reduces loan interest) */
  offsetBalance: number;
  /** Total net worth (assets - liabilities) */
  netWorth: number;
  /** Net cash flow for this period (income - expenses) */
  cashFlow: number;
  /** Tax paid this period */
  taxPaid: number;
  /** Interest saved due to offset account */
  interestSaved: number;
}

/**
 * User-configurable financial parameters
 * All monetary values are in the user's currency
 */
export interface UserParameters {
  // Income
  /** Annual salary amount */
  annualSalary: number;
  /** How often salary is paid */
  salaryFrequency: PaymentFrequency;
  /** Income tax rate as a percentage (e.g., 30 for 30%) - DEPRECATED: Use taxBrackets instead */
  incomeTaxRate: number;
  /** Tax brackets for progressive taxation (optional, falls back to incomeTaxRate if not provided) */
  taxBrackets?: TaxBracket[];

  // Expenses
  /** Monthly living expenses (food, utilities, etc.) - DEPRECATED: Use expenseItems instead */
  monthlyLivingExpenses: number;
  /** Monthly rent or mortgage payment - DEPRECATED: Use expenseItems instead */
  monthlyRentOrMortgage: number;
  /** Individual expense items with frequencies (optional, falls back to monthlyLivingExpenses if not provided) */
  expenseItems?: ExpenseItem[];

  // Loans
  /** Outstanding loan principal amount */
  loanPrincipal: number;
  /** Annual interest rate as a percentage (e.g., 5.5 for 5.5%) */
  loanInterestRate: number;
  /** Regular loan payment amount */
  loanPaymentAmount: number;
  /** How often loan payments are made */
  loanPaymentFrequency: PaymentFrequency;
  /** Whether to use an offset account (leftover funds reduce loan interest) */
  useOffsetAccount: boolean;
  /** Current offset account balance */
  currentOffsetBalance: number;

  // Investments
  /** Monthly contribution to investments */
  monthlyInvestmentContribution: number;
  /** Expected annual return rate as a percentage (e.g., 7 for 7%) */
  investmentReturnRate: number;
  /** Current investment balance */
  currentInvestmentBalance: number;

  // Superannuation
  /** Percentage of salary contributed to super (e.g., 11 for 11%) */
  superContributionRate: number;
  /** Expected annual return rate for super as a percentage */
  superReturnRate: number;
  /** Current superannuation balance */
  currentSuperBalance: number;

  // Retirement
  /** Desired annual income in retirement */
  desiredAnnualRetirementIncome: number;
  /** Target retirement age */
  retirementAge: number;
  /** Current age */
  currentAge: number;

  // Simulation
  /** Number of years to simulate */
  simulationYears: number;
  /** Starting date for the simulation */
  startDate: Date;
}

/**
 * Result of a complete simulation run
 */
export interface SimulationResult {
  /** Array of financial states at each time interval */
  states: FinancialState[];
  /** Calculated retirement date, or null if not achievable */
  retirementDate: Date | null;
  /** Age at retirement, or null if not achievable */
  retirementAge: number | null;
  /** Whether the financial trajectory is sustainable */
  isSustainable: boolean;
  /** Array of warning messages about the simulation */
  warnings: string[];
}

/**
 * Validation result for parameter bounds
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Parameter bounds for validation
 */
export interface ParameterBounds {
  min: number;
  max: number;
  fieldName: string;
}

/**
 * Parameter transition - represents a change to financial parameters at a specific date
 */
export interface ParameterTransition {
  /** Unique identifier for this transition */
  id: string;

  /** Date when this transition takes effect */
  transitionDate: Date;

  /** Optional label/description for this transition */
  label?: string;

  /** Parameters that change at this transition (partial UserParameters) */
  /** Only specified fields will change; others carry forward */
  parameterChanges: Partial<UserParameters>;
}

/**
 * Parameter period - represents a continuous time span with constant parameters
 */
export interface ParameterPeriod {
  /** Start date of this period (inclusive) */
  startDate: Date;

  /** End date of this period (exclusive), null for final period */
  endDate: Date | null;

  /** Complete parameter set active during this period */
  parameters: UserParameters;

  /** Reference to the transition that started this period (null for base period) */
  transitionId: string | null;
}

/**
 * Simulation configuration with parameter transitions
 */
export interface SimulationConfiguration {
  /** Base parameters (apply from start until first transition) */
  baseParameters: UserParameters;

  /** Array of parameter transitions, sorted chronologically */
  transitions: ParameterTransition[];
}

/**
 * Transition point - marks where a transition occurred during simulation
 */
export interface TransitionPoint {
  /** Date of transition */
  date: Date;

  /** Index in states array where transition occurred */
  stateIndex: number;

  /** Transition that occurred */
  transition: ParameterTransition;

  /** Summary of what changed */
  changesSummary: string;
}

/**
 * Enhanced simulation result with transition information
 */
export interface EnhancedSimulationResult extends SimulationResult {
  /** Transition points that occurred during simulation */
  transitionPoints: TransitionPoint[];

  /** Parameter periods used in simulation */
  periods: ParameterPeriod[];
}

/**
 * Comparison simulation result - compares scenarios with and without transitions
 */
export interface ComparisonSimulationResult {
  /** Result with transitions */
  withTransitions: EnhancedSimulationResult;

  /** Result without transitions (base parameters only) */
  withoutTransitions: SimulationResult;

  /** Comparison metrics */
  comparison: {
    /** Difference in retirement date in years (null if either is not achievable) */
    retirementDateDifference: number | null;
    /** Difference in final net worth */
    finalNetWorthDifference: number;
    /** Whether sustainability changed between scenarios */
    sustainabilityChanged: boolean;
  };
}

/**
 * Transition template - predefined template for common life events
 */
export interface TransitionTemplate {
  /** Template identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description of this life event */
  description: string;

  /** Category (e.g., "career", "lifestyle", "retirement") */
  category: string;

  /** Function that generates parameter changes based on current params */
  generateChanges: (currentParams: UserParameters) => Partial<UserParameters>;
}

/**
 * Predefined transition templates for common life events
 */
export const TRANSITION_TEMPLATES: TransitionTemplate[] = [
  {
    id: "semi-retirement",
    name: "Semi-Retirement",
    description: "Reduce work hours and income, lower expenses",
    category: "retirement",
    generateChanges: (current) => ({
      annualSalary: current.annualSalary * 0.5,
      monthlyLivingExpenses: current.monthlyLivingExpenses * 0.8,
    }),
  },
  {
    id: "full-retirement",
    name: "Full Retirement",
    description: "Stop working, rely on investments and super",
    category: "retirement",
    generateChanges: (current) => ({
      annualSalary: 0,
      monthlyInvestmentContribution: 0,
      monthlyLivingExpenses: current.monthlyLivingExpenses * 0.7,
    }),
  },
  {
    id: "relocation-cheaper",
    name: "Relocate to Cheaper Area",
    description: "Move to area with lower cost of living",
    category: "lifestyle",
    generateChanges: (current) => ({
      monthlyRentOrMortgage: current.monthlyRentOrMortgage * 0.7,
      monthlyLivingExpenses: current.monthlyLivingExpenses * 0.85,
    }),
  },
  {
    id: "career-change-higher",
    name: "Career Change (Higher Income)",
    description: "Switch to higher-paying career",
    category: "career",
    generateChanges: (current) => ({
      annualSalary: current.annualSalary * 1.3,
    }),
  },
  {
    id: "career-change-lower",
    name: "Career Change (Lower Income)",
    description: "Switch to lower-paying but more fulfilling career",
    category: "career",
    generateChanges: (current) => ({
      annualSalary: current.annualSalary * 0.7,
    }),
  },
  {
    id: "increase-savings",
    name: "Increase Savings Rate",
    description: "Boost investment contributions",
    category: "financial",
    generateChanges: (current) => ({
      monthlyInvestmentContribution:
        current.monthlyInvestmentContribution * 1.5,
    }),
  },
];
