/**
 * InputIsland - Fresh island component for financial parameter inputs
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2
 */

import { useEffect, useState } from "preact/hooks";
import type { UserParameters, PaymentFrequency, SimulationConfiguration } from "../types/financial.ts";
import {
  validatePositiveNumber,
  validatePercentage,
  validateRetirementAge,
  validateSimulationYears,
} from "../lib/validation.ts";

interface InputIslandProps {
  config: SimulationConfiguration | null;
  onConfigurationChange: (config: SimulationConfiguration) => void;
}

/**
 * Default user parameters
 */
const getDefaultParameters = (): UserParameters => ({
  annualSalary: 80000,
  salaryFrequency: "monthly" as PaymentFrequency,
  incomeTaxRate: 30,
  monthlyLivingExpenses: 2000,
  monthlyRentOrMortgage: 1500,
  loanPrincipal: 0,
  loanInterestRate: 5.5,
  loanPaymentAmount: 0,
  loanPaymentFrequency: "monthly" as PaymentFrequency,
  useOffsetAccount: false,
  currentOffsetBalance: 0,
  monthlyInvestmentContribution: 500,
  investmentReturnRate: 7,
  currentInvestmentBalance: 10000,
  superContributionRate: 11,
  superReturnRate: 7,
  currentSuperBalance: 50000,
  desiredAnnualRetirementIncome: 60000,
  retirementAge: 65,
  currentAge: 30,
  simulationYears: 40,
  startDate: new Date(),
});

/**
 * Field validation errors
 */
interface FieldErrors {
  [key: string]: string | undefined;
}

