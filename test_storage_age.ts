/**
 * Test script to verify age storage and sync
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

console.log("=== Testing Age Storage and Sync ===\n");

// Test 1: Save configuration with age 30
console.log("Test 1: Save configuration with age 30");
const testConfig: SimulationConfiguration = {
  baseParameters: {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Test Person",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [],
      superAccounts: [],
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

storage.saveConfiguration(testConfig);
console.log("✅ Saved with age 30");

let loaded = storage.loadConfiguration();
console.log("  - Loaded currentAge:", loaded?.baseParameters.currentAge);
console.log("  - Loaded people[0].currentAge:", loaded?.baseParameters.people?.[0]?.currentAge);

// Test 2: Update age to 40 and save
console.log("\nTest 2: Update age to 40");
if (loaded && loaded.baseParameters.people) {
  loaded.baseParameters.people[0].currentAge = 40;
  storage.saveConfiguration(loaded);
  console.log("✅ Saved with age 40");
  
  // Test 3: Load again and verify
  console.log("\nTest 3: Load and verify age is 40");
  const reloaded = storage.loadConfiguration();
  console.log("  - Reloaded currentAge:", reloaded?.baseParameters.currentAge);
  console.log("  - Reloaded people[0].currentAge:", reloaded?.baseParameters.people?.[0]?.currentAge);
  
  if (reloaded?.baseParameters.currentAge === 40 && 
      reloaded?.baseParameters.people?.[0]?.currentAge === 40) {
    console.log("✅ Age correctly persisted as 40");
  } else {
    console.log("❌ Age did not persist correctly!");
    console.log("   Expected: 40");
    console.log("   Got legacy:", reloaded?.baseParameters.currentAge);
    console.log("   Got people:", reloaded?.baseParameters.people?.[0]?.currentAge);
  }
}

// Test 4: Check what's actually in storage
console.log("\nTest 4: Raw storage data");
const rawData = mockStorage["finance-simulation-config"];
if (rawData) {
  const parsed = JSON.parse(rawData);
  console.log("  - Stored currentAge:", parsed.baseParameters.currentAge);
  console.log("  - Stored people[0].currentAge:", parsed.baseParameters.people?.[0]?.currentAge);
}

console.log("\n=== Test Complete ===");
