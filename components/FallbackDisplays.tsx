/**
 * FallbackDisplays - Fallback UI components for when milestone detection or advice generation fails
 * Provides graceful degradation when core functionality is unavailable
 * Validates: Requirements 1.1, 2.1
 */

import { ComponentChildren } from "preact";
import type { 
  MilestoneDetectionError, 
  AdviceGenerationError,
  FinancialState 
} from "../types/milestones.ts";

/**
 * Props for fallback display components
 */
interface FallbackDisplayProps {
  /** Optional retry callback */
  onRetry?: () => void;
  /** Optional callback to continue without the feature */
  onContinue?: () => void;
  /** Additional context or error information */
  context?: string;
}

/**
 * Fallback display when no milestones are detected
 */
export function NoMilestonesDisplay({ onRetry, context }: FallbackDisplayProps) {
  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Financial Milestones</h3>
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <h4 class="text-lg font-medium text-gray-900 mb-2">No Milestones Detected</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-md mx-auto">
          We didn't find any major financial milestones in your simulation timeline. 
          This could mean your financial journey is steady, or the simulation period 
          may not include significant events like loan payoffs or retirement eligibility.
        </p>
        
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left">
              <p class="text-sm text-blue-800 font-medium mb-1">Possible reasons:</p>
              <ul class="text-xs text-blue-700 space-y-1">
                <li>• Simulation period is too short to show major events</li>
                <li>• No loans to pay off during the timeline</li>
                <li>• Retirement goals are beyond the simulation period</li>
                <li>• Parameter changes don't occur in this scenario</li>
              </ul>
            </div>
          </div>
        </div>

        {context && (
          <div class="text-xs text-gray-500 mb-4">
            Context: {context}
          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
          >
            Retry Detection
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Fallback display when milestone detection fails with errors
 */
export function MilestoneDetectionFailedDisplay({ 
  onRetry, 
  onContinue, 
  context 
}: FallbackDisplayProps & { 
  errors?: MilestoneDetectionError[] 
}) {
  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Financial Milestones</h3>
      <div class="text-center py-6">
        <svg
          class="mx-auto h-16 w-16 text-amber-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <h4 class="text-lg font-medium text-gray-900 mb-2">Milestone Detection Unavailable</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-md mx-auto">
          We encountered an issue while analyzing your financial timeline for milestones. 
          Your simulation results are still accurate and available.
        </p>

        <div class="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-amber-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left">
              <p class="text-sm text-amber-800 font-medium mb-1">What you can still do:</p>
              <ul class="text-xs text-amber-700 space-y-1">
                <li>• View your complete financial timeline</li>
                <li>• Review net worth and cash flow projections</li>
                <li>• Analyze investment and debt trajectories</li>
                <li>• Compare different scenarios</li>
              </ul>
            </div>
          </div>
        </div>

        {context && (
          <div class="text-xs text-gray-500 mb-4">
            Issue: {context}
          </div>
        )}

        <div class="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors duration-200 text-sm font-medium"
            >
              Try Again
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
            >
              Continue Without Milestones
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback display when no retirement advice is available
 */
export function NoAdviceDisplay({ onRetry, context }: FallbackDisplayProps) {
  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Retirement Advice</h3>
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h4 class="text-lg font-medium text-gray-900 mb-2">No Advice Available</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-md mx-auto">
          We couldn't generate specific retirement recommendations based on your current 
          simulation. This might be because your financial plan is already well-optimized 
          or the simulation data is insufficient for analysis.
        </p>

        <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left">
              <p class="text-sm text-green-800 font-medium mb-1">This could mean:</p>
              <ul class="text-xs text-green-700 space-y-1">
                <li>• Your retirement plan is on track</li>
                <li>• No significant optimizations needed</li>
                <li>• Current strategy is well-balanced</li>
                <li>• Goals are achievable with current approach</li>
              </ul>
            </div>
          </div>
        </div>

        {context && (
          <div class="text-xs text-gray-500 mb-4">
            Context: {context}
          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
          >
            Retry Analysis
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Fallback display when advice generation fails with errors
 */
export function AdviceGenerationFailedDisplay({ 
  onRetry, 
  onContinue, 
  context 
}: FallbackDisplayProps & { 
  errors?: AdviceGenerationError[] 
}) {
  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Retirement Advice</h3>
      <div class="text-center py-6">
        <svg
          class="mx-auto h-16 w-16 text-blue-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h4 class="text-lg font-medium text-gray-900 mb-2">Advice Generation Unavailable</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-md mx-auto">
          We encountered an issue while generating personalized retirement recommendations. 
          Your simulation results remain accurate and you can still make informed decisions.
        </p>

        <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left">
              <p class="text-sm text-blue-800 font-medium mb-1">Alternative approaches:</p>
              <ul class="text-xs text-blue-700 space-y-1">
                <li>• Consult with a financial advisor</li>
                <li>• Review your timeline for optimization opportunities</li>
                <li>• Compare different scenarios manually</li>
                <li>• Focus on debt reduction and investment growth</li>
              </ul>
            </div>
          </div>
        </div>

        {context && (
          <div class="text-xs text-gray-500 mb-4">
            Issue: {context}
          </div>
        )}

        <div class="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
              Try Again
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
            >
              Continue Without Advice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback display for insufficient data scenarios
 */
export function InsufficientDataDisplay({ 
  onRetry, 
  context,
  dataType = "simulation data"
}: FallbackDisplayProps & { 
  dataType?: string 
}) {
  return (
    <div class="card p-6">
      <div class="text-center py-6">
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
        <h4 class="text-lg font-medium text-gray-900 mb-2">Insufficient Data</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-md mx-auto">
          We need more {dataType} to provide meaningful analysis. 
          Please ensure your simulation has completed successfully and includes 
          sufficient timeline data.
        </p>

        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-yellow-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left">
              <p class="text-sm text-yellow-800 font-medium mb-1">To resolve this:</p>
              <ul class="text-xs text-yellow-700 space-y-1">
                <li>• Run a complete simulation first</li>
                <li>• Ensure simulation covers multiple years</li>
                <li>• Check that all required parameters are set</li>
                <li>• Verify simulation completed without errors</li>
              </ul>
            </div>
          </div>
        </div>

        {context && (
          <div class="text-xs text-gray-500 mb-4">
            Details: {context}
          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200 text-sm font-medium"
          >
            Check Again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Generic error display with customizable content
 */
export function GenericErrorDisplay({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  icon = "exclamation",
  onRetry,
  onContinue,
  context
}: FallbackDisplayProps & {
  title?: string;
  message?: string;
  icon?: 'exclamation' | 'warning' | 'info';
}) {
  const iconPaths = {
    exclamation: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  };

  return (
    <div class="card p-6">
      <div class="text-center py-6">
        <svg
          class="mx-auto h-16 w-16 text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d={iconPaths[icon]}
          />
        </svg>
        <h4 class="text-lg font-medium text-gray-900 mb-2">{title}</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-md mx-auto">
          {message}
        </p>

        {context && (
          <div class="text-xs text-gray-500 mb-4">
            {context}
          </div>
        )}

        <div class="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
            >
              Try Again
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}