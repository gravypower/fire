/**
 * ComparisonIsland - Fresh island component for running comparison simulations
 * Validates: Requirements 10.1
 */

import { useState } from "preact/hooks";
import type {
  ComparisonSimulationResult,
  SimulationConfiguration,
} from "../types/financial.ts";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import ComparisonView from "../components/ComparisonView.tsx";

interface ComparisonIslandProps {
  config: SimulationConfiguration;
}

/**
 * ComparisonIsland component
 * 
 * Provides a button to trigger comparison simulation and displays results.
 * Compares scenarios with and without parameter transitions.
 * 
 * Requirements 10.1: Offer option to run comparison simulation
 */
export default function ComparisonIsland({ config }: ComparisonIslandProps) {
  const [comparison, setComparison] = useState<
    ComparisonSimulationResult | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  /**
   * Runs comparison simulation
   * Requirements 10.1: Run comparison when user requests it
   */
  const handleRunComparison = async () => {
    setIsLoading(true);
    setError(null);
    setShowComparison(true);

    try {
      // Run comparison in a setTimeout to allow UI to update
      await new Promise((resolve) => setTimeout(resolve, 0));

      const comparisonResult = SimulationEngine.runComparisonSimulation(config);

      setComparison(comparisonResult);
    } catch (err) {
      let errorMessage = "An unexpected error occurred during comparison";

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error("Comparison error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Closes the comparison view
   */
  const handleCloseComparison = () => {
    setShowComparison(false);
    setComparison(null);
    setError(null);
  };

  // Only show button if there are transitions to compare
  if (config.transitions.length === 0) {
    return null;
  }

  return (
    <div class="fade-in">
      {/* Compare Scenarios Button */}
      {!showComparison && (
        <div class="card p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-800 mb-1">
                Compare Scenarios
              </h3>
              <p class="text-sm text-gray-600">
                See how your transitions impact your financial future compared to
                maintaining base parameters
              </p>
            </div>
            <button
              onClick={handleRunComparison}
              class="ml-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Compare Scenarios
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div class="card p-8 fade-in">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="spinner-lg"></div>
            <div class="text-center">
              <p class="text-lg font-medium text-gray-700">
                Running comparison...
              </p>
              <p class="text-sm text-gray-500 mt-1">
                Comparing scenarios with and without transitions
              </p>
            </div>
            <div class="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                class="bg-blue-600 h-2 rounded-full animate-pulse"
                style="width: 100%"
              >
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div class="card p-6 fade-in">
          <div class="alert-error">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-8 w-8 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-lg font-semibold text-red-800 mb-2">
                  Comparison Error
                </h3>
                <div class="text-sm text-red-700 mb-3">
                  <p>{error}</p>
                </div>
                <div class="flex gap-3">
                  <button
                    onClick={handleRunComparison}
                    class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
                  >
                    Retry Comparison
                  </button>
                  <button
                    onClick={handleCloseComparison}
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && !isLoading && !error && (
        <div class="fade-in">
          <div class="mb-4 flex justify-end">
            <button
              onClick={handleCloseComparison}
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium flex items-center"
            >
              <svg
                class="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close Comparison
            </button>
          </div>
          <ComparisonView comparison={comparison} />
        </div>
      )}
    </div>
  );
}
