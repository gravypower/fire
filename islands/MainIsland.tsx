/**
 * MainIsland - Handles all interactive state for the Finance Simulation Tool
 * 
 * This island component manages state that was previously in the route component.
 * In Fresh, useState can only be used in island components, not in routes.
 */

import { useState, useEffect, useRef } from "preact/hooks";
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
import MilestoneTimeline from "../components/MilestoneTimeline.tsx";
import RetirementAdvicePanel from "../components/RetirementAdvicePanel.tsx";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import { storageService } from "../lib/storage.ts";
import { generateRetirementAdvice } from "../lib/retirement_advice_engine.ts";
import type { RetirementAdvice } from "../types/milestones.ts";

export default function MainIsland() {
  const [config, setConfig] = useState<SimulationConfiguration | null>(null);
  const [simulationResult, setSimulationResult] = useState<EnhancedSimulationResult | null>(null);
  const [retirementAdvice, setRetirementAdvice] = useState<RetirementAdvice | null>(null);
  const [activeTab, setActiveTab] = useState<"configure" | "results" | "investments" | "milestones" | "advice">("configure");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Scroll position tracking
  const scrollPositions = useRef<Record<string, number>>({
    configure: 0,
    results: 0,
    investments: 0,
    milestones: 0,
    advice: 0,
  });
  const contentRef = useRef<HTMLDivElement>(null);

  // Add scroll listener to continuously save position
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        scrollPositions.current[activeTab] = contentRef.current.scrollTop;
      }
    };

    const scrollContainer = contentRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [activeTab]);

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
      
      // Generate retirement advice
      try {
        const adviceResult = generateRetirementAdvice(
          result,
          configuration.baseParameters,
          result.milestones || []
        );
        setRetirementAdvice(adviceResult.advice);
      } catch (error) {
        console.warn('Failed to generate retirement advice:', error);
        setRetirementAdvice(null);
      }
      
      // Don't auto-switch tabs - let user stay on current tab
    } catch (error) {
      console.error("Simulation failed:", error);
      setSimulationResult(null);
      setRetirementAdvice(null);
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

  // Save scroll position when switching tabs
  const saveScrollPosition = () => {
    if (contentRef.current) {
      scrollPositions.current[activeTab] = contentRef.current.scrollTop;
    }
  };

  // Restore scroll position when tab becomes active
  const restoreScrollPosition = (tab: string) => {
    // Use requestAnimationFrame for better timing with content rendering
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = scrollPositions.current[tab] || 0;
        }
      }, 100); // Longer delay for complex content like investments
    });
  };

  // Handle tab switching with scroll position management
  const handleTabSwitch = (tab: "configure" | "results" | "investments" | "milestones" | "advice") => {
    saveScrollPosition();
    setActiveTab(tab);
    restoreScrollPosition(tab);
  };

  // Handle configuration export
  const handleExportConfig = () => {
    try {
      const exportData = storageService.exportConfiguration();
      if (!exportData) {
        alert("No configuration to export. Please configure your parameters first.");
        return;
      }

      // Create and download file
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export configuration. Please try again.");
    }
  };

  // Handle configuration import
  const handleImportConfig = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = storageService.importConfiguration(jsonData);
        
        if (success) {
          // Reload the configuration
          const loadedConfig = storageService.loadConfiguration();
          if (loadedConfig) {
            setConfig(loadedConfig);
            runSimulation(loadedConfig);
            alert("Configuration imported successfully!");
          }
        } else {
          alert("Failed to import configuration. Please check the file format.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import configuration. The file may be corrupted or in the wrong format.");
      }
      
      // Reset file input
      target.value = "";
    };
    
    reader.readAsText(file);
  };

  return (
    <div class="h-full bg-gray-50 flex flex-col">
      <ErrorBoundary>
        {/* Fixed Header with Tab Navigation */}
        <div class="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div class="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop Navigation */}
            <nav class="-mb-px hidden lg:flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabSwitch("configure")}
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
                onClick={() => handleTabSwitch("investments")}
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
                onClick={() => handleTabSwitch("results")}
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
              <button
                onClick={() => handleTabSwitch("milestones")}
                class={`${
                  activeTab === "milestones"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center`}
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Milestones
                {simulationResult?.milestones && simulationResult.milestones.length > 0 && (
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {simulationResult.milestones.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleTabSwitch("advice")}
                class={`${
                  activeTab === "advice"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center`}
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Advice
                {retirementAdvice && (
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {retirementAdvice.recommendations.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Mobile Navigation */}
            <div class="lg:hidden">
              <div class="flex items-center justify-between py-4">
                <div class="flex items-center">
                  <span class="text-lg font-semibold text-gray-900 capitalize">{activeTab}</span>
                  {activeTab === "investments" && config?.baseParameters.investmentHoldings?.length > 0 && (
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {config.baseParameters.investmentHoldings.length}
                    </span>
                  )}
                  {activeTab === "results" && simulationResult && (
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Ready
                    </span>
                  )}
                  {activeTab === "milestones" && simulationResult?.milestones?.length > 0 && (
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {simulationResult.milestones.length}
                    </span>
                  )}
                  {activeTab === "advice" && retirementAdvice && (
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {retirementAdvice.recommendations.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded="false"
                >
                  <span class="sr-only">Open main menu</span>
                  {!mobileMenuOpen ? (
                    <svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Mobile Menu */}
              {mobileMenuOpen && (
                <div class="border-t border-gray-200 pb-3">
                  <div class="grid grid-cols-2 gap-2 px-2 pt-2">
                    <button
                      onClick={() => {
                        handleTabSwitch("configure");
                        setMobileMenuOpen(false);
                      }}
                      class={`${
                        activeTab === "configure"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                      } flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200`}
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure
                    </button>
                    <button
                      onClick={() => {
                        handleTabSwitch("investments");
                        setMobileMenuOpen(false);
                      }}
                      class={`${
                        activeTab === "investments"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                      } flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200`}
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Investments
                      {config?.baseParameters.investmentHoldings?.length > 0 && (
                        <span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {config.baseParameters.investmentHoldings.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleTabSwitch("results");
                        setMobileMenuOpen(false);
                      }}
                      class={`${
                        activeTab === "results"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                      } flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200`}
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Results
                      {simulationResult && (
                        <span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleTabSwitch("milestones");
                        setMobileMenuOpen(false);
                      }}
                      class={`${
                        activeTab === "milestones"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                      } flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200`}
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Milestones
                      {simulationResult?.milestones?.length > 0 && (
                        <span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {simulationResult.milestones.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleTabSwitch("advice");
                        setMobileMenuOpen(false);
                      }}
                      class={`${
                        activeTab === "advice"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                      } flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 col-span-2`}
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Advice
                      {retirementAdvice && (
                        <span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {retirementAdvice.recommendations.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div 
          ref={contentRef}
          class="flex-1 overflow-y-auto"
        >
          <main class="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Configure Tab */}
        {activeTab === "configure" && (
          <div class="space-y-4 sm:space-y-6 fade-in">
            {/* Import/Export Controls */}
            <div class="card p-4 bg-blue-50 border-blue-200">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-1">Configuration Management</h3>
                  <p class="text-sm text-gray-600">Save your configuration to a file or load from a previously saved file.</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleExportConfig}
                    class="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Config
                  </button>
                  <label class="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 transition-colors duration-200 cursor-pointer">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Import Config
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfig}
                      class="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>
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
                  onClick={() => handleTabSwitch("configure")}
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
                  userParameters={config?.baseParameters}
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
                  onClick={() => handleTabSwitch("configure")}
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

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div class="space-y-4 sm:space-y-6 fade-in">
            {simulationResult?.milestones && simulationResult.milestones.length > 0 ? (
              <ErrorBoundary>
                <MilestoneTimeline
                  milestones={simulationResult.milestones}
                  simulationStates={simulationResult.states}
                  onMilestoneClick={(milestone) => {
                    console.log('Milestone clicked:', milestone);
                    // Could implement detailed milestone view here
                  }}
                />
              </ErrorBoundary>
            ) : (
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
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  No Milestones Found
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  {!simulationResult 
                    ? "Run a simulation to see your financial milestones."
                    : "No significant financial milestones were detected in your simulation."
                  }
                </p>
                {!simulationResult && (
                  <button
                    onClick={() => handleTabSwitch("configure")}
                    class="btn-primary inline-flex items-center"
                  >
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Go to Configure
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Advice Tab */}
        {activeTab === "advice" && (
          <div class="space-y-4 sm:space-y-6 fade-in">
            {retirementAdvice && simulationResult ? (
              <ErrorBoundary>
                <RetirementAdvicePanel
                  advice={retirementAdvice}
                  currentScenario={simulationResult}
                  onImplementStrategy={(strategy) => {
                    console.log('Strategy to implement:', strategy);
                    // Could implement strategy implementation here
                  }}
                />
              </ErrorBoundary>
            ) : (
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  No Advice Available
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  {!simulationResult 
                    ? "Run a simulation to get personalized retirement advice."
                    : !retirementAdvice
                      ? "No retirement advice was generated for your current scenario."
                      : "Retirement advice is being generated..."
                  }
                </p>
                {!simulationResult && (
                  <button
                    onClick={() => handleTabSwitch("configure")}
                    class="btn-primary inline-flex items-center"
                  >
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Go to Configure
                  </button>
                )}
              </div>
            )}
          </div>
        )}
          </main>
          
          {/* Footer Disclaimer */}
          <footer class="bg-gray-100 border-t border-gray-200 mt-8">
            <div class="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div class="text-center">
                <div class="flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <h3 class="text-lg font-semibold text-gray-900">Important Disclaimer</h3>
                </div>
                <p class="text-sm text-gray-700 max-w-4xl mx-auto leading-relaxed">
                  This tool is for simulation purposes only and is not financial advice. The calculations and projections 
                  provided are estimates based on the information you enter and should not be relied upon for making 
                  financial decisions. For personalized financial advice tailored to your specific circumstances, 
                  please consult with a qualified financial planner or advisor.
                </p>
                <p class="text-xs text-gray-500 mt-3">
                  Results may vary based on market conditions, tax law changes, and other factors not accounted for in these simulations.
                </p>
                <div class="mt-4 pt-4 border-t border-gray-300">
                  <p class="text-xs text-gray-500">
                    Finance Simulation Tool - Plan your financial future with confidence
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </div>
  );
}
