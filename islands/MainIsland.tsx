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
import type { ExpenseItem } from "../types/expenses.ts";
import InputIsland from "./InputIsland.tsx";
import VisualizationIsland from "./VisualizationIsland.tsx";
import ComparisonIsland from "./ComparisonIsland.tsx";
import TransitionManagerIsland from "./TransitionManagerIsland.tsx";
import ExpenseManagerIsland from "./ExpenseManagerIsland.tsx";
import HouseholdManagerIsland from "./HouseholdManagerIsland.tsx";
import InvestmentManagerIsland from "./InvestmentManagerIsland.tsx";
import ErrorBoundary from "../components/ErrorBoundary.tsx";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import { storageService } from "../lib/storage.ts";

export default function MainIsland() {
  const [config, setConfig] = useState<SimulationConfiguration | null>(null);
  const [simulationResult, setSimulationResult] = useState<EnhancedSimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"configure" | "results" | "investments">("configure");

  // Load configuration on mount
  useEffect(() => {
    const loadedConfig = storageService.loadConfiguration();
    if (loadedConfig) {
      setConfig(loadedConfig);
      // Run initial simulation with loaded config
      runSimulation(loadedConfig);
    } else {
      // No saved config, create default one
      const defaultConfig: SimulationConfiguration = {
        baseParameters: {
          annualSalary: 80000,
          salaryFrequency: "monthly",
          incomeTaxRate: 30,
          monthlyLivingExpenses: 0,
          monthlyRentOrMortgage: 0,
          expenseItems: [],
          loans: [],
          loanPrincipal: 0,
          loanInterestRate: 5.5,
          loanPaymentAmount: 0,
          loanPaymentFrequency: "monthly",
          useOffsetAccount: false,
          currentOffsetBalance: 0,
          monthlyInvestmentContribution: 500,
          investmentReturnRate: 7,
          currentInvestmentBalance: 10000,
          superContributionRate: 11,
          superReturnRate: 7,
          currentSuperBalance: 50000,
          desiredAnnualRetirementIncome: 60000,
          retirementAge: 65,
          currentAge: 30,
          simulationYears: 40,
          startDate: new Date(),
          householdMode: "single",
          people: [
            {
              id: "person-1",
              name: "Me",
              currentAge: 30,
              retirementAge: 65,
              incomeSources: [],
              superAccounts: [],
            },
          ],
        },
        transitions: [],
      };
      setConfig(defaultConfig);
      // Save the default config
      try {
        storageService.saveConfiguration(defaultConfig);
      } catch (error) {
        console.error("Failed to save initial configuration:", error);
      }
      // Run initial simulation
      runSimulation(defaultConfig);
    }
  }, []);

  // Run simulation whenever config changes
  const runSimulation = (configuration: SimulationConfiguration) => {
    try {
      const result = SimulationEngine.runSimulationWithTransitions(configuration);
      setSimulationResult(result);
      // Don't auto-switch tabs - let user stay on current tab
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
        {/* Tab Navigation */}
        <div class="mb-6">
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("configure")}
                class={`${
                  activeTab === "configure"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center`}
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configure
              </button>
              <button
                onClick={() => setActiveTab("investments")}
                class={`${
                  activeTab === "investments"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center`}
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Investments
                {config && config.baseParameters.investmentHoldings && config.baseParameters.investmentHoldings.length > 0 && (
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {config.baseParameters.investmentHoldings.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("results")}
                class={`${
                  activeTab === "results"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center`}
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Results
                {simulationResult && (
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Ready
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Configure Tab */}
        {activeTab === "configure" && (
          <div class="space-y-4 sm:space-y-6 fade-in">
            {/* Household Manager - Only show if config exists */}
            {config && (
              <ErrorBoundary>
                <HouseholdManagerIsland
                  config={config}
                  onConfigChange={handleConfigurationChange}
                />
              </ErrorBoundary>
            )}

            <ErrorBoundary>
              <InputIsland 
                config={config}
                onConfigurationChange={handleConfigurationChange} 
              />
            </ErrorBoundary>

            {/* Expense Manager - Only show if config exists */}
            {config && (
              <ErrorBoundary>
                <ExpenseManagerIsland
                  expenses={config.baseParameters.expenseItems || []}
                  onExpensesChange={(expenses: ExpenseItem[]) => {
                    const updatedConfig = {
                      ...config,
                      baseParameters: {
                        ...config.baseParameters,
                        expenseItems: expenses,
                      },
                    };
                    handleConfigurationChange(updatedConfig);
                  }}
                />
              </ErrorBoundary>
            )}

            {/* Transition Manager - Only show if config exists */}
            {config && (
              <ErrorBoundary>
                <TransitionManagerIsland
                  config={config}
                  onConfigChange={handleConfigurationChange}
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  Welcome to Finance Simulation Tool
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  Enter your financial parameters to begin your simulation.
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
        )}

        {/* Investments Tab */}
        {activeTab === "investments" && (
          <div class="space-y-4 sm:space-y-6 fade-in">
            {config && (
              <ErrorBoundary>
                <InvestmentManagerIsland
                  config={config}
                  onConfigChange={handleConfigurationChange}
                />
              </ErrorBoundary>
            )}
            {!config && (
              <div class="card p-8 text-center fade-in">
                <svg
                  class="mx-auto h-16 w-16 text-blue-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  Investment Portfolio
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  Configure your financial parameters first to start tracking investments.
                </p>
                <button
                  onClick={() => setActiveTab("configure")}
                  class="btn-primary inline-flex items-center"
                >
                  Go to Configure
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "results" && (
          <div class="space-y-4 sm:space-y-6 fade-in">
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
                  desiredRetirementAge={config?.baseParameters.retirementAge}
                />
              </ErrorBoundary>
            )}

            {/* No Results Message */}
            {!simulationResult && (
              <div class="card p-8 text-center fade-in">
                <svg
                  class="mx-auto h-16 w-16 text-gray-400 mb-4"
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
                  No Results Yet
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  Configure your financial parameters in the Configure tab to see results.
                </p>
                <button
                  onClick={() => setActiveTab("configure")}
                  class="btn-primary inline-flex items-center"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Go to Configure
                </button>
              </div>
            )}
          </div>
        )}
      </ErrorBoundary>
    </main>
  );
}
