/**
 * MainIsland - Handles all interactive state for the Finance Simulation Tool
 * 
 * This island component manages state that was previously in the route component.
 * In Fresh, useState can only be used in island components, not in routes.
 */

import { useState, useEffect } from "preact/hooks";
import type {
  SimulationConfiguration,
  EnhancedSimulationResult,
} from "../types/financial.ts";
import InputIsland from "./InputIsland.tsx";
import VisualizationIsland from "./VisualizationIsland.tsx";
import ComparisonIsland from "./ComparisonIsland.tsx";
import TransitionManagerIsland from "./TransitionManagerIsland.tsx";
import ErrorBoundary from "../components/ErrorBoundary.tsx";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import { storageService } from "../lib/storage.ts";

export default function MainIsland() {
  const [config, setConfig] = useState<SimulationConfiguration | null>(null);
  const [simulationResult, setSimulationResult] = useState<EnhancedSimulationResult | null>(null);

  // Load configuration on mount
  useEffect(() => {
    const loadedConfig = storageService.loadConfiguration();
    if (loadedConfig) {
      setConfig(loadedConfig);
      // Run initial simulation with loaded config
      runSimulation(loadedConfig);
    }
  }, []);

  // Run simulation whenever config changes
  const runSimulation = (configuration: SimulationConfiguration) => {
    try {
      const result = SimulationEngine.runSimulationWithTransitions(configuration);
      setSimulationResult(result);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };

  const handleConfigurationChange = (newConfig: SimulationConfiguration) => {
    setConfig(newConfig);
    // Save to storage
    try {
      storageService.saveConfiguration(newConfig);
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
    // Trigger simulation
    runSimulation(newConfig);
  };

  return (
    <main class="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <ErrorBoundary>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column: Input Parameters and Transitions - Narrower */}
          <div class="lg:col-span-3 xl:col-span-2 space-y-4 sm:space-y-6">
            <ErrorBoundary>
              <InputIsland 
                config={config}
                onConfigurationChange={handleConfigurationChange} 
              />
            </ErrorBoundary>

            {/* Transition Manager - Only show if config exists */}
            {config && (
              <ErrorBoundary>
                <TransitionManagerIsland
                  config={config}
                  onConfigChange={handleConfigurationChange}
                />
              </ErrorBoundary>
            )}
          </div>

          {/* Right Column: Simulation and Visualization - Wider */}
          <div class="lg:col-span-9 xl:col-span-10 space-y-4 sm:space-y-6">
            {/* Comparison Island - Only show if config has transitions */}
            {config && config.transitions.length > 0 && (
              <ErrorBoundary>
                <ComparisonIsland config={config} />
              </ErrorBoundary>
            )}

            {/* Visualization Island */}
            {simulationResult && (
              <ErrorBoundary>
                <VisualizationIsland 
                  result={simulationResult}
                  transitionPoints={simulationResult.transitionPoints}
                />
              </ErrorBoundary>
            )}

            {/* Initial State Message */}
            {!config && (
              <div class="card p-8 text-center fade-in">
                <svg
                  class="mx-auto h-16 w-16 text-blue-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  Welcome to Finance Simulation Tool
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  Enter your financial parameters on the left to begin your simulation.
                </p>
                <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                  <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-sm text-blue-700 font-medium">
                    Your data is stored locally and never leaves your device
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </main>
  );
}
