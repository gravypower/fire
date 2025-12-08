/**
 * HouseholdManagerIsland - Manages household configuration (single vs couple)
 * Allows users to configure multiple people with individual income sources
 */

import { useState } from "preact/hooks";
import type { SimulationConfiguration, Person, IncomeSource, PaymentFrequency } from "../types/financial.ts";

interface HouseholdManagerIslandProps {
  config: SimulationConfiguration;
  onConfigChange: (config: SimulationConfiguration) => void;
}

export default function HouseholdManagerIsland({ config, onConfigChange }: HouseholdManagerIslandProps) {
  const [householdMode, setHouseholdMode] = useState<"single" | "couple">(
    config.baseParameters.householdMode || "single"
  );

  /**
   * Switches between single and couple mode
   */
  const handleModeChange = (mode: "single" | "couple") => {
    setHouseholdMode(mode);

    if (mode === "couple") {
      // Initialize couple mode with two people
      const existingPerson = config.baseParameters.people?.[0];
      const people: Person[] = [
        existingPerson || {
          id: "person-1",
          name: "Person 1",
          currentAge: config.baseParameters.currentAge || 30,
          retirementAge: config.baseParameters.retirementAge || 65,
          incomeSources: config.baseParameters.incomeSources || [],
          superAccounts: config.baseParameters.superAccounts || [],
        },
        {
          id: "person-2",
          name: "Person 2",
          currentAge: config.baseParameters.currentAge || 30,
          retirementAge: config.baseParameters.retirementAge || 65,
          incomeSources: [],
          superAccounts: [],
        },
      ];

      onConfigChange({
        ...config,
        baseParameters: {
          ...config.baseParameters,
          householdMode: "couple",
          people,
        },
      });
    } else {
      // Switch back to single mode - keep first person
      const firstPerson = config.baseParameters.people?.[0];
      onConfigChange({
        ...config,
        baseParameters: {
          ...config.baseParameters,
          householdMode: "single",
          people: firstPerson ? [firstPerson] : undefined,
        },
      });
    }
  };

  /**
   * Updates a person's details
   */
  const updatePerson = (personId: string, updates: Partial<Person>) => {
    if (!config.baseParameters.people) return;

    const updatedPeople = config.baseParameters.people.map(person =>
      person.id === personId ? { ...person, ...updates } : person
    );

    // Sync legacy fields with first person's data for backward compatibility
    const firstPerson = updatedPeople[0];
    const legacyUpdates: Partial<import("../types/financial.ts").UserParameters> = {};
    
    if (firstPerson) {
      if (updates.currentAge !== undefined) {
        legacyUpdates.currentAge = firstPerson.currentAge;
      }
      if (updates.retirementAge !== undefined) {
        legacyUpdates.retirementAge = firstPerson.retirementAge;
      }
    }

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        ...legacyUpdates,
        people: updatedPeople,
      },
    });
  };

  /**
   * Adds an income source to a person
   */
  const addIncomeSource = (personId: string) => {
    if (!config.baseParameters.people) return;

    const newIncome: IncomeSource = {
      id: `income-${Date.now()}`,
      label: "New Income",
      amount: 0,
      frequency: "yearly" as PaymentFrequency,
      isBeforeTax: true,
      personId,
    };

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === personId) {
        return {
          ...person,
          incomeSources: [...(person.incomeSources || []), newIncome],
        };
      }
      return person;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        people: updatedPeople,
      },
    });
  };

  /**
   * Removes an income source from a person
   */
  const removeIncomeSource = (personId: string, incomeId: string) => {
    if (!config.baseParameters.people) return;

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === personId) {
        return {
          ...person,
          incomeSources: person.incomeSources.filter(inc => inc.id !== incomeId),
        };
      }
      return person;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        people: updatedPeople,
      },
    });
  };

  /**
   * Updates an income source for a person
   */
  const updateIncomeSource = (personId: string, incomeId: string, updates: Partial<IncomeSource>) => {
    if (!config.baseParameters.people) return;

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === personId) {
        return {
          ...person,
          incomeSources: person.incomeSources.map(inc =>
            inc.id === incomeId ? { ...inc, ...updates } : inc
          ),
        };
      }
      return person;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        people: updatedPeople,
      },
    });
  };

  /**
   * Adds a super account to a person
   */
  const addSuperAccount = (personId: string) => {
    if (!config.baseParameters.people) return;

    const newSuper: import("../types/financial.ts").SuperAccount = {
      id: `super-${Date.now()}`,
      label: "New Super Account",
      balance: 0,
      contributionRate: 11,
      returnRate: 7,
      personId,
    };

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === personId) {
        return {
          ...person,
          superAccounts: [...(person.superAccounts || []), newSuper],
        };
      }
      return person;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        people: updatedPeople,
      },
    });
  };

  /**
   * Removes a super account from a person
   */
  const removeSuperAccount = (personId: string, superId: string) => {
    if (!config.baseParameters.people) return;

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === personId) {
        return {
          ...person,
          superAccounts: person.superAccounts.filter(sup => sup.id !== superId),
        };
      }
      return person;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        people: updatedPeople,
      },
    });
  };

  /**
   * Updates a super account for a person
   */
  const updateSuperAccount = (personId: string, superId: string, updates: Partial<import("../types/financial.ts").SuperAccount>) => {
    if (!config.baseParameters.people) return;

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === personId) {
        return {
          ...person,
          superAccounts: person.superAccounts.map(sup =>
            sup.id === superId ? { ...sup, ...updates } : sup
          ),
        };
      }
      return person;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        people: updatedPeople,
      },
    });
  };

  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Household Configuration
      </h3>

      {/* Mode Selector */}
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Household Type
        </label>
        <div class="flex gap-4">
          <button
            onClick={() => handleModeChange("single")}
            class={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              householdMode === "single"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <div class="flex items-center justify-center">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="font-semibold">Single Person</span>
            </div>
            <p class="text-xs mt-1 text-gray-600">One person's finances</p>
          </button>

          <button
            onClick={() => handleModeChange("couple")}
            class={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              householdMode === "couple"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <div class="flex items-center justify-center">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="font-semibold">Couple/Household</span>
            </div>
            <p class="text-xs mt-1 text-gray-600">Two people with separate incomes</p>
          </button>
        </div>
      </div>

      {/* Tax Benefit Info */}
      {householdMode === "couple" && (
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div>
              <h4 class="text-sm font-semibold text-green-800 mb-1">Tax Advantage</h4>
              <p class="text-xs text-green-700">
                Couple mode calculates tax separately for each person. This means each person gets their own tax-free threshold,
                which can result in significant tax savings compared to combining incomes!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* People Configuration (Couple Mode) */}
      {householdMode === "couple" && config.baseParameters.people && (
        <div class="space-y-6">
          {config.baseParameters.people.map((person, personIndex) => (
            <div key={person.id} class="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <div class="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={person.name}
                  onInput={(e) => updatePerson(person.id, { name: (e.target as HTMLInputElement).value })}
                  class="text-lg font-semibold px-3 py-1 border border-purple-300 rounded bg-white"
                  placeholder="Person name"
                />
                <span class="text-sm text-purple-600 font-medium">Person {personIndex + 1}</span>
              </div>

              {/* Age Configuration */}
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Current Age</label>
                  <input
                    type="number"
                    value={person.currentAge}
                    onInput={(e) => updatePerson(person.id, { currentAge: parseInt((e.target as HTMLInputElement).value) })}
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Retirement Age</label>
                  <input
                    type="number"
                    value={person.retirementAge}
                    onInput={(e) => updatePerson(person.id, { retirementAge: parseInt((e.target as HTMLInputElement).value) })}
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Income Sources */}
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700">Income Sources</label>
                  <button
                    onClick={() => addIncomeSource(person.id)}
                    class="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    + Add Income
                  </button>
                </div>

                {person.incomeSources && person.incomeSources.length > 0 ? (
                  <div class="space-y-2">
                    {person.incomeSources.map((income) => (
                      <div key={income.id} class="p-3 bg-white rounded border border-gray-200">
                        <div class="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={income.label}
                            onInput={(e) => updateIncomeSource(person.id, income.id, { label: (e.target as HTMLInputElement).value })}
                            placeholder="Income label"
                            class="text-sm font-medium px-2 py-1 border border-gray-300 rounded flex-1 mr-2"
                          />
                          <button
                            onClick={() => removeIncomeSource(person.id, income.id)}
                            class="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label class="text-xs text-gray-600">Amount</label>
                            <input
                              type="number"
                              value={income.amount}
                              onInput={(e) => updateIncomeSource(person.id, income.id, { amount: parseFloat((e.target as HTMLInputElement).value) })}
                              class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              step="100"
                            />
                          </div>
                          <div>
                            <label class="text-xs text-gray-600">Frequency</label>
                            <select
                              value={income.frequency}
                              onChange={(e) => updateIncomeSource(person.id, income.id, { frequency: (e.target as HTMLSelectElement).value as PaymentFrequency })}
                              class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="fortnightly">Fortnightly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                        <div class="mb-2">
                          <label class="flex items-center cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={income.isBeforeTax}
                              onChange={(e) => updateIncomeSource(person.id, income.id, { isBeforeTax: (e.target as HTMLInputElement).checked })}
                              class="w-3 h-3 text-purple-600 border-gray-300 rounded mr-1"
                            />
                            <span class="text-gray-600">Before tax (taxable income)</span>
                          </label>
                        </div>
                        <div class="mb-2">
                          <label class="flex items-center cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={income.isOneOff || false}
                              onChange={(e) => updateIncomeSource(person.id, income.id, { isOneOff: (e.target as HTMLInputElement).checked })}
                              class="w-3 h-3 text-green-600 border-gray-300 rounded mr-1"
                            />
                            <span class="text-gray-600">One-off income (e.g., car sale)</span>
                          </label>
                        </div>
                        {income.isOneOff && (
                          <div class="mb-2 fade-in">
                            <label class="text-xs text-gray-600">One-off Date</label>
                            <input
                              type="date"
                              value={income.oneOffDate ? new Date(income.oneOffDate).toISOString().split('T')[0] : ""}
                              onInput={(e) => updateIncomeSource(person.id, income.id, { oneOffDate: new Date((e.target as HTMLInputElement).value) })}
                              class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        )}
                        {!income.isOneOff && (
                          <div class="grid grid-cols-2 gap-2 fade-in">
                            <div>
                              <label class="text-xs text-gray-600">Start Date (Optional)</label>
                              <input
                                type="date"
                                value={income.startDate ? new Date(income.startDate).toISOString().split('T')[0] : ""}
                                onInput={(e) => updateIncomeSource(person.id, income.id, { startDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label class="text-xs text-gray-600">End Date (Optional)</label>
                              <input
                                type="date"
                                value={income.endDate ? new Date(income.endDate).toISOString().split('T')[0] : ""}
                                onInput={(e) => updateIncomeSource(person.id, income.id, { endDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p class="text-xs text-gray-500 italic p-3 bg-white rounded border border-gray-200">
                    No income sources yet. Click "+ Add Income" to add one.
                  </p>
                )}
              </div>

              {/* Super Accounts */}
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700">Super Accounts</label>
                  <button
                    onClick={() => addSuperAccount(person.id)}
                    class="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    + Add Super
                  </button>
                </div>

                {person.superAccounts && person.superAccounts.length > 0 ? (
                  <div class="space-y-2">
                    {person.superAccounts.map((superAcc) => (
                      <div key={superAcc.id} class="p-3 bg-white rounded border border-gray-200">
                        <div class="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={superAcc.label}
                            onInput={(e) => updateSuperAccount(person.id, superAcc.id, { label: (e.target as HTMLInputElement).value })}
                            placeholder="Super account label"
                            class="text-sm font-medium px-2 py-1 border border-gray-300 rounded flex-1 mr-2"
                          />
                          <button
                            onClick={() => removeSuperAccount(person.id, superAcc.id)}
                            class="text-red-600 hover:text-red-700 text-xs"
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
                              onInput={(e) => updateSuperAccount(person.id, superAcc.id, { balance: parseFloat((e.target as HTMLInputElement).value) })}
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
                                onInput={(e) => updateSuperAccount(person.id, superAcc.id, { contributionRate: parseFloat((e.target as HTMLInputElement).value) })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                step="0.5"
                              />
                            </div>
                            <div>
                              <label class="text-xs text-gray-600">Return Rate (%)</label>
                              <input
                                type="number"
                                value={superAcc.returnRate}
                                onInput={(e) => updateSuperAccount(person.id, superAcc.id, { returnRate: parseFloat((e.target as HTMLInputElement).value) })}
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
                  <p class="text-xs text-gray-500 italic p-3 bg-white rounded border border-gray-200">
                    No super accounts yet. Click "+ Add Super" to add one.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Mode Configuration */}
      {householdMode === "single" && config.baseParameters.people && config.baseParameters.people.length > 0 && (
        <div class="space-y-6">
          {config.baseParameters.people.slice(0, 1).map((person) => (
            <div key={person.id} class="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <div class="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={person.name}
                  onInput={(e) => updatePerson(person.id, { name: (e.target as HTMLInputElement).value })}
                  class="text-lg font-semibold px-3 py-1 border border-blue-300 rounded bg-white"
                  placeholder="Your name"
                />
              </div>

              {/* Age Configuration */}
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Current Age</label>
                  <input
                    type="number"
                    value={person.currentAge}
                    onInput={(e) => updatePerson(person.id, { currentAge: parseInt((e.target as HTMLInputElement).value) })}
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Retirement Age</label>
                  <input
                    type="number"
                    value={person.retirementAge}
                    onInput={(e) => updatePerson(person.id, { retirementAge: parseInt((e.target as HTMLInputElement).value) })}
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Income Sources */}
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700">Income Sources</label>
                  <button
                    onClick={() => addIncomeSource(person.id)}
                    class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Income
                  </button>
                </div>

                {person.incomeSources && person.incomeSources.length > 0 ? (
                  <div class="space-y-2">
                    {person.incomeSources.map((income) => (
                      <div key={income.id} class="p-3 bg-white rounded border border-gray-200">
                        <div class="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={income.label}
                            onInput={(e) => updateIncomeSource(person.id, income.id, { label: (e.target as HTMLInputElement).value })}
                            placeholder="Income label"
                            class="text-sm font-medium px-2 py-1 border border-gray-300 rounded flex-1 mr-2"
                          />
                          <button
                            onClick={() => removeIncomeSource(person.id, income.id)}
                            class="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label class="text-xs text-gray-600">Amount</label>
                            <input
                              type="number"
                              value={income.amount}
                              onInput={(e) => updateIncomeSource(person.id, income.id, { amount: parseFloat((e.target as HTMLInputElement).value) })}
                              class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              step="100"
                            />
                          </div>
                          <div>
                            <label class="text-xs text-gray-600">Frequency</label>
                            <select
                              value={income.frequency}
                              onChange={(e) => updateIncomeSource(person.id, income.id, { frequency: (e.target as HTMLSelectElement).value as PaymentFrequency })}
                              class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="fortnightly">Fortnightly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label class="flex items-center cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={income.isBeforeTax}
                              onChange={(e) => updateIncomeSource(person.id, income.id, { isBeforeTax: (e.target as HTMLInputElement).checked })}
                              class="w-3 h-3 text-blue-600 border-gray-300 rounded mr-1"
                            />
                            <span class="text-gray-600">Before tax (taxable income)</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p class="text-xs text-gray-500 italic p-3 bg-white rounded border border-gray-200">
                    No income sources yet. Click "+ Add Income" to add one.
                  </p>
                )}
              </div>

              {/* Super Accounts */}
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700">Super Accounts</label>
                  <button
                    onClick={() => addSuperAccount(person.id)}
                    class="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    + Add Super
                  </button>
                </div>

                {person.superAccounts && person.superAccounts.length > 0 ? (
                  <div class="space-y-2">
                    {person.superAccounts.map((superAcc) => (
                      <div key={superAcc.id} class="p-3 bg-white rounded border border-gray-200">
                        <div class="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={superAcc.label}
                            onInput={(e) => updateSuperAccount(person.id, superAcc.id, { label: (e.target as HTMLInputElement).value })}
                            placeholder="Super account label"
                            class="text-sm font-medium px-2 py-1 border border-gray-300 rounded flex-1 mr-2"
                          />
                          <button
                            onClick={() => removeSuperAccount(person.id, superAcc.id)}
                            class="text-red-600 hover:text-red-700 text-xs"
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
                              onInput={(e) => updateSuperAccount(person.id, superAcc.id, { balance: parseFloat((e.target as HTMLInputElement).value) })}
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
                                onInput={(e) => updateSuperAccount(person.id, superAcc.id, { contributionRate: parseFloat((e.target as HTMLInputElement).value) })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                step="0.5"
                              />
                            </div>
                            <div>
                              <label class="text-xs text-gray-600">Return Rate (%)</label>
                              <input
                                type="number"
                                value={superAcc.returnRate}
                                onInput={(e) => updateSuperAccount(person.id, superAcc.id, { returnRate: parseFloat((e.target as HTMLInputElement).value) })}
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
                  <p class="text-xs text-gray-500 italic p-3 bg-white rounded border border-gray-200">
                    No super accounts yet. Click "+ Add Super" to add one.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
