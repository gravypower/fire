/**
 * HousePurchaseIsland - Plan future house purchases (deposit, buying costs,
 * resulting mortgage, ongoing holding costs, appreciation) that feed into
 * the retirement simulation.
 */

import { useState } from "preact/hooks";
import type {
  PaymentFrequency,
  SimulationConfiguration,
} from "../types/financial.ts";
import type { HousePurchase } from "../types/property.ts";

interface HousePurchaseIslandProps {
  config: SimulationConfiguration;
  onConfigChange: (config: SimulationConfiguration) => void;
}

function toDateInputValue(date?: Date): string {
  return date ? new Date(date).toISOString().split("T")[0] : "";
}

function formatCurrency(value: number): string {
  return `$${
    value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }`;
}

export default function HousePurchaseIsland(
  { config, onConfigChange }: HousePurchaseIslandProps,
) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<HousePurchase>>({});
  const [error, setError] = useState<string | null>(null);

  const houses = config.baseParameters.housePurchases || [];
  const rentExpenses = (config.baseParameters.expenseItems || []).filter(
    (item) => item.enabled,
  );

  const startAdd = () => {
    setFormData({
      name: "New House",
      purchaseDate: new Date(),
      price: 0,
      depositAmount: 0,
      buyingCosts: 0,
      appreciationRate: 4,
      movingIn: true,
      mortgageInterestRate: 6,
      mortgagePaymentAmount: 0,
      mortgagePaymentFrequency: "monthly",
      monthlyHoldingCosts: 0,
    });
    setIsAdding(true);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (house: HousePurchase) => {
    setFormData({ ...house });
    setIsAdding(false);
    setEditingId(house.id);
    setError(null);
  };

  const cancelForm = () => {
    setFormData({});
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const saveHouse = () => {
    const {
      name,
      purchaseDate,
      price,
      depositAmount,
      buyingCosts,
      appreciationRate,
      movingIn,
      linkedRentExpenseId,
      mortgageInterestRate,
      mortgagePaymentAmount,
      mortgagePaymentFrequency,
      hasOffset,
      offsetBalance,
      isDebtRecycling,
      monthlyHoldingCosts,
      notes,
    } = formData;

    if (!name) {
      setError("Please enter a name for this purchase");
      return;
    }
    if (!purchaseDate) {
      setError("Please enter a purchase date");
      return;
    }
    if (!price || price <= 0) {
      setError("Please enter a valid purchase price");
      return;
    }
    if (
      depositAmount === undefined || depositAmount < 0 || depositAmount > price
    ) {
      setError("Deposit must be between 0 and the purchase price");
      return;
    }
    if (buyingCosts === undefined || buyingCosts < 0) {
      setError("Please enter valid buying costs (0 if none)");
      return;
    }

    const house: HousePurchase = {
      id: editingId || `house-${Date.now()}`,
      name,
      purchaseDate,
      price,
      depositAmount,
      buyingCosts,
      appreciationRate: appreciationRate ?? 0,
      movingIn: movingIn ?? false,
      linkedRentExpenseId: movingIn ? linkedRentExpenseId : undefined,
      mortgageInterestRate: mortgageInterestRate ?? 0,
      mortgagePaymentAmount: mortgagePaymentAmount ?? 0,
      mortgagePaymentFrequency: mortgagePaymentFrequency ?? "monthly",
      hasOffset,
      offsetBalance: hasOffset ? offsetBalance ?? 0 : undefined,
      isDebtRecycling,
      monthlyHoldingCosts: monthlyHoldingCosts ?? 0,
      notes: notes || undefined,
    };

    const updatedHouses = editingId
      ? houses.map((h) => (h.id === editingId ? house : h))
      : [...houses, house];

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        housePurchases: updatedHouses,
      },
    });

    cancelForm();
  };

  const removeHouse = (id: string) => {
    if (!confirm("Delete this planned house purchase?")) return;
    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        housePurchases: houses.filter((h) => h.id !== id),
      },
    });
  };

  const describeHouse = (house: HousePurchase): string => {
    const loanPrincipal = Math.max(0, house.price - house.depositAmount);
    const dateLabel = new Date(house.purchaseDate).toLocaleDateString();
    const offsetLabel = house.hasOffset
      ? ` · Offset: ${formatCurrency(house.offsetBalance ?? 0)}`
      : "";
    return `${formatCurrency(house.price)} on ${dateLabel} · Deposit ${
      formatCurrency(house.depositAmount)
    } + ${formatCurrency(house.buyingCosts)} costs · Mortgage ${
      formatCurrency(loanPrincipal)
    } @ ${house.mortgageInterestRate}%${offsetLabel}`;
  };

  return (
    <div class="card p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg
          class="w-7 h-7 mr-3 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        Property
      </h2>

      <p class="text-sm text-gray-600 mb-6">
        Plan one or more future house purchases. Each one draws its deposit and
        buying costs down from cash on the purchase date, creates a mortgage
        that amortizes from then on, and grows in value at the appreciation rate
        you set - all of it factored into the main retirement simulation.
      </p>

      {!isAdding && !editingId && (
        <div class="mb-4">
          <button
            onClick={startAdd}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            + Add House Purchase
          </button>
        </div>
      )}

      {(isAdding || editingId) && (
        <div class="border border-gray-300 rounded-lg p-4 bg-gray-50 mb-4 fade-in">
          <h4 class="text-md font-semibold mb-3 text-gray-800">
            {editingId ? "Edit House Purchase" : "Add House Purchase"}
          </h4>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  name: (e.target as HTMLInputElement).value,
                })}
              placeholder="e.g., Primary Home, Investment Property"
              class="input-field text-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={toDateInputValue(formData.purchaseDate)}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  setFormData({
                    ...formData,
                    purchaseDate: value ? new Date(value) : undefined,
                  });
                }}
                class="input-field text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Purchase Price ($) *
              </label>
              <input
                type="number"
                value={formData.price ?? ""}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    price: parseFloat((e.target as HTMLInputElement).value) ||
                      0,
                  })}
                class="input-field text-sm"
                step="1000"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Deposit ($) *
              </label>
              <input
                type="number"
                value={formData.depositAmount ?? ""}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    depositAmount:
                      parseFloat((e.target as HTMLInputElement).value) || 0,
                  })}
                class="input-field text-sm"
                step="1000"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Buying Costs ($)
              </label>
              <input
                type="number"
                value={formData.buyingCosts ?? ""}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    buyingCosts:
                      parseFloat((e.target as HTMLInputElement).value) || 0,
                  })}
                placeholder="Stamp duty, legal fees, inspections"
                class="input-field text-sm"
                step="100"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Appreciation Rate (%/year)
              </label>
              <input
                type="number"
                value={formData.appreciationRate ?? ""}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    appreciationRate:
                      parseFloat((e.target as HTMLInputElement).value) || 0,
                  })}
                class="input-field text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Ongoing Holding Costs ($/month)
              </label>
              <input
                type="number"
                value={formData.monthlyHoldingCosts ?? ""}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    monthlyHoldingCosts:
                      parseFloat((e.target as HTMLInputElement).value) || 0,
                  })}
                placeholder="Rates, insurance, maintenance"
                class="input-field text-sm"
                step="10"
              />
            </div>
          </div>

          {/* Moving in / rent */}
          <div class="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
            <label class="flex items-center cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={formData.movingIn ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    movingIn: (e.target as HTMLInputElement).checked,
                  })}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm font-medium text-gray-700">
                I'll move into this house
              </span>
            </label>
            <p class="text-xs text-gray-600 mb-2">
              If checked, an existing rent expense can be ended automatically on
              the purchase date. Leave unchecked for an investment property.
            </p>
            {formData.movingIn && (
              <div class="fade-in">
                <label class="text-xs text-gray-600">
                  Rent expense to stop
                </label>
                <select
                  value={formData.linkedRentExpenseId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      linkedRentExpenseId:
                        (e.target as HTMLSelectElement).value || undefined,
                    })}
                  class="input-field text-sm"
                >
                  <option value="">None</option>
                  {rentExpenses.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mortgage */}
          <div class="mb-3 p-3 bg-gray-100 rounded border border-gray-200">
            <h5 class="text-sm font-semibold text-gray-700 mb-2">
              Mortgage (on {formatCurrency(
                Math.max(
                  0,
                  (formData.price ?? 0) - (formData.depositAmount ?? 0),
                ),
              )})
            </h5>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Interest Rate (%) *
                </label>
                <input
                  type="number"
                  value={formData.mortgageInterestRate ?? ""}
                  onInput={(e) =>
                    setFormData({
                      ...formData,
                      mortgageInterestRate:
                        parseFloat((e.target as HTMLInputElement).value) || 0,
                    })}
                  class="input-field text-sm"
                  step="0.1"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  value={formData.mortgagePaymentAmount ?? ""}
                  onInput={(e) =>
                    setFormData({
                      ...formData,
                      mortgagePaymentAmount:
                        parseFloat((e.target as HTMLInputElement).value) || 0,
                    })}
                  class="input-field text-sm"
                  step="100"
                />
              </div>
            </div>
            <div class="mb-3">
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Payment Frequency *
              </label>
              <select
                value={formData.mortgagePaymentFrequency || "monthly"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mortgagePaymentFrequency: (e.target as HTMLSelectElement)
                      .value as PaymentFrequency,
                  })}
                class="input-field text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <label class="flex items-center cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={formData.hasOffset || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hasOffset: (e.target as HTMLInputElement).checked,
                  })}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">Use Offset Account</span>
            </label>
            {formData.hasOffset && (
              <div class="mb-2 ml-6">
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Current Offset Balance ($)
                </label>
                <input
                  type="number"
                  value={formData.offsetBalance ?? 0}
                  onInput={(e) =>
                    setFormData({
                      ...formData,
                      offsetBalance: parseFloat(
                        (e.target as HTMLInputElement).value,
                      ) || 0,
                    })}
                  class="input-field text-sm"
                  step="1000"
                />
              </div>
            )}
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDebtRecycling || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isDebtRecycling: (e.target as HTMLInputElement).checked,
                  })}
                class="w-4 h-4 text-green-600 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">
                Enable Debt Recycling (Tax Deductible Interest)
              </span>
            </label>
          </div>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={formData.notes || ""}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  notes: (e.target as HTMLInputElement).value,
                })}
              class="input-field text-sm"
            />
          </div>

          {error && <p class="text-xs text-red-600 mb-3">{error}</p>}

          <div class="flex gap-3">
            <button onClick={saveHouse} class="btn-primary flex-1">
              {editingId ? "Update" : "Add"} House Purchase
            </button>
            <button onClick={cancelForm} class="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isAdding && !editingId && (
        houses.length > 0
          ? (
            <div class="space-y-3">
              {houses.map((house) => (
                <div
                  key={house.id}
                  class="p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-lg" role="img" aria-label="house">
                        🏡
                      </span>
                      <h4 class="text-sm font-semibold text-gray-800">
                        {house.name}
                      </h4>
                      {house.movingIn && (
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Moving in
                        </span>
                      )}
                    </div>
                    <div class="flex gap-2">
                      <button
                        onClick={() => startEdit(house)}
                        class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeHouse(house.id)}
                        class="text-red-600 hover:text-red-700 text-xs px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p class="text-xs text-gray-600">{describeHouse(house)}</p>
                  {house.monthlyHoldingCosts > 0 && (
                    <p class="text-xs text-gray-500 mt-1">
                      Holding costs:{" "}
                      {formatCurrency(house.monthlyHoldingCosts)}/month from
                      purchase
                    </p>
                  )}
                  {house.notes && (
                    <p class="text-xs text-gray-500 mt-1">{house.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )
          : <p class="text-sm text-gray-500">No house purchases planned yet.</p>
      )}
    </div>
  );
}
