/**
 * SimulationIsland - Fresh island component for running financial simulations
 * Validates: Requirements 5.1, 5.2
 */

import { useEffect, useState } from "preact/hooks";
import type { SimulationResult, UserParameters } from "../types/financial.ts";
import { SimulationEngine } from "../lib/simulation_engine.ts";

interface SimulationIslandProps {
  parameters: UserParameters;
  onSimulationComplete?: (result: SimulationResult) => void;
}

/**
 * SimulationIsland component
 * 
 * Receives UserParameters as props and automatically triggers simulation
 * when parameters change. Manages loading state and error handling.
 * 
 * Requirements 5.1: Parameter changes trigger new simulation runs
 * Requirements 5.2: Results update to reflect new scenarios
 */
export default function SimulationIsland({
  parameters,
  onSimulationComplete,
}: SimulationIslandProps) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Runs simulation when parameters change
   * Requirements 5.1: WHEN a user modifies a financial parameter 
   * THEN the Finance Simulation Tool SHALL trigger a new simulation run automatically
   */
  useEffect(() => {
    const runSimulation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Run simulation in a setTimeout to allow UI to update
        // This prevents blocking the UI thread for long simulations
        await new Promise((resolve) => setTimeout(resolve, 0));

        const simulationResult = SimulationEngine.runSimulation(parameters);

        setResult(simulationResult);
        
        // Notify parent component if callback provided
        if (onSimulationComplete) {
          onSimulationComplete(simulationResult);
        }
      } catch (err) {
        // Handle simulation errors gracefully with user-friendly messages
        let errorMessage = "An unexpected error occurred during simulation";
        
        if (err instanceof Error) {
          // Provide more specific error messages based on error type
          if (err.message.includes("division by zero") || err.message.includes("divide by zero")) {
            errorMessage = "Invalid calculation detected. Please check your input values, especially interest rates and payment amounts.";
          } else if (err.message.includes("overflow") || err.message.includes("Infinity")) {
            errorMessage = "The simulation produced values that are too large. Please adjust your parameters to more realistic values.";
          } else if (err.message.includes("NaN") || err.message.includes("not a number")) {
            errorMessage = "Invalid numeric values detected. Please ensure all inputs are valid numbers.";
          } else if (err.message.includes("timeout") || err.message.includes("time out")) {
            errorMessage = "The simulation is taking too long. Try reducing the simulation years or adjusting your parameters.";
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
        console.error("Simulation error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    runSimulation();
  }, [parameters]); // Re-run when parameters change

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div class="card p-8 fade-in">
        <div class="flex flex-col items-center justify-center space-y-4">
          <div class="spinner-lg"></div>
          <div class="text-center">
            <p class="text-lg font-medium text-gray-700">Running simulation...</p>
            <p class="text-sm text-gray-500 mt-1">Calculating your financial future</p>
          </div>
          <div class="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
            <div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 100%"></div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
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
                Simulation Error
              </h3>
              <div class="text-sm text-red-700 mb-3">
                <p>{error}</p>
              </div>
              <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p class="text-xs text-red-800 mb-2">
                  <strong>Common solutions:</strong>
                </p>
                <ul class="text-xs text-red-700 list-disc list-inside space-y-1">
                  <li>Verify all input values are positive numbers</li>
                  <li>Ensure interest rates are reasonable (0-100%)</li>
                  <li>Check that loan payments are sufficient to cover interest</li>
                  <li>Reduce simulation years if the calculation is too complex</li>
                </ul>
              </div>
              <div class="flex gap-3">
                <button
                  onClick={() => setError(null)}
                  class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
                >
                  Retry Simulation
                </button>
                <button
                  onClick={() => window.location.reload()}
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render simulation results
   * Requirements 5.2: Display updated results reflecting new scenario
   */
  if (result) {
    return (
      <div class="card p-6 fade-in">
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Simulation Results</h2>

        {/* Key Metrics */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Retirement Date */}
          <div class="metric-card bg-blue-50">
            <h3 class="text-sm font-medium text-gray-600 mb-1">
              Retirement Date
            </h3>
            <p class="text-2xl font-bold text-blue-600">
              {result.retirementDate
                ? result.retirementDate.toLocaleDateString()
                : "Not Achievable"}
            </p>
            {result.retirementAge && (
              <p class="text-sm text-gray-600 mt-1">
                Age {Math.floor(result.retirementAge)}
              </p>
            )}
          </div>

          {/* Net Worth */}
          <div class="metric-card bg-green-50">
            <h3 class="text-sm font-medium text-gray-600 mb-1">
              Final Net Worth
            </h3>
            <p class="text-2xl font-bold text-green-600">
              ${result.states[result.states.length - 1].netWorth.toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </p>
          </div>

          {/* Sustainability */}
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

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div class="alert-warning">
            <h3 class="text-sm font-medium text-yellow-800 mb-2">
              Warnings
            </h3>
            <ul class="list-disc list-inside space-y-1">
              {result.warnings.map((warning, index) => (
                <li key={index} class="text-sm text-yellow-700">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Statistics */}
        <div class="border-t pt-4 mt-6">
          <h3 class="text-lg font-semibold mb-3 text-gray-700">
            Summary Statistics
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="scale-in">
              <p class="text-sm text-gray-600">Total Periods</p>
              <p class="text-lg font-semibold text-gray-800">
                {result.states.length}
              </p>
            </div>
            <div class="scale-in">
              <p class="text-sm text-gray-600">Final Cash</p>
              <p class="text-lg font-semibold text-gray-800">
                ${result.states[result.states.length - 1].cash.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </p>
            </div>
            <div class="scale-in">
              <p class="text-sm text-gray-600">Final Investments</p>
              <p class="text-lg font-semibold text-gray-800">
                ${result.states[result.states.length - 1].investments.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </p>
            </div>
            <div class="scale-in">
              <p class="text-sm text-gray-600">Final Super</p>
              <p class="text-lg font-semibold text-gray-800">
                ${result.states[result.states.length - 1].superannuation.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Should not reach here, but provide fallback
  return null;
}
