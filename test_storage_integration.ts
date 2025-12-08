/**
 * Integration Test for Storage Reset Issue
 * Tests the complete flow: save -> reload -> verify
 */

import { LocalStorageService } from "./lib/storage.ts";
import type { SimulationConfiguration } from "./types/financial.ts";
import { DEFAULT_AU_TAX_BRACKETS } from "./lib/processors.ts";

// Mock localStorage
class MockStorage {
  private storage: Record<string, string> = {};
  
  getItem(key: string): string | null {
    return this.storage[key] || null;
  }
  
  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }
  
  removeItem(key: string): void {
    delete this.storage[key];
  }
  
  clear(): void {
    this.storage = {};
  }
  
  get length(): number {
    return Object.keys(this.storage).length;
  }
  
  key(): string | null {
    return null;
  }
}

console.log("=== INTEGRATION TEST: Storage Reset Issue ===\n");

// Simulate the complete user flow
console.log("Scenario: User enters data, reloads page, data should persist\n");

// Step 1: User opens app for first time
console.log("Step 1: First visit - no data in storage");
let mockStorage = new MockStorage();
let storage = new LocalStorageService(mockStorage as unknown as Storage);

let loadedConfig = storage.loadConfiguration();
console.log("  Loaded config:", loadedConfig === null ? "null (expected)" : "unexpected data");

// Step 2: User enters their data
console.log("\nStep 2: User enters financial data");
const userConfig: SimulationConfiguration = {
  baseParameters: {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "John Doe",
      currentAge: 35,
      retirementAge: 67,
      incomeSources: [{
        id: "income-1",
        label: "Software Engineer",
        amount: 120000,
        frequency: "yearly",
        isBeforeTax: true,
      }],
      superAccounts: [{
        id: "super-1",
        label: "Main Super",
        balance: 80000,
        contributionRate: 11,
        returnRate: 7,
      }],
    }],
    loans: [{
      id: "loan-1",
      label: "Home Loan",
      principal: 500000,
      interestRate: 5.8,
      paymentAmount: 3200,
      paymentFrequency: "monthly",
      hasOffset: true,
      offsetBalance: 15000,
    }],
    expenseItems: [
      {
        id: "expense-1",
        label: "Groceries",
        amount: 600,
        frequency: "monthly",
        category: "living",
      },
      {
        id: "expense-2",
        label: "Utilities",
        amount: 250,
        frequency: "monthly",
        category: "living",
      },
    ],
    taxBrackets: DEFAULT_AU_TAX_BRACKETS,
    // Legacy fields
    annualSalary: 120000,
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
    desiredAnnualRetirementIncome: 70000,
    retirementAge: 67,
    currentAge: 35,
    simulationYears: 40,
    startDate: new Date("2024-01-01"),
  },
  transitions: [],
};

storage.saveConfiguration(userConfig);
console.log("  ✅ Configuration saved");
console.log("  - Age:", userConfig.baseParameters.currentAge);
console.log("  - Name:", userConfig.baseParameters.people?.[0]?.name);
console.log("  - Salary:", userConfig.baseParameters.people?.[0]?.incomeSources?.[0]?.amount);
console.log("  - Loan:", userConfig.baseParameters.loans?.[0]?.principal);
console.log("  - Expenses:", userConfig.baseParameters.expenseItems?.length);

// Step 3: User adds a transition
console.log("\nStep 3: User adds a life event transition");
loadedConfig = storage.loadConfiguration();
if (loadedConfig) {
  loadedConfig.transitions.push({
    id: "transition-1",
    transitionDate: new Date("2026-01-01"),
    label: "Promotion",
    parameterChanges: {
      annualSalary: 140000,
    },
  });
  storage.saveConfiguration(loadedConfig);
  console.log("  ✅ Transition added and saved");
}

// Step 4: User adds more expenses
console.log("\nStep 4: User adds more expenses");
loadedConfig = storage.loadConfiguration();
if (loadedConfig) {
  loadedConfig.baseParameters.expenseItems?.push({
    id: "expense-3",
    label: "Car Insurance",
    amount: 1200,
    frequency: "yearly",
    category: "insurance",
  });
  storage.saveConfiguration(loadedConfig);
  console.log("  ✅ Expense added and saved");
}

