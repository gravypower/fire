/**
 * Parameter categorization for person-specific vs household-level changes
 * Defines which parameters can be changed at person level vs household level
 */

/**
 * Parameters that are person-specific and require person selection in couple/household mode
 */
export const PERSON_SPECIFIC_PARAMETERS = [
  // Income-related (person-specific)
  'annualSalary',
  'salaryFrequency', 
  'incomeTaxRate',
  'incomeSources',
  
  // Superannuation (person-specific)
  'superContributionRate',
  'superReturnRate', 
  'currentSuperBalance',
  'superAccounts',
  
  // Age and retirement (person-specific)
  'currentAge',
  'retirementAge',
  
  // Person properties
  'name',
] as const;

/**
 * Parameters that are household-level and apply to the entire household
 */
export const HOUSEHOLD_LEVEL_PARAMETERS = [
  // Expenses (shared by household)
  'monthlyLivingExpenses',
  'monthlyRentOrMortgage',
  'expenseItems',
  
  // Loans and debt (typically household-level)
  'loanPrincipal',
  'loanInterestRate',
  'loanPaymentAmount',
  'loanPaymentFrequency',
  'useOffsetAccount',
  'currentOffsetBalance',
  'loans',
  
  // Investments (can be household-level or person-specific)
  'monthlyInvestmentContribution',
  'investmentReturnRate',
  'currentInvestmentBalance',
  'investmentHoldings',
  
  // Household configuration
  'householdMode',
  'people',
  
  // Tax configuration (can be household-level)
  'taxBrackets',
  
  // Retirement goals (household-level)
  'desiredAnnualRetirementIncome',
  
  // Simulation settings
  'simulationYears',
  'startDate',
] as const;

/**
 * Parameters that can be either person-specific or household-level depending on context
 */
export const FLEXIBLE_PARAMETERS = [
  // Investment holdings can be individual or joint
  'investmentHoldings',
  'monthlyInvestmentContribution',
  'investmentReturnRate',
  'currentInvestmentBalance',
  
  // Tax settings can be individual or household
  'taxBrackets',
  'incomeTaxRate',
] as const;

/**
 * Parameters that don't make sense for parameter transitions (read-only or structural)
 */
export const NON_CHANGEABLE_PARAMETERS = [
  'householdMode', // Structural - shouldn't change mid-simulation
  'people', // Structural - people don't appear/disappear
  'simulationYears', // Simulation setting
  'startDate', // Simulation setting
] as const;

export type PersonSpecificParameter = typeof PERSON_SPECIFIC_PARAMETERS[number];
export type HouseholdLevelParameter = typeof HOUSEHOLD_LEVEL_PARAMETERS[number];
export type FlexibleParameter = typeof FLEXIBLE_PARAMETERS[number];
export type NonChangeableParameter = typeof NON_CHANGEABLE_PARAMETERS[number];

/**
 * Determines if a parameter requires person selection in couple/household mode
 */
export function requiresPersonSelection(
  parameter: string, 
  householdMode: 'single' | 'couple'
): boolean {
  if (householdMode === 'single') {
    return false; // No person selection needed for single mode
  }
  
  return PERSON_SPECIFIC_PARAMETERS.includes(parameter as PersonSpecificParameter);
}

/**
 * Determines if a parameter can be changed in transitions
 */
export function isChangeableParameter(parameter: string): boolean {
  return !NON_CHANGEABLE_PARAMETERS.includes(parameter as NonChangeableParameter);
}

/**
 * Gets the category of a parameter
 */
export function getParameterCategory(parameter: string): 'person' | 'household' | 'flexible' | 'non-changeable' {
  if (NON_CHANGEABLE_PARAMETERS.includes(parameter as NonChangeableParameter)) {
    return 'non-changeable';
  }
  if (PERSON_SPECIFIC_PARAMETERS.includes(parameter as PersonSpecificParameter)) {
    return 'person';
  }
  if (FLEXIBLE_PARAMETERS.includes(parameter as FlexibleParameter)) {
    return 'flexible';
  }
  return 'household';
}

/**
 * Parameter metadata for UI display and validation
 */
export interface ParameterMetadata {
  /** Parameter key */
  key: string;
  /** Display name for UI */
  displayName: string;
  /** Category of parameter */
  category: 'person' | 'household' | 'flexible' | 'non-changeable';
  /** Whether this parameter requires person selection in couple mode */
  requiresPersonSelection: boolean;
  /** Description of what this parameter controls */
  description: string;
  /** Whether this parameter can be changed in transitions */
  isChangeable: boolean;
  /** Data type for validation */
  dataType: 'number' | 'string' | 'boolean' | 'date' | 'array' | 'object';
  /** Whether this parameter makes sense for advice recommendations */
  advisable: boolean;
}

/**
 * Complete parameter metadata registry
 */
