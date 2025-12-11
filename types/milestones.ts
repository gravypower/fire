/**
 * Data models for financial milestones and retirement advice
 */

/**
 * Types of milestones that can be detected during simulation
 */
export type MilestoneType = 
  | 'loan_payoff' 
  | 'offset_completion' 
  | 'retirement_eligibility' 
  | 'parameter_transition'
  | 'expense_expiration';

/**
 * Categories for organizing milestones
 */
export type MilestoneCategory = 'debt' | 'investment' | 'retirement' | 'transition' | 'expense';

/**
 * Base milestone interface - common properties for all milestone types
 */
export interface BaseMilestone {
  /** Unique identifier for this milestone */
  id: string;
  /** Type of milestone */
  type: MilestoneType;
  /** Date when this milestone occurs */
  date: Date;
  /** Human-readable title for the milestone */
  title: string;
  /** Detailed description of what happened */
  description: string;
  /** Financial impact in dollars (positive for gains, negative for costs) */
  financialImpact?: number;
  /** Category for organizing milestones */
  category: MilestoneCategory;
}

/**
 * Milestone for when a loan is completely paid off
 */
export interface LoanPayoffMilestone extends BaseMilestone {
  type: 'loan_payoff';
  category: 'debt';
  /** ID of the loan that was paid off */
  loanId: string;
  /** Name/label of the loan */
  loanName: string;
  /** Amount of the final payment */
  finalPaymentAmount: number;
  /** Total interest paid over the life of the loan */
  totalInterestPaid: number;
  /** Number of months it took to pay off the loan */
  monthsToPayoff: number;
}

/**
 * Milestone for when offset account balance equals or exceeds loan balance
 */
export interface OffsetCompletionMilestone extends BaseMilestone {
  type: 'offset_completion';
  category: 'debt';
  /** ID of the loan with the completed offset */
  loanId: string;
  /** Offset account balance at completion */
  offsetAmount: number;
  /** Remaining loan balance at completion */
  loanBalance: number;
  /** Annual interest rate being saved */
  interestSavingsRate: number;
}

/**
 * Milestone for when retirement becomes financially feasible
 */
export interface RetirementMilestone extends BaseMilestone {
  type: 'retirement_eligibility';
  category: 'retirement';
  /** Required assets to support desired retirement income */
  requiredAssets: number;
  /** Actual assets available at this date */
  actualAssets: number;
  /** Monthly withdrawal capacity based on assets */
  monthlyWithdrawalCapacity: number;
  /** How many years earlier than target retirement age (if applicable) */
  yearsEarlierThanTarget?: number;
  /** ID of the person retiring (for multi-person households) */
  personId?: string;
}

/**
 * Milestone for when parameter transitions occur during simulation
 */
export interface ParameterTransitionMilestone extends BaseMilestone {
  type: 'parameter_transition';
  category: 'transition';
  /** ID of the transition that occurred */
  transitionId: string;
  /** Summary of parameter changes that occurred */
  parameterChanges: Record<string, { from: any; to: any }>;
  /** Human-readable summary of the impact */
  impactSummary: string;
}

/**
 * Milestone for when an expense with an end date expires
 */
export interface ExpenseExpirationMilestone extends BaseMilestone {
  type: 'expense_expiration';
  category: 'expense';
  /** ID of the expense that expired */
  expenseId: string;
  /** Name of the expense */
  expenseName: string;
  /** Monthly amount that will be saved */
  monthlySavings: number;
  /** Annual amount that will be saved */
  annualSavings: number;
  /** Category of the expense */
  expenseCategory: string;
}

/**
 * Union type for all milestone types
 */
export type Milestone = 
  | LoanPayoffMilestone 
  | OffsetCompletionMilestone 
  | RetirementMilestone 
  | ParameterTransitionMilestone
  | ExpenseExpirationMilestone;

/**
 * Result of milestone detection process
 */
export interface MilestoneDetectionResult {
  /** Array of detected milestones */
  milestones: Milestone[];
  /** Any errors that occurred during detection */
  errors: MilestoneDetectionError[];
  /** Warnings about potential issues */
  warnings: string[];
}

/**
 * Error that can occur during milestone detection
 */
export interface MilestoneDetectionError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Context about where the error occurred */
  context?: Record<string, any>;
  /** Severity level of the error */
  severity: 'warning' | 'error' | 'critical';
}

/**
 * Categories for retirement advice
 */
export type AdviceCategory = 'debt' | 'investment' | 'expense' | 'income';

/**
 * Priority levels for advice items
 */
export type AdvicePriority = 'high' | 'medium' | 'low';

/**
 * Overall assessment of retirement readiness
 */
export type RetirementAssessment = 'on_track' | 'needs_improvement' | 'critical';

/**
 * Individual advice item with specific recommendations
 */