// Step 5: User updates their age
console.log("\nStep 5: User updates their age");
loadedConfig = storage.loadConfiguration();
if (loadedConfig) {
  loadedConfig.baseParameters.currentAge = 36;
  loadedConfig.baseParameters.people![0].currentAge = 36;
  storage.saveConfiguration(loadedConfig);
  console.log("  ✅ Age updated to 36");
}

// Step 6: SIMULATE PAGE RELOAD
console.log("\n🔄 Step 6: PAGE RELOAD (simulating browser refresh)");
console.log("  Creating new storage instance with same underlying data...");

// Create new storage instance (simulates page reload)
storage = new LocalStorageService(mockStorage as unknown as Storage);

// Step 7: Load configuration (this is what happens on page load)
console.log("\nStep 7: Loading configuration after reload");
const reloadedConfig = storage.loadConfiguration();

if (!reloadedConfig) {
  console.log("❌ FAILED: No configuration loaded after reload!");
  console.log("   This is the bug - data was lost on reload");
} else {
  console.log("✅ Configuration loaded successfully");
  
  // Verify all data
  let allCorrect = true;
  
  // Check age
  if (reloadedConfig.baseParameters.currentAge !== 36) {
    console.log(`❌ Age mismatch: expected 36, got ${reloadedConfig.baseParameters.currentAge}`);
    allCorrect = false;
  } else {
    console.log("  ✅ Age: 36 (correct)");
  }
  
  // Check person age
  if (reloadedConfig.baseParameters.people?.[0]?.currentAge !== 36) {
    console.log(`❌ Person age mismatch: expected 36, got ${reloadedConfig.baseParameters.people?.[0]?.currentAge}`);
    allCorrect = false;
  } else {
    console.log("  ✅ Person age: 36 (correct)");
  }
  
  // Check name
  if (reloadedConfig.baseParameters.people?.[0]?.name !== "John Doe") {
    console.log(`❌ Name mismatch: expected "John Doe", got "${reloadedConfig.baseParameters.people?.[0]?.name}"`);
    allCorrect = false;
  } else {
    console.log("  ✅ Name: John Doe (correct)");
  }
  
  // Check salary
  const salary = reloadedConfig.baseParameters.people?.[0]?.incomeSources?.[0]?.amount;
  if (salary !== 120000) {
    console.log(`❌ Salary mismatch: expected 120000, got ${salary}`);
    allCorrect = false;
  } else {
    console.log("  ✅ Salary: $120,000 (correct)");
  }
  
  // Check loan
  const loanPrincipal = reloadedConfig.baseParameters.loans?.[0]?.principal;
  if (loanPrincipal !== 500000) {
    console.log(`❌ Loan mismatch: expected 500000, got ${loanPrincipal}`);
    allCorrect = false;
  } else {
    console.log("  ✅ Loan: $500,000 (correct)");
  }
  
  // Check expenses
  const expenseCount = reloadedConfig.baseParameters.expenseItems?.length;
  if (expenseCount !== 3) {
    console.log(`❌ Expense count mismatch: expected 3, got ${expenseCount}`);
    allCorrect = false;
  } else {
    console.log("  ✅ Expenses: 3 items (correct)");
  }
  
  // Check transitions
  const transitionCount = reloadedConfig.transitions.length;
  if (transitionCount !== 1) {
    console.log(`❌ Transition count mismatch: expected 1, got ${transitionCount}`);
    allCorrect = false;
  } else {
    console.log("  ✅ Transitions: 1 event (correct)");
  }
  
  // Check transition details
  if (reloadedConfig.transitions[0]?.label !== "Promotion") {
    console.log(`❌ Transition label mismatch: expected "Promotion", got "${reloadedConfig.transitions[0]?.label}"`);
    allCorrect = false;
  } else {
    console.log("  ✅ Transition: Promotion (correct)");
  }
  
  if (allCorrect) {
    console.log("\n🎉 SUCCESS: All data persisted correctly after reload!");
  } else {
    console.log("\n❌ FAILURE: Some data was lost or corrupted after reload");
  }
}

// Step 8: Test multiple reloads
console.log("\n🔄 Step 8: Testing multiple reloads");
for (let i = 1; i <= 3; i++) {
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  const config = storage.loadConfiguration();
  
  if (config && config.baseParameters.currentAge === 36) {
    console.log(`  ✅ Reload ${i}: Data still intact`);
  } else {
    console.log(`  ❌ Reload ${i}: Data lost!`);
  }
}

console.log("\n=== INTEGRATION TEST COMPLETE ===");
