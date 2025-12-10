/**
 * AsyncMilestoneAdviceWrapper - Handles async loading of milestones and advice
 * Provides loading states, error handling, and graceful degradation
 * Validates: Requirements 1.1, 2.1
 */

import { useState, useEffect } from "preact/hooks";
import type { 
  Milestone, 
  RetirementAdvice, 
  MilestoneDetectionResult,
  AdviceGenerationResult,
  MilestoneDetectionError,
  AdviceGenerationError
} from "../types/milestones.ts";
import type { FinancialState, UserParameters, SimulationResult, TransitionPoint } from "../types/financial.ts";
import { detectMilestonesFromSimulation } from "../lib/milestone_detector.ts";
import { generateRetirementAdvice } from "../lib/retirement_advice_engine.ts";
import { 
  safeMilestoneDetection, 
  safeAdviceGeneration,
  validateMilestones,
  validateAdvice,
  createEmptyMilestoneResult,
  createEmptyAdviceResult,
  sanitizeMilestoneForDisplay,
  sanitizeAdviceForDisplay,
  RetryManager
} from "../lib/error_handling_utils.ts";
import MilestoneTimeline from "./MilestoneTimeline.tsx";
import RetirementAdvicePanel from "./RetirementAdvicePanel.tsx";
import { MilestoneLoadingState, AdviceLoadingState } from "./LoadingStates.tsx";

interface AsyncMilestoneAdviceWrapperProps {
  /** Simulation states for milestone detection */
  simulationStates: FinancialState[];
  /** User parameters for context */
  userParameters: UserParameters;
  /** Simulation result for advice generation */
  simulationResult: SimulationResult;
  /** Optional transition points for parameter transitions */
  transitionPoints?: TransitionPoint[];
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
  /** Callback when milestone is clicked */
  onMilestoneClick?: (milestone: Milestone) => void;
  /** Callback when advice strategy is selected */
  onImplementStrategy?: (strategy: any) => void;
}

interface AsyncState {
  // Milestone state
  milestones: Milestone[];
  milestonesLoading: boolean;
  milestonesError: Error | null;
  milestoneDetectionErrors: MilestoneDetectionError[];
  
  // Advice state
  advice: RetirementAdvice | null;
  adviceLoading: boolean;
  adviceError: Error | null;
  adviceGenerationErrors: AdviceGenerationError[];
  
  // General state
  hasAttemptedLoad: boolean;
}

/**
 * AsyncMilestoneAdviceWrapper component
 * Manages async loading and error handling for milestone and advice components
 */
