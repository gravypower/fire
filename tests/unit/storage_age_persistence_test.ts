/**
 * Unit tests for age persistence in local storage
 * Tests the specific issue where age changes don't persist after reload
 */

import { assertEquals, assertExists } from "$std/assert/mod.ts";
import { LocalStorageService } from "../../lib/storage.ts";
import type { UserParameters, SimulationConfiguration } from "../../types/financial.ts";

// Mock localStorage for testing in Deno environment
class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  reset(): void {
    this.store.clear();
  }
}

// Helper function to create test configuration with people
function createTestConfigWithPeople(currentAge: number, retirementAge: number): SimulationConfiguration {
  return {
    baseParameters: {
      annualSalary: 80000,
      salaryFrequency: "monthly",
      incomeTaxRate: 30,
      monthlyLivingExpenses: 2000,
      monthlyRentOrMortgage: 1500,
      loanPrincipal: 0,
      loanInterestRate: 5.5,
      loanPaymentAmount: 0,
      loanPaymentFrequency: "monthly",
      useOffsetAccount: false,
      currentOffsetBalance: 0,
      monthlyInvestmentContribution: 500,
      investmentReturnRate: 7,
      currentInvestmentBalance: 10000,
      superContributionRate: 11,
      superReturnRate: 6,
      currentSuperBalance: 50000,
      desiredAnnualRetirementIncome: 60000,
      retirementAge: retirementAge,
      currentAge: currentAge,
      simulationYears: 35,
      startDate: new Date("2024-01-01T00:00:00.000Z"),
      householdMode: "single",
      people: [
        {
          id: "person-1",
          name: "Test Person",
          currentAge: currentAge,
          retirementAge: retirementAge,
          incomeSources: [],
          superAccounts: [],
        },
      ],
      loans: [],
    } as UserParameters,
    transitions: [],
  };
}

Deno.test("Age Persistence - currentAge 44 persists after save and load", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  // Create config with age 44
  const config = createTestConfigWithPeople(44, 65);
  
  // Save configuration
  service.saveConfiguration(config);
  
  // Load configuration
  const loaded = service.loadConfiguration();
  
  assertExists(loaded);
  assertEquals(loaded.baseParameters.currentAge, 44, "Legacy currentAge should be 44");
  assertEquals(loaded.baseParameters.people?.[0]?.currentAge, 44, "Person currentAge should be 44");
});

Deno.test("Age Persistence - changing from 30 to 44 persists", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  // Start with age 30
  const initialConfig = createTestConfigWithPeople(30, 65);
  service.saveConfiguration(initialConfig);
  
  // Update to age 44
  const updatedConfig = createTestConfigWithPeople(44, 65);
  service.saveConfiguration(updatedConfig);
  
  // Load and verify
  const loaded = service.loadConfiguration();
  
  assertExists(loaded);
  assertEquals(loaded.baseParameters.currentAge, 44, "Legacy currentAge should be updated to 44");
  assertEquals(loaded.baseParameters.people?.[0]?.currentAge, 44, "Person currentAge should be updated to 44");
});

Deno.test("Age Persistence - retirementAge persists correctly", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  // Create config with retirement age 70
  const config = createTestConfigWithPeople(44, 70);
  
  // Save configuration
  service.saveConfiguration(config);
  
  // Load configuration
  const loaded = service.loadConfiguration();
  
  assertExists(loaded);
  assertEquals(loaded.baseParameters.retirementAge, 70, "Legacy retirementAge should be 70");
  assertEquals(loaded.baseParameters.people?.[0]?.retirementAge, 70, "Person retirementAge should be 70");
});

