/**
 * ExpenseManagerIsland - Manages individual expense items
 */

import { useState } from "preact/hooks";
import type { ExpenseItem, ExpenseCategory, ExpenseSummary } from "../types/expenses.ts";
import { EXPENSE_TEMPLATES, CATEGORY_INFO } from "../types/expenses.ts";
import type { PaymentFrequency } from "../types/financial.ts";
import { ExpenseProcessor } from "../lib/processors.ts";

interface ExpenseManagerIslandProps {
  expenses: ExpenseItem[];
  onExpensesChange: (expenses: ExpenseItem[]) => void;
}

export default function ExpenseManagerIsland({
  expenses,
  onExpensesChange,
}: ExpenseManagerIslandProps) {
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ExpenseItem>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  /**
   * Gets empty form data
   */
  function getEmptyForm(): Partial<ExpenseItem> {
    return {
      name: "",
      amount: 0,
      frequency: "monthly",
      category: "other",
      enabled: true,
      isOneOff: false,
    };
  }

  /**
   * Calculates expense summaries by category
   */
  function getExpenseSummaries(): ExpenseSummary[] {
    const summaries: Record<ExpenseCategory, ExpenseSummary> = {} as Record<ExpenseCategory, ExpenseSummary>;

    for (const item of expenses) {
      if (!summaries[item.category]) {
        summaries[item.category] = {
          category: item.category,
          monthlyTotal: 0,
          items: [],
        };
      }
      summaries[item.category].items.push(item);
    }

    // Calculate monthly totals
    for (const category in summaries) {
      const items = summaries[category as ExpenseCategory].items;
      summaries[category as ExpenseCategory].monthlyTotal =
        ExpenseProcessor.calculateMonthlyTotal(items);
    }

    return Object.values(summaries).sort((a, b) =>
      b.monthlyTotal - a.monthlyTotal
    );
  }

  /**
   * Handles starting to add a new expense
   */
  function handleStartAdd() {
    setFormData(getEmptyForm());
    setIsAddingExpense(true);
    setEditingId(null);
    setShowTemplates(false);
    setTemplateSearch("");
  }

  /**
   * Handles starting to edit an expense
   */
  function handleStartEdit(expense: ExpenseItem) {
    setFormData({ ...expense });
    setIsAddingExpense(false);
    setEditingId(expense.id);
    setShowTemplates(false);
    setTemplateSearch("");
  }

  /**
   * Handles canceling add/edit
   */
  function handleCancel() {
    setFormData({});
    setIsAddingExpense(false);
    setEditingId(null);
    setShowTemplates(false);
    setTemplateSearch("");
  }

  /**
   * Handles saving an expense
   */
  function handleSave() {
    if (!formData.name || !formData.amount || formData.amount <= 0) {
      alert("Please enter a valid name and amount");
      return;
    }

    if (editingId) {
      // Update existing
      const updated = expenses.map((e) =>
        e.id === editingId ? { ...e, ...formData } as ExpenseItem : e
      );
      onExpensesChange(updated);
    } else {
      // Add new
      const newExpense: ExpenseItem = {
        id: crypto.randomUUID(),
        name: formData.name!,
        amount: formData.amount!,
        frequency: formData.frequency || "monthly",
        category: formData.category || "other",
        enabled: formData.enabled !== false,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isOneOff: formData.isOneOff || false,
        oneOffDate: formData.oneOffDate,
      };
      onExpensesChange([...expenses, newExpense]);
    }

    handleCancel();
  }

  /**
   * Handles deleting an expense
   */
  function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    onExpensesChange(expenses.filter((e) => e.id !== id));
  }

  /**
   * Handles toggling expense enabled state
   */
  function handleToggle(id: string) {
    const updated = expenses.map((e) =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    );
    onExpensesChange(updated);
  }

  /**
   * Handles applying a template
   */
  function handleApplyTemplate(template: Partial<ExpenseItem>) {
    setFormData({
      ...getEmptyForm(),
      ...template,
    });
    setShowTemplates(false);
    setTemplateSearch("");
  }

  /**
   * Filters templates based on search input
   */
  function getFilteredTemplates() {
    if (!templateSearch.trim()) {
      return EXPENSE_TEMPLATES;
    }
    
    const searchLower = templateSearch.toLowerCase();
    return EXPENSE_TEMPLATES.filter(template => 
      template.name?.toLowerCase().includes(searchLower) ||
      CATEGORY_INFO[template.category!]?.label.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Formats amount for display
   */
  function formatAmount(amount: number, frequency: PaymentFrequency): string {
    return `${amount.toFixed(2)}/${frequency === "fortnightly" ? "fortnight" : frequency.replace("ly", "")}`;
  }

  /**
   * Calculates monthly equivalent
   */
  function getMonthlyEquivalent(amount: number, frequency: PaymentFrequency): number {
    switch (frequency) {
      case "weekly":
        return (amount * 52) / 12;
      case "fortnightly":
        return (amount * 26) / 12;
      case "monthly":
        return amount;
      case "yearly":
        return amount / 12;
      default:
        return amount;
    }
  }

  const totalMonthly = ExpenseProcessor.calculateMonthlyTotal(expenses);
  const summaries = getExpenseSummaries();
  const isFormOpen = isAddingExpense || editingId !== null;

  return (
    <div class="card p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Expense Tracker</h2>
          <p class="text-sm text-gray-600 mt-1">
            Total: <span class="font-semibold text-gray-900">${totalMonthly.toFixed(2)}/month</span>
          </p>
        </div>
        {!isFormOpen && (
          <button type="button" onClick={handleStartAdd} class="btn-primary flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Expense
          </button>
        )}
      </div>

      {/* Expense List */}
      {!isFormOpen && expenses.length === 0 && (
        <div class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p class="text-sm">No expenses tracked yet.</p>
          <p class="text-xs mt-1">Add individual expenses to track your spending.</p>
        </div>
      )}

      {!isFormOpen && summaries.length > 0 && (
        <div class="space-y-4">
          {summaries.map((summary) => (
            <div key={summary.category} class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{CATEGORY_INFO[summary.category].icon}</span>
                  <div>
                    <h3 class="font-semibold text-gray-900">{CATEGORY_INFO[summary.category].label}</h3>
                    <p class="text-sm text-gray-600">${summary.monthlyTotal.toFixed(2)}/month</p>
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                {summary.items.map((item) => (
                  <div
                    key={item.id}
                    class={`flex items-center justify-between p-2 rounded ${
                      item.enabled ? "bg-gray-50" : "bg-gray-100 opacity-60"
                    }`}
                  >
                    <div class="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggle(item.id)}
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <div class="flex-1">
                        <p class={`text-sm font-medium ${item.enabled ? "text-gray-900" : "text-gray-500 line-through"}`}>
                          {item.name}
                        </p>
                        <p class="text-xs text-gray-600">
                          {item.isOneOff ? (
                            <>
                              ${item.amount.toFixed(2)} (One-off{item.oneOffDate ? ` on ${new Date(item.oneOffDate).toLocaleDateString()}` : ""})
                            </>
                          ) : (
                            <>
                              {formatAmount(item.amount, item.frequency)}
                              {item.frequency !== "monthly" && (
                                <span class="ml-2 text-gray-500">
                                  (${getMonthlyEquivalent(item.amount, item.frequency).toFixed(2)}/month)
                                </span>
                              )}
                            </>
                          )}
                          {item.endDate && !item.isOneOff && (
                            <span class="ml-2 text-orange-600">
                              (Ends: {new Date(item.endDate).toLocaleDateString()})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        class="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        class="text-red-600 hover:text-red-800 p-1"
                        title="Delete"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div class="border border-gray-300 rounded-lg p-6 bg-gray-50">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            {editingId ? "Edit Expense" : "Add New Expense"}
          </h3>

          {/* Template Selector */}
          {!editingId && (
            <div class="mb-4">
              <button
                type="button"
                onClick={() => {
                  setShowTemplates(!showTemplates);
                  if (showTemplates) {
                    setTemplateSearch("");
                  }
                }}
                class="btn-secondary w-full flex items-center justify-center text-sm"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                {showTemplates ? "Hide Templates" : "Use Template"}
              </button>
            </div>
          )}

          {showTemplates && (
            <div class="mb-4 border border-blue-200 rounded-lg p-3 bg-white fade-in">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-medium text-gray-700">Common Expenses:</p>
                <p class="text-xs text-gray-500">{getFilteredTemplates().length} templates</p>
              </div>
              
              {/* Search Input */}
              <div class="mb-3">
                <div class="relative">
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={templateSearch}
                    onInput={(e) => setTemplateSearch((e.target as HTMLInputElement).value)}
                    placeholder="Search templates... (e.g., 'school', 'car', 'insurance')"
                    class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {templateSearch && (
                    <button
                      type="button"
                      onClick={() => setTemplateSearch("")}
                      class="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Template Grid */}
              <div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {getFilteredTemplates().map((template, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    class="text-left p-2 text-sm border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{CATEGORY_INFO[template.category!]?.icon}</span>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900 truncate">{template.name}</p>
                        <p class="text-xs text-gray-500 capitalize">{template.frequency}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* No Results Message */}
              {templateSearch && getFilteredTemplates().length === 0 && (
                <div class="text-center py-4 text-gray-500">
                  <svg class="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306" />
                  </svg>
                  <p class="text-sm">No templates found for "{templateSearch}"</p>
                  <p class="text-xs mt-1">Try a different search term or create a custom expense</p>
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name || ""}
              onInput={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
              placeholder="e.g., Groceries"
              class="input-field"
            />
          </div>

          {/* Amount */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                value={formData.amount || ""}
                onInput={(e) => setFormData({ ...formData, amount: parseFloat((e.target as HTMLInputElement).value) })}
                step="0.01"
                min="0"
                class="input-field pl-8"
              />
            </div>
          </div>

          {/* Frequency */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
            <select
              value={formData.frequency || "monthly"}
              onChange={(e) => setFormData({ ...formData, frequency: (e.target as HTMLSelectElement).value as PaymentFrequency })}
              class="input-field"
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Category */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={formData.category || "other"}
              onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLSelectElement).value as ExpenseCategory })}
              class="input-field"
            >
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* One-off Expense Toggle */}
          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOneOff || false}
                onChange={(e) => setFormData({ ...formData, isOneOff: (e.target as HTMLInputElement).checked })}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm font-medium text-gray-700">
                This is a one-off expense
              </span>
            </label>
            <p class="text-xs text-gray-600 mt-1 ml-6">
              One-off expenses occur only once (e.g., new caravan, house gate)
            </p>
          </div>

          {/* One-off Date */}
          {formData.isOneOff && (
            <div class="mb-4 fade-in">
              <label class="block text-sm font-medium text-gray-700 mb-1">One-off Date *</label>
              <input
                type="date"
                value={formData.oneOffDate ? new Date(formData.oneOffDate).toISOString().split('T')[0] : ""}
                onInput={(e) => setFormData({ ...formData, oneOffDate: new Date((e.target as HTMLInputElement).value) })}
                class="input-field"
              />
            </div>
          )}

          {/* Date Range for Recurring Expenses */}
          {!formData.isOneOff && (
            <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded fade-in">
              <p class="text-sm font-medium text-gray-700 mb-2">Date Range (Optional)</p>
              <p class="text-xs text-gray-600 mb-3">
                Set start and end dates for expenses that don't last forever (e.g., school fees)
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ""}
                    onInput={(e) => setFormData({ ...formData, startDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                    class="input-field text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ""}
                    onInput={(e) => setFormData({ ...formData, endDate: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value) : undefined })}
                    class="input-field text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div class="flex gap-3 mt-6">
            <button type="button" onClick={handleSave} class="btn-primary flex-1">
              {editingId ? "Update" : "Add"} Expense
            </button>
            <button type="button" onClick={handleCancel} class="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}