export default function AsyncMilestoneAdviceWrapper({
  simulationStates,
  userParameters,
  simulationResult,
  transitionPoints,
  autoLoad = true,
  onMilestoneClick,
  onImplementStrategy,
}: AsyncMilestoneAdviceWrapperProps) {
  const [state, setState] = useState<AsyncState>({
    milestones: [],
    milestonesLoading: false,
    milestonesError: null,
    milestoneDetectionErrors: [],
    advice: null,
    adviceLoading: false,
    adviceError: null,
    adviceGenerationErrors: [],
    hasAttemptedLoad: false,
  });

  const retryManager = new RetryManager(3, 1000);

  /**
   * Loads milestones with error handling and retry logic
   */
  const loadMilestones = async () => {
    setState(prev => ({ 
      ...prev, 
      milestonesLoading: true, 
      milestonesError: null,
      milestoneDetectionErrors: []
    }));

    try {
      const { result, errors } = await safeMilestoneDetection(
        async () => {
          return await retryManager.execute(async () => {
            // Validate input data
            if (!simulationStates || simulationStates.length < 2) {
              throw new Error('Insufficient simulation data for milestone detection');
            }

            if (!userParameters) {
              throw new Error('User parameters required for milestone detection');
            }

            // Detect milestones
            const detectionResult = detectMilestonesFromSimulation(
              simulationStates,
              userParameters,
              transitionPoints
            );

            // Validate results
            const validationErrors = validateMilestones(detectionResult.milestones);
            
            return {
              ...detectionResult,
              errors: [...detectionResult.errors, ...validationErrors]
            };
          });
        },
        'detect milestones from simulation',
        createEmptyMilestoneResult()
      );

      // Sanitize milestones for display
      const sanitizedMilestones = result.milestones.map(sanitizeMilestoneForDisplay);

      setState(prev => ({
        ...prev,
        milestones: sanitizedMilestones,
        milestonesLoading: false,
        milestoneDetectionErrors: [...result.errors, ...errors],
      }));

    } catch (error) {
      console.error('Failed to load milestones:', error);
      setState(prev => ({
        ...prev,
        milestonesLoading: false,
        milestonesError: error instanceof Error ? error : new Error('Unknown milestone loading error'),
        milestoneDetectionErrors: [{
          code: 'MILESTONE_LOAD_FAILED',
          message: `Failed to load milestones: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
          context: { error: String(error) },
        }],
      }));
    }
  };

  /**
   * Loads retirement advice with error handling and retry logic
   */
  const loadAdvice = async () => {
    setState(prev => ({ 
      ...prev, 
      adviceLoading: true, 
      adviceError: null,
      adviceGenerationErrors: []
    }));

    try {
      const { result, errors } = await safeAdviceGeneration(
        async () => {
          return await retryManager.execute(async () => {
            // Validate input data
            if (!simulationResult || !simulationResult.states || simulationResult.states.length < 2) {
              throw new Error('Insufficient simulation results for advice generation');
            }

            if (!userParameters) {
              throw new Error('User parameters required for advice generation');
            }

            // Generate advice
            const adviceResult = generateRetirementAdvice(
              simulationResult,
              userParameters,
              state.milestones // Use current milestones if available
            );

            // Validate results
            const validationErrors = validateAdvice(adviceResult.advice);
            
            return {
              ...adviceResult,
              errors: [...adviceResult.errors, ...validationErrors]
            };
          });
        },
        'generate retirement advice',
        createEmptyAdviceResult()
      );

      // Sanitize advice for display
      const sanitizedAdvice = sanitizeAdviceForDisplay(result.advice);

      setState(prev => ({
        ...prev,
        advice: sanitizedAdvice,
        adviceLoading: false,
        adviceGenerationErrors: [...result.errors, ...errors],
      }));

    } catch (error) {
      console.error('Failed to load advice:', error);
      setState(prev => ({
        ...prev,
        adviceLoading: false,
        adviceError: error instanceof Error ? error : new Error('Unknown advice loading error'),
        adviceGenerationErrors: [{
          code: 'ADVICE_LOAD_FAILED',
          message: `Failed to load advice: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
          context: { error: String(error) },
        }],
      }));
    }
  };

  /**
   * Loads both milestones and advice
   */
  const loadAll = async () => {
    setState(prev => ({ ...prev, hasAttemptedLoad: true }));
    
    // Load milestones first, then advice (advice can use milestone data)
    await loadMilestones();
    await loadAdvice();
  };

  /**
   * Retries milestone loading
   */
  const retryMilestones = () => {
    retryManager.reset();
    loadMilestones();
  };

  /**
   * Retries advice loading
   */
  const retryAdvice = () => {
    retryManager.reset();
    loadAdvice();
  };

  /**
   * Retries both milestone and advice loading
   */
  const retryAll = () => {
    retryManager.reset();
    loadAll();
  };

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !state.hasAttemptedLoad) {
      loadAll();
    }
  }, [autoLoad, simulationStates, userParameters, simulationResult]);

  // Check if we have sufficient data
  const hasSufficientData = simulationStates && 
    simulationStates.length >= 2 && 
    userParameters && 
    simulationResult && 
    simulationResult.states && 
    simulationResult.states.length >= 2;

  if (!hasSufficientData && !state.hasAttemptedLoad) {
    return (
      <div class="space-y-6">
        <div class="card p-6">
          <div class="text-center py-8">
            <svg
              class="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h4 class="text-lg font-medium text-gray-900 mb-2">Waiting for Simulation Data</h4>
            <p class="text-sm text-gray-600 mb-4">
              Please run a complete financial simulation to see milestones and receive retirement advice.
            </p>
            <button
              onClick={loadAll}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
              Check for Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Milestone Timeline */}
      <MilestoneTimeline
        milestones={state.milestones}
        simulationStates={simulationStates}
        onMilestoneClick={onMilestoneClick}
        isLoading={state.milestonesLoading}
        error={state.milestonesError}
        detectionErrors={state.milestoneDetectionErrors}
        onRetry={retryMilestones}
        showSkeleton={state.hasAttemptedLoad}
      />

      {/* Retirement Advice Panel */}
      {state.advice && (
        <RetirementAdvicePanel
          advice={state.advice}
          currentScenario={simulationResult}
          onImplementStrategy={onImplementStrategy}
          isLoading={state.adviceLoading}
          error={state.adviceError}
          generationErrors={state.adviceGenerationErrors}
          onRetry={retryAdvice}
          showSkeleton={state.hasAttemptedLoad}
        />
      )}

      {/* Loading state for advice if not yet loaded */}
      {!state.advice && state.adviceLoading && (
        <AdviceLoadingState 
          message="Generating retirement advice..." 
          details="Analyzing your financial situation and creating personalized recommendations"
        />
      )}

      {/* Manual load button if auto-load is disabled */}
      {!autoLoad && !state.hasAttemptedLoad && (
        <div class="card p-6">
          <div class="text-center">
            <h4 class="text-lg font-medium text-gray-900 mb-2">Load Milestones & Advice</h4>
            <p class="text-sm text-gray-600 mb-4">
              Click below to analyze your simulation for milestones and generate retirement advice.
            </p>
            <button
              onClick={loadAll}
              class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Analyze Simulation
            </button>
          </div>
        </div>
      )}

      {/* Global retry button if both have errors */}
      {(state.milestonesError || state.adviceError) && (
        <div class="card p-4 bg-amber-50 border border-amber-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-amber-800">
                Some features encountered issues. You can retry or continue with available data.
              </span>
            </div>
            <button
              onClick={retryAll}
              class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors duration-200 text-sm font-medium"
            >
              Retry All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}