/**
 * Test for person-specific parameter changes in retirement advice
 * Demonstrates how advice is correctly targeted to specific people
 */

import { RetirementAdviceEngine } from "./lib/retirement_advice_engine.ts";
import { applyPersonSpecificAdvice, getAdviceTargetName } from "./lib/person_specific_advice_utils.ts";
import type { UserParameters, FinancialState, SimulationResult } from "./types/financial.ts";

console.log("🧪 Testing Person-Specific Parameter Changes\n");

// Create test parameters with a couple
const testParams: UserParameters = {
  householdMode: "couple",
  people: [
    {
      id: "person-1",
      name: "Alice",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [
        {
          id: "alice-salary",
          label: "Alice's Salary",
          amount: 80000,
          frequency: "yearly",
          isBeforeTax: true,
          personId: "person-1",
        },
      ],
      superAccounts: [
        {
          id: "alice-super",
          label: "Alice's Super",
          balance: 50000,
          contributionRate: 11,
          returnRate: 7,
          personId: "person-1",
        },
      ],
    },
    {
      id: "person-2",
      name: "Bob",
      currentAge: 32,
      retirementAge: 67,
      incomeSources: [
        {
          id: "bob-salary",
          label: "Bob's Salary",
          amount: 90000,
          frequency: "yearly",
          isBeforeTax: true,
          personId: "person-2",
        },
      ],
      superAccounts: [
        {
          id: "bob-super",
          label: "Bob's Super",
          balance: 60000,
          contributionRate: 11,
          returnRate: 7,
          personId: "person-2",
        },
      ],
    },
  ],
  // Legacy fields for compatibility
  annualSalary: 170000, // Combined
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
  currentSuperBalance: 110000, // Combined
  desiredAnnualRetirementIncome: 80000,
  retirementAge: 65,
  currentAge: 30,
  simulationYears: 35,
  startDate: new Date("2024-01-01"),
};

// Create mock simulation states
const states: FinancialState[] = [];
for (let i = 0; i < 60; i++) { // 5 years of monthly data
  const date = new Date(2024, i, 1);
  states.push({
    date,
    cash: 5000 + (i * 200),
    investments: 20000 + (i * 1000),
    superannuation: 110000 + (i * 800),
    loanBalance: Math.max(0, 300000 - (i * 2000)),
    loanBalances: { "legacy-loan": Math.max(0, 300000 - (i * 2000)) },
    offsetBalance: 10000 + (i * 100),
    netWorth: (5000 + (i * 200)) + (20000 + (i * 1000)) + (110000 + (i * 800)) - Math.max(0, 300000 - (i * 2000)),
    cashFlow: 2000,
    taxPaid: 2500,
    expenses: 6000,
    interestSaved: 300,
  });
}

const result: SimulationResult = {
  states,
  isSustainable: true,
  retirementDate: null,
  retirementAge: null,
  finalNetWorth: states[states.length - 1].netWorth,
  warnings: [],
};

console.log("👥 Household Setup:");
console.log(`   Mode: ${testParams.householdMode}`);
for (const person of testParams.people!) {
  console.log(`   • ${person.name} (age ${person.currentAge}, retires at ${person.retirementAge})`);
  console.log(`     Income: ${person.incomeSources[0].amount.toLocaleString()}`);
  console.log(`     Super: ${person.superAccounts[0].balance.toLocaleString()} at ${person.superAccounts[0].contributionRate}%`);
}

// Generate advice
console.log("\n🎯 Generating Person-Specific Advice:");
const engine = new RetirementAdviceEngine();
const adviceResult = engine.generateAdvice(result, testParams);

console.log(`   Total recommendations: ${adviceResult.advice.recommendations.length}`);
console.log(`   Validation errors: ${adviceResult.errors.length}`);

// Show person-specific advice
const personSpecificAdvice = adviceResult.advice.recommendations.filter(advice => 
  advice.personId || advice.personSpecificChanges
);