Deno.test("Age Persistence - both ages sync correctly in couple mode", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  const config: SimulationConfiguration = {
    baseParameters: {
      annualSalary: 80000,
      salaryFrequency: "monthly",
      incomeTaxRate: 30,
      monthlyLivingExpenses: 2000,
      monthlyRentOrMortgage: 1500,
      loanPrincipal: 0,
      loanInterestRate: 5.5,
      loanPaymentAmount: 0,
      loanPaymentFrequency: "monthly",
      useOffsetAccount: false,
      currentOffsetBalance: 0,
      monthlyInvestmentContribution: 500,
      investmentReturnRate: 7,
      currentInvestmentBalance: 10000,
      superContributionRate: 11,
      superReturnRate: 6,
      currentSuperBalance: 50000,
      desiredAnnualRetirementIncome: 60000,
      retirementAge: 65, // Will be synced from first person
      currentAge: 30, // Will be synced from first person
      simulationYears: 35,
      startDate: new Date("2024-01-01T00:00:00.000Z"),
      householdMode: "couple",
      people: [
        {
          id: "person-1",
          name: "Person 1",
          currentAge: 44,
          retirementAge: 70,
          incomeSources: [],
          superAccounts: [],
        },
        {
          id: "person-2",
          name: "Person 2",
          currentAge: 42,
          retirementAge: 67,
          incomeSources: [],
          superAccounts: [],
        },
      ],
      loans: [],
    } as UserParameters,
    transitions: [],
  };
  
  // Save configuration
  service.saveConfiguration(config);
  
  // Load configuration
  const loaded = service.loadConfiguration();
  
  assertExists(loaded);
  // Legacy fields should sync with first person
  assertEquals(loaded.baseParameters.currentAge, 44, "Legacy currentAge should sync with first person");
  assertEquals(loaded.baseParameters.retirementAge, 70, "Legacy retirementAge should sync with first person");
  // Both people should maintain their own ages
  assertEquals(loaded.baseParameters.people?.[0]?.currentAge, 44);
  assertEquals(loaded.baseParameters.people?.[0]?.retirementAge, 70);
  assertEquals(loaded.baseParameters.people?.[1]?.currentAge, 42);
  assertEquals(loaded.baseParameters.people?.[1]?.retirementAge, 67);
});

Deno.test("Age Persistence - legacy fields sync when people array exists", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  // Create config where legacy fields don't match people array
  const config: SimulationConfiguration = {
    baseParameters: {
      annualSalary: 80000,
      salaryFrequency: "monthly",
      incomeTaxRate: 30,
      monthlyLivingExpenses: 2000,
      monthlyRentOrMortgage: 1500,
      loanPrincipal: 0,
      loanInterestRate: 5.5,
      loanPaymentAmount: 0,
      loanPaymentFrequency: "monthly",
      useOffsetAccount: false,
      currentOffsetBalance: 0,
      monthlyInvestmentContribution: 500,
      investmentReturnRate: 7,
      currentInvestmentBalance: 10000,
      superContributionRate: 11,
      superReturnRate: 6,
      currentSuperBalance: 50000,
      desiredAnnualRetirementIncome: 60000,
      retirementAge: 65, // Old value
      currentAge: 30, // Old value
      simulationYears: 35,
      startDate: new Date("2024-01-01T00:00:00.000Z"),
      householdMode: "single",
      people: [
        {
          id: "person-1",
          name: "Test Person",
          currentAge: 44, // New value
          retirementAge: 70, // New value
          incomeSources: [],
          superAccounts: [],
        },
      ],
      loans: [],
    } as UserParameters,
    transitions: [],
  };
  
  // Save configuration (should sync before saving)
  service.saveConfiguration(config);
  
  // Load configuration (should sync after loading)
  const loaded = service.loadConfiguration();
  
  assertExists(loaded);
  // Legacy fields should be synced with people array
  assertEquals(loaded.baseParameters.currentAge, 44, "Legacy currentAge should sync with person");
  assertEquals(loaded.baseParameters.retirementAge, 70, "Legacy retirementAge should sync with person");
  assertEquals(loaded.baseParameters.people?.[0]?.currentAge, 44);
  assertEquals(loaded.baseParameters.people?.[0]?.retirementAge, 70);
});

Deno.test("Age Persistence - multiple save/load cycles maintain age", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  // First save with age 44
  const config1 = createTestConfigWithPeople(44, 65);
  service.saveConfiguration(config1);
  
  // Load
  const loaded1 = service.loadConfiguration();
  assertExists(loaded1);
  assertEquals(loaded1.baseParameters.currentAge, 44);
  
  // Save again (simulating app state update)
  service.saveConfiguration(loaded1);
  
  // Load again
  const loaded2 = service.loadConfiguration();
  assertExists(loaded2);
  assertEquals(loaded2.baseParameters.currentAge, 44, "Age should still be 44 after multiple cycles");
  assertEquals(loaded2.baseParameters.people?.[0]?.currentAge, 44);
});

Deno.test("Age Persistence - raw storage data contains correct age", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  
  const config = createTestConfigWithPeople(44, 65);
  service.saveConfiguration(config);
  
  // Check raw storage data
  const rawData = testStorage.getItem("finance-simulation-config");
  assertExists(rawData);
  
  const parsed = JSON.parse(rawData);
  assertEquals(parsed.baseParameters.currentAge, 44, "Raw storage should have currentAge 44");
  assertEquals(parsed.baseParameters.people[0].currentAge, 44, "Raw storage person should have currentAge 44");
});

