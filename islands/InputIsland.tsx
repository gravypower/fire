/**
 * InputIsland - Fresh island component for financial parameter inputs
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2
 */

import { useEffect, useState } from "preact/hooks";
import type { UserParameters, PaymentFrequency, SimulationConfiguration, TaxBracket } from "../types/financial.ts";
import { DEFAULT_AU_TAX_BRACKETS } from "../lib/processors.ts";
import {
  validatePositiveNumber,
  validatePercentage,
  validateRetirementAge,
  validateSimulationYears,
} from "../lib/validation.ts";
import AdPlaceholder from "../components/AdPlaceholder.tsx";

interface InputIslandProps {
  config: SimulationConfiguration | null;
  onConfigurationChange: (config: SimulationConfiguration) => void;
}

/**
 * Default user parameters
 */
const getDefaultParameters = (): UserParameters => ({
  // Household configuration
  householdMode: "single" as const,
  people: [
    {
      id: "person-1",
      name: "Me",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [
        {
          id: "income-default",
          label: "Salary",
          amount: 80000,
          frequency: "yearly" as PaymentFrequency,
          isBeforeTax: true,
        },
      ],
      superAccounts: [],
    },
  ],
  // Legacy fields for backward compatibility
  annualSalary: 80000,
  salaryFrequency: "monthly" as PaymentFrequency,
  incomeTaxRate: 30,
  taxBrackets: DEFAULT_AU_TAX_BRACKETS,
  monthlyLivingExpenses: 0, // Legacy field - use expenseItems instead
  monthlyRentOrMortgage: 0, // Legacy field - use expenseItems instead
  expenseItems: [], // Use Expense Tracker to add expenses
  loans: [], // Use the "+ Add Loan" button to add loans
  loanPrincipal: 0, // Legacy field - kept for backward compatibility
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
  const [showTaxBrackets, setShowTaxBrackets] = useState(false);
  const [taxConfigLoading, setTaxConfigLoading] = useState(false);
  const [taxConfigInfo, setTaxConfigInfo] = useState<{ country: string; taxYear: string; description: string } | null>(null);

  // Load tax configuration from server on mount
  useEffect(() => {
    const loadTaxConfig = async () => {
      setTaxConfigLoading(true);
      try {
        const response = await fetch('/api/tax-config');
        if (response.ok) {
          const taxConfig = await response.json();
          setTaxConfigInfo({
            country: taxConfig.country,
            taxYear: taxConfig.taxYear,
            description: taxConfig.description,
          });
          
          // Update parameters with server tax brackets
          setParameters(prev => ({
            ...prev,
            taxBrackets: taxConfig.brackets,
          }));
          
          // If config exists, update it with new tax brackets
          if (config) {
            const updatedConfig = {
              ...config,
              baseParameters: {
                ...config.baseParameters,
                taxBrackets: taxConfig.brackets,
              },
            };
            onConfigurationChange(updatedConfig);
          }
        }
      } catch (error) {
        console.error('Failed to load tax config:', error);
        // Fall back to default tax brackets
      } finally {
        setTaxConfigLoading(false);
      }
    };
    
    loadTaxConfig();
  }, []); // Run once on mount

  // Initialize parameters from config or defaults
  // Update when config prop changes (e.g., when loaded from storage)
  useEffect(() => {
    if (config) {
      const params = { ...config.baseParameters };
      // Ensure loans array exists (for backward compatibility)
      if (params.loans === undefined) {
        params.loans = [];
      }
      setParameters(params);
    } else {
      // Create initial config with defaults
      const defaultParams = getDefaultParameters();
      setParameters(defaultParams);
      
      // Create and save initial configuration
      const initialConfig: SimulationConfiguration = {
        baseParameters: defaultParams,
        transitions: [],
      };
      onConfigurationChange(initialConfig);
    }
  }, [config]); // React to config changes

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
   * Handles tax bracket changes
   */
  const handleTaxBracketChange = (index: number, field: 'min' | 'max' | 'rate', value: string) => {
    const brackets = [...(parameters.taxBrackets || DEFAULT_AU_TAX_BRACKETS)];
    const numValue = field === 'max' && value === '' ? null : parseFloat(value);
    
    if (field === 'max' && value === '') {
      brackets[index] = { ...brackets[index], max: null };
    } else if (!isNaN(numValue as number)) {
      brackets[index] = { ...brackets[index], [field]: numValue };
    }
    
    const updatedParams = { ...parameters, taxBrackets: brackets };
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
      }
    }
  };

  /**
   * Resets tax brackets to Australian defaults
   */
  const resetTaxBrackets = () => {
    const updatedParams = { ...parameters, taxBrackets: DEFAULT_AU_TAX_BRACKETS };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
      }
    }
  };



  /**
   * Adds a new loan
   */
  const addLoan = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const newLoan: import("../types/financial.ts").Loan = {
      id: `loan-${Date.now()}`,
      label: "New Loan",
      principal: 0,
      interestRate: 5.5,
      paymentAmount: 0,
      paymentFrequency: "monthly" as PaymentFrequency,
    };
    
    const loans = parameters.loans || [];
    const updatedParams = { ...parameters, loans: [...loans, newLoan] };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
      }
    }
  };

  /**
   * Removes a loan
   */
  const removeLoan = (index: number) => {
    const loans = [...(parameters.loans || [])];
    loans.splice(index, 1);
    const updatedParams = { ...parameters, loans };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
      }
    }
  };

  /**
   * Updates a loan
   */
  const updateLoan = (index: number, field: string, value: any) => {
    const loans = [...(parameters.loans || [])];
    loans[index] = { ...loans[index], [field]: value };
    const updatedParams = { ...parameters, loans };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
      }
    }
  };

  /**
   * Adds a new super account
   */
  const addSuperAccount = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const newSuper: import("../types/financial.ts").SuperAccount = {
      id: `super-${Date.now()}`,
      label: "New Super Account",
      balance: 0,
      contributionRate: 11,
      returnRate: 7,
    };
    
    const superAccounts = parameters.superAccounts || [];
    const updatedParams = { ...parameters, superAccounts: [...superAccounts, newSuper] };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
      }
    }
  };

  /**
   * Removes a super account
   */
  const removeSuperAccount = (index: number) => {
    const superAccounts = [...(parameters.superAccounts || [])];
    superAccounts.splice(index, 1);
    const updatedParams = { ...parameters, superAccounts };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
      }
    }
  };

  /**
   * Updates a super account
   */
  const updateSuperAccount = (index: number, field: string, value: any) => {
    const superAccounts = [...(parameters.superAccounts || [])];
    superAccounts[index] = { ...superAccounts[index], [field]: value };
    const updatedParams = { ...parameters, superAccounts };
    setParameters(updatedParams);

    if (config) {
      try {
        const updatedConfig: SimulationConfiguration = {
          ...config,
          baseParameters: updatedParams,
        };
        onConfigurationChange(updatedConfig);
      } catch (e) {
        console.error("Failed to update configuration:", e);
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
    <div class="slide-in">
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

      {/* Grid Layout for Cards */}
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Tax Configuration Section */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Tax Configuration
          </h3>
          <div class="p-4 bg-blue-50 rounded-md border border-blue-200">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span class="text-sm font-medium text-gray-700">Tax Brackets (Progressive)</span>
            </div>
            <button
              onClick={() => setShowTaxBrackets(!showTaxBrackets)}
              class="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {showTaxBrackets ? 'Hide' : 'Edit'}
            </button>
          </div>
          
          {!showTaxBrackets && (
            <div>
              <p class="text-xs text-gray-700 font-medium mb-1">Australian Tax Rates (2024-25):</p>
              <ul class="text-xs text-gray-600 space-y-0.5">
                {(parameters.taxBrackets || DEFAULT_AU_TAX_BRACKETS).map((bracket, i) => (
                  <li key={i}>
                    • ${bracket.min.toLocaleString()} - {bracket.max ? `$${bracket.max.toLocaleString()}` : '+'}: {bracket.rate}%
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {showTaxBrackets && (
            <div class="space-y-3 fade-in">
              <div class="flex justify-between items-center mb-2">
                <p class="text-xs text-gray-600">Edit tax brackets below:</p>
                <button
                  onClick={resetTaxBrackets}
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Reset to AU Defaults
                </button>
              </div>
              
              {(parameters.taxBrackets || DEFAULT_AU_TAX_BRACKETS).map((bracket, index) => (
                <div key={index} class="grid grid-cols-3 gap-2 p-2 bg-white rounded border border-blue-200">
                  <div>
                    <label class="text-xs text-gray-600">Min ($)</label>
                    <input
                      type="number"
                      value={bracket.min}
                      onInput={(e) => handleTaxBracketChange(index, 'min', (e.target as HTMLInputElement).value)}
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Max ($)</label>
                    <input
                      type="number"
                      value={bracket.max ?? ''}
                      placeholder="No limit"
                      onInput={(e) => handleTaxBracketChange(index, 'max', (e.target as HTMLInputElement).value)}
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Rate (%)</label>
                    <input
                      type="number"
                      value={bracket.rate}
                      onInput={(e) => handleTaxBracketChange(index, 'rate', (e.target as HTMLInputElement).value)}
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* Advertisement Placeholder */}
        <AdPlaceholder variant="premium" />

        {/* Loans Section - Spans 2 columns on large screens */}
        <div class="card p-6 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-700 flex items-center">
              <svg class="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Loans & Mortgages
            </h3>
            <button
              onClick={(e) => addLoan(e)}
              type="button"
              class="text-sm px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              + Add Loan
            </button>
          </div>
          
          {/* Info about offset strategy */}
          {parameters.loans && parameters.loans.length > 1 && parameters.loans.some(l => l.hasOffset) && (
            <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <div class="flex items-start">
                <svg class="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <p class="text-xs text-green-700">
                  <strong>Smart Offset Strategy:</strong> Leftover cash each period is automatically added to the offset account of your biggest loan with offset enabled. This minimizes total interest paid.
                </p>
              </div>
            </div>
          )}
          
          {/* Always show loan list (empty state or with loans) */}
          {parameters.loans && parameters.loans.length > 0 ? (
            <div class="space-y-4">
              {parameters.loans.map((loan, index) => (
                <div key={loan.id} class="p-4 bg-gray-50 rounded border border-gray-200">
                  <div class="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={loan.label}
                      onInput={(e) => updateLoan(index, 'label', (e.target as HTMLInputElement).value)}
                      placeholder="Loan label (e.g., Home Mortgage)"
                      class="text-sm font-medium px-2 py-1 border border-gray-300 rounded flex-1 mr-2"
                    />
                    <button
                      onClick={() => removeLoan(index)}
                      type="button"
                      class="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs text-gray-600">Principal Balance ($)</label>
                      <input
                        type="number"
                        value={loan.principal}
                        onInput={(e) => updateLoan(index, 'principal', parseFloat((e.target as HTMLInputElement).value))}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        step="1000"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-gray-600">Interest Rate (%)</label>
                      <input
                        type="number"
                        value={loan.interestRate}
                        onInput={(e) => updateLoan(index, 'interestRate', parseFloat((e.target as HTMLInputElement).value))}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-gray-600">Payment Amount ($)</label>
                      <input
                        type="number"
                        value={loan.paymentAmount}
                        onInput={(e) => updateLoan(index, 'paymentAmount', parseFloat((e.target as HTMLInputElement).value))}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        step="100"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-gray-600">Payment Frequency</label>
                      <select
                        value={loan.paymentFrequency}
                        onChange={(e) => updateLoan(index, 'paymentFrequency', (e.target as HTMLSelectElement).value)}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="fortnightly">Fortnightly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Offset Account for this loan */}
                  <div class="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <label class="flex items-center cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={loan.hasOffset || false}
                        onChange={(e) => updateLoan(index, 'hasOffset', (e.target as HTMLInputElement).checked)}
                        class="w-3 h-3 text-blue-600 border-gray-300 rounded"
                      />
                      <span class="ml-2 text-xs font-medium text-gray-700">
                        Use Offset Account
                      </span>
                    </label>
                    <p class="text-xs text-gray-600 mb-2">
                      Leftover cash will be added to this loan's offset to reduce interest
                    </p>
                    {loan.hasOffset && (
                      <div class="fade-in">
                        <label class="text-xs text-gray-600">Current Offset Balance ($)</label>
                        <input
                          type="number"
                          value={loan.offsetBalance || 0}
                          onInput={(e) => updateLoan(index, 'offsetBalance', parseFloat((e.target as HTMLInputElement).value))}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          step="100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p class="text-sm text-gray-600 mb-2">No loans added yet</p>
              <p class="text-xs text-gray-500">Click "+ Add Loan" above to add a mortgage or other loan</p>
            </div>
          )}
        </div>

        {/* Investments Section */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-700 flex items-center">
            <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Investments
          </h3>
          {renderNumberInput("Monthly Investment Contribution", "monthlyInvestmentContribution", "100", "$")}
          {renderNumberInput("Investment Return Rate (%)", "investmentReturnRate", "0.1")}
          {renderNumberInput("Current Investment Balance", "currentInvestmentBalance", "1000", "$")}
        </div>

        {/* Superannuation Section - Only show if not using household mode with people */}
        {(!parameters.people || parameters.people.length === 0) && (
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-700 flex items-center">
                <svg class="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Superannuation
              </h3>
              <button
                onClick={(e) => addSuperAccount(e)}
                type="button"
                class="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                + Add Super
              </button>
            </div>
            
            {/* Show super accounts if available */}
            {parameters.superAccounts && parameters.superAccounts.length > 0 ? (
              <div class="space-y-3">
                {parameters.superAccounts.map((superAcc, index) => (
                  <div key={superAcc.id} class="p-3 bg-gray-50 rounded border border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={superAcc.label}
                        onInput={(e) => updateSuperAccount(index, 'label', (e.target as HTMLInputElement).value)}
                        placeholder="Super account label"
                        class="text-sm font-medium px-2 py-1 border border-gray-300 rounded flex-1 mr-2"
                      />
                      <button
                        onClick={() => removeSuperAccount(index)}
                        type="button"
                        class="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div class="grid grid-cols-1 gap-2">
                      <div>
                        <label class="text-xs text-gray-600">Current Balance ($)</label>
                        <input
                          type="number"
                          value={superAcc.balance}
                          onInput={(e) => updateSuperAccount(index, 'balance', parseFloat((e.target as HTMLInputElement).value))}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          step="1000"
                        />
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class="text-xs text-gray-600">Contribution Rate (%)</label>
                          <input
                            type="number"
                            value={superAcc.contributionRate}
                            onInput={(e) => updateSuperAccount(index, 'contributionRate', parseFloat((e.target as HTMLInputElement).value))}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.5"
                          />
                        </div>
                        <div>
                          <label class="text-xs text-gray-600">Return Rate (%)</label>
                          <input
                            type="number"
                            value={superAcc.returnRate}
                            onInput={(e) => updateSuperAccount(index, 'returnRate', parseFloat((e.target as HTMLInputElement).value))}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {renderNumberInput("Super Contribution Rate (%)", "superContributionRate", "0.1")}
                {renderNumberInput("Super Return Rate (%)", "superReturnRate", "0.1")}
                {renderNumberInput("Current Super Balance", "currentSuperBalance", "1000", "$")}
              </>
            )}
          </div>
        )}

        {/* Retirement Income Section */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-700 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Retirement Income
          </h3>
          {renderNumberInput("Desired Annual Retirement Income", "desiredAnnualRetirementIncome", "1000", "$")}
          <p class="text-xs text-gray-500 mt-2">
            Set your current age and retirement age in the Household Configuration section above.
          </p>
        </div>

        {/* Simulation Section */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-700 flex items-center">
            <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Simulation
          </h3>
          {renderNumberInput("Simulation Years", "simulationYears", "1")}
        </div>
      </div>
    </div>
  );
}
