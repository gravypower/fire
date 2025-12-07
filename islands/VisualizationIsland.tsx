/**
 * VisualizationIsland - Fresh island component for displaying simulation results
 * Validates: Requirements 3.5, 4.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useState } from "preact/hooks";
import type { SimulationResult, TimeInterval, TransitionPoint, EnhancedSimulationResult } from "../types/financial.ts";
import { formatCurrency, groupByTimeInterval, findLoanPayoffDate } from "../lib/result_utils.ts";
import NetWorthChart from "../components/NetWorthChart.tsx";
import CashFlowChart from "../components/CashFlowChart.tsx";
import ChartErrorBoundary from "../components/ChartErrorBoundary.tsx";
import TimelineSummary from "../components/TimelineSummary.tsx";

interface VisualizationIslandProps {
  result: SimulationResult | EnhancedSimulationResult;
  transitionPoints?: TransitionPoint[];
}

/**
 * VisualizationIsland component
 * 
 * Displays simulation results with key metrics, warnings, and time-series data.
 * Provides time granularity selector for viewing results at different intervals.
 * 
 * Requirements 3.5: Time granularity selector
 * Requirements 4.4: Retirement date display
 * Requirements 10.1: Sustainability indication
 * Requirements 10.2: Debt increase warning
 * Requirements 10.3: Positive outcome display
 * Requirements 10.4: Negative cash flow alert
 * Requirements 10.5: Net worth growth indication
 */
