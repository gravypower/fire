/**
 * Local storage persistence layer for user parameters and simulation configurations
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 6.1, 6.2, 6.4, 6.5
 */

import type { UserParameters, SimulationConfiguration, ParameterTransition } from "../types/financial.ts";

/**
 * Storage service interface for persisting user parameters
 */
export interface StorageService {
  /**
   * Saves user parameters to local storage
   * @param params - The parameters to save
   * @throws Error if storage is unavailable or quota exceeded
   */
  saveParameters(params: UserParameters): void;

  /**
   * Loads user parameters from local storage
   * @returns The saved parameters, or null if not found or corrupted
   */
  loadParameters(): UserParameters | null;

  /**
   * Clears all stored parameters from local storage
   */
  clearParameters(): void;

  /**
   * Saves complete simulation configuration including transitions
   * @param config - The configuration to save
   * @throws Error if storage is unavailable or quota exceeded
   */
  saveConfiguration(config: SimulationConfiguration): void;

  /**
   * Loads simulation configuration with transitions
   * @returns The saved configuration, or null if not found or corrupted
   */
  loadConfiguration(): SimulationConfiguration | null;

  /**
   * Clears all stored configuration from local storage
   */
  clearConfiguration(): void;
}

/**
 * Key used for storing parameters in local storage (legacy)
 */
const STORAGE_KEY = "finance-simulation-parameters";

/**
 * Key used for storing configuration with transitions
 */
const CONFIG_STORAGE_KEY = "finance-simulation-config";

/**
 * Serializable version of UserParameters (Date converted to string)
 * Note: This interface is intentionally flexible to support both legacy and new fields
 */
interface SerializableUserParameters {
  // Legacy fields (for backward compatibility)
  annualSalary: number;
  salaryFrequency: "weekly" | "fortnightly" | "monthly" | "yearly";
  incomeTaxRate: number;
  monthlyLivingExpenses: number;
  monthlyRentOrMortgage: number;
  loanPrincipal: number;
  loanInterestRate: number;
  loanPaymentAmount: number;
  loanPaymentFrequency: "weekly" | "fortnightly" | "monthly" | "yearly";
  useOffsetAccount: boolean;
  currentOffsetBalance: number;
  monthlyInvestmentContribution: number;
  investmentReturnRate: number;
  currentInvestmentBalance: number;
  superContributionRate: number;
  superReturnRate: number;
  currentSuperBalance: number;
  desiredAnnualRetirementIncome: number;
  retirementAge: number;
  currentAge: number;
  simulationYears: number;
  startDate: string; // ISO date string
  
  // New fields (optional for backward compatibility)
  householdMode?: "single" | "couple";
  people?: any[]; // Simplified - will be serialized as-is
  incomeSources?: any[];
  taxBrackets?: any[];
  expenseItems?: any[];
  loans?: any[];
  superAccounts?: any[];
}

/**
 * Serializable version of ParameterTransition (Dates converted to strings)
 */
interface SerializableParameterTransition {
  id: string;
  transitionDate: string; // ISO date string
  label?: string;
  parameterChanges: Partial<SerializableUserParameters>;
}

/**
 * Serializable version of SimulationConfiguration
 */
interface SerializableSimulationConfiguration {
  version: string; // "2.0" for transition support
  baseParameters: SerializableUserParameters;
  transitions: SerializableParameterTransition[];
  savedAt: string; // ISO timestamp
}

/**
 * Converts UserParameters to a serializable format
 * @param params - The parameters to serialize
 * @returns Serializable version with Date converted to string
 */
function toSerializable(
  params: UserParameters,
): SerializableUserParameters {
  return {
    ...params,
    startDate: params.startDate.toISOString(),
  };
}

/**
 * Converts dates in nested objects (like expense items, income sources, etc.)
 * @param obj - Object that may contain date strings
 * @returns Object with date strings converted to Date objects
 */
function convertNestedDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertNestedDates);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Convert known date fields
      if ((key === 'startDate' || key === 'endDate' || key === 'oneOffDate') && 
          typeof value === 'string') {
        converted[key] = new Date(value);
      } else if (typeof value === 'object') {
        converted[key] = convertNestedDates(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  
  return obj;
}

/**
 * Converts serializable format back to UserParameters
 * @param serializable - The serializable parameters
 * @returns UserParameters with Date object restored
 */
function fromSerializable(
  serializable: SerializableUserParameters,
): UserParameters {
  const result = {
    ...serializable,
    startDate: new Date(serializable.startDate),
  };
  
  // Convert nested dates in arrays
  if (result.expenseItems) {
    result.expenseItems = convertNestedDates(result.expenseItems);
  }
  
  if (result.incomeSources) {
    result.incomeSources = convertNestedDates(result.incomeSources);
  }
  
  if (result.people) {
    result.people = convertNestedDates(result.people);
  }
  
  return result as UserParameters;
}

/**
 * Converts partial UserParameters to serializable format
 * @param params - The partial parameters to serialize
 * @returns Serializable version with Dates converted to strings
 */
function toSerializablePartial(
  params: Partial<UserParameters>,
): Partial<SerializableUserParameters> {
  const result: Record<string, unknown> = { ...params };
  if (params.startDate) {
    result.startDate = params.startDate.toISOString();
  }
  return result as Partial<SerializableUserParameters>;
}

/**
 * Converts partial serializable parameters back to UserParameters
 * @param serializable - The partial serializable parameters
 * @returns Partial UserParameters with Date objects restored
 */
function fromSerializablePartial(
  serializable: Partial<SerializableUserParameters>,
): Partial<UserParameters> {
  const result: Record<string, unknown> = { ...serializable };
  if (serializable.startDate) {
    result.startDate = new Date(serializable.startDate);
  }
  return result as Partial<UserParameters>;
}

/**
 * Converts ParameterTransition to serializable format
 * @param transition - The transition to serialize
 * @returns Serializable version with Dates converted to strings
 */
function transitionToSerializable(
  transition: ParameterTransition,
): SerializableParameterTransition {
  return {
    id: transition.id,
    transitionDate: transition.transitionDate.toISOString(),
    label: transition.label,
    parameterChanges: toSerializablePartial(transition.parameterChanges),
  };
}

/**
 * Converts serializable transition back to ParameterTransition
 * @param serializable - The serializable transition
 * @returns ParameterTransition with Date objects restored
 */
function transitionFromSerializable(
  serializable: SerializableParameterTransition,
): ParameterTransition {
  return {
    id: serializable.id,
    transitionDate: new Date(serializable.transitionDate),
    label: serializable.label,
    parameterChanges: fromSerializablePartial(serializable.parameterChanges),
  };
}

/**
 * Converts SimulationConfiguration to serializable format
 * @param config - The configuration to serialize
 * @returns Serializable version with Dates converted to strings
 */
function configToSerializable(
  config: SimulationConfiguration,
): SerializableSimulationConfiguration {
  return {
    version: "2.0",
    baseParameters: toSerializable(config.baseParameters),
    transitions: config.transitions.map(transitionToSerializable),
    savedAt: new Date().toISOString(),
  };
}

/**
 * Converts serializable configuration back to SimulationConfiguration
 * @param serializable - The serializable configuration
 * @returns SimulationConfiguration with Date objects restored
 */
function configFromSerializable(
  serializable: SerializableSimulationConfiguration,
): SimulationConfiguration {
  return {
    baseParameters: fromSerializable(serializable.baseParameters),
    transitions: serializable.transitions.map(transitionFromSerializable),
  };
}

/**
 * Validates that the loaded data has all required fields
 * @param data - The data to validate
 * @returns true if data is valid UserParameters structure
 */
function isValidParametersStructure(data: unknown): data is SerializableUserParameters {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const params = data as Record<string, unknown>;

  // Check core required fields exist and have correct types
  // Made more lenient to support new optional fields
  const requiredFields = [
    "annualSalary",
    "incomeTaxRate",
    "monthlyLivingExpenses",
    "monthlyRentOrMortgage",
    "loanPrincipal",
    "loanInterestRate",
    "loanPaymentAmount",
    "monthlyInvestmentContribution",
    "investmentReturnRate",
    "currentInvestmentBalance",
    "superContributionRate",
    "superReturnRate",
    "currentSuperBalance",
    "desiredAnnualRetirementIncome",
    "retirementAge",
    "currentAge",
    "simulationYears",
    "currentOffsetBalance",
  ];

  for (const field of requiredFields) {
    if (typeof params[field] !== "number") {
      return false;
    }
  }

  // Check boolean fields
  if (typeof params.useOffsetAccount !== "boolean") {
    return false;
  }

  // Check frequency fields
  const validFrequencies = ["weekly", "fortnightly", "monthly", "yearly"];
  if (
    typeof params.salaryFrequency !== "string" ||
    !validFrequencies.includes(params.salaryFrequency)
  ) {
    return false;
  }

  if (
    typeof params.loanPaymentFrequency !== "string" ||
    !validFrequencies.includes(params.loanPaymentFrequency)
  ) {
    return false;
  }

  // Check startDate is a valid date string
  if (typeof params.startDate !== "string") {
    return false;
  }

  const date = new Date(params.startDate);
  if (isNaN(date.getTime())) {
    return false;
  }

  // New optional fields - just check they're the right type if present
  if (params.householdMode !== undefined && 
      typeof params.householdMode !== "string") {
    return false;
  }

  if (params.people !== undefined && !Array.isArray(params.people)) {
    return false;
  }

  if (params.incomeSources !== undefined && !Array.isArray(params.incomeSources)) {
    return false;
  }

  if (params.taxBrackets !== undefined && !Array.isArray(params.taxBrackets)) {
    return false;
  }

  if (params.expenseItems !== undefined && !Array.isArray(params.expenseItems)) {
    return false;
  }

  if (params.loans !== undefined && !Array.isArray(params.loans)) {
    return false;
  }

  if (params.superAccounts !== undefined && !Array.isArray(params.superAccounts)) {
    return false;
  }

  return true;
}

/**
 * Validates that the loaded data is a valid SimulationConfiguration structure
 * @param data - The data to validate
 * @returns true if data is valid SimulationConfiguration structure
 */
function isValidConfigurationStructure(data: unknown): data is SerializableSimulationConfiguration {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const config = data as Record<string, unknown>;

  // Check version
  if (typeof config.version !== "string") {
    return false;
  }

  // Check baseParameters
  if (!isValidParametersStructure(config.baseParameters)) {
    return false;
  }

  // Check transitions array
  if (!Array.isArray(config.transitions)) {
    return false;
  }

  // Validate each transition
  for (const transition of config.transitions) {
    if (typeof transition !== "object" || transition === null) {
      return false;
    }

    const t = transition as Record<string, unknown>;

    // Check required fields
    if (typeof t.id !== "string") {
      return false;
    }

    if (typeof t.transitionDate !== "string") {
      return false;
    }

    // Validate transition date
    const transitionDate = new Date(t.transitionDate);
    if (isNaN(transitionDate.getTime())) {
      return false;
    }

    // Check optional label
    if (t.label !== undefined && typeof t.label !== "string") {
      return false;
    }

    // Check parameterChanges is an object
    if (typeof t.parameterChanges !== "object" || t.parameterChanges === null) {
      return false;
    }
  }

  // Check savedAt
  if (typeof config.savedAt !== "string") {
    return false;
  }

  const savedAt = new Date(config.savedAt);
  if (isNaN(savedAt.getTime())) {
    return false;
  }

  return true;
}

/**
 * Implementation of StorageService using browser local storage
 */
export class LocalStorageService implements StorageService {
  private storage: Storage;

  constructor(storage?: Storage) {
    this.storage = storage || (globalThis as any).localStorage;
  }

  /**
   * Checks if local storage is available
   * @returns true if local storage is available
   */
  private isStorageAvailable(): boolean {
    try {
      if (typeof this.storage === "undefined") {
        return false;
      }
      const test = "__storage_test__";
      this.storage.setItem(test, test);
      this.storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Saves user parameters to local storage
   * Validates: Requirements 9.1, 9.5
   */
  saveParameters(params: UserParameters): void {
    if (!this.isStorageAvailable()) {
      throw new Error("Local storage is not available");
    }

    try {
      const serializable = toSerializable(params);
      const json = JSON.stringify(serializable);
      this.storage.setItem(STORAGE_KEY, json);
    } catch (error) {
      // Check if it's a quota exceeded error
      if (
        error instanceof Error &&
        (error.name === "QuotaExceededError" ||
          error.message.includes("quota"))
      ) {
        throw new Error("Storage quota exceeded. Please clear some data.");
      }
      throw new Error(`Failed to save parameters: ${error}`);
    }
  }

  /**
   * Loads user parameters from local storage
   * Validates: Requirements 9.2, 9.3
   */
  loadParameters(): UserParameters | null {
    if (!this.isStorageAvailable()) {
      console.warn("Local storage is not available");
      return null;
    }

    try {
      const json = this.storage.getItem(STORAGE_KEY);

      if (json === null) {
        return null;
      }

      const parsed = JSON.parse(json);

      // Validate structure before converting
      if (!isValidParametersStructure(parsed)) {
        console.error("Stored data has invalid structure, using defaults");
        return null;
      }

      return fromSerializable(parsed);
    } catch (error) {
      // Handle corrupted data
      console.error("Failed to load parameters, data may be corrupted:", error);
      return null;
    }
  }

  /**
   * Clears all stored parameters from local storage
   * Validates: Requirements 9.4
   */
  clearParameters(): void {
    if (!this.isStorageAvailable()) {
      console.warn("Local storage is not available");
      return;
    }

    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear parameters:", error);
    }
  }

  /**
   * Saves complete simulation configuration including transitions
   * Validates: Requirements 6.1, 6.4
   */
  saveConfiguration(config: SimulationConfiguration): void {
    if (!this.isStorageAvailable()) {
      throw new Error("Local storage is not available");
    }

    try {
      // Sync legacy fields with people array before saving
      const configToSave = { ...config };
      if (configToSave.baseParameters.people && configToSave.baseParameters.people.length > 0) {
        const firstPerson = configToSave.baseParameters.people[0];
        configToSave.baseParameters = {
          ...configToSave.baseParameters,
          currentAge: firstPerson.currentAge,
          retirementAge: firstPerson.retirementAge,
        };
      }
      
      const serializable = configToSerializable(configToSave);
      const json = JSON.stringify(serializable);
      this.storage.setItem(CONFIG_STORAGE_KEY, json);
    } catch (error) {
      // Check if it's a quota exceeded error
      if (
        error instanceof Error &&
        (error.name === "QuotaExceededError" ||
          error.message.includes("quota"))
      ) {
        throw new Error("Storage quota exceeded. Please clear some data.");
      }
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Loads simulation configuration with transitions
   * Validates: Requirements 6.2, 6.5
   */
  loadConfiguration(): SimulationConfiguration | null {
    if (!this.isStorageAvailable()) {
      console.warn("Local storage is not available");
      return null;
    }

    try {
      const json = this.storage.getItem(CONFIG_STORAGE_KEY);

      if (json === null) {
        // Try to migrate from legacy format
        return this.migrateFromLegacyFormat();
      }

      const parsed = JSON.parse(json);

      // Validate structure before converting
      if (!isValidConfigurationStructure(parsed)) {
        console.error("Stored configuration has invalid structure");
        // Try to migrate from legacy format as fallback
        return this.migrateFromLegacyFormat();
      }

      const config = configFromSerializable(parsed);
      
      // Sync legacy fields with people array if present
      if (config.baseParameters.people && config.baseParameters.people.length > 0) {
        const firstPerson = config.baseParameters.people[0];
        config.baseParameters.currentAge = firstPerson.currentAge;
        config.baseParameters.retirementAge = firstPerson.retirementAge;
      }
      
      // Ensure loans array exists (migrate from legacy single loan if needed)
      if (config.baseParameters.loans === undefined) {
        // Check if there's a legacy loan to migrate
        if (config.baseParameters.loanPrincipal > 0) {
          config.baseParameters.loans = [{
            id: `loan-migrated-${Date.now()}`,
            label: "Migrated Loan",
            principal: config.baseParameters.loanPrincipal,
            interestRate: config.baseParameters.loanInterestRate,
            paymentAmount: config.baseParameters.loanPaymentAmount,
            paymentFrequency: config.baseParameters.loanPaymentFrequency,
            hasOffset: config.baseParameters.useOffsetAccount,
            offsetBalance: config.baseParameters.currentOffsetBalance || 0,
          }];
          // Clear legacy fields
          config.baseParameters.loanPrincipal = 0;
          config.baseParameters.loanPaymentAmount = 0;
          config.baseParameters.useOffsetAccount = false;
          config.baseParameters.currentOffsetBalance = 0;
        } else {
          // No legacy loan, just initialize empty array
          config.baseParameters.loans = [];
        }
        // Save the migrated config
        this.saveConfiguration(config);
      }
      
      return config;
    } catch (error) {
      // Handle corrupted data
      console.error("Failed to load configuration, data may be corrupted:", error);
      // Try to migrate from legacy format as fallback
      return this.migrateFromLegacyFormat();
    }
  }

  /**
   * Clears all stored configuration from local storage
   * Validates: Requirements 6.4
   */
  clearConfiguration(): void {
    if (!this.isStorageAvailable()) {
      console.warn("Local storage is not available");
      return;
    }

    try {
      this.storage.removeItem(CONFIG_STORAGE_KEY);
      // Also clear legacy format
      this.storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear configuration:", error);
    }
  }

  /**
   * Migrates from legacy format (base parameters only) to new format
   * Validates: Requirements 6.2
   */
  private migrateFromLegacyFormat(): SimulationConfiguration | null {
    try {
      const legacyParams = this.loadParameters();
      
      if (legacyParams === null) {
        return null;
      }

      // Migrate legacy single loan to loans array if present
      if (legacyParams.loans === undefined) {
        if (legacyParams.loanPrincipal > 0) {
          legacyParams.loans = [{
            id: `loan-migrated-${Date.now()}`,
            label: "Migrated Loan",
            principal: legacyParams.loanPrincipal,
            interestRate: legacyParams.loanInterestRate,
            paymentAmount: legacyParams.loanPaymentAmount,
            paymentFrequency: legacyParams.loanPaymentFrequency,
            hasOffset: legacyParams.useOffsetAccount,
            offsetBalance: legacyParams.currentOffsetBalance || 0,
          }];
          // Clear legacy fields
          legacyParams.loanPrincipal = 0;
          legacyParams.loanPaymentAmount = 0;
          legacyParams.useOffsetAccount = false;
          legacyParams.currentOffsetBalance = 0;
        } else {
          // No legacy loan, initialize empty array
          legacyParams.loans = [];
        }
      }

      // Create configuration with empty transitions array
      const config: SimulationConfiguration = {
        baseParameters: legacyParams,
        transitions: [],
      };

      // Save in new format
      this.saveConfiguration(config);

      console.log("Successfully migrated from legacy storage format");

      return config;
    } catch (error) {
      console.error("Failed to migrate from legacy format:", error);
      return null;
    }
  }
}

/**
 * Default storage service instance
 */
export const storageService = new LocalStorageService();