export default function InputIsland({ config, onConfigurationChange }: InputIslandProps) {
  const [parameters, setParameters] = useState<UserParameters>(getDefaultParameters());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [storageError, setStorageError] = useState<string | null>(null);

  // Initialize parameters from config or defaults
  useEffect(() => {
    if (config) {
      setParameters(config.baseParameters);
    } else {
      // Create initial configuration with default parameters
      const defaultParams = getDefaultParameters();
      setParameters(defaultParams);
      onConfigurationChange({
        baseParameters: defaultParams,
        transitions: [],
      });
    }
  }, []);

  /**
   * Validates a single field and updates errors
   */
  const validateField = (fieldName: string, value: number): string | undefined => {
    let validationResult;

    switch (fieldName) {
      case "annualSalary":
        validationResult = validatePositiveNumber(value, "Annual salary");
        break;
      case "monthlyLivingExpenses":
        validationResult = validatePositiveNumber(value, "Monthly living expenses");
        break;
      case "monthlyRentOrMortgage":
        validationResult = validatePositiveNumber(value, "Monthly rent or mortgage");
        break;
      case "loanPrincipal":
        validationResult = validatePositiveNumber(value, "Loan principal");
        break;
      case "loanInterestRate":
        validationResult = validatePercentage(value, "Loan interest rate");
        break;
      case "loanPaymentAmount":
        validationResult = validatePositiveNumber(value, "Loan payment amount");
        break;
      case "incomeTaxRate":
        validationResult = validatePercentage(value, "Income tax rate");
        break;
      case "currentOffsetBalance":
        validationResult = validatePositiveNumber(value, "Current offset balance");
        break;
      case "monthlyInvestmentContribution":
        validationResult = validatePositiveNumber(value, "Monthly investment contribution");
        break;
      case "investmentReturnRate":
        validationResult = validatePercentage(value, "Investment return rate");
        break;
      case "currentInvestmentBalance":
        validationResult = validatePositiveNumber(value, "Current investment balance");
        break;
      case "superContributionRate":
        validationResult = validatePercentage(value, "Super contribution rate");
        break;
      case "superReturnRate":
        validationResult = validatePercentage(value, "Super return rate");
        break;
      case "currentSuperBalance":
        validationResult = validatePositiveNumber(value, "Current super balance");
        break;
      case "desiredAnnualRetirementIncome":
        validationResult = validatePositiveNumber(value, "Desired annual retirement income");
        break;
      case "retirementAge":
        validationResult = validateRetirementAge(parameters.currentAge, value);
        break;
      case "currentAge":
        validationResult = validateRetirementAge(value, parameters.retirementAge);
        break;
      case "simulationYears":
        validationResult = validateSimulationYears(value);
        break;
      default:
        return undefined;
    }

    return validationResult.isValid ? undefined : validationResult.error;
  };

  /**
   * Handles numeric input changes
   */
  const handleNumberChange = (fieldName: keyof UserParameters, value: string) => {
    const numValue = parseFloat(value);
    
    // Allow empty string for user to clear field
    if (value === "") {
      setParameters((prev) => ({ ...prev, [fieldName]: 0 }));
      return;
    }

    if (isNaN(numValue)) {
      setErrors((prev) => ({ ...prev, [fieldName]: "Must be a valid number" }));
      return;
    }

    const error = validateField(fieldName, numValue);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));

    const updatedParams = { ...parameters, [fieldName]: numValue };
    setParameters(updatedParams);

    // Update configuration with new base parameters if valid
    if (!error && config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
        // Clear storage error if save succeeds
        if (storageError) {
          setStorageError(null);
        }
      } catch (e) {
        console.error("Failed to update configuration:", e);
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        if (errorMsg.includes("quota") || errorMsg.includes("QuotaExceededError")) {
          setStorageError("Storage quota exceeded. Your data may not be saved.");
        } else {
          setStorageError("Unable to save data. Changes will be lost on page refresh.");
        }
      }
    }
  };

  /**
   * Handles frequency select changes
   */
  const handleFrequencyChange = (
    fieldName: "salaryFrequency" | "loanPaymentFrequency",
    value: PaymentFrequency
  ) => {
    const updatedParams = { ...parameters, [fieldName]: value };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
        // Clear storage error if save succeeds
        if (storageError) {
          setStorageError(null);
        }
      } catch (e) {
        console.error("Failed to update configuration:", e);
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        if (errorMsg.includes("quota") || errorMsg.includes("QuotaExceededError")) {
          setStorageError("Storage quota exceeded. Your data may not be saved.");
        } else {
          setStorageError("Unable to save data. Changes will be lost on page refresh.");
        }
      }
    }
  };

  /**
   * Handles checkbox changes
   */
  const handleCheckboxChange = (
    fieldName: "useOffsetAccount",
    checked: boolean
  ) => {
    const updatedParams = { ...parameters, [fieldName]: checked };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
        if (storageError) {
          setStorageError(null);
        }
      } catch (e) {
        console.error("Failed to update configuration:", e);
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        if (errorMsg.includes("quota") || errorMsg.includes("QuotaExceededError")) {
          setStorageError("Storage quota exceeded. Your data may not be saved.");
        } else {
          setStorageError("Unable to save data. Changes will be lost on page refresh.");
        }
      }
    }
  };

  /**
   * Renders an input field with label and error message
   */
  const renderNumberInput = (
    label: string,
    fieldName: keyof UserParameters,
    step: string = "0.01",
    prefix?: string
  ) => {
    const value = parameters[fieldName];
    const error = errors[fieldName];

    return (
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div class="relative">
          {prefix && (
            <span class="absolute left-3 top-2 text-gray-500 font-medium">{prefix}</span>
          )}
          <input
            type="number"
            value={value as number}
            onInput={(e) => handleNumberChange(fieldName, (e.target as HTMLInputElement).value)}
            step={step}
            class={`${error ? "input-field-error" : "input-field"} ${
              prefix ? "pl-8" : ""
            }`}
          />
        </div>
        {error && (
          <div class="mt-1 flex items-start fade-in">
            <svg class="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders a frequency select field
   */
  const renderFrequencySelect = (
    label: string,
    fieldName: "salaryFrequency" | "loanPaymentFrequency"
  ) => {
    const value = parameters[fieldName];

    return (
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) =>
            handleFrequencyChange(fieldName, (e.target as HTMLSelectElement).value as PaymentFrequency)
          }
          class="input-field cursor-pointer"
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    );
  };

  return (
    <div class="card p-6 slide-in">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Financial Parameters</h2>

      {/* Storage Error Alert */}
      {storageError && (
        <div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4 fade-in">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm text-yellow-800">{storageError}</p>
            </div>
            <div class="ml-3">
              <button
                onClick={() => setStorageError(null)}
                class="text-yellow-800 hover:text-yellow-900"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Income Section */}
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Income
        </h3>
        {renderNumberInput("Annual Salary (Gross)", "annualSalary", "1000", "$")}
        {renderFrequencySelect("Salary Frequency", "salaryFrequency")}
        {renderNumberInput("Income Tax Rate (%)", "incomeTaxRate", "0.1")}
        <div class="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p class="text-xs text-gray-700 font-medium mb-1">Australian Tax Rates (2024-25):</p>
          <ul class="text-xs text-gray-600 space-y-0.5">
            <li>• $0 - $18,200: 0%</li>
            <li>• $18,201 - $45,000: 19%</li>
            <li>• $45,001 - $120,000: 32.5%</li>
            <li>• $120,001 - $180,000: 37%</li>
            <li>• $180,001+: 45%</li>
          </ul>
          <p class="text-xs text-gray-500 mt-2">
            Enter your effective tax rate above (total tax ÷ gross income × 100)
          </p>
        </div>
      </div>

      {/* Expenses Section */}
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Expenses
        </h3>
        {renderNumberInput("Monthly Living Expenses", "monthlyLivingExpenses", "100", "$")}
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Monthly Rent (for renters only)
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500 font-medium">$</span>
            <input
              type="number"
              value={parameters.monthlyRentOrMortgage as number}
              onInput={(e) => handleNumberChange("monthlyRentOrMortgage", (e.target as HTMLInputElement).value)}
              step="100"
              class={`${errors.monthlyRentOrMortgage ? "input-field-error" : "input-field"} pl-8`}
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            If you have a mortgage, set this to $0 and use the Loan fields below
          </p>
          {errors.monthlyRentOrMortgage && (
            <div class="mt-1 flex items-start fade-in">
              <svg class="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm text-red-600">{errors.monthlyRentOrMortgage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Loans Section */}
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Loans & Mortgage
        </h3>
        <p class="text-sm text-gray-600 mb-3">
          Use these fields for mortgages or other loans. Set all to $0 if you're renting.
        </p>
        {renderNumberInput("Loan Principal (Outstanding Balance)", "loanPrincipal", "1000", "$")}
        {renderNumberInput("Loan Interest Rate (%)", "loanInterestRate", "0.1")}
        {renderNumberInput("Loan Payment Amount (per payment)", "loanPaymentAmount", "100", "$")}
        {renderFrequencySelect("Loan Payment Frequency", "loanPaymentFrequency")}
        
        {/* Offset Account */}
        <div class="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
          <div class="mb-3">
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={parameters.useOffsetAccount}
                onChange={(e) => handleCheckboxChange("useOffsetAccount", (e.target as HTMLInputElement).checked)}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="ml-2 text-sm font-medium text-gray-700">
                Use Offset Account
              </span>
            </label>
            <p class="text-xs text-gray-600 mt-1 ml-6">
              Leftover funds will be placed in an offset account to reduce loan interest
            </p>
          </div>
          {parameters.useOffsetAccount && (
            <div class="fade-in">
              {renderNumberInput("Current Offset Balance", "currentOffsetBalance", "100", "$")}
            </div>
          )}
        </div>
      </div>

      {/* Investments Section */}
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Investments
        </h3>
        {renderNumberInput("Monthly Investment Contribution", "monthlyInvestmentContribution", "100", "$")}
        {renderNumberInput("Investment Return Rate (%)", "investmentReturnRate", "0.1")}
        {renderNumberInput("Current Investment Balance", "currentInvestmentBalance", "1000", "$")}
      </div>

      {/* Superannuation Section */}
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Superannuation
        </h3>
        {renderNumberInput("Super Contribution Rate (%)", "superContributionRate", "0.1")}
        {renderNumberInput("Super Return Rate (%)", "superReturnRate", "0.1")}
        {renderNumberInput("Current Super Balance", "currentSuperBalance", "1000", "$")}
      </div>

      {/* Retirement Section */}
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Retirement
        </h3>
        {renderNumberInput("Desired Annual Retirement Income", "desiredAnnualRetirementIncome", "1000", "$")}
        {renderNumberInput("Current Age", "currentAge", "1")}
        {renderNumberInput("Retirement Age", "retirementAge", "1")}
      </div>

      {/* Simulation Section */}
      <div class="mb-2">
        <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Simulation
        </h3>
        {renderNumberInput("Simulation Years", "simulationYears", "1")}
      </div>
    </div>
  );
}