export default function VisualizationIsland({
  result,
  transitionPoints = [],
}: VisualizationIslandProps) {
  // State for time granularity selection
  const [selectedGranularity, setSelectedGranularity] = useState<TimeInterval>("month");

  // Check if result is an EnhancedSimulationResult
  const isEnhancedResult = (res: SimulationResult | EnhancedSimulationResult): res is EnhancedSimulationResult => {
    return 'transitionPoints' in res && 'periods' in res;
  };

  // Get transition points from result or props
  const effectiveTransitionPoints = isEnhancedResult(result) ? result.transitionPoints : transitionPoints;

  // Handle missing or invalid result
  if (!result || !result.states || result.states.length === 0) {
    return (
      <div class="card p-8 fade-in">
        <div class="text-center">
          <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">No Results Available</h3>
          <p class="text-sm text-gray-500 mb-4">
            The simulation hasn't produced any results yet. Please check your input parameters and try again.
          </p>
        </div>
      </div>
    );
  }

  // Filter results based on selected granularity
  const filteredStates = groupByTimeInterval(result.states, selectedGranularity);

  // Calculate key metrics
  const currentNetWorth = result.states.length > 0
    ? result.states[result.states.length - 1].netWorth
    : 0;

  const finalCash = result.states.length > 0
    ? result.states[result.states.length - 1].cash
    : 0;

  const finalInvestments = result.states.length > 0
    ? result.states[result.states.length - 1].investments
    : 0;

  const finalSuper = result.states.length > 0
    ? result.states[result.states.length - 1].superannuation
    : 0;

  const finalLoanBalance = result.states.length > 0
    ? result.states[result.states.length - 1].loanBalance
    : 0;

  const finalOffsetBalance = result.states.length > 0
    ? result.states[result.states.length - 1].offsetBalance
    : 0;

  const initialLoanBalance = result.states.length > 0
    ? result.states[0].loanBalance
    : 0;

  // Calculate total tax paid and interest saved
  const totalTaxPaid = result.states.reduce((sum, state) => sum + (state.taxPaid || 0), 0);
  const totalInterestSaved = result.states.reduce((sum, state) => sum + (state.interestSaved || 0), 0);

  // Find loan payoff date
  const loanPayoffDate = findLoanPayoffDate(result.states);

  return (
    <div class="card p-6 fade-in">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">
        Financial Projection Results
      </h2>

      {/* Key Metrics Section */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Retirement Date - Requirements 4.4 */}
        <div
          class={`metric-card ${
            result.retirementDate ? "bg-blue-50" : "bg-gray-50"
          }`}
        >
          <h3 class="text-sm font-medium text-gray-600 mb-1">
            Retirement Date
          </h3>
          <p
            class={`text-2xl font-bold ${
              result.retirementDate ? "text-blue-600" : "text-gray-500"
            }`}
          >
            {result.retirementDate
              ? result.retirementDate.toLocaleDateString()
              : "Not Achievable"}
          </p>
          {result.retirementAge && (
            <p class="text-sm text-gray-600 mt-1">
              Age {result.retirementAge}
            </p>
          )}
        </div>

        {/* Loan Payoff Date */}
        {initialLoanBalance > 0 && (
          <div
            class={`metric-card ${
              loanPayoffDate ? "bg-green-50" : "bg-orange-50"
            }`}
          >
            <h3 class="text-sm font-medium text-gray-600 mb-1">
              Loan Paid Off
            </h3>
            <p
              class={`text-2xl font-bold ${
                loanPayoffDate ? "text-green-600" : "text-orange-600"
              }`}
            >
              {loanPayoffDate
                ? loanPayoffDate.toLocaleDateString()
                : "Not in Period"}
            </p>
            {loanPayoffDate && (
              <p class="text-sm text-gray-600 mt-1">
                Debt-free!
              </p>
            )}
            {!loanPayoffDate && finalLoanBalance > 0 && (
              <p class="text-sm text-gray-600 mt-1">
                {formatCurrency(finalLoanBalance)} remaining
              </p>
            )}
          </div>
        )}

        {/* Current Net Worth */}
        <div class="metric-card bg-green-50">
          <h3 class="text-sm font-medium text-gray-600 mb-1">
            Final Net Worth
          </h3>
          <p class="text-2xl font-bold text-green-600">
            {formatCurrency(currentNetWorth)}
          </p>
        </div>

        {/* Sustainability Status - Requirements 10.1 */}
        <div
          class={`metric-card ${
            result.isSustainable ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <h3 class="text-sm font-medium text-gray-600 mb-1">
            Financial Health
          </h3>
          <p
            class={`text-2xl font-bold ${
              result.isSustainable ? "text-green-600" : "text-red-600"
            }`}
          >
            {result.isSustainable ? "Sustainable" : "Unsustainable"}
          </p>
        </div>
      </div>

      {/* Positive Outcome Display - Requirements 10.3 */}
      {result.retirementDate && result.isSustainable && (
        <div class="alert-success mb-6">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg
                class="h-6 w-6 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-semibold text-green-800">
                Retirement Goal Achievable
              </h3>
              <div class="mt-2 text-sm text-green-700">
                <p>
                  Based on your current financial trajectory, you can retire on{" "}
                  <span class="font-semibold">{result.retirementDate.toLocaleDateString()}</span> at age{" "}
                  <span class="font-semibold">{result.retirementAge}</span>. Your financial plan is sustainable.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings and Alerts - Requirements 10.2, 10.4 */}
      {result.warnings.length > 0 && (
        <div class="alert-warning mb-6">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg
                class="h-6 w-6 text-yellow-400"
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
              <h3 class="text-sm font-semibold text-yellow-800 mb-2">
                Financial Warnings
              </h3>
              <ul class="list-disc list-inside space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index} class="text-sm text-yellow-700">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Summary - Requirements 9.1 */}
      {isEnhancedResult(result) && result.periods && result.periods.length > 1 && (
        <div class="mb-6">
          <TimelineSummary 
            config={{
              baseParameters: result.periods[0].parameters,
              transitions: result.transitionPoints.map(tp => tp.transition),
            }}
          />
        </div>
      )}

      {/* Charts Section - Requirements 6.1, 6.2, 6.3, 6.4, 4.1, 4.4 */}
      <div class="grid grid-cols-1 gap-6 mb-6">
        <ChartErrorBoundary chartName="Net Worth Chart">
          <NetWorthChart 
            states={filteredStates} 
            transitionPoints={effectiveTransitionPoints}
          />
        </ChartErrorBoundary>
        <ChartErrorBoundary chartName="Cash Flow Chart">
          <CashFlowChart 
            states={filteredStates}
            transitionPoints={effectiveTransitionPoints}
          />
        </ChartErrorBoundary>
      </div>

      {/* Time Granularity Selector - Requirements 3.5 */}
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Time Granularity
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGranularity("week")}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedGranularity === "week"
                ? "bg-blue-600 text-white shadow-md scale-105"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setSelectedGranularity("month")}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedGranularity === "month"
                ? "bg-blue-600 text-white shadow-md scale-105"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedGranularity("year")}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedGranularity === "year"
                ? "bg-blue-600 text-white shadow-md scale-105"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Filtered Results Display */}
      <div class="border-t pt-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-700">
          Financial Timeline ({selectedGranularity}ly view)
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Showing {filteredStates.length} data points
        </p>

        {/* Summary Statistics */}
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div class="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <p class="text-xs text-gray-600 mb-1">Final Cash</p>
            <p class="text-lg font-semibold text-gray-800">
              {formatCurrency(finalCash)}
            </p>
          </div>
          <div class="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <p class="text-xs text-gray-600 mb-1">Final Investments</p>
            <p class="text-lg font-semibold text-gray-800">
              {formatCurrency(finalInvestments)}
            </p>
          </div>
          <div class="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <p class="text-xs text-gray-600 mb-1">Final Super</p>
            <p class="text-lg font-semibold text-gray-800">
              {formatCurrency(finalSuper)}
            </p>
          </div>
          <div class="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <p class="text-xs text-gray-600 mb-1">Final Loan</p>
            <p class="text-lg font-semibold text-gray-800">
              {formatCurrency(finalLoanBalance)}
            </p>
          </div>
          {finalOffsetBalance > 0 && (
            <div class="bg-blue-50 p-3 rounded-md hover:bg-blue-100 transition-colors duration-200">
              <p class="text-xs text-blue-600 mb-1">Offset Balance</p>
              <p class="text-lg font-semibold text-blue-800">
                {formatCurrency(finalOffsetBalance)}
              </p>
            </div>
          )}
          <div class="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <p class="text-xs text-gray-600 mb-1">Net Worth</p>
            <p class="text-lg font-semibold text-gray-800">
              {formatCurrency(currentNetWorth)}
            </p>
          </div>
          {totalTaxPaid > 0 && (
            <div class="bg-red-50 p-3 rounded-md hover:bg-red-100 transition-colors duration-200">
              <p class="text-xs text-red-600 mb-1">Total Tax Paid</p>
              <p class="text-lg font-semibold text-red-800">
                {formatCurrency(totalTaxPaid)}
              </p>
            </div>
          )}
          {totalInterestSaved > 0 && (
            <div class="bg-green-50 p-3 rounded-md hover:bg-green-100 transition-colors duration-200">
              <p class="text-xs text-green-600 mb-1">Interest Saved</p>
              <p class="text-lg font-semibold text-green-800">
                {formatCurrency(totalInterestSaved)}
              </p>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
          <table class="data-table">
            <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
              <tr>
                <th class="sticky-header">
                  <div>Date</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    Final: {filteredStates[filteredStates.length - 1]?.date.toLocaleDateString()}
                  </div>
                </th>
                <th class="text-right sticky-header">
                  <div>Cash</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(filteredStates[filteredStates.length - 1]?.cash || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header">
                  <div>Investments</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(filteredStates[filteredStates.length - 1]?.investments || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header">
                  <div>Super</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(filteredStates[filteredStates.length - 1]?.superannuation || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header">
                  <div>Loan</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(filteredStates[filteredStates.length - 1]?.loanBalance || 0)}
                  </div>
                </th>
                {finalOffsetBalance > 0 && (
                  <th class="text-right sticky-header">
                    <div>Offset</div>
                    <div class="text-xs font-normal text-gray-500 mt-1">
                      {formatCurrency(finalOffsetBalance)}
                    </div>
                  </th>
                )}
                <th class="text-right sticky-header">
                  <div>Net Worth</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(filteredStates[filteredStates.length - 1]?.netWorth || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header">
                  <div>Cash Flow</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(filteredStates[filteredStates.length - 1]?.cashFlow || 0)}
                  </div>
                </th>
                {totalTaxPaid > 0 && (
                  <th class="text-right sticky-header">
                    <div>Tax</div>
                    <div class="text-xs font-normal text-gray-500 mt-1">
                      {formatCurrency(totalTaxPaid)}
                    </div>
                  </th>
                )}
                {totalInterestSaved > 0 && (
                  <th class="text-right sticky-header">
                    <div>Int. Saved</div>
                    <div class="text-xs font-normal text-gray-500 mt-1">
                      {formatCurrency(totalInterestSaved)}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStates.map((state, index) => (
                <tr key={index}>
                  <td class="text-gray-900 font-medium">
                    {state.date.toLocaleDateString()}
                  </td>
                  <td
                    class={`text-right ${
                      state.cash < 0 ? "text-red-600 font-semibold" : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(state.cash)}
                  </td>
                  <td class="text-gray-900 text-right">
                    {formatCurrency(state.investments)}
                  </td>
                  <td class="text-gray-900 text-right">
                    {formatCurrency(state.superannuation)}
                  </td>
                  <td class="text-gray-900 text-right">
                    {formatCurrency(state.loanBalance)}
                  </td>
                  {finalOffsetBalance > 0 && (
                    <td class="text-blue-600 text-right">
                      {formatCurrency(state.offsetBalance)}
                    </td>
                  )}
                  <td
                    class={`text-right font-semibold ${
                      state.netWorth < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(state.netWorth)}
                  </td>
                  <td
                    class={`text-right font-medium ${
                      state.cashFlow < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(state.cashFlow)}
                  </td>
                  {totalTaxPaid > 0 && (
                    <td class="text-red-600 text-right text-sm">
                      {formatCurrency(state.taxPaid || 0)}
                    </td>
                  )}
                  {totalInterestSaved > 0 && (
                    <td class="text-green-600 text-right text-sm">
                      {formatCurrency(state.interestSaved || 0)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