export const PARAMETER_METADATA: Record<string, ParameterMetadata> = {
  // Person-specific income parameters
  annualSalary: {
    key: 'annualSalary',
    displayName: 'Annual Salary',
    category: 'person',
    requiresPersonSelection: true,
    description: 'Annual salary income for a specific person',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  salaryFrequency: {
    key: 'salaryFrequency',
    displayName: 'Salary Frequency',
    category: 'person',
    requiresPersonSelection: true,
    description: 'How often salary is paid (weekly, monthly, etc.)',
    isChangeable: true,
    dataType: 'string',
    advisable: false,
  },
  incomeTaxRate: {
    key: 'incomeTaxRate',
    displayName: 'Income Tax Rate',
    category: 'flexible',
    requiresPersonSelection: true,
    description: 'Tax rate applied to income',
    isChangeable: true,
    dataType: 'number',
    advisable: false,
  },
  
  // Person-specific superannuation parameters
  superContributionRate: {
    key: 'superContributionRate',
    displayName: 'Super Contribution Rate',
    category: 'person',
    requiresPersonSelection: true,
    description: 'Percentage of salary contributed to superannuation',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  superReturnRate: {
    key: 'superReturnRate',
    displayName: 'Super Return Rate',
    category: 'person',
    requiresPersonSelection: true,
    description: 'Expected annual return rate for superannuation',
    isChangeable: true,
    dataType: 'number',
    advisable: false,
  },
  currentSuperBalance: {
    key: 'currentSuperBalance',
    displayName: 'Current Super Balance',
    category: 'person',
    requiresPersonSelection: true,
    description: 'Current superannuation account balance',
    isChangeable: true,
    dataType: 'number',
    advisable: false,
  },
  
  // Person-specific age and retirement
  currentAge: {
    key: 'currentAge',
    displayName: 'Current Age',
    category: 'person',
    requiresPersonSelection: true,
    description: 'Current age of the person',
    isChangeable: false, // Age doesn't change in transitions
    dataType: 'number',
    advisable: false,
  },
  retirementAge: {
    key: 'retirementAge',
    displayName: 'Retirement Age',
    category: 'person',
    requiresPersonSelection: true,
    description: 'Target retirement age for the person',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  
  // Household-level expense parameters
  monthlyLivingExpenses: {
    key: 'monthlyLivingExpenses',
    displayName: 'Monthly Living Expenses',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Monthly household living expenses (food, utilities, etc.)',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  monthlyRentOrMortgage: {
    key: 'monthlyRentOrMortgage',
    displayName: 'Monthly Rent/Mortgage',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Monthly housing payment (rent or mortgage)',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  
  // Household-level debt parameters
  loanPrincipal: {
    key: 'loanPrincipal',
    displayName: 'Loan Principal',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Outstanding loan principal amount',
    isChangeable: true,
    dataType: 'number',
    advisable: false,
  },
  loanInterestRate: {
    key: 'loanInterestRate',
    displayName: 'Loan Interest Rate',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Annual interest rate for loans',
    isChangeable: true,
    dataType: 'number',
    advisable: false,
  },
  loanPaymentAmount: {
    key: 'loanPaymentAmount',
    displayName: 'Loan Payment Amount',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Regular loan payment amount',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  useOffsetAccount: {
    key: 'useOffsetAccount',
    displayName: 'Use Offset Account',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Whether to use offset account for loans',
    isChangeable: true,
    dataType: 'boolean',
    advisable: true,
  },
  
  // Flexible investment parameters
  monthlyInvestmentContribution: {
    key: 'monthlyInvestmentContribution',
    displayName: 'Monthly Investment Contribution',
    category: 'flexible',
    requiresPersonSelection: false, // Can be household or person-specific
    description: 'Monthly contribution to investment accounts',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  investmentReturnRate: {
    key: 'investmentReturnRate',
    displayName: 'Investment Return Rate',
    category: 'flexible',
    requiresPersonSelection: false,
    description: 'Expected annual return rate for investments',
    isChangeable: true,
    dataType: 'number',
    advisable: false,
  },
  
  // Household retirement goals
  desiredAnnualRetirementIncome: {
    key: 'desiredAnnualRetirementIncome',
    displayName: 'Desired Annual Retirement Income',
    category: 'household',
    requiresPersonSelection: false,
    description: 'Target annual income needed in retirement',
    isChangeable: true,
    dataType: 'number',
    advisable: true,
  },
  
  // Non-changeable structural parameters
  householdMode: {
    key: 'householdMode',
    displayName: 'Household Mode',
    category: 'non-changeable',
    requiresPersonSelection: false,
    description: 'Whether household is single or couple',
    isChangeable: false,
    dataType: 'string',
    advisable: false,
  },
  simulationYears: {
    key: 'simulationYears',
    displayName: 'Simulation Years',
    category: 'non-changeable',
    requiresPersonSelection: false,
    description: 'Number of years to simulate',
    isChangeable: false,
    dataType: 'number',
    advisable: false,
  },
};

/**
 * Gets parameters that are advisable for retirement recommendations
 */
export function getAdvisableParameters(): ParameterMetadata[] {
  return Object.values(PARAMETER_METADATA).filter(param => param.advisable);
}

/**
 * Gets parameters that require person selection for the given household mode
 */
export function getPersonSpecificParameters(householdMode: 'single' | 'couple'): ParameterMetadata[] {
  if (householdMode === 'single') {
    return [];
  }
  return Object.values(PARAMETER_METADATA).filter(param => param.requiresPersonSelection);
}

/**
 * Gets parameters that are household-level
 */
export function getHouseholdParameters(): ParameterMetadata[] {
  return Object.values(PARAMETER_METADATA).filter(param => 
    param.category === 'household' || param.category === 'flexible'
  );
}