export interface AdviceItem {
  /** Unique identifier for this advice item */
  id: string;
  /** Category of advice */
  category: AdviceCategory;
  /** Priority level for implementation */
  priority: AdvicePriority;
  /** Short title for the recommendation */
  title: string;
  /** Detailed description of the recommendation */
  description: string;
  /** Specific actionable steps to implement this advice */
  specificActions: string[];
  /** Projected impact of implementing this advice */
  projectedImpact: {
    /** Years saved on retirement timeline */
    timelineSavings?: number;
    /** Dollar amount saved over time */
    costSavings?: number;
    /** Additional assets generated */
    additionalAssets?: number;
  };
  /** How feasible this advice is to implement (0-100) */
  feasibilityScore: number;
  /** How effective this advice is expected to be (0-100) */
  effectivenessScore: number;
  /** Person this advice applies to (for household mode) */
  personId?: string;
  /** Suggested parameter changes to implement this advice */
  parameterChanges?: Partial<import("../types/financial.ts").UserParameters>;
  /** Person-specific parameter changes (for modifying individual people in household) */
  personSpecificChanges?: {
    /** ID of the person to modify */
    personId: string;
    /** Changes to apply to this person's data */
    changes: {
      /** Updates to income sources */
      incomeSources?: Array<{
        /** Action to take: 'add', 'update', or 'remove' */
        action: 'add' | 'update' | 'remove';
        /** Income source ID (for update/remove) */
        id?: string;
        /** Income source data (for add/update) */
        data?: Partial<import("../types/financial.ts").IncomeSource>;
      }>;
      /** Updates to super accounts */
      superAccounts?: Array<{
        /** Action to take: 'add', 'update', or 'remove' */
        action: 'add' | 'update' | 'remove';
        /** Super account ID (for update/remove) */
        id?: string;
        /** Super account data (for add/update) */
        data?: Partial<import("../types/financial.ts").SuperAccount>;
      }>;
      /** Updates to person properties */
      personUpdates?: {
        currentAge?: number;
        retirementAge?: number;
        name?: string;
      };
    };
  };
}

/**
 * Ranked advice with overall scoring
 */
export interface RankedAdvice extends AdviceItem {
  /** Overall score combining feasibility and effectiveness */
  overallScore: number;
  /** Rank among all advice items (1 = highest priority) */
  rank: number;
}

/**
 * Assessment of retirement feasibility
 */
export interface RetirementFeasibility {
  /** Whether user can retire at their target age */
  canRetireAtTarget: boolean;
  /** Actual retirement age if different from target */
  actualRetirementAge?: number;
  /** Amount short of retirement goal (if applicable) */
  shortfallAmount?: number;
  /** Surplus amount beyond retirement goal (if applicable) */
  surplusAmount?: number;
}

/**
 * Complete retirement advice package
 */
export interface RetirementAdvice {
  /** Overall assessment of current trajectory */
  overallAssessment: RetirementAssessment;
  /** Analysis of retirement feasibility */
  retirementFeasibility: RetirementFeasibility;
  /** All recommendations ranked by priority */
  recommendations: RankedAdvice[];
  /** High-impact, easy-to-implement recommendations */
  quickWins: AdviceItem[];
  /** Long-term strategic recommendations */
  longTermStrategies: AdviceItem[];
}

/**
 * Result of advice generation process
 */
export interface AdviceGenerationResult {
  /** Generated retirement advice */
  advice: RetirementAdvice;
  /** Any errors that occurred during generation */
  errors: AdviceGenerationError[];
  /** Warnings about limitations or assumptions */
  warnings: string[];
}

/**
 * Error that can occur during advice generation
 */
export interface AdviceGenerationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Context about where the error occurred */
  context?: Record<string, any>;
  /** Severity level of the error */
  severity: 'warning' | 'error' | 'critical';
}

/**
 * Configuration for milestone detection
 */
export interface MilestoneDetectionConfig {
  /** Whether to detect loan payoff milestones */
  detectLoanPayoffs: boolean;
  /** Whether to detect offset completion milestones */
  detectOffsetCompletion: boolean;
  /** Whether to detect retirement eligibility milestones */
  detectRetirementEligibility: boolean;
  /** Whether to detect parameter transition milestones */
  detectParameterTransitions: boolean;
  /** Whether to detect expense expiration milestones */
  detectExpenseExpirations: boolean;
  /** Minimum financial impact to consider a milestone significant */
  minimumImpactThreshold?: number;
}

/**
 * Configuration for advice generation
 */
export interface AdviceGenerationConfig {
  /** Whether to generate debt-related advice */
  includeDebtAdvice: boolean;
  /** Whether to generate investment-related advice */
  includeInvestmentAdvice: boolean;
  /** Whether to generate expense-related advice */
  includeExpenseAdvice: boolean;
  /** Whether to generate income-related advice */
  includeIncomeAdvice: boolean;
  /** Maximum number of recommendations to generate */
  maxRecommendations?: number;
  /** Minimum effectiveness score to include advice (0-100) */
  minEffectivenessThreshold?: number;
}