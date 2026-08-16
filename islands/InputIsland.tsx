/**
 * InputIsland - Fresh island component for financial parameter inputs
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2
 */

import { useEffect, useState } from "preact/hooks";
import type {
  PaymentFrequency,
  SimulationConfiguration,
  SuperAccount,
  UserParameters,
} from "../types/financial.ts";
import { DEFAULT_AU_TAX_BRACKETS } from "../lib/processors.ts";
import { getCountryModule } from "../lib/tax_modules/index.ts";
import {
  validatePercentage,
  validatePositiveNumber,
  validateRetirementAge,
} from "../lib/validation.ts";

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

export default function InputIsland(
  { config, onConfigurationChange }: InputIslandProps,
) {
  const [parameters, setParameters] = useState<UserParameters>(
    getDefaultParameters(),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [storageError, setStorageError] = useState<string | null>(null);

  const retirementModule = getCountryModule(parameters.country);

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
      // Just set default parameters locally, don't save yet
      // MainIsland will handle creating initial config if needed
      const defaultParams = getDefaultParameters();
      setParameters(defaultParams);
    }
  }, [config]); // React to config changes

  /**
   * Validates a single field and updates errors
   */
  const validateField = (
    fieldName: string,
    value: number,
  ): string | undefined => {
    let validationResult;

    switch (fieldName) {
      case "annualSalary":
        validationResult = validatePositiveNumber(value, "Annual salary");
        break;
      case "monthlyLivingExpenses":
        validationResult = validatePositiveNumber(
          value,
          "Monthly living expenses",
        );
        break;
      case "monthlyRentOrMortgage":
        validationResult = validatePositiveNumber(
          value,
          "Monthly rent or mortgage",
        );
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
        validationResult = validatePositiveNumber(
          value,
          "Current offset balance",
        );
        break;
      case "monthlyInvestmentContribution":
        validationResult = validatePositiveNumber(
          value,
          "Monthly investment contribution",
        );
        break;
      case "investmentReturnRate":
        validationResult = validatePercentage(value, "Investment return rate");
        break;
      case "currentInvestmentBalance":
        validationResult = validatePositiveNumber(
          value,
          "Current investment balance",
        );
        break;
      case "superContributionRate":
        validationResult = validatePercentage(value, "Super contribution rate");
        break;
      case "superReturnRate":
        validationResult = validatePercentage(value, "Super return rate");
        break;
      case "currentSuperBalance":
        validationResult = validatePositiveNumber(
          value,
          "Current super balance",
        );
        break;
      case "desiredAnnualRetirementIncome":
        validationResult = validatePositiveNumber(
          value,
          "Desired annual retirement income",
        );
        break;
      case "retirementAge":
        validationResult = validateRetirementAge(parameters.currentAge, value);
        break;
      case "currentAge":
        validationResult = validateRetirementAge(
          value,
          parameters.retirementAge,
        );
        break;

      default:
        return undefined;
    }

    return validationResult.isValid ? undefined : validationResult.error;
  };

  /**
   * Handles numeric input changes
   */
  const handleNumberChange = (
    fieldName: keyof UserParameters,
    value: string,
  ) => {
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
        if (
          errorMsg.includes("quota") || errorMsg.includes("QuotaExceededError")
        ) {
          setStorageError(
            "Storage quota exceeded. Your data may not be saved.",
          );
        } else {
          setStorageError(
            "Unable to save data. Changes will be lost on page refresh.",
          );
        }
      }
    }
  };

  // Super account management state
  const [isAddingSuper, setIsAddingSuper] = useState(false);
  const [editingSuperId, setEditingSuperId] = useState<string | null>(null);
  const [superFormData, setSuperFormData] = useState<Partial<SuperAccount>>({});

  /**
   * Starts adding a new super account
   */
  const startAddSuper = () => {
    setSuperFormData({
      label: "New Super Account",
      balance: 0,
      contributionRate: 11,
      returnRate: 7,
    });
    setIsAddingSuper(true);
    setEditingSuperId(null);
  };

  /**
   * Starts editing a super account
   */
  const startEditSuper = (superAcc: SuperAccount) => {
    setSuperFormData({ ...superAcc });
    setIsAddingSuper(false);
    setEditingSuperId(superAcc.id);
  };

  /**
   * Cancels super account add/edit
   */
  const cancelSuperForm = () => {
    setSuperFormData({});
    setIsAddingSuper(false);
    setEditingSuperId(null);
  };

  /**
   * Saves a super account (add or update)
   */
  const saveSuper = () => {
    if (
      !superFormData.label || superFormData.balance === undefined ||
      superFormData.balance < 0
    ) {
      alert("Please enter a valid super account label and balance");
      return;
    }

    const superAccounts = parameters.superAccounts || [];
    let updatedSupers;

    if (editingSuperId) {
      // Update existing super
      updatedSupers = superAccounts.map((superAcc) =>
        superAcc.id === editingSuperId
          ? { ...superAcc, ...superFormData } as SuperAccount
          : superAcc
      );
    } else {
      // Add new super
      const newSuper: SuperAccount = {
        id: `super-${Date.now()}`,
        ...superFormData as any,
      };
      updatedSupers = [...superAccounts, newSuper];
    }

    const updatedParams = { ...parameters, superAccounts: updatedSupers };
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

    cancelSuperForm();
  };

  /**
   * Removes a super account
   */
  const removeSuperAccount = (superId: string) => {
    if (!confirm("Delete this super account?")) return;

    const superAccounts = parameters.superAccounts || [];
    const updatedSupers = superAccounts.filter((superAcc) =>
      superAcc.id !== superId
    );
    const updatedParams = { ...parameters, superAccounts: updatedSupers };
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
    prefix?: string,
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
            <span class="absolute left-3 top-2 text-gray-500 font-medium">
              {prefix}
            </span>
          )}
          <input
            type="number"
            value={value as number}
            onInput={(e) =>
              handleNumberChange(
                fieldName,
                (e.target as HTMLInputElement).value,
              )}
            step={step}
            class={`${error ? "input-field-error" : "input-field"} ${
              prefix ? "pl-8" : ""
            }`}
          />
        </div>
        {error && (
          <div class="mt-1 flex items-start fade-in">
            <svg
              class="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            <p class="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div class="slide-in">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">
        Retirement Goal
      </h2>

      {/* Storage Error Alert */}
      {storageError && (
        <div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4 fade-in">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
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
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout for Cards */}
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Tax configuration removed - see Help page for tax bracket information */}

        {/* Superannuation Section - Only show if not using household mode with people */}
        {(!parameters.people || parameters.people.length === 0) && (
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-700 flex items-center">
                <svg
                  class="w-5 h-5 mr-2 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                {retirementModule.retirementAccountLabel}
              </h3>
              {!isAddingSuper && !editingSuperId && (
                <button
                  onClick={startAddSuper}
                  type="button"
                  class="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                  + Add {retirementModule.retirementAccountShortLabel}
                </button>
              )}
            </div>

            {/* Super Form (Add/Edit) */}
            {(isAddingSuper || editingSuperId) && (
              <div class="border border-gray-300 rounded-lg p-4 bg-gray-50 mb-4 fade-in">
                <h4 class="text-md font-semibold mb-3 text-gray-800">
                  {editingSuperId
                    ? `Edit ${retirementModule.retirementAccountShortLabel} Account`
                    : `Add New ${retirementModule.retirementAccountShortLabel} Account`}
                </h4>

                {/* Super Label */}
                <div class="mb-3">
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={superFormData.label || ""}
                    onInput={(e) =>
                      setSuperFormData({
                        ...superFormData,
                        label: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="e.g., AustralianSuper, REST Super"
                    class="input-field text-sm"
                  />
                </div>

                {/* Balance */}
                <div class="mb-3">
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Current Balance ($) *
                  </label>
                  <input
                    type="number"
                    value={superFormData.balance ?? ""}
                    onInput={(e) =>
                      setSuperFormData({
                        ...superFormData,
                        balance:
                          parseFloat((e.target as HTMLInputElement).value) || 0,
                      })}
                    class="input-field text-sm"
                    step="1000"
                  />
                </div>

                {/* Contribution and Return Rates */}
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                      Contribution Rate (%) *
                    </label>
                    <input
                      type="number"
                      value={superFormData.contributionRate ?? ""}
                      onInput={(e) =>
                        setSuperFormData({
                          ...superFormData,
                          contributionRate:
                            parseFloat((e.target as HTMLInputElement).value) ||
                            0,
                        })}
                      class="input-field text-sm"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                      Return Rate (%) *
                    </label>
                    <input
                      type="number"
                      value={superFormData.returnRate ?? ""}
                      onInput={(e) =>
                        setSuperFormData({
                          ...superFormData,
                          returnRate:
                            parseFloat((e.target as HTMLInputElement).value) ||
                            0,
                        })}
                      class="input-field text-sm"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div class="flex gap-3 mt-4">
                  <button onClick={saveSuper} class="btn-primary flex-1">
                    {editingSuperId ? "Update" : "Add"}{" "}
                    {retirementModule.retirementAccountShortLabel} Account
                  </button>
                  <button
                    onClick={cancelSuperForm}
                    class="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Super List (Summary View) */}
            {!isAddingSuper && !editingSuperId && (
              <>
                {parameters.superAccounts && parameters.superAccounts.length > 0
                  ? (
                    <div class="space-y-3">
                      {parameters.superAccounts.map((superAcc) => (
                        <div
                          key={superAcc.id}
                          class="p-3 bg-gray-50 rounded border border-gray-200"
                        >
                          <div class="flex items-center justify-between mb-2">
                            <h4 class="text-sm font-semibold text-gray-800">
                              {superAcc.label}
                            </h4>
                            <div class="flex gap-2">
                              <button
                                onClick={() => startEditSuper(superAcc)}
                                class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeSuperAccount(superAcc.id)}
                                type="button"
                                class="text-red-600 hover:text-red-700 text-xs px-2 py-1"
                                title="Delete"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div class="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span class="text-gray-500">Balance:</span>{" "}
                              <span class="font-medium text-gray-800">
                                ${superAcc.balance.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span class="text-gray-500">Contribution:</span>
                              {" "}
                              <span class="font-medium text-gray-800">
                                {superAcc.contributionRate}%
                              </span>
                            </div>
                            <div>
                              <span class="text-gray-500">Return:</span>{" "}
                              <span class="font-medium text-gray-800">
                                {superAcc.returnRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                  : (
                    <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <svg
                        class="mx-auto h-12 w-12 text-gray-400 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      <p class="text-sm text-gray-600 mb-2">
                        No {retirementModule.retirementAccountShortLabel}{" "}
                        accounts added yet
                      </p>
                      <p class="text-xs text-gray-500">
                        Click "+ Add{" "}
                        {retirementModule.retirementAccountShortLabel}" above to
                        add a {retirementModule.retirementAccountLabel} account
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {/* Retirement Income Section */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-700 flex items-center">
            <svg
              class="w-5 h-5 mr-2 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Retirement Income
          </h3>
          {renderNumberInput(
            "Desired Annual Retirement Income",
            "desiredAnnualRetirementIncome",
            "1000",
            "$",
          )}
          <p class="text-xs text-gray-500 mt-2">
            Set your current age and retirement age in the Household
            Configuration section above.
          </p>
        </div>

        {/* Simulation Section */}
      </div>
    </div>
  );
}
