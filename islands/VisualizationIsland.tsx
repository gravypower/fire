/**
 * VisualizationIsland - Fresh island component for displaying simulation results
 * Validates: Requirements 3.5, 4.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useState } from "preact/hooks";
import type { SimulationResult, TimeInterval, TransitionPoint, EnhancedSimulationResult, UserParameters } from "../types/financial.ts";
import type { Milestone, RetirementAdvice } from "../types/milestones.ts";
import { formatCurrency, groupByTimeInterval, findLoanPayoffDate } from "../lib/result_utils.ts";
import { detectMilestonesFromSimulation } from "../lib/milestone_detector.ts";
import { generateRetirementAdvice } from "../lib/retirement_advice_engine.ts";
import NetWorthChart from "../components/NetWorthChart.tsx";
import CashFlowChart from "../components/CashFlowChart.tsx";
import ChartErrorBoundary from "../components/ChartErrorBoundary.tsx";


import { SummaryTable, LoansTable, InvestmentsTable, TaxTable, CashFlowTable } from "../components/FinancialTimelineTables.tsx";

interface VisualizationIslandProps {
  result: SimulationResult | EnhancedSimulationResult;
  transitionPoints?: TransitionPoint[];
  desiredRetirementAge?: number;
  userParameters?: UserParameters;
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
  desiredRetirementAge,
  userParameters,
}: VisualizationIslandProps) {
  // State for time granularity selection
  const [selectedGranularity, setSelectedGranularity] = useState<TimeInterval>("year");
  
  // State for which detailed table to show
  const [selectedDetailTable, setSelectedDetailTable] = useState<"summary" | "loans" | "tax" | "investments" | "cashflow">("summary");



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

  // Calculate cumulative values for each filtered period
  const statesWithPeriodTotals = filteredStates.map((state, index) => {
    // Find the previous filtered state date (or start date for first period)
    const prevDate = index === 0 
      ? result.states[0].date 
      : filteredStates[index - 1].date;
    
    // Sum up all values between previous filtered state and current state
    const periodStates = result.states.filter(s => 
      s.date > prevDate && s.date <= state.date
    );
    
    const periodTaxPaid = periodStates.reduce((sum, s) => sum + (s.taxPaid || 0), 0);
    const periodExpenses = periodStates.reduce((sum, s) => sum + (s.expenses || 0), 0);
    const periodInterestSaved = periodStates.reduce((sum, s) => sum + (s.interestSaved || 0), 0);
    const periodDeductibleInterest = periodStates.reduce((sum, s) => sum + (s.deductibleInterest || 0), 0);
    const periodCashFlow = periodStates.reduce((sum, s) => sum + (s.cashFlow || 0), 0);
    
    return {
      ...state,
      periodTaxPaid,
      periodExpenses,
      periodInterestSaved,
      periodDeductibleInterest,
      periodCashFlow,
    };
  });

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

  // Calculate total tax paid and interest saved (full simulation)
  const totalTaxPaid = result.states.reduce((sum, state) => sum + (state.taxPaid || 0), 0);
  const totalInterestSaved = result.states.reduce((sum, state) => sum + (state.interestSaved || 0), 0);
  const totalDeductibleInterest = result.states.reduce((sum, state) => sum + (state.deductibleInterest || 0), 0);

  // Calculate cumulative totals for filtered states (sum of all period totals)
  const filteredTaxPaid = statesWithPeriodTotals.reduce((sum, state) => sum + (state.periodTaxPaid || 0), 0);
  const filteredExpenses = statesWithPeriodTotals.reduce((sum, state) => sum + (state.periodExpenses || 0), 0);
  const filteredInterestSaved = statesWithPeriodTotals.reduce((sum, state) => sum + (state.periodInterestSaved || 0), 0);
  const filteredDeductibleInterest = statesWithPeriodTotals.reduce((sum, state) => sum + (state.periodDeductibleInterest || 0), 0);

  // Find loan payoff date
  const loanPayoffDate = findLoanPayoffDate(result.states);

  // Generate milestones and advice if user parameters are available
  let milestones: Milestone[] = [];
  let retirementAdvice: RetirementAdvice | null = null;

  if (userParameters) {
    try {
      // Detect milestones from simulation results
      const milestoneResult = detectMilestonesFromSimulation(
        result.states,
        userParameters,
        effectiveTransitionPoints
      );
      milestones = milestoneResult.milestones;

      // Generate retirement advice
      const adviceResult = generateRetirementAdvice(
        result,
        userParameters,
        milestones
      );
      retirementAdvice = adviceResult.advice;
    } catch (error) {
      console.warn('Failed to generate milestones or advice:', error);
    }
  }

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
            result.retirementDate 
              ? (desiredRetirementAge && result.retirementAge && result.retirementAge > desiredRetirementAge + 1 
                  ? "bg-orange-50" 
                  : "bg-blue-50")
              : "bg-red-50"
          }`}
        >
          <h3 class="text-sm font-medium text-gray-600 mb-1">
            Retirement Date
          </h3>
          <p
            class={`text-2xl font-bold ${
              result.retirementDate 
                ? (desiredRetirementAge && result.retirementAge && result.retirementAge > desiredRetirementAge + 1 
                    ? "text-orange-600" 
                    : "text-blue-600")
                : "text-red-600"
            }`}
          >
            {result.retirementDate
              ? result.retirementDate.toLocaleDateString()
              : "Not Achievable"}
          </p>
          {result.retirementAge && (
            <p class="text-sm text-gray-600 mt-1">
              Age {Math.floor(result.retirementAge)}
              {desiredRetirementAge && result.retirementAge > desiredRetirementAge + 1 && (
                <span class="text-orange-600 font-semibold">
                  {" "}(Goal: {desiredRetirementAge})
                </span>
              )}
            </p>
          )}
          {!result.retirementDate && desiredRetirementAge && (
            <p class="text-sm text-red-600 mt-1 font-semibold">
              Goal: Age {desiredRetirementAge}
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
                  <span class="font-semibold">{Math.floor(result.retirementAge || 0)}</span>. Your financial plan is sustainable.
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



      {/* Charts Section - Requirements 6.1, 6.2, 6.3, 6.4, 4.1, 4.4 */}
      <div class="grid grid-cols-1 gap-6 mb-6">
        <ChartErrorBoundary chartName="Net Worth Chart">
          <NetWorthChart 
            states={statesWithPeriodTotals} 
            transitionPoints={effectiveTransitionPoints}
          />
        </ChartErrorBoundary>
        <ChartErrorBoundary chartName="Cash Flow Chart">
          <CashFlowChart 
            states={statesWithPeriodTotals}
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
            onClick={() => setSelectedGranularity("fortnight")}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedGranularity === "fortnight"
                ? "bg-blue-600 text-white shadow-md scale-105"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
            }`}
          >
            Fortnightly
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
          Financial Timeline ({selectedGranularity === "fortnight" ? "Fortnightly" : selectedGranularity}ly view)
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Showing {statesWithPeriodTotals.length} data points
        </p>

        {/* Event Legend */}
        <div class="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Timeline Events:</h4>
          <div class="flex flex-wrap gap-4 text-xs">
            {result.retirementDate && (
              <div class="flex items-center">
                <span class="text-green-600 font-semibold mr-1">🎉</span>
                <span class="text-gray-700">Retirement Date</span>
              </div>
            )}
            {initialLoanBalance > 0 && (
              <div class="flex items-center">
                <svg class="w-4 h-4 text-blue-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="text-gray-700">Loan Paid Off</span>
              </div>
            )}
            {effectiveTransitionPoints.length > 0 && (
              <div class="flex items-center">
                <svg class="w-4 h-4 text-purple-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                <span class="text-gray-700">Parameter Transition</span>
              </div>
            )}
          </div>
          <p class="text-xs text-gray-600 mt-2">
            Look for highlighted rows in the table below to see when these events occur.
          </p>
        </div>

        {/* Table View Selector */}
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Table View
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDetailTable("summary")}
              class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedDetailTable === "summary"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setSelectedDetailTable("loans")}
              class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedDetailTable === "loans"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
              }`}
            >
              Loans & Debt
            </button>
            <button
              onClick={() => setSelectedDetailTable("investments")}
              class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedDetailTable === "investments"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
              }`}
            >
              Investments & Super
            </button>
            <button
              onClick={() => setSelectedDetailTable("tax")}
              class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedDetailTable === "tax"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
              }`}
            >
              Tax & Deductions
            </button>
            <button
              onClick={() => setSelectedDetailTable("cashflow")}
              class={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedDetailTable === "cashflow"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105"
              }`}
            >
              Cash Flow & Expenses
            </button>
          </div>
        </div>

        <p class="text-sm text-gray-600 mb-4">
          Note: Period values show cumulative amounts for each {selectedGranularity === "fortnight" ? "fortnight" : selectedGranularity}. Headers show final or total values.
        </p>

        {/* Render Selected Table */}
        {selectedDetailTable === "summary" && (
          <SummaryTable 
            states={statesWithPeriodTotals}
            transitionPoints={effectiveTransitionPoints}
            retirementDate={result.retirementDate || undefined}
            allStates={result.states}
            milestones={milestones}
          />
        )}
        {selectedDetailTable === "loans" && (
          <LoansTable 
            states={statesWithPeriodTotals}
            transitionPoints={effectiveTransitionPoints}
            retirementDate={result.retirementDate || undefined}
            allStates={result.states}
            milestones={milestones}
          />
        )}
        {selectedDetailTable === "investments" && (
          <InvestmentsTable 
            states={statesWithPeriodTotals}
            transitionPoints={effectiveTransitionPoints}
            retirementDate={result.retirementDate || undefined}
            allStates={result.states}
            milestones={milestones}
          />
        )}
        {selectedDetailTable === "tax" && (
          <TaxTable 
            states={statesWithPeriodTotals}
            transitionPoints={effectiveTransitionPoints}
            retirementDate={result.retirementDate || undefined}
            allStates={result.states}
            milestones={milestones}
          />
        )}
        {selectedDetailTable === "cashflow" && (
          <CashFlowTable 
            states={statesWithPeriodTotals}
            transitionPoints={effectiveTransitionPoints}
            retirementDate={result.retirementDate || undefined}
            allStates={result.states}
            milestones={milestones}
          />
        )}

        {/* Old table removed - replaced with component-based tables above */}
        <div style="display: none;">
          <table class="data-table">
            <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
              <tr>
                <th class="sticky-header">
                  <div>Date</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    Final: {statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.date.toLocaleDateString()}
                  </div>
                </th>
                <th class="text-right sticky-header bg-gray-50">
                  <div>Cash Available</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency((statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.cash || 0) + (statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.offsetBalance || 0))}
                  </div>
                </th>
                <th class="text-right sticky-header bg-gray-50">
                  <div>Investments</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.investments || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header bg-gray-50">
                  <div>Super</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.superannuation || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header bg-gray-50">
                  <div>Loan</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.loanBalance || 0)}
                  </div>
                </th>
                {finalOffsetBalance > 0 && (
                  <th class="text-right sticky-header bg-blue-50">
                    <div class="text-blue-700">Offset</div>
                    <div class="text-xs font-normal text-blue-600 mt-1">
                      {formatCurrency(finalOffsetBalance)}
                    </div>
                  </th>
                )}
                <th class="text-right sticky-header bg-gray-50">
                  <div>Net Worth</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.netWorth || 0)}
                  </div>
                </th>
                <th class="text-right sticky-header bg-gray-50">
                  <div>Cash Flow</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    {formatCurrency(statesWithPeriodTotals[statesWithPeriodTotals.length - 1]?.periodCashFlow || 0)}
                  </div>
                </th>
                {filteredExpenses > 0 && (
                  <th class="text-right sticky-header bg-orange-50">
                    <div class="text-orange-700">Expenses</div>
                    <div class="text-xs font-normal text-orange-600 mt-1">
                      Cumulative: {formatCurrency(filteredExpenses)}
                    </div>
                  </th>
                )}
                {filteredTaxPaid > 0 && (
                  <th class="text-right sticky-header bg-red-50">
                    <div class="text-red-700">Tax</div>
                    <div class="text-xs font-normal text-red-600 mt-1">
                      Cumulative: {formatCurrency(filteredTaxPaid)}
                    </div>
                  </th>
                )}
                {filteredInterestSaved > 0 && (
                  <th class="text-right sticky-header bg-green-50">
                    <div class="text-green-700">Int. Saved</div>
                    <div class="text-xs font-normal text-green-600 mt-1">
                      Cumulative: {formatCurrency(filteredInterestSaved)}
                    </div>
                  </th>
                )}
                {filteredDeductibleInterest > 0 && (
                  <th class="text-right sticky-header bg-blue-50">
                    <div class="text-blue-700">Tax Deduction</div>
                    <div class="text-xs font-normal text-blue-600 mt-1">
                      Cumulative: {formatCurrency(filteredDeductibleInterest)}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {statesWithPeriodTotals.map((state, index) => {
                // Find the original state index in the full states array
                const originalIndex = result.states.findIndex(s => s.date.getTime() === state.date.getTime());
                
                // Check if this date matches retirement date
                const isRetirementDate = result.retirementDate && 
                  state.date.toDateString() === result.retirementDate.toDateString();
                
                // Check if there's a transition at this state
                const transitionAtThisState = effectiveTransitionPoints.find(
                  tp => tp.stateIndex === originalIndex
                );
                
                // Check if loan was paid off at this date
                const isPreviousLoanBalance = index > 0 && statesWithPeriodTotals[index - 1].loanBalance > 0;
                const isLoanPayoff = isPreviousLoanBalance && state.loanBalance === 0;
                
                // Determine row styling based on events
                const hasEvent = isRetirementDate || transitionAtThisState || isLoanPayoff;
                let rowClass = "";
                if (isRetirementDate) rowClass = "bg-green-50 border-l-4 border-green-500";
                else if (isLoanPayoff) rowClass = "bg-blue-50 border-l-4 border-blue-500";
                else if (transitionAtThisState) rowClass = "bg-purple-50 border-l-4 border-purple-500";
                
                return (
                  <tr key={index} class={rowClass}>
                    <td class="text-gray-900 font-medium">
                      <div class={hasEvent ? "font-bold" : ""}>{state.date.toLocaleDateString()}</div>
                      {isRetirementDate && (
                        <div class="text-xs font-bold text-green-700 mt-1 flex items-center bg-green-100 px-2 py-1 rounded">
                          <span class="mr-1">🎉</span>
                          Retirement Date
                        </div>
                      )}
                      {isLoanPayoff && (
                        <div class="text-xs font-bold text-blue-700 mt-1 flex items-center bg-blue-100 px-2 py-1 rounded">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          Loan Paid Off
                        </div>
                      )}
                      {transitionAtThisState && (
                        <div class="text-xs font-bold text-purple-700 mt-1 flex items-center bg-purple-100 px-2 py-1 rounded">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                          </svg>
                          {transitionAtThisState.transition.label || "Transition"}
                        </div>
                      )}
                    </td>
                    <td
                      class={`text-right ${
                        (state.cash + state.offsetBalance) < 0 ? "text-red-600 font-semibold" : "text-gray-900"
                      }`}
                      title={`Cash: ${formatCurrency(state.cash)}\nOffset: ${formatCurrency(state.offsetBalance)}`}
                    >
                      {formatCurrency(state.cash + state.offsetBalance)}
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
                      <td class="text-gray-900 text-right">
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
                        state.periodCashFlow < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(state.periodCashFlow)}
                    </td>
                    {filteredExpenses > 0 && (
                      <td class="text-gray-900 text-right text-sm">
                        {formatCurrency(state.periodExpenses || 0)}
                      </td>
                    )}
                    {filteredTaxPaid > 0 && (
                      <td class="text-gray-900 text-right text-sm">
                        {formatCurrency(state.periodTaxPaid || 0)}
                      </td>
                    )}
                    {filteredInterestSaved > 0 && (
                      <td class="text-gray-900 text-right text-sm">
                        {formatCurrency(state.periodInterestSaved || 0)}
                      </td>
                    )}
                    {filteredDeductibleInterest > 0 && (
                      <td class="text-gray-900 text-right text-sm">
                        {formatCurrency(state.periodDeductibleInterest || 0)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
