/**
 * Test for parameter categorization and UI utilities
 * Demonstrates which parameters require person selection vs household-level changes
 */

import { 
  getChangeableParameters,
  getParametersByCategory,
  getRecommendedParameters,
  validateParameterChangeForm,
  createPersonParameterChange,
  getParameterChangeDescription,
  type ParameterChangeFormData
} from "./lib/parameter_change_ui_utils.ts";
import { 
  requiresPersonSelection,
  getParameterCategory,
  PARAMETER_METADATA
} from "./types/parameter_categories.ts";
import type { UserParameters } from "./types/financial.ts";

console.log("🏷️  Testing Parameter Categorization System\n");

// Create test parameters for a couple
const coupleParams: UserParameters = {
  householdMode: "couple",
  people: [
    {
      id: "person-1",
      name: "Alice",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [{
        id: "alice-salary",
        label: "Alice's Salary",
        amount: 80000,
        frequency: "yearly",
        isBeforeTax: true,
        personId: "person-1",
      }],
      superAccounts: [{
        id: "alice-super",
        label: "Alice's Super",
        balance: 50000,
        contributionRate: 11,
        returnRate: 7,
        personId: "person-1",
      }],
    },
    {
      id: "person-2",
      name: "Bob",
      currentAge: 32,
      retirementAge: 67,
      incomeSources: [{
        id: "bob-salary",
        label: "Bob's Salary",
        amount: 90000,
        frequency: "yearly",
        isBeforeTax: true,
        personId: "person-2",
      }],
      superAccounts: [{
        id: "bob-super",
        label: "Bob's Super",
        balance: 60000,
        contributionRate: 11,
        returnRate: 7,
        personId: "person-2",
      }],
    },
  ],
  // Legacy fields
  annualSalary: 170000,
  salaryFrequency: "yearly",
  incomeTaxRate: 30,
  monthlyLivingExpenses: 4000,
  monthlyRentOrMortgage: 2000,
  loanPrincipal: 300000,
  loanInterestRate: 6.0,
  loanPaymentAmount: 2500,
  loanPaymentFrequency: "monthly",
  useOffsetAccount: true,
  currentOffsetBalance: 10000,
  monthlyInvestmentContribution: 1000,
  investmentReturnRate: 7,
  currentInvestmentBalance: 20000,
  superContributionRate: 11,
  superReturnRate: 7,
  currentSuperBalance: 110000,
  desiredAnnualRetirementIncome: 80000,
  retirementAge: 65,
  currentAge: 30,
  simulationYears: 35,
  startDate: new Date("2024-01-01"),
};

// Test parameter categorization
console.log("📊 Parameter Categories:");
const paramsByCategory = getParametersByCategory(coupleParams);

console.log(`\n👤 Person-Specific Parameters (${paramsByCategory.personSpecific.length}):`);
for (const param of paramsByCategory.personSpecific) {
  console.log(`   • ${param.displayName} (${param.key})`);
  console.log(`     Current: ${param.currentValue}`);
  console.log(`     People: ${param.availablePeople?.map(p => p.name).join(', ')}`);
}

console.log(`\n🏠 Household-Level Parameters (${paramsByCategory.household.length}):`);
for (const param of paramsByCategory.household) {
  console.log(`   • ${param.displayName} (${param.key})`);
  console.log(`     Current: ${param.currentValue}`);
}

console.log(`\n🔄 Flexible Parameters (${paramsByCategory.flexible.length}):`);
for (const param of paramsByCategory.flexible) {
  console.log(`   • ${param.displayName} (${param.key})`);
  console.log(`     Current: ${param.currentValue}`);
  console.log(`     Requires person selection: ${param.requiresPersonSelection}`);
}

// Test recommended parameters for advice
console.log(`\n💡 Recommended Parameters for Advice:`);
const recommendedParams = getRecommendedParameters(coupleParams);
for (const param of recommendedParams) {
  const category = param.requiresPersonSelection ? "Person-specific" : "Household";
  console.log(`   • ${param.displayName} (${category})`);
}

// Test parameter change creation
console.log(`\n🔧 Testing Parameter Changes:`);

