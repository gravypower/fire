/**
 * TransitionManagerIsland - Fresh island component for managing parameter transitions
 * Validates: Requirements 1.1, 1.2, 1.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.5, 8.1, 8.2, 8.4, 8.5
 */

import { useState } from "preact/hooks";
import type {
  ParameterTransition,
  SimulationConfiguration,
  UserParameters,
  TransitionTemplate,
} from "../types/financial.ts";
import { TRANSITION_TEMPLATES } from "../types/financial.ts";
import {
  addTransition,
  updateTransition,
  removeTransition,
  validateTransition,
} from "../lib/transition_manager.ts";
import { applyTemplate } from "../lib/templates.ts";

interface TransitionManagerIslandProps {
  config: SimulationConfiguration;
  onConfigChange: (config: SimulationConfiguration) => void;
}

interface TransitionFormData {
  id: string;
  transitionDate: string; // ISO date string for input
  label: string;
  selectedParams: Set<keyof UserParameters>;
  parameterValues: Partial<UserParameters>;
}

export default function TransitionManagerIsland({
  config,
  onConfigChange,
}: TransitionManagerIslandProps) {
  const [isAddingTransition, setIsAddingTransition] = useState(false);
  const [editingTransitionId, setEditingTransitionId] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState<TransitionFormData>(
    getEmptyFormData(),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  /**
   * Creates empty form data
   */
  function getEmptyFormData(): TransitionFormData {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      id: crypto.randomUUID(),
      transitionDate: tomorrow.toISOString().split("T")[0],
      label: "",
      selectedParams: new Set(),
      parameterValues: {},
    };
  }

  /**
   * Loads a transition into the form for editing
   */
  function loadTransitionIntoForm(transition: ParameterTransition) {
    const selectedParams = new Set(
      Object.keys(transition.parameterChanges) as (keyof UserParameters)[],
    );

    setFormData({
      id: transition.id,
      transitionDate: transition.transitionDate.toISOString().split("T")[0],
      label: transition.label || "",
      selectedParams,
      parameterValues: { ...transition.parameterChanges },
    });
  }

  /**
   * Handles starting to add a new transition
   */
  function handleStartAdd() {
    setFormData(getEmptyFormData());
    setValidationError(null);
    setIsAddingTransition(true);
    setEditingTransitionId(null);
    setShowTemplateSelector(false);
  }

  /**
   * Handles starting to edit an existing transition
   */
  function handleStartEdit(transition: ParameterTransition) {
    loadTransitionIntoForm(transition);
    setValidationError(null);
    setIsAddingTransition(false);
    setEditingTransitionId(transition.id);
    setShowTemplateSelector(false);
  }

  /**
   * Handles canceling add/edit
   */
  function handleCancel() {
    setIsAddingTransition(false);
    setEditingTransitionId(null);
    setFormData(getEmptyFormData());
    setValidationError(null);
    setShowTemplateSelector(false);
  }

  /**
   * Handles saving a transition (add or update)
   */
  function handleSave() {
    // Build the transition object
    const transition: ParameterTransition = {
      id: formData.id,
      transitionDate: new Date(formData.transitionDate),
      label: formData.label || undefined,
      parameterChanges: formData.parameterValues,
    };

    // Create a copy of config for modification
    const newConfig = { ...config, transitions: [...config.transitions] };

    let result;
    if (editingTransitionId) {
      // Update existing transition
      result = updateTransition(newConfig, editingTransitionId, transition);
    } else {
      // Add new transition
      result = addTransition(newConfig, transition);
    }

    if (!result.isValid) {
      setValidationError(result.error || "Validation failed");
      return;
    }

    // Success - update config and reset form
    onConfigChange(newConfig);
    handleCancel();
  }

  /**
   * Handles deleting a transition
   */
  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transition?")) {
      return;
    }

    const newConfig = { ...config, transitions: [...config.transitions] };
    removeTransition(newConfig, id);
    onConfigChange(newConfig);
  }

  /**
   * Handles date input change
   */
  function handleDateChange(dateString: string) {
    setFormData({ ...formData, transitionDate: dateString });
    setValidationError(null);
  }

  /**
   * Handles label input change
   */
  function handleLabelChange(label: string) {
    setFormData({ ...formData, label });
  }

  /**
   * Handles parameter checkbox toggle
   */
  function handleParamToggle(param: keyof UserParameters) {
    const newSelectedParams = new Set(formData.selectedParams);
    const newParamValues = { ...formData.parameterValues };

    if (newSelectedParams.has(param)) {
      newSelectedParams.delete(param);
      delete newParamValues[param];
    } else {
      newSelectedParams.add(param);
      // Initialize with current base parameter value
      newParamValues[param] = config.baseParameters[param];
    }

    setFormData({
      ...formData,
      selectedParams: newSelectedParams,
      parameterValues: newParamValues,
    });
    setValidationError(null);
  }

  /**
   * Handles parameter value change
   */
  function handleParamValueChange(
    param: keyof UserParameters,
    value: string | number | boolean,
  ) {
    const newParamValues = { ...formData.parameterValues };
    newParamValues[param] = value as any;

    setFormData({
      ...formData,
      parameterValues: newParamValues,
    });
    setValidationError(null);
  }

  /**
   * Handles applying a template
   */
  function handleApplyTemplate(template: TransitionTemplate) {
    const changes = applyTemplate(template.id, config.baseParameters);
    if (!changes) {
      return;
    }

    // Update form with template changes
    const selectedParams = new Set(
      Object.keys(changes) as (keyof UserParameters)[],
    );

    setFormData({
      ...formData,
      label: formData.label || template.name,
      selectedParams,
      parameterValues: changes,
    });

    setShowTemplateSelector(false);
    setValidationError(null);
  }

  /**
   * Formats a parameter name for display
   */
  function formatParamName(param: keyof UserParameters): string {
    return param
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Gets a summary of parameter changes for a transition
   */
  function getChangesSummary(transition: ParameterTransition): string {
    const changes = Object.keys(transition.parameterChanges);
    if (changes.length === 0) return "No changes";
    if (changes.length === 1) return formatParamName(changes[0] as keyof UserParameters);
    if (changes.length === 2) {
      return `${formatParamName(changes[0] as keyof UserParameters)}, ${formatParamName(changes[1] as keyof UserParameters)}`;
    }
    return `${changes.length} parameters`;
  }

  /**
   * Formats a date for display
   */
  function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Group templates by category
  const templatesByCategory = TRANSITION_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TransitionTemplate[]>);

  const isFormOpen = isAddingTransition || editingTransitionId !== null;

  return (
    <div class="card p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Parameter Transitions</h2>
        {!isFormOpen && (
          <button
            onClick={handleStartAdd}
            class="btn-primary flex items-center"
          >
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Transition
          </button>
        )}
      </div>

      {/* Transition List */}
      {!isFormOpen && config.transitions.length === 0 && (
        <div class="text-center py-8 text-gray-500">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p class="text-sm">No parameter transitions defined yet.</p>
          <p class="text-xs mt-1">
            Add transitions to model life events like retirement or career changes.
          </p>
        </div>
      )}

      {!isFormOpen && config.transitions.length > 0 && (
        <div class="space-y-3">
          {config.transitions.map((transition) => (
            <div
              key={transition.id}
              class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <svg
                      class="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span class="font-semibold text-gray-900">
                      {formatDate(transition.transitionDate)}
                    </span>
                  </div>
                  {transition.label && (
                    <p class="text-sm text-gray-700 mb-2">{transition.label}</p>
                  )}
                  <p class="text-sm text-gray-600">
                    Changes: {getChangesSummary(transition)}
                  </p>
                </div>
                <div class="flex gap-2 ml-4">
                  <button
                    onClick={() => handleStartEdit(transition)}
                    class="text-blue-600 hover:text-blue-800 p-1"
                    title="Edit transition"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(transition.id)}
                    class="text-red-600 hover:text-red-800 p-1"
                    title="Delete transition"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div class="border border-gray-300 rounded-lg p-6 bg-gray-50">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            {editingTransitionId ? "Edit Transition" : "Add New Transition"}
          </h3>

          {/* Validation Error */}
          {validationError && (
            <div class="mb-4 bg-red-50 border border-red-200 rounded-md p-3 fade-in">
              <div class="flex">
                <svg
                  class="h-5 w-5 text-red-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                <p class="text-sm text-red-800">{validationError}</p>
              </div>
            </div>
          )}

          {/* Template Selector Button */}
          {!editingTransitionId && (
            <div class="mb-4">
              <button
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                class="btn-secondary w-full flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
                {showTemplateSelector ? "Hide Templates" : "Use Template"}
              </button>
            </div>
          )}

          {/* Template Selector */}
          {showTemplateSelector && (
            <div class="mb-6 border border-blue-200 rounded-lg p-4 bg-white fade-in">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">
                Select a Template
              </h4>
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category} class="mb-4 last:mb-0">
                  <h5 class="text-xs font-medium text-gray-600 uppercase mb-2">
                    {category}
                  </h5>
                  <div class="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleApplyTemplate(template)}
                        class="w-full text-left p-3 border border-gray-200 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div class="font-medium text-sm text-gray-900">
                          {template.name}
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Date Input */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Transition Date *
            </label>
            <input
              type="date"
              value={formData.transitionDate}
              onInput={(e) =>
                handleDateChange((e.target as HTMLInputElement).value)}
              class="input-field"
              required
            />
            <p class="text-xs text-gray-500 mt-1">
              Date when these parameter changes take effect
            </p>
          </div>

          {/* Label Input */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Label (Optional)
            </label>
            <input
              type="text"
              value={formData.label}
              onInput={(e) =>
                handleLabelChange((e.target as HTMLInputElement).value)}
              placeholder="e.g., Semi-retirement, Career change"
              class="input-field"
            />
          </div>

          {/* Parameter Selection */}
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Parameters to Change *
            </label>
            <p class="text-xs text-gray-500 mb-3">
              Select which parameters will change at this transition
            </p>

            {/* Render parameter checkboxes grouped by category */}
            <ParameterSelector
              config={config}
              formData={formData}
              onParamToggle={handleParamToggle}
              onParamValueChange={handleParamValueChange}
              formatParamName={formatParamName}
            />
          </div>

          {/* Action Buttons */}
          <div class="flex gap-3 mt-6">
            <button onClick={handleSave} class="btn-primary flex-1">
              {editingTransitionId ? "Update Transition" : "Add Transition"}
            </button>
            <button onClick={handleCancel} class="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Parameter selector component with grouped parameters
 */
function ParameterSelector({
  config,
  formData,
  onParamToggle,
  onParamValueChange,
  formatParamName,
}: {
  config: SimulationConfiguration;
  formData: TransitionFormData;
  onParamToggle: (param: keyof UserParameters) => void;
  onParamValueChange: (
    param: keyof UserParameters,
    value: string | number | boolean,
  ) => void;
  formatParamName: (param: keyof UserParameters) => string;
}) {
  // Define parameter groups
  const parameterGroups: {
    name: string;
    params: (keyof UserParameters)[];
  }[] = [
    {
      name: "Income",
      params: ["annualSalary", "incomeTaxRate"],
    },
    {
      name: "Expenses",
      params: ["monthlyLivingExpenses", "monthlyRentOrMortgage"],
    },
    {
      name: "Investments",
      params: [
        "monthlyInvestmentContribution",
        "investmentReturnRate",
        "currentInvestmentBalance",
      ],
    },
    {
      name: "Superannuation",
      params: [
        "superContributionRate",
        "superReturnRate",
        "currentSuperBalance",
      ],
    },
    {
      name: "Loans",
      params: [
        "loanPrincipal",
        "loanInterestRate",
        "loanPaymentAmount",
        "currentOffsetBalance",
      ],
    },
  ];

  return (
    <div class="space-y-4">
      {parameterGroups.map((group) => (
        <div key={group.name} class="border border-gray-200 rounded-lg p-3">
          <h5 class="text-sm font-semibold text-gray-700 mb-2">{group.name}</h5>
          <div class="space-y-2">
            {group.params.map((param) => (
              <div key={param} class="flex items-start gap-2">
                <input
                  type="checkbox"
                  id={`param-${param}`}
                  checked={formData.selectedParams.has(param)}
                  onChange={() => onParamToggle(param)}
                  class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div class="flex-1">
                  <label
                    htmlFor={`param-${param}`}
                    class="text-sm text-gray-700 cursor-pointer"
                  >
                    {formatParamName(param)}
                  </label>
                  {formData.selectedParams.has(param) && (
                    <div class="mt-1 fade-in">
                      <input
                        type="number"
                        value={formData.parameterValues[param] as number}
                        onInput={(e) =>
                          onParamValueChange(
                            param,
                            parseFloat((e.target as HTMLInputElement).value),
                          )}
                        step="0.01"
                        class="input-field text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
