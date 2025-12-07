/**
 * TimelineSummary - Component for displaying parameter transitions in a chronological timeline view
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type {
  ParameterTransition,
  SimulationConfiguration,
  ParameterPeriod,
  UserParameters,
} from "../types/financial.ts";
import { buildParameterPeriods } from "../lib/transition_manager.ts";

interface TimelineSummaryProps {
  /** Simulation configuration with transitions */
  config: SimulationConfiguration;
  /** Optional callback when a transition is clicked */
  onTransitionClick?: (transitionId: string) => void;
}

/**
 * TimelineSummary component displays all parameter transitions in a chronological timeline view
 * Shows transition dates, descriptions, parameter changes, and period durations
 */
export default function TimelineSummary({
  config,
  onTransitionClick,
}: TimelineSummaryProps) {
  // Build parameter periods from configuration
  const periods = buildParameterPeriods(config);

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
   * Calculates the duration of a period in days
   */
  function calculatePeriodDuration(period: ParameterPeriod): number {
    const endDate = period.endDate || new Date(
      period.startDate.getTime() +
        period.parameters.simulationYears * 365 * 24 * 60 * 60 * 1000,
    );
    const durationMs = endDate.getTime() - period.startDate.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Formats a duration in days to a human-readable string
   */
  function formatDuration(days: number): string {
    if (days < 30) {
      return `${days} day${days !== 1 ? "s" : ""}`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months !== 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(days / 365);
      const remainingMonths = Math.floor((days % 365) / 30);
      if (remainingMonths === 0) {
        return `${years} year${years !== 1 ? "s" : ""}`;
      }
      return `${years} year${years !== 1 ? "s" : ""}, ${remainingMonths} month${
        remainingMonths !== 1 ? "s" : ""
      }`;
    }
  }

  /**
   * Gets a brief description of parameter changes for a transition
   */
  function getChangeDescription(transition: ParameterTransition): string {
    const changes = Object.entries(transition.parameterChanges);
    if (changes.length === 0) return "No changes";

    // If there's a label, use it
    if (transition.label) {
      return transition.label;
    }

    // Otherwise, create a description from the changes
    if (changes.length === 1) {
      const [param, value] = changes[0];
      return `${formatParamName(param as keyof UserParameters)} changed`;
    } else if (changes.length === 2) {
      return `${formatParamName(changes[0][0] as keyof UserParameters)}, ${
        formatParamName(changes[1][0] as keyof UserParameters)
      } changed`;
    } else {
      return `${changes.length} parameters changed`;
    }
  }

  /**
   * Gets detailed parameter changes for a transition
   */
  function getDetailedChanges(
    transition: ParameterTransition,
  ): Array<{ param: string; value: string | number | boolean }> {
    return Object.entries(transition.parameterChanges).map(([param, value]) => ({
      param: formatParamName(param as keyof UserParameters),
      value,
    }));
  }

  /**
   * Handles clicking on a transition
   */
  function handleTransitionClick(transitionId: string) {
    if (onTransitionClick) {
      onTransitionClick(transitionId);
    }
  }

  // If no transitions, show a simple message
  if (config.transitions.length === 0) {
    return (
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Timeline</h3>
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm">No transitions in timeline</p>
          <p class="text-xs mt-1">
            Add parameter transitions to see them in the timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        Timeline Summary
      </h3>

      <div class="relative">
        {/* Timeline line */}
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />

        {/* Timeline entries */}
        <div class="space-y-6">
          {periods.map((period, index) => {
            const duration = calculatePeriodDuration(period);
            const transition = period.transitionId
              ? config.transitions.find((t) => t.id === period.transitionId)
              : null;

            return (
              <div key={index} class="relative pl-10">
                {/* Timeline dot */}
                <div
                  class={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                    period.transitionId
                      ? "bg-blue-600 border-blue-600"
                      : "bg-gray-400 border-gray-400"
                  }`}
                />

                {/* Period card */}
                <div
                  class={`border rounded-lg p-4 ${
                    period.transitionId
                      ? "border-blue-200 bg-blue-50 hover:border-blue-400 transition-colors"
                      : "border-gray-200 bg-gray-50"
                  } ${onTransitionClick && period.transitionId ? "cursor-pointer" : ""}`}
                  onClick={() =>
                    period.transitionId &&
                    handleTransitionClick(period.transitionId)}
                >
                  {/* Date and duration */}
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-gray-900">
                          {formatDate(period.startDate)}
                        </span>
                        {period.transitionId && (
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Transition
                          </span>
                        )}
                        {!period.transitionId && (
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                            Base Period
                          </span>
                        )}
                      </div>
                      <div class="text-sm text-gray-600 mt-1">
                        Duration: {formatDuration(duration)}
                      </div>
                    </div>
                  </div>

                  {/* Transition description */}
                  {transition && (
                    <div class="mt-3">
                      <p class="text-sm font-medium text-gray-900 mb-2">
                        {getChangeDescription(transition)}
                      </p>

                      {/* Detailed parameter changes */}
                      <div class="space-y-1">
                        {getDetailedChanges(transition).map((change, idx) => (
                          <div
                            key={idx}
                            class="text-xs text-gray-700 flex items-center gap-2"
                          >
                            <svg
                              class="w-3 h-3 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <span class="font-medium">{change.param}:</span>
                            <span>
                              {typeof change.value === "number"
                                ? change.value.toLocaleString()
                                : String(change.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Base period description */}
                  {!transition && (
                    <div class="mt-2">
                      <p class="text-sm text-gray-600">
                        Using base parameters
                      </p>
                    </div>
                  )}

                  {/* Click hint */}
                  {onTransitionClick && period.transitionId && (
                    <div class="mt-3 text-xs text-blue-600 flex items-center gap-1">
                      <svg
                        class="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                      <span>Click to view details</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* End marker */}
          <div class="relative pl-10">
            <div class="absolute left-2.5 w-3 h-3 rounded-full border-2 bg-gray-300 border-gray-300" />
            <div class="text-sm text-gray-600">
              <span class="font-medium">
                {formatDate(
                  new Date(
                    config.baseParameters.startDate.getTime() +
                      config.baseParameters.simulationYears * 365 * 24 * 60 *
                        60 * 1000,
                  ),
                )}
              </span>
              <span class="ml-2">Simulation End</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
