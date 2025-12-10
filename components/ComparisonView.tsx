/**
 * ComparisonView Component
 * Displays side-by-side comparison of simulation results with and without transitions
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { ComparisonSimulationResult } from "../types/financial.ts";
import { formatCurrency } from "../lib/result_utils.ts";
import MilestoneComparisonView from "./MilestoneComparisonView.tsx";
import AdviceComparisonView from "./AdviceComparisonView.tsx";

interface ComparisonViewProps {
  comparison: ComparisonSimulationResult;
}

/**
 * ComparisonView component
 * 
 * Displays side-by-side results comparing scenarios with and without transitions.
 * Shows retirement date comparison, net worth comparison, sustainability comparison,
 * and highlights the impact of each transition.
 * 
 * Requirements 10.1: Display comparison results
 * Requirements 10.2: Show retirement date comparison
 * Requirements 10.3: Show final net worth comparison
 * Requirements 10.4: Show sustainability comparison
 * Requirements 10.5: Show impact of each transition
 */
export default function ComparisonView({ comparison }: ComparisonViewProps) {
  const { withTransitions, withoutTransitions, comparison: metrics } =
    comparison;

  // Calculate final values
  const finalNetWorthWith = withTransitions.states.length > 0
    ? withTransitions.states[withTransitions.states.length - 1].netWorth
    : 0;

  const finalNetWorthWithout = withoutTransitions.states.length > 0
    ? withoutTransitions.states[withoutTransitions.states.length - 1].netWorth
    : 0;

  // Determine if transitions have positive or negative impact
  const netWorthImpactPositive = metrics.finalNetWorthDifference > 0;
  const retirementImpactPositive = metrics.retirementDateDifference !== null &&
    metrics.retirementDateDifference < 0; // Earlier retirement is positive

  return (
    <div class="card p-6 fade-in">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">
        Scenario Comparison: With vs Without Transitions
      </h2>

      {/* Overall Impact Summary */}
      <div class="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <h3 class="text-lg font-semibold text-gray-800 mb-3">
          Overall Impact
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Net Worth Impact */}
          <div class="bg-white p-3 rounded-md shadow-sm">
            <p class="text-xs text-gray-600 mb-1">Net Worth Impact</p>
            <p
              class={`text-xl font-bold ${
                netWorthImpactPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {netWorthImpactPositive ? "+" : ""}
              {formatCurrency(metrics.finalNetWorthDifference)}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {netWorthImpactPositive ? "Better" : "Worse"} with transitions
            </p>
          </div>

          {/* Retirement Date Impact */}
          <div class="bg-white p-3 rounded-md shadow-sm">
            <p class="text-xs text-gray-600 mb-1">Retirement Date Impact</p>
            {metrics.retirementDateDifference !== null ? (
              <>
                <p
                  class={`text-xl font-bold ${
                    retirementImpactPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {retirementImpactPositive ? "" : "+"}
                  {Math.abs(metrics.retirementDateDifference).toFixed(1)} years
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {retirementImpactPositive ? "Earlier" : "Later"} retirement
                </p>
              </>
            ) : (
              <>
                <p class="text-xl font-bold text-gray-500">N/A</p>
                <p class="text-xs text-gray-500 mt-1">
                  Retirement not achievable in one or both scenarios
                </p>
              </>
            )}
          </div>

          {/* Sustainability Impact */}
          <div class="bg-white p-3 rounded-md shadow-sm">
            <p class="text-xs text-gray-600 mb-1">Sustainability</p>
            {metrics.sustainabilityChanged ? (
              <>
                <p
                  class={`text-xl font-bold ${
                    withTransitions.isSustainable
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Changed
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {withTransitions.isSustainable
                    ? "Improved to sustainable"
                    : "Degraded to unsustainable"}
                </p>
              </>
            ) : (
              <>
                <p class="text-xl font-bold text-gray-600">Unchanged</p>
                <p class="text-xs text-gray-500 mt-1">
                  {withTransitions.isSustainable
                    ? "Sustainable in both"
                    : "Unsustainable in both"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* With Transitions */}
        <div class="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
          <div class="flex items-center mb-4">
            <svg
              class="w-6 h-6 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <h3 class="text-lg font-bold text-blue-800">
              With Transitions
            </h3>
          </div>

          <div class="space-y-3">
            {/* Retirement Date */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Retirement Date</p>
              <p class="text-lg font-semibold text-gray-800">
                {withTransitions.retirementDate
                  ? withTransitions.retirementDate.toLocaleDateString()
                  : "Not Achievable"}
              </p>
              {withTransitions.retirementAge && (
                <p class="text-sm text-gray-600">
                  Age {Math.floor(withTransitions.retirementAge)}
                </p>
              )}
            </div>

            {/* Final Net Worth */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Final Net Worth</p>
              <p class="text-lg font-semibold text-green-600">
                {formatCurrency(finalNetWorthWith)}
              </p>
            </div>

            {/* Sustainability */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Financial Health</p>
              <p
                class={`text-lg font-semibold ${
                  withTransitions.isSustainable
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {withTransitions.isSustainable
                  ? "Sustainable"
                  : "Unsustainable"}
              </p>
            </div>

            {/* Number of Transitions */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Transitions Applied</p>
              <p class="text-lg font-semibold text-blue-600">
                {withTransitions.transitionPoints.length}
              </p>
            </div>
          </div>
        </div>

        {/* Without Transitions */}
        <div class="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <div class="flex items-center mb-4">
            <svg
              class="w-6 h-6 text-gray-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 class="text-lg font-bold text-gray-800">
              Without Transitions (Base Only)
            </h3>
          </div>

          <div class="space-y-3">
            {/* Retirement Date */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Retirement Date</p>
              <p class="text-lg font-semibold text-gray-800">
                {withoutTransitions.retirementDate
                  ? withoutTransitions.retirementDate.toLocaleDateString()
                  : "Not Achievable"}
              </p>
              {withoutTransitions.retirementAge && (
                <p class="text-sm text-gray-600">
                  Age {Math.floor(withoutTransitions.retirementAge)}
                </p>
              )}
            </div>

            {/* Final Net Worth */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Final Net Worth</p>
              <p class="text-lg font-semibold text-green-600">
                {formatCurrency(finalNetWorthWithout)}
              </p>
            </div>

            {/* Sustainability */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Financial Health</p>
              <p
                class={`text-lg font-semibold ${
                  withoutTransitions.isSustainable
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {withoutTransitions.isSustainable
                  ? "Sustainable"
                  : "Unsustainable"}
              </p>
            </div>

            {/* Constant Parameters */}
            <div class="bg-white p-3 rounded-md">
              <p class="text-sm text-gray-600 mb-1">Parameter Changes</p>
              <p class="text-lg font-semibold text-gray-600">None</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transition Impact Details */}
      {withTransitions.transitionPoints.length > 0 && (
        <div class="border-t pt-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Impact of Each Transition
          </h3>
          <div class="space-y-3">
            {withTransitions.transitionPoints.map((tp, index) => (
              <div
                key={index}
                class="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border border-blue-200"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">
                        {index + 1}
                      </span>
                      <p class="font-semibold text-gray-800">
                        {tp.transition.label || `Transition ${index + 1}`}
                      </p>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">
                      Date: {tp.date.toLocaleDateString()}
                    </p>
                    <p class="text-sm text-gray-700">{tp.changesSummary}</p>
                  </div>
                  <div class="ml-4">
                    <svg
                      class="w-8 h-8 text-blue-500"
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings Comparison */}
      {(withTransitions.warnings.length > 0 ||
        withoutTransitions.warnings.length > 0) && (
        <div class="border-t pt-6 mt-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Warnings Comparison
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* With Transitions Warnings */}
            <div>
              <h4 class="text-sm font-semibold text-blue-800 mb-2">
                With Transitions
              </h4>
              {withTransitions.warnings.length > 0 ? (
                <ul class="list-disc list-inside space-y-1">
                  {withTransitions.warnings.map((warning, index) => (
                    <li key={index} class="text-sm text-yellow-700">
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="text-sm text-green-600">No warnings</p>
              )}
            </div>

            {/* Without Transitions Warnings */}
            <div>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">
                Without Transitions
              </h4>
              {withoutTransitions.warnings.length > 0 ? (
                <ul class="list-disc list-inside space-y-1">
                  {withoutTransitions.warnings.map((warning, index) => (
                    <li key={index} class="text-sm text-yellow-700">
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="text-sm text-green-600">No warnings</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Milestone Comparison Section */}
      {comparison.milestoneComparison && (
        <div class="border-t pt-6 mt-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Milestone Comparison
          </h3>
          <MilestoneComparisonView comparison={comparison.milestoneComparison} />
        </div>
      )}

      {/* Advice Comparison Section */}
      {comparison.adviceComparison && (
        <div class="border-t pt-6 mt-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Retirement Advice Comparison
          </h3>
          <AdviceComparisonView comparison={comparison.adviceComparison} />
        </div>
      )}
    </div>
  );
}
