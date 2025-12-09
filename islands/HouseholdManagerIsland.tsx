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

  // Income source management state
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeFormData, setIncomeFormData] = useState<Partial<IncomeSource>>({});
  const [incomePersonId, setIncomePersonId] = useState<string | null>(null);

  // Super account management state
  const [isAddingSuper, setIsAddingSuper] = useState(false);
  const [editingSuperId, setEditingSuperId] = useState<string | null>(null);
  const [superFormData, setSuperFormData] = useState<Partial<import("../types/financial.ts").SuperAccount>>({});
  const [superPersonId, setSuperPersonId] = useState<string | null>(null);

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
   * Starts adding a new income source
   */
  const startAddIncome = (personId: string) => {
    setIncomeFormData({
      label: "New Income",
      amount: 0,
      frequency: "yearly" as PaymentFrequency,
      isBeforeTax: true,
      isOneOff: false,
    });
    setIncomePersonId(personId);
    setIsAddingIncome(true);
    setEditingIncomeId(null);
  };

  /**
   * Starts editing an income source
   */
  const startEditIncome = (personId: string, income: IncomeSource) => {
    setIncomeFormData({ ...income });
    setIncomePersonId(personId);
    setIsAddingIncome(false);
    setEditingIncomeId(income.id);
  };

  /**
   * Cancels income add/edit
   */
  const cancelIncomeForm = () => {
    setIncomeFormData({});
    setIncomePersonId(null);
    setIsAddingIncome(false);
    setEditingIncomeId(null);
  };

  /**
   * Saves an income source (add or update)
   */
  const saveIncome = () => {
    if (!incomePersonId || !config.baseParameters.people) return;
    if (!incomeFormData.label || incomeFormData.amount === undefined || incomeFormData.amount < 0) {
      alert("Please enter a valid income label and amount");
      return;
    }

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === incomePersonId) {
        let updatedIncomeSources;
        if (editingIncomeId) {
          // Update existing income
          updatedIncomeSources = person.incomeSources.map(inc =>
            inc.id === editingIncomeId ? { ...inc, ...incomeFormData } as IncomeSource : inc
          );
        } else {
          // Add new income
          const newIncome: IncomeSource = {
            id: `income-${Date.now()}`,
            personId: incomePersonId,
            ...incomeFormData as any,
          };
          updatedIncomeSources = [...person.incomeSources, newIncome];
        }
        return { ...person, incomeSources: updatedIncomeSources };
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

    cancelIncomeForm();
  };

  /**
   * Removes an income source from a person
   */
  const removeIncomeSource = (personId: string, incomeId: string) => {
    if (!confirm("Delete this income source?")) return;
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
   * Starts adding a new super account
   */
  const startAddSuper = (personId: string) => {
    setSuperFormData({
      label: "New Super Account",
      balance: 0,
      contributionRate: 11,
      returnRate: 7,
    });
    setSuperPersonId(personId);
    setIsAddingSuper(true);
    setEditingSuperId(null);
  };

  /**
   * Starts editing a super account
   */
  const startEditSuper = (personId: string, superAcc: import("../types/financial.ts").SuperAccount) => {
    setSuperFormData({ ...superAcc });
    setSuperPersonId(personId);
    setIsAddingSuper(false);
    setEditingSuperId(superAcc.id);
  };

  /**
   * Cancels super add/edit
   */
  const cancelSuperForm = () => {
    setSuperFormData({});
    setSuperPersonId(null);
    setIsAddingSuper(false);
    setEditingSuperId(null);
  };

  /**
   * Saves a super account (add or update)
   */
  const saveSuper = () => {
    if (!superPersonId || !config.baseParameters.people) return;
    if (!superFormData.label || superFormData.balance === undefined || superFormData.balance < 0) {
      alert("Please enter a valid super account label and balance");
      return;
    }

    const updatedPeople = config.baseParameters.people.map(person => {
      if (person.id === superPersonId) {
        let updatedSuperAccounts;
        if (editingSuperId) {
          // Update existing super
          updatedSuperAccounts = person.superAccounts.map(sup =>
            sup.id === editingSuperId ? { ...sup, ...superFormData } as import("../types/financial.ts").SuperAccount : sup
          );
        } else {
          // Add new super
          const newSuper: import("../types/financial.ts").SuperAccount = {
            id: `super-${Date.now()}`,
            personId: superPersonId,
            ...superFormData as any,
          };
          updatedSuperAccounts = [...person.superAccounts, newSuper];
        }
        return { ...person, superAccounts: updatedSuperAccounts };
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

    cancelSuperForm();
  };

  /**
   * Removes a super account from a person
   */
  const removeSuperAccount = (personId: string, superId: string) => {
    if (!confirm("Delete this super account?")) return;
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
                  {(!isAddingIncome || incomePersonId !== person.id) && (!editingIncomeId || incomePersonId !== person.id) && (
                    <button
                      onClick={() => startAddIncome(person.id)}
                      class="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      + Add Income
                    </button>
                  )}
                </div>

                {/* Income Form (Add/Edit) */}
                {((isAddingIncome && incomePersonId === person.id) || (editingIncomeId && incomePersonId === person.id)) && (
                  <div class="border border-purple-300 rounded-lg p-3 bg-purple-50 mb-2 fade-in">
                    <h5 class="text-sm font-semibold mb-2 text-gray-800">
                      {editingIncomeId ? "Edit Income" : "Add New Income"}
                    </h5>

                    <div class="mb-2">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Income Label *</label>
                      <input
                        type="text"
                        value={incomeFormData.label || ""}
                        onInput={(e) => setIncomeFormData({ ...incomeFormData, label: (e.target as HTMLInputElement).value })}
                        placeholder="e.g., Salary, Freelance"
                        class="input-field text-sm"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
                        <input
                          type="number"
                          value={incomeFormData.amount ?? ""}
                          onInput={(e) => setIncomeFormData({ ...incomeFormData, amount: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                          class="input-field text-sm"
                          step="100"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Frequency *</label>
                        <select
                          value={incomeFormData.frequency || "yearly"}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, frequency: (e.target as HTMLSelectElement).value as PaymentFrequency })}
                          class="input-field text-sm"
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
                          checked={incomeFormData.isBeforeTax ?? true}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, isBeforeTax: (e.target as HTMLInputElement).checked })}
                          class="w-3 h-3 text-purple-600 border-gray-300 rounded mr-1"
                        />
                        <span class="text-gray-700">Before tax (taxable income)</span>
                      </label>
                    </div>

                    <div class="mb-2">
                      <label class="flex items-center cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={incomeFormData.isOneOff || false}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, isOneOff: (e.target as HTMLInputElement).checked })}
                          class="w-3 h-3 text-green-600 border-gray-300 rounded mr-1"
                        />
                        <span class="text-gray-700">One-off income (e.g., car sale)</span>
                      </label>
                    </div>

                    {incomeFormData.isOneOff && (
                      <div class="mb-2 fade-in">
                        <label class="block text-xs font-medium text-gray-700 mb-1">One-off Date *</label>
                        <input
                          type="date"
                          value={incomeFormData.oneOffDate ? new Date(incomeFormData.oneOffDate).toISOString().split('T')[0] : ""}
                          onInput={(e) => setIncomeFormData({ ...incomeFormData, oneOffDate: new Date((e.target as HTMLInputElement).value) })}
                          class="input-field text-sm"
                        />
                      </div>
                    )}

                    {!incomeFormData.isOneOff && (
                      <div class="grid grid-cols-2 gap-2 mb-2 fade-in">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Start Date (Optional)</label>
                          <input
                            type="date"
                            value={incomeFormData.startDate ? new Date(incomeFormData.startDate).toISOString().split('T')[0] : ""}
                            onInput={(e) => setIncomeFormData({ ...incomeFormData, startDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                            class="input-field text-sm"
                          />
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">End Date (Optional)</label>
                          <input
                            type="date"
                            value={incomeFormData.endDate ? new Date(incomeFormData.endDate).toISOString().split('T')[0] : ""}
                            onInput={(e) => setIncomeFormData({ ...incomeFormData, endDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                            class="input-field text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div class="flex gap-2 mt-3">
                      <button onClick={saveIncome} class="btn-primary flex-1 text-xs py-1">
                        {editingIncomeId ? "Update" : "Add"} Income
                      </button>
                      <button onClick={cancelIncomeForm} class="btn-secondary flex-1 text-xs py-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Income List (Summary View) */}
                {(!isAddingIncome || incomePersonId !== person.id) && (!editingIncomeId || incomePersonId !== person.id) && (
                  <>
                    {person.incomeSources && person.incomeSources.length > 0 ? (
                      <div class="space-y-2">
                        {person.incomeSources.map((income) => (
                          <div key={income.id} class="p-2 bg-white rounded border border-gray-200">
                            <div class="flex items-center justify-between mb-1">
                              <h5 class="text-sm font-semibold text-gray-800">{income.label}</h5>
                              <div class="flex gap-2">
                                <button
                                  onClick={() => startEditIncome(person.id, income)}
                                  class="text-blue-600 hover:text-blue-800 text-xs px-1"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeIncomeSource(person.id, income.id)}
                                  class="text-red-600 hover:text-red-700 text-xs px-1"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <span class="text-gray-500">Amount:</span> <span class="font-medium text-gray-800">${income.amount.toLocaleString()}/{income.frequency}</span>
                              </div>
                              <div>
                                <span class="text-gray-500">Tax:</span> <span class="font-medium text-gray-800">{income.isBeforeTax ? "Before tax" : "After tax"}</span>
                              </div>
                              {income.isOneOff && (
                                <div class="col-span-2">
                                  <span class="text-green-600 font-medium">One-off{income.oneOffDate ? ` on ${new Date(income.oneOffDate).toLocaleDateString()}` : ""}</span>
                                </div>
                              )}
                              {!income.isOneOff && (income.startDate || income.endDate) && (
                                <div class="col-span-2 text-xs text-gray-500">
                                  {income.startDate && `From: ${new Date(income.startDate).toLocaleDateString()}`}
                                  {income.startDate && income.endDate && " | "}
                                  {income.endDate && `To: ${new Date(income.endDate).toLocaleDateString()}`}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p class="text-xs text-gray-500 italic p-3 bg-white rounded border border-gray-200">
                        No income sources yet. Click "+ Add Income" to add one.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Super Accounts */}
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700">Super Accounts</label>
                  {(!isAddingSuper || superPersonId !== person.id) && (!editingSuperId || superPersonId !== person.id) && (
                    <button
                      onClick={() => startAddSuper(person.id)}
                      class="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      + Add Super
                    </button>
                  )}
                </div>

                {/* Super Form (Add/Edit) */}
                {((isAddingSuper && superPersonId === person.id) || (editingSuperId && superPersonId === person.id)) && (
                  <div class="border border-yellow-300 rounded-lg p-3 bg-yellow-50 mb-2 fade-in">
                    <h5 class="text-sm font-semibold mb-2 text-gray-800">
                      {editingSuperId ? "Edit Super Account" : "Add New Super Account"}
                    </h5>

                    <div class="mb-2">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
                      <input
                        type="text"
                        value={superFormData.label || ""}
                        onInput={(e) => setSuperFormData({ ...superFormData, label: (e.target as HTMLInputElement).value })}
                        placeholder="e.g., AustralianSuper, REST"
                        class="input-field text-sm"
                      />
                    </div>

                    <div class="mb-2">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Current Balance ($) *</label>
                      <input
                        type="number"
                        value={superFormData.balance ?? ""}
                        onInput={(e) => setSuperFormData({ ...superFormData, balance: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                        class="input-field text-sm"
                        step="1000"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Contribution Rate (%) *</label>
                        <input
                          type="number"
                          value={superFormData.contributionRate ?? ""}
                          onInput={(e) => setSuperFormData({ ...superFormData, contributionRate: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                          class="input-field text-sm"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Return Rate (%) *</label>
                        <input
                          type="number"
                          value={superFormData.returnRate ?? ""}
                          onInput={(e) => setSuperFormData({ ...superFormData, returnRate: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                          class="input-field text-sm"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                      <button onClick={saveSuper} class="btn-primary flex-1 text-xs py-1">
                        {editingSuperId ? "Update" : "Add"} Super Account
                      </button>
                      <button onClick={cancelSuperForm} class="btn-secondary flex-1 text-xs py-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Super List (Summary View) */}
                {(!isAddingSuper || superPersonId !== person.id) && (!editingSuperId || superPersonId !== person.id) && (
                  <>
                    {person.superAccounts && person.superAccounts.length > 0 ? (
                      <div class="space-y-2">
                        {person.superAccounts.map((superAcc) => (
                          <div key={superAcc.id} class="p-2 bg-white rounded border border-gray-200">
                            <div class="flex items-center justify-between mb-1">
                              <h5 class="text-sm font-semibold text-gray-800">{superAcc.label}</h5>
                              <div class="flex gap-2">
                                <button
                                  onClick={() => startEditSuper(person.id, superAcc)}
                                  class="text-blue-600 hover:text-blue-800 text-xs px-1"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeSuperAccount(person.id, superAcc.id)}
                                  class="text-red-600 hover:text-red-700 text-xs px-1"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-xs text-gray-600">
                              <div>
                                <span class="text-gray-500">Balance:</span> <span class="font-medium text-gray-800">${superAcc.balance.toLocaleString()}</span>
                              </div>
                              <div>
                                <span class="text-gray-500">Contribution:</span> <span class="font-medium text-gray-800">{superAcc.contributionRate}%</span>
                              </div>
                              <div>
                                <span class="text-gray-500">Return:</span> <span class="font-medium text-gray-800">{superAcc.returnRate}%</span>
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
                  </>
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
                  {(!isAddingIncome || incomePersonId !== person.id) && (!editingIncomeId || incomePersonId !== person.id) && (
                    <button
                      onClick={() => startAddIncome(person.id)}
                      class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add Income
                    </button>
                  )}
                </div>

                {/* Income Form (Add/Edit) - Same as couple mode */}
                {((isAddingIncome && incomePersonId === person.id) || (editingIncomeId && incomePersonId === person.id)) && (
                  <div class="border border-blue-300 rounded-lg p-3 bg-blue-50 mb-2 fade-in">
                    <h5 class="text-sm font-semibold mb-2 text-gray-800">
                      {editingIncomeId ? "Edit Income" : "Add New Income"}
                    </h5>

                    <div class="mb-2">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Income Label *</label>
                      <input
                        type="text"
                        value={incomeFormData.label || ""}
                        onInput={(e) => setIncomeFormData({ ...incomeFormData, label: (e.target as HTMLInputElement).value })}
                        placeholder="e.g., Salary, Freelance"
                        class="input-field text-sm"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
                        <input
                          type="number"
                          value={incomeFormData.amount ?? ""}
                          onInput={(e) => setIncomeFormData({ ...incomeFormData, amount: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                          class="input-field text-sm"
                          step="100"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Frequency *</label>
                        <select
                          value={incomeFormData.frequency || "yearly"}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, frequency: (e.target as HTMLSelectElement).value as PaymentFrequency })}
                          class="input-field text-sm"
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
                          checked={incomeFormData.isBeforeTax ?? true}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, isBeforeTax: (e.target as HTMLInputElement).checked })}
                          class="w-3 h-3 text-blue-600 border-gray-300 rounded mr-1"
                        />
                        <span class="text-gray-700">Before tax (taxable income)</span>
                      </label>
                    </div>

                    <div class="mb-2">
                      <label class="flex items-center cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={incomeFormData.isOneOff || false}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, isOneOff: (e.target as HTMLInputElement).checked })}
                          class="w-3 h-3 text-green-600 border-gray-300 rounded mr-1"
                        />
                        <span class="text-gray-700">One-off income (e.g., car sale)</span>
                      </label>
                    </div>

                    {incomeFormData.isOneOff && (
                      <div class="mb-2 fade-in">
                        <label class="block text-xs font-medium text-gray-700 mb-1">One-off Date *</label>
                        <input
                          type="date"
                          value={incomeFormData.oneOffDate ? new Date(incomeFormData.oneOffDate).toISOString().split('T')[0] : ""}
                          onInput={(e) => setIncomeFormData({ ...incomeFormData, oneOffDate: new Date((e.target as HTMLInputElement).value) })}
                          class="input-field text-sm"
                        />
                      </div>
                    )}

                    {!incomeFormData.isOneOff && (
                      <div class="grid grid-cols-2 gap-2 mb-2 fade-in">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Start Date (Optional)</label>
                          <input
                            type="date"
                            value={incomeFormData.startDate ? new Date(incomeFormData.startDate).toISOString().split('T')[0] : ""}
                            onInput={(e) => setIncomeFormData({ ...incomeFormData, startDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                            class="input-field text-sm"
                          />
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">End Date (Optional)</label>
                          <input
                            type="date"
                            value={incomeFormData.endDate ? new Date(incomeFormData.endDate).toISOString().split('T')[0] : ""}
                            onInput={(e) => setIncomeFormData({ ...incomeFormData, endDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                            class="input-field text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div class="flex gap-2 mt-3">
                      <button onClick={saveIncome} class="btn-primary flex-1 text-xs py-1">
                        {editingIncomeId ? "Update" : "Add"} Income
                      </button>
                      <button onClick={cancelIncomeForm} class="btn-secondary flex-1 text-xs py-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Income List (Summary View) */}
                {(!isAddingIncome || incomePersonId !== person.id) && (!editingIncomeId || incomePersonId !== person.id) && (
                  <>
                    {person.incomeSources && person.incomeSources.length > 0 ? (
                      <div class="space-y-2">
                        {person.incomeSources.map((income) => (
                          <div key={income.id} class="p-2 bg-white rounded border border-gray-200">
                            <div class="flex items-center justify-between mb-1">
                              <h5 class="text-sm font-semibold text-gray-800">{income.label}</h5>
                              <div class="flex gap-2">
                                <button
                                  onClick={() => startEditIncome(person.id, income)}
                                  class="text-blue-600 hover:text-blue-800 text-xs px-1"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeIncomeSource(person.id, income.id)}
                                  class="text-red-600 hover:text-red-700 text-xs px-1"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <span class="text-gray-500">Amount:</span> <span class="font-medium text-gray-800">${income.amount.toLocaleString()}/{income.frequency}</span>
                              </div>
                              <div>
                                <span class="text-gray-500">Tax:</span> <span class="font-medium text-gray-800">{income.isBeforeTax ? "Before tax" : "After tax"}</span>
                              </div>
                              {income.isOneOff && (
                                <div class="col-span-2">
                                  <span class="text-green-600 font-medium">One-off{income.oneOffDate ? ` on ${new Date(income.oneOffDate).toLocaleDateString()}` : ""}</span>
                                </div>
                              )}
                              {!income.isOneOff && (income.startDate || income.endDate) && (
                                <div class="col-span-2 text-xs text-gray-500">
                                  {income.startDate && `From: ${new Date(income.startDate).toLocaleDateString()}`}
                                  {income.startDate && income.endDate && " | "}
                                  {income.endDate && `To: ${new Date(income.endDate).toLocaleDateString()}`}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p class="text-xs text-gray-500 italic p-3 bg-white rounded border border-gray-200">
                        No income sources yet. Click "+ Add Income" to add one.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Super Accounts */}
              <div class="mb-3">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700">Super Accounts</label>
                  {(!isAddingSuper || superPersonId !== person.id) && (!editingSuperId || superPersonId !== person.id) && (
                    <button
                      onClick={() => startAddSuper(person.id)}
                      class="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      + Add Super
                    </button>
                  )}
                </div>

                {/* Super Form (Add/Edit) - Same as couple mode */}
                {((isAddingSuper && superPersonId === person.id) || (editingSuperId && superPersonId === person.id)) && (
                  <div class="border border-yellow-300 rounded-lg p-3 bg-yellow-50 mb-2 fade-in">
                    <h5 class="text-sm font-semibold mb-2 text-gray-800">
                      {editingSuperId ? "Edit Super Account" : "Add New Super Account"}
                    </h5>

                    <div class="mb-2">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
                      <input
                        type="text"
                        value={superFormData.label || ""}
                        onInput={(e) => setSuperFormData({ ...superFormData, label: (e.target as HTMLInputElement).value })}
                        placeholder="e.g., AustralianSuper, REST"
                        class="input-field text-sm"
                      />
                    </div>

                    <div class="mb-2">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Current Balance ($) *</label>
                      <input
                        type="number"
                        value={superFormData.balance ?? ""}
                        onInput={(e) => setSuperFormData({ ...superFormData, balance: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                        class="input-field text-sm"
                        step="1000"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Contribution Rate (%) *</label>
                        <input
                          type="number"
                          value={superFormData.contributionRate ?? ""}
                          onInput={(e) => setSuperFormData({ ...superFormData, contributionRate: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                          class="input-field text-sm"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Return Rate (%) *</label>
                        <input
                          type="number"
                          value={superFormData.returnRate ?? ""}
                          onInput={(e) => setSuperFormData({ ...superFormData, returnRate: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                          class="input-field text-sm"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                      <button onClick={saveSuper} class="btn-primary flex-1 text-xs py-1">
                        {editingSuperId ? "Update" : "Add"} Super Account
                      </button>
                      <button onClick={cancelSuperForm} class="btn-secondary flex-1 text-xs py-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Super List (Summary View) */}
                {(!isAddingSuper || superPersonId !== person.id) && (!editingSuperId || superPersonId !== person.id) && (
                  <>
                    {person.superAccounts && person.superAccounts.length > 0 ? (
                      <div class="space-y-2">
                        {person.superAccounts.map((superAcc) => (
                          <div key={superAcc.id} class="p-2 bg-white rounded border border-gray-200">
                            <div class="flex items-center justify-between mb-1">
                              <h5 class="text-sm font-semibold text-gray-800">{superAcc.label}</h5>
                              <div class="flex gap-2">
                                <button
                                  onClick={() => startEditSuper(person.id, superAcc)}
                                  class="text-blue-600 hover:text-blue-800 text-xs px-1"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeSuperAccount(person.id, superAcc.id)}
                                  class="text-red-600 hover:text-red-700 text-xs px-1"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-xs text-gray-600">
                              <div>
                                <span class="text-gray-500">Balance:</span> <span class="font-medium text-gray-800">${superAcc.balance.toLocaleString()}</span>
                              </div>
                              <div>
                                <span class="text-gray-500">Contribution:</span> <span class="font-medium text-gray-800">{superAcc.contributionRate}%</span>
                              </div>
                              <div>
                                <span class="text-gray-500">Return:</span> <span class="font-medium text-gray-800">{superAcc.returnRate}%</span>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
