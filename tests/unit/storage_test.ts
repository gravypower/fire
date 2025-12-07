/**
 * Unit tests for local storage persistence layer
 * Tests: Requirements 9.1, 9.2, 9.3, 9.4
 */

import { assertEquals, assertExists } from "$std/assert/mod.ts";
import { LocalStorageService } from "../../lib/storage.ts";
import type { UserParameters } from "../../types/financial.ts";

// Mock localStorage for testing in Deno environment
class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();
  private quotaExceeded = false;
  private unavailable = false;

  get length(): number {
    return this.store.size;
  }

  setItem(key: string, value: string): void {
    if (this.unavailable) {
      throw new Error("Storage unavailable");
    }
    if (this.quotaExceeded) {
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    if (this.unavailable) {
      throw new Error("Storage unavailable");
    }
    return this.store.get(key) ?? null;
  }

  removeItem(key: string): void {
    if (this.unavailable) {
      throw new Error("Storage unavailable");
    }
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  // Test helpers
  setQuotaExceeded(value: boolean): void {
    this.quotaExceeded = value;
  }

  setUnavailable(value: boolean): void {
    this.unavailable = value;
  }

  reset(): void {
    this.store.clear();
    this.quotaExceeded = false;
    this.unavailable = false;
  }
}

// Helper function to create valid test parameters
function createTestParameters(): UserParameters {
  return {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: true,
    currentOffsetBalance: 5000,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 6,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01T00:00:00.000Z"),
  };
}

Deno.test("LocalStorageService - saveParameters stores data", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  service.saveParameters(params);

  const stored = testStorage.getItem("finance-simulation-parameters");
  assertExists(stored);
  assertEquals(typeof stored, "string");
});

Deno.test("LocalStorageService - loadParameters retrieves saved data", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  service.saveParameters(params);
  const loaded = service.loadParameters();

  assertExists(loaded);
  assertEquals(loaded.annualSalary, params.annualSalary);
  assertEquals(loaded.salaryFrequency, params.salaryFrequency);
  assertEquals(loaded.monthlyLivingExpenses, params.monthlyLivingExpenses);
  assertEquals(loaded.currentAge, params.currentAge);
  assertEquals(loaded.retirementAge, params.retirementAge);
  assertEquals(loaded.startDate.toISOString(), params.startDate.toISOString());
});

Deno.test("LocalStorageService - loadParameters returns null when no data", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - clearParameters removes data", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  service.saveParameters(params);
  service.clearParameters();
  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - handles corrupted JSON data", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);

  // Manually insert corrupted data
  testStorage.setItem("finance-simulation-parameters", "{ invalid json }");

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - handles data with missing fields", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);

  // Insert data with missing required fields
  const incomplete = {
    annualSalary: 80000,
    // Missing many required fields
  };
  testStorage.setItem(
    "finance-simulation-parameters",
    JSON.stringify(incomplete),
  );

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - handles data with invalid types", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);

  // Insert data with wrong types
  const invalidTypes = {
    annualSalary: "not a number",
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 6,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: "2024-01-01",
  };
  testStorage.setItem(
    "finance-simulation-parameters",
    JSON.stringify(invalidTypes),
  );

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - handles invalid date string", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);

  const params = createTestParameters();
  const serialized = JSON.parse(JSON.stringify({
    ...params,
    startDate: params.startDate.toISOString(),
  }));
  serialized.startDate = "not a valid date";

  testStorage.setItem(
    "finance-simulation-parameters",
    JSON.stringify(serialized),
  );

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - handles invalid frequency values", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);

  const params = createTestParameters();
  const serialized = JSON.parse(JSON.stringify({
    ...params,
    startDate: params.startDate.toISOString(),
  }));
  serialized.salaryFrequency = "invalid";

  testStorage.setItem(
    "finance-simulation-parameters",
    JSON.stringify(serialized),
  );

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - Date serialization round-trip preserves value", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  const originalDate = params.startDate.toISOString();

  service.saveParameters(params);
  const loaded = service.loadParameters();

  assertExists(loaded);
  assertEquals(loaded.startDate.toISOString(), originalDate);
  assertEquals(loaded.startDate instanceof Date, true);
});

