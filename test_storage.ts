/**
 * Test script to verify storage functionality
 */

import { LocalStorageService } from "./lib/storage.ts";
import type { SimulationConfiguration } from "./types/financial.ts";

// Mock localStorage for testing
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
  length: 0,
  key: () => null,
};

const storage = new LocalStorageService(mockLocalStorage as Storage);

console.log("=== Testing Storage Service ===\n");

// Test 1: Save and load configuration with new fields
console.log("Test 1: Save and load configuration with new fields");
const testConfig: SimulationConfiguration = {
  baseParameters: {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Test Person",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [{
        id: "income-1",
        label: "Salary",
        amount: 80000,
        frequency: "yearly",
        isBeforeTax: true,
      }],
      superAccounts: [{
        id: "super-1",
        label: "Main Super",
        balance: 50000,
        contributionRate: 11,
        returnRate: 7,
      }],
    }],
    loans: [{
      id: "loan-1",
      label: "Home Loan",
      principal: 400000,
      interestRate: 6.0,
      paymentAmount: 3000,
      paymentFrequency: "monthly",
      hasOffset: true,
      offsetBalance: 5000,
    }],
    expenseItems: [{
      id: "expense-1",
      label: "Groceries",
      amount: 500,
      frequency: "monthly",
      category: "living",
    }],
    // Legacy fields
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 0,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 0,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 40,
    startDate: new Date("2024-01-01"),
  },
  transitions: [],
};

try {
  storage.saveConfiguration(testConfig);
  console.log("✅ Configuration saved successfully");
  
  const loaded = storage.loadConfiguration();
  if (loaded) {
    console.log("✅ Configuration loaded successfully");
    console.log("  - Household mode:", loaded.baseParameters.householdMode);
    console.log("  - People count:", loaded.baseParameters.people?.length || 0);
    console.log("  - Loans count:", loaded.baseParameters.loans?.length || 0);
    console.log("  - Expense items count:", loaded.baseParameters.expenseItems?.length || 0);
    
    if (loaded.baseParameters.people && loaded.baseParameters.people.length > 0) {
      const person = loaded.baseParameters.people[0];
      console.log("  - Person name:", person.name);
      console.log("  - Income sources:", person.incomeSources?.length || 0);
      console.log("  - Super accounts:", person.superAccounts?.length || 0);
    }
    
    if (loaded.baseParameters.loans && loaded.baseParameters.loans.length > 0) {
      const loan = loaded.baseParameters.loans[0];
      console.log("  - Loan label:", loan.label);
      console.log("  - Loan principal:", loan.principal);
      console.log("  - Has offset:", loan.hasOffset);
      console.log("  - Offset balance:", loan.offsetBalance);
    }
  } else {
    console.log("❌ Failed to load configuration");
  }
} catch (error) {
  console.log("❌ Error:", error);
}

console.log("\n=== Test Complete ===");