// Test 1: Person-specific salary change
console.log(`\n1. Alice's Salary Increase:`);
const salaryChange = createPersonParameterChange(
  'annualSalary',
  95000,
  'person-1',
  coupleParams
);
console.log(`   Result: ${JSON.stringify(salaryChange, null, 2)}`);

// Test 2: Person-specific super contribution change
console.log(`\n2. Bob's Super Contribution Increase:`);
const superChange = createPersonParameterChange(
  'superContributionRate',
  13,
  'person-2',
  coupleParams
);
console.log(`   Result: ${JSON.stringify(superChange, null, 2)}`);

// Test 3: Household expense change
console.log(`\n3. Household Living Expenses Reduction:`);
const expenseChange = createPersonParameterChange(
  'monthlyLivingExpenses',
  3500,
  'person-1', // Person ID provided but not used for household parameter
  coupleParams
);
console.log(`   Result: ${JSON.stringify(expenseChange, null, 2)}`);

// Test parameter change descriptions
console.log(`\n📝 Parameter Change Descriptions:`);
console.log(`   Salary: ${getParameterChangeDescription('annualSalary', 80000, 95000, 'Alice')}`);
console.log(`   Super: ${getParameterChangeDescription('superContributionRate', 11, 13, 'Bob')}`);
console.log(`   Expenses: ${getParameterChangeDescription('monthlyLivingExpenses', 4000, 3500)}`);

// Test form validation
console.log(`\n✅ Form Validation Tests:`);

// Valid person-specific change
const validForm: ParameterChangeFormData = {
  parameterKey: 'retirementAge',
  newValue: 67,
  personId: 'person-1',
  transitionDate: new Date('2030-01-01'),
  label: 'Delay Alice retirement'
};

const validValidation = validateParameterChangeForm(validForm, coupleParams);
console.log(`   Valid form: ${validValidation.isValid ? '✅ PASS' : '❌ FAIL'}`);
if (!validValidation.isValid) {
  console.log(`   Errors: ${validValidation.errors.join(', ')}`);
}

// Invalid - missing person selection
const invalidForm: ParameterChangeFormData = {
  parameterKey: 'annualSalary',
  newValue: 100000,
  // personId missing for person-specific parameter
  transitionDate: new Date('2030-01-01'),
  label: 'Salary increase'
};

const invalidValidation = validateParameterChangeForm(invalidForm, coupleParams);
console.log(`   Missing person: ${invalidValidation.isValid ? '✅ PASS' : '❌ FAIL'}`);
if (!invalidValidation.isValid) {
  console.log(`   Errors: ${invalidValidation.errors.join(', ')}`);
}

// Test single vs couple mode differences
console.log(`\n👤 Single vs Couple Mode Comparison:`);
const singleParams = { ...coupleParams, householdMode: 'single' as const };

console.log(`   Annual Salary in couple mode: requires person = ${requiresPersonSelection('annualSalary', 'couple')}`);
console.log(`   Annual Salary in single mode: requires person = ${requiresPersonSelection('annualSalary', 'single')}`);
console.log(`   Living Expenses in couple mode: requires person = ${requiresPersonSelection('monthlyLivingExpenses', 'couple')}`);
console.log(`   Living Expenses in single mode: requires person = ${requiresPersonSelection('monthlyLivingExpenses', 'single')}`);

console.log(`\n🎯 Key Insights:`);
console.log(`   • Person-specific parameters: ${paramsByCategory.personSpecific.length}`);
console.log(`   • Household parameters: ${paramsByCategory.household.length}`);
console.log(`   • Recommended for advice: ${recommendedParams.length}`);
console.log(`   • Parameters requiring person selection in couple mode: ${paramsByCategory.personSpecific.length}`);
console.log(`   • Parameters that don't require person selection: ${paramsByCategory.household.length + paramsByCategory.flexible.length}`);

console.log(`\n✅ Parameter Categorization Test Complete!`);
console.log(`\n🔍 System Benefits:`);
console.log(`   • Clear separation of person vs household parameters`);
console.log(`   • Automatic validation of person selection requirements`);
console.log(`   • UI can show appropriate controls based on parameter type`);
console.log(`   • Prevents invalid parameter changes (e.g., expenses per person)`);
console.log(`   • Supports both single and couple modes seamlessly`);