Deno.test("LocalStorageService - saveParameters throws on quota exceeded", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  // Set quota exceeded after the service is created and storage availability is checked
  // This simulates quota being exceeded during the actual save operation
  const originalSetItem = testStorage.setItem.bind(testStorage);
  let callCount = 0;
  testStorage.setItem = (key: string, value: string) => {
    callCount++;
    // Allow the storage availability check to pass (first call for __storage_test__)
    // but fail on the actual save (second call for finance-simulation-parameters)
    if (callCount > 1) {
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    }
    originalSetItem(key, value);
  };

  let errorThrown = false;
  try {
    service.saveParameters(params);
  } catch (error) {
    errorThrown = true;
    assertEquals(
      (error as Error).message.includes("quota"),
      true,
    );
  }

  assertEquals(errorThrown, true);
});

Deno.test("LocalStorageService - saveParameters throws when storage unavailable", () => {
  const testStorage = new MockLocalStorage();
  testStorage.setUnavailable(true);
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  let errorThrown = false;
  try {
    service.saveParameters(params);
  } catch (error) {
    errorThrown = true;
    assertEquals(
      (error as Error).message.includes("not available"),
      true,
    );
  }

  assertEquals(errorThrown, true);
});

Deno.test("LocalStorageService - loadParameters returns null when storage unavailable", () => {
  const testStorage = new MockLocalStorage();
  testStorage.setUnavailable(true);
  const service = new LocalStorageService(testStorage);

  const loaded = service.loadParameters();

  assertEquals(loaded, null);
});

Deno.test("LocalStorageService - clearParameters handles unavailable storage gracefully", () => {
  const testStorage = new MockLocalStorage();
  testStorage.setUnavailable(true);
  const service = new LocalStorageService(testStorage);

  // Should not throw
  service.clearParameters();

  // Test passes if no error is thrown
  assertEquals(true, true);
});

Deno.test("LocalStorageService - preserves all numeric fields", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  service.saveParameters(params);
  const loaded = service.loadParameters();

  assertExists(loaded);
  assertEquals(loaded.annualSalary, params.annualSalary);
  assertEquals(loaded.monthlyLivingExpenses, params.monthlyLivingExpenses);
  assertEquals(loaded.monthlyRentOrMortgage, params.monthlyRentOrMortgage);
  assertEquals(loaded.loanPrincipal, params.loanPrincipal);
  assertEquals(loaded.loanInterestRate, params.loanInterestRate);
  assertEquals(loaded.loanPaymentAmount, params.loanPaymentAmount);
  assertEquals(
    loaded.monthlyInvestmentContribution,
    params.monthlyInvestmentContribution,
  );
  assertEquals(loaded.investmentReturnRate, params.investmentReturnRate);
  assertEquals(
    loaded.currentInvestmentBalance,
    params.currentInvestmentBalance,
  );
  assertEquals(loaded.superContributionRate, params.superContributionRate);
  assertEquals(loaded.superReturnRate, params.superReturnRate);
  assertEquals(loaded.currentSuperBalance, params.currentSuperBalance);
  assertEquals(
    loaded.desiredAnnualRetirementIncome,
    params.desiredAnnualRetirementIncome,
  );
  assertEquals(loaded.retirementAge, params.retirementAge);
  assertEquals(loaded.currentAge, params.currentAge);
  assertEquals(loaded.simulationYears, params.simulationYears);
});

Deno.test("LocalStorageService - preserves frequency fields", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  service.saveParameters(params);
  const loaded = service.loadParameters();

  assertExists(loaded);
  assertEquals(loaded.salaryFrequency, params.salaryFrequency);
  assertEquals(loaded.loanPaymentFrequency, params.loanPaymentFrequency);
});

// Tests for SimulationConfiguration storage (Requirements 6.1, 6.2, 6.4, 6.5)

