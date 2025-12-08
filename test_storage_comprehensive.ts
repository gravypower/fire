/**
 * Comprehensive Storage Test Suite
 * Tests all storage functionality including page reload scenarios
 */

import { LocalStorageService } from "./lib/storage.ts";
import type { SimulationConfiguration, UserParameters, ParameterTransition } from "./types/financial.ts";
import { DEFAULT_AU_TAX_BRACKETS } from "./lib/processors.ts";

// Mock localStorage for testing
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
  
  // Helper to inspect raw storage
  getRawData(): Record<string, string> {
    return { ...this.storage };
  }
  
  // Simulate page reload by creating a new storage instance with same data
  simulateReload(): MockStorage {
    const newStorage = new MockStorage();
    newStorage.storage = { ...this.storage };
    return newStorage;
  }
  
  get length(): number {
    return Object.keys(this.storage).length;
  }
  
  key(): string | null {
    return null;
  }
}

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  testCount++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        passCount++;
        console.log(`✅ Test ${testCount}: ${name}`);
      }).catch((error) => {
        failCount++;
        console.log(`❌ Test ${testCount}: ${name}`);
        console.log(`   Error: ${error.message}`);
      });
    } else {
      passCount++;
      console.log(`✅ Test ${testCount}: ${name}`);
    }
  } catch (error) {
    failCount++;
    console.log(`❌ Test ${testCount}: ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertNotNull(value: unknown, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || "Expected non-null value");
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || "Expected condition to be true");
  }
}

// Helper to create test configuration
function createTestConfig(overrides?: Partial<UserParameters>): SimulationConfiguration {
  const baseParams: UserParameters = {
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
    taxBrackets: DEFAULT_AU_TAX_BRACKETS,
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
    ...overrides,
  };

  return {
    baseParameters: baseParams,
    transitions: [],
  };
}

console.log("=== COMPREHENSIVE STORAGE TEST SUITE ===\n");

// Test Suite 1: Basic Storage Operations
console.log("--- Test Suite 1: Basic Storage Operations ---");

test("Save and load configuration", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  storage.saveConfiguration(config);
  
  const loaded = storage.loadConfiguration();
  assertNotNull(loaded, "Configuration should be loaded");
  assertEquals(loaded!.baseParameters.currentAge, 30);
  assertEquals(loaded!.baseParameters.people?.[0]?.currentAge, 30);
});

test("Clear configuration", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  storage.saveConfiguration(config);
  storage.clearConfiguration();
  
  const loaded = storage.loadConfiguration();
  assertEquals(loaded, null, "Configuration should be null after clearing");
});

test("Handle non-existent configuration", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const loaded = storage.loadConfiguration();
  assertEquals(loaded, null, "Should return null for non-existent config");
});

// Test Suite 2: Page Reload Simulation
console.log("\n--- Test Suite 2: Page Reload Simulation ---");

test("Configuration persists after simulated page reload", () => {
  let mockStorage = new MockStorage();
  let storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  storage.saveConfiguration(config);
  
  // Simulate page reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const loaded = storage.loadConfiguration();
  assertNotNull(loaded, "Configuration should persist after reload");
  assertEquals(loaded!.baseParameters.currentAge, 30);
});

test("Age persists correctly after reload", () => {
  let mockStorage = new MockStorage();
  let storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig({ currentAge: 35 });
  config.baseParameters.people![0].currentAge = 35;
  storage.saveConfiguration(config);
  
  // Simulate page reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const loaded = storage.loadConfiguration();
  assertNotNull(loaded);
  assertEquals(loaded!.baseParameters.currentAge, 35, "Legacy age should be 35");
  assertEquals(loaded!.baseParameters.people?.[0]?.currentAge, 35, "Person age should be 35");
});

test("Multiple updates persist correctly", () => {
  let mockStorage = new MockStorage();
  let storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  // Save initial config
  const config1 = createTestConfig({ currentAge: 30 });
  storage.saveConfiguration(config1);
  
  // Update age
  const config2 = createTestConfig({ currentAge: 35 });
  config2.baseParameters.people![0].currentAge = 35;
  storage.saveConfiguration(config2);
  
  // Simulate reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const loaded = storage.loadConfiguration();
  assertEquals(loaded!.baseParameters.currentAge, 35, "Should have updated age");
});

// Test Suite 3: Complex Data Structures
console.log("\n--- Test Suite 3: Complex Data Structures ---");

test("Save and load household with multiple people", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.baseParameters.householdMode = "couple";
  config.baseParameters.people = [
    {
      id: "person-1",
      name: "Person 1",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [],
      superAccounts: [],
    },
    {
      id: "person-2",
      name: "Person 2",
      currentAge: 28,
      retirementAge: 67,
      incomeSources: [],
      superAccounts: [],
    },
  ];
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  assertEquals(loaded!.baseParameters.householdMode, "couple");
  assertEquals(loaded!.baseParameters.people?.length, 2);
  assertEquals(loaded!.baseParameters.people?.[1]?.name, "Person 2");
});

test("Save and load multiple loans", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.baseParameters.loans = [
    {
      id: "loan-1",
      label: "Home Loan",
      principal: 400000,
      interestRate: 6.0,
      paymentAmount: 3000,
      paymentFrequency: "monthly",
      hasOffset: true,
      offsetBalance: 5000,
    },
    {
      id: "loan-2",
      label: "Car Loan",
      principal: 30000,
      interestRate: 8.0,
      paymentAmount: 500,
      paymentFrequency: "monthly",
      hasOffset: false,
      offsetBalance: 0,
    },
  ];
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  assertEquals(loaded!.baseParameters.loans?.length, 2);
  assertEquals(loaded!.baseParameters.loans?.[1]?.label, "Car Loan");
});

test("Save and load multiple expense items", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.baseParameters.expenseItems = [
    {
      id: "expense-1",
      label: "Groceries",
      amount: 500,
      frequency: "monthly",
      category: "living",
    },
    {
      id: "expense-2",
      label: "Utilities",
      amount: 200,
      frequency: "monthly",
      category: "living",
    },
    {
      id: "expense-3",
      label: "Insurance",
      amount: 1200,
      frequency: "yearly",
      category: "insurance",
    },
  ];
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  assertEquals(loaded!.baseParameters.expenseItems?.length, 3);
  assertEquals(loaded!.baseParameters.expenseItems?.[2]?.frequency, "yearly");
});

// Test Suite 4: Transitions
console.log("\n--- Test Suite 4: Transitions ---");

test("Save and load configuration with transitions", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.transitions = [
    {
      id: "transition-1",
      transitionDate: new Date("2025-01-01"),
      label: "Salary Increase",
      parameterChanges: {
        annualSalary: 90000,
      },
    },
    {
      id: "transition-2",
      transitionDate: new Date("2026-01-01"),
      label: "Buy House",
      parameterChanges: {
        loanPrincipal: 500000,
        loanInterestRate: 5.5,
      },
    },
  ];
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  assertEquals(loaded!.transitions.length, 2);
  assertEquals(loaded!.transitions[0].label, "Salary Increase");
  assertTrue(loaded!.transitions[0].transitionDate instanceof Date);
});

test("Transitions persist after reload", () => {
  let mockStorage = new MockStorage();
  let storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.transitions = [
    {
      id: "transition-1",
      transitionDate: new Date("2025-06-15"),
      label: "Career Change",
      parameterChanges: {
        annualSalary: 100000,
      },
    },
  ];
  
  storage.saveConfiguration(config);
  
  // Simulate reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const loaded = storage.loadConfiguration();
  assertNotNull(loaded);
  assertEquals(loaded!.transitions.length, 1);
  assertEquals(loaded!.transitions[0].parameterChanges.annualSalary, 100000);
});

// Test Suite 5: Date Handling
console.log("\n--- Test Suite 5: Date Handling ---");

test("Start date serializes and deserializes correctly", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const testDate = new Date("2024-06-15T10:30:00.000Z");
  const config = createTestConfig({ startDate: testDate });
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  assertTrue(loaded!.baseParameters.startDate instanceof Date);
  assertEquals(
    loaded!.baseParameters.startDate.toISOString(),
    testDate.toISOString()
  );
});

test("Transition dates serialize correctly", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const transitionDate = new Date("2025-12-25T00:00:00.000Z");
  const config = createTestConfig();
  config.transitions = [{
    id: "transition-1",
    transitionDate: transitionDate,
    label: "Test Transition",
    parameterChanges: {},
  }];
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  assertTrue(loaded!.transitions[0].transitionDate instanceof Date);
  assertEquals(
    loaded!.transitions[0].transitionDate.toISOString(),
    transitionDate.toISOString()
  );
});

// Test Suite 6: Error Handling
console.log("\n--- Test Suite 6: Error Handling ---");

test("Handle corrupted JSON data", () => {
  const mockStorage = new MockStorage();
  mockStorage.setItem("finance-simulation-config", "{ invalid json }");
  
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  const loaded = storage.loadConfiguration();
  
  assertEquals(loaded, null, "Should return null for corrupted data");
});

test("Handle invalid data structure", () => {
  const mockStorage = new MockStorage();
  mockStorage.setItem("finance-simulation-config", JSON.stringify({
    version: "2.0",
    baseParameters: { invalid: "structure" },
    transitions: [],
  }));
  
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  const loaded = storage.loadConfiguration();
  
  assertEquals(loaded, null, "Should return null for invalid structure");
});

// Test Suite 7: Legacy Migration
console.log("\n--- Test Suite 7: Legacy Migration ---");

test("Migrate from legacy parameters format", () => {
  const mockStorage = new MockStorage();
  
  // Save in legacy format
  const legacyParams = {
    annualSalary: 75000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2500,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: true,
    currentOffsetBalance: 10000,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 20000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 60000,
    desiredAnnualRetirementIncome: 50000,
    retirementAge: 67,
    currentAge: 32,
    simulationYears: 35,
    startDate: new Date("2024-01-01").toISOString(),
  };
  
  mockStorage.setItem("finance-simulation-parameters", JSON.stringify(legacyParams));
  
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded, "Should migrate legacy format");
  assertEquals(loaded!.baseParameters.annualSalary, 75000);
  assertEquals(loaded!.transitions.length, 0);
});

// Test Suite 8: Age Synchronization
console.log("\n--- Test Suite 8: Age Synchronization ---");

test("Age syncs from people array to legacy field on save", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.baseParameters.people![0].currentAge = 42;
  config.baseParameters.people![0].retirementAge = 70;
  
  storage.saveConfiguration(config);
  
  // Check raw storage
  const rawData = mockStorage.getRawData()["finance-simulation-config"];
  const parsed = JSON.parse(rawData);
  
  assertEquals(parsed.baseParameters.currentAge, 42, "Legacy age should sync on save");
  assertEquals(parsed.baseParameters.retirementAge, 70, "Legacy retirement age should sync");
});

test("Age syncs from legacy field to people array on load", () => {
  const mockStorage = new MockStorage();
  const storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.baseParameters.currentAge = 45;
  config.baseParameters.retirementAge = 68;
  config.baseParameters.people![0].currentAge = 30; // Different value
  
  storage.saveConfiguration(config);
  const loaded = storage.loadConfiguration();
  
  assertNotNull(loaded);
  // After save, ages should be synced from people array
  assertEquals(loaded!.baseParameters.currentAge, 30);
  assertEquals(loaded!.baseParameters.people?.[0]?.currentAge, 30);
});

// Test Suite 9: Real-World Scenarios
console.log("\n--- Test Suite 9: Real-World Scenarios ---");

test("Complete user workflow: create, update, reload", () => {
  let mockStorage = new MockStorage();
  let storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  // Step 1: User creates initial config
  const config1 = createTestConfig({ currentAge: 25 });
  storage.saveConfiguration(config1);
  
  // Step 2: User updates age
  const loaded1 = storage.loadConfiguration();
  assertNotNull(loaded1);
  loaded1!.baseParameters.currentAge = 26;
  loaded1!.baseParameters.people![0].currentAge = 26;
  storage.saveConfiguration(loaded1!);
  
  // Step 3: Page reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  // Step 4: Verify data persisted
  const loaded2 = storage.loadConfiguration();
  assertNotNull(loaded2);
  assertEquals(loaded2!.baseParameters.currentAge, 26);
  assertEquals(loaded2!.baseParameters.people?.[0]?.currentAge, 26);
  
  // Step 5: Add transition
  loaded2!.transitions.push({
    id: "transition-1",
    transitionDate: new Date("2025-01-01"),
    label: "New Job",
    parameterChanges: { annualSalary: 95000 },
  });
  storage.saveConfiguration(loaded2!);
  
  // Step 6: Another reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  // Step 7: Verify everything persisted
  const loaded3 = storage.loadConfiguration();
  assertNotNull(loaded3);
  assertEquals(loaded3!.baseParameters.currentAge, 26);
  assertEquals(loaded3!.transitions.length, 1);
  assertEquals(loaded3!.transitions[0].label, "New Job");
});

test("User adds expenses and they persist", () => {
  let mockStorage = new MockStorage();
  let storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const config = createTestConfig();
  config.baseParameters.expenseItems = [];
  storage.saveConfiguration(config);
  
  // Add expense
  const loaded = storage.loadConfiguration();
  assertNotNull(loaded);
  loaded!.baseParameters.expenseItems!.push({
    id: "expense-new",
    label: "Netflix",
    amount: 15,
    frequency: "monthly",
    category: "entertainment",
  });
  storage.saveConfiguration(loaded!);
  
  // Reload
  mockStorage = mockStorage.simulateReload();
  storage = new LocalStorageService(mockStorage as unknown as Storage);
  
  const reloaded = storage.loadConfiguration();
  assertNotNull(reloaded);
  assertEquals(reloaded!.baseParameters.expenseItems?.length, 1);
  assertEquals(reloaded!.baseParameters.expenseItems?.[0]?.label, "Netflix");
});

// Summary
console.log("\n=== TEST SUMMARY ===");
console.log(`Total Tests: ${testCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log("\n🎉 All tests passed!");
} else {
  console.log(`\n⚠️  ${failCount} test(s) failed`);
}