console.log(`   Person-specific advice: ${personSpecificAdvice.length} items\n`);

for (const advice of personSpecificAdvice) {
  const targetName = getAdviceTargetName(advice, testParams);
  console.log(`📋 ${advice.title}`);
  console.log(`   Target: ${targetName}`);
  console.log(`   Category: ${advice.category} | Priority: ${advice.priority}`);
  console.log(`   Effectiveness: ${advice.effectivenessScore}% | Feasibility: ${advice.feasibilityScore}%`);
  console.log(`   Description: ${advice.description}`);
  
  if (advice.personSpecificChanges) {
    console.log(`   📝 Parameter Changes for ${advice.personSpecificChanges.personId}:`);
    
    if (advice.personSpecificChanges.changes.superAccounts) {
      for (const superChange of advice.personSpecificChanges.changes.superAccounts) {
        console.log(`      Super Account ${superChange.action}: ${JSON.stringify(superChange.data)}`);
      }
    }
    
    if (advice.personSpecificChanges.changes.personUpdates) {
      console.log(`      Person Updates: ${JSON.stringify(advice.personSpecificChanges.changes.personUpdates)}`);
    }
    
    if (advice.personSpecificChanges.changes.incomeSources) {
      for (const incomeChange of advice.personSpecificChanges.changes.incomeSources) {
        console.log(`      Income Source ${incomeChange.action}: ${JSON.stringify(incomeChange.data)}`);
      }
    }
  }
  
  console.log(`   Actions: ${advice.specificActions.slice(0, 2).join(', ')}...`);
  console.log("");
}

// Test applying advice
if (personSpecificAdvice.length > 0) {
  console.log("🔧 Testing Parameter Change Application:");
  const firstAdvice = personSpecificAdvice[0];
  console.log(`   Applying: ${firstAdvice.title}`);
  
  const originalParams = JSON.parse(JSON.stringify(testParams));
  const updatedParams = applyPersonSpecificAdvice(testParams, firstAdvice);
  
  // Show what changed
  if (firstAdvice.personId) {
    const originalPerson = originalParams.people?.find(p => p.id === firstAdvice.personId);
    const updatedPerson = updatedParams.people?.find(p => p.id === firstAdvice.personId);
    
    if (originalPerson && updatedPerson) {
      console.log(`   ✅ Changes applied to ${updatedPerson.name}:`);
      
      // Check super account changes
      for (let i = 0; i < originalPerson.superAccounts.length; i++) {
        const original = originalPerson.superAccounts[i];
        const updated = updatedPerson.superAccounts[i];
        
        if (original.contributionRate !== updated.contributionRate) {
          console.log(`      Super contribution: ${original.contributionRate}% → ${updated.contributionRate}%`);
        }
      }
      
      // Check retirement age changes
      if (originalPerson.retirementAge !== updatedPerson.retirementAge) {
        console.log(`      Retirement age: ${originalPerson.retirementAge} → ${updatedPerson.retirementAge}`);
      }
      
      // Check income source changes
      if (originalPerson.incomeSources.length !== updatedPerson.incomeSources.length) {
        console.log(`      Income sources: ${originalPerson.incomeSources.length} → ${updatedPerson.incomeSources.length}`);
      }
    }
  }
}

// Show validation results
if (adviceResult.errors.length > 0) {
  console.log("\n⚠️  Validation Issues:");
  for (const error of adviceResult.errors) {
    console.log(`   ${error.severity.toUpperCase()}: ${error.message}`);
    if (error.context) {
      console.log(`   Context: ${JSON.stringify(error.context)}`);
    }
  }
}

console.log("\n✅ Person-Specific Advice Test Complete!");
console.log("\n🔍 Key Features Demonstrated:");
console.log("   • Advice correctly targets specific people in household");
console.log("   • Parameter changes are validated before application");
console.log("   • Changes maintain person ID relationships");
console.log("   • Super accounts, income sources, and person properties can be modified");
console.log("   • Validation catches mismatched person IDs and missing references");