Deno.test("LocalStorageService - saveConfiguration stores configuration with transitions", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  const config = {
    baseParameters: params,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01T00:00:00.000Z"),
        label: "Semi-retirement",
        parameterChanges: {
          annualSalary: 40000,
          monthlyLivingExpenses: 1600,
        },
      },
    ],
  };

  service.saveConfiguration(config);

  const stored = testStorage.getItem("finance-simulation-config");
  assertExists(stored);
  assertEquals(typeof stored, "string");
});

Deno.test("LocalStorageService - loadConfiguration retrieves saved configuration", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  const config = {
    baseParameters: params,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01T00:00:00.000Z"),
        label: "Semi-retirement",
        parameterChanges: {
          annualSalary: 40000,
          monthlyLivingExpenses: 1600,
        },
      },
    ],
  };

  service.saveConfiguration(config);
  const loaded = service.loadConfiguration();

  assertExists(loaded);
  assertEquals(loaded.baseParameters.annualSalary, params.annualSalary);
  assertEquals(loaded.transitions.length, 1);
  assertEquals(loaded.transitions[0].id, "transition-1");
  assertEquals(loaded.transitions[0].label, "Semi-retirement");
  assertEquals(loaded.transitions[0].transitionDate.toISOString(), "2025-01-01T00:00:00.000Z");
  assertEquals(loaded.transitions[0].parameterChanges.annualSalary, 40000);
  assertEquals(loaded.transitions[0].parameterChanges.monthlyLivingExpenses, 1600);
});

Deno.test("LocalStorageService - loadConfiguration migrates from legacy format", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();

  // Save in legacy format
  service.saveParameters(params);

  // Load as configuration (should migrate)
  const loaded = service.loadConfiguration();

  assertExists(loaded);
  assertEquals(loaded.baseParameters.annualSalary, params.annualSalary);
  assertEquals(loaded.transitions.length, 0);
  
  // Verify new format is now saved
  const stored = testStorage.getItem("finance-simulation-config");
  assertExists(stored);
});

Deno.test("LocalStorageService - clearConfiguration removes all data", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  const config = {
    baseParameters: params,
    transitions: [],
  };

  service.saveConfiguration(config);
  service.clearConfiguration();
  
  const configStored = testStorage.getItem("finance-simulation-config");
  const paramsStored = testStorage.getItem("finance-simulation-parameters");
  
  assertEquals(configStored, null);
  assertEquals(paramsStored, null);
});

Deno.test("LocalStorageService - loadConfiguration handles empty transitions array", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  const config = {
    baseParameters: params,
    transitions: [],
  };

  service.saveConfiguration(config);
  const loaded = service.loadConfiguration();

  assertExists(loaded);
  assertEquals(loaded.transitions.length, 0);
});

Deno.test("LocalStorageService - loadConfiguration handles multiple transitions", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  const config = {
    baseParameters: params,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01T00:00:00.000Z"),
        label: "Semi-retirement",
        parameterChanges: {
          annualSalary: 40000,
        },
      },
      {
        id: "transition-2",
        transitionDate: new Date("2030-01-01T00:00:00.000Z"),
        label: "Full retirement",
        parameterChanges: {
          annualSalary: 0,
          monthlyInvestmentContribution: 0,
        },
      },
    ],
  };

  service.saveConfiguration(config);
  const loaded = service.loadConfiguration();

  assertExists(loaded);
  assertEquals(loaded.transitions.length, 2);
  assertEquals(loaded.transitions[0].id, "transition-1");
  assertEquals(loaded.transitions[1].id, "transition-2");
});

Deno.test("LocalStorageService - configuration round-trip preserves dates", () => {
  const testStorage = new MockLocalStorage();
  const service = new LocalStorageService(testStorage);
  const params = createTestParameters();
  
  const transitionDate = new Date("2025-06-15T12:30:00.000Z");
  const config = {
    baseParameters: params,
    transitions: [
      {
        id: "transition-1",
        transitionDate: transitionDate,
        parameterChanges: {
          annualSalary: 50000,
        },
      },
    ],
  };

  service.saveConfiguration(config);
  const loaded = service.loadConfiguration();

  assertExists(loaded);
  assertEquals(loaded.transitions[0].transitionDate.toISOString(), transitionDate.toISOString());
  assertEquals(loaded.transitions[0].transitionDate instanceof Date, true);
});
