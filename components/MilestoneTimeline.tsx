/**
 * MilestoneTimeline - Component for displaying milestones chronologically
 * Validates: Requirements 1.1, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { Milestone, MilestoneCategory, MilestoneType, MilestoneDetectionError } from "../types/milestones.ts";
import type { FinancialState } from "../types/financial.ts";
import { formatMilestone, type MilestoneDisplay } from "../lib/milestone_formatters.ts";
import { useState } from "preact/hooks";
import MilestoneErrorBoundary from "./MilestoneErrorBoundary.tsx";
import { 
  MilestoneLoadingState, 
  MilestoneSkeletonLoader, 
  InlineLoadingState 
} from "./LoadingStates.tsx";
import { 
  NoMilestonesDisplay, 
  MilestoneDetectionFailedDisplay, 
  InsufficientDataDisplay 
} from "./FallbackDisplays.tsx";

interface MilestoneTimelineProps {
  /** Array of milestones to display */
  milestones: Milestone[];
  /** Simulation states for context */
  simulationStates: FinancialState[];
  /** Optional callback when a milestone is clicked */
  onMilestoneClick?: (milestone: Milestone) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Detection errors */
  detectionErrors?: MilestoneDetectionError[];
  /** Retry callback for error recovery */
  onRetry?: () => void;
  /** Whether to show skeleton loader instead of empty state */
  showSkeleton?: boolean;
}

/**
 * Gets the appropriate icon for a milestone type
 */
function getMilestoneIcon(type: MilestoneType): string {
  switch (type) {
    case 'loan_payoff':
      return '💳';
    case 'offset_completion':
      return '🏦';
    case 'retirement_eligibility':
      return '🏖️';
    case 'parameter_transition':
      return '📊';
    case 'expense_expiration':
      return '💸';
    default:
      return '📅';
  }
}

/**
 * Gets the appropriate color scheme for a milestone category
 */
function getCategoryColors(category: MilestoneCategory): {
  badge: string;
  border: string;
  bg: string;
  dot: string;
} {
  switch (category) {
    case 'debt':
      return {
        badge: 'bg-green-100 text-green-800',
        border: 'border-green-200',
        bg: 'bg-green-50',
        dot: 'bg-green-600 border-green-600',
      };
    case 'investment':
      return {
        badge: 'bg-blue-100 text-blue-800',
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        dot: 'bg-blue-600 border-blue-600',
      };
    case 'retirement':
      return {
        badge: 'bg-purple-100 text-purple-800',
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        dot: 'bg-purple-600 border-purple-600',
      };
    case 'transition':
      return {
        badge: 'bg-yellow-100 text-yellow-800',
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        dot: 'bg-yellow-600 border-yellow-600',
      };
    case 'expense':
      return {
        badge: 'bg-orange-100 text-orange-800',
        border: 'border-orange-200',
        bg: 'bg-orange-50',
        dot: 'bg-orange-600 border-orange-600',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-800',
        border: 'border-gray-200',
        bg: 'bg-gray-50',
        dot: 'bg-gray-600 border-gray-600',
      };
  }
}

/**
 * Individual milestone card component
 */
function MilestoneCard({ 
  milestone, 
  display, 
  colors, 
  isExpanded, 
  onToggle, 
  onClick 
}: {
  milestone: Milestone;
  display: MilestoneDisplay;
  colors: ReturnType<typeof getCategoryColors>;
  isExpanded: boolean;
  onToggle: () => void;
  onClick?: () => void;
}) {
  const handleCardClick = (e: Event) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      onToggle();
    }
  };

  return (
    <div
      class={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${colors.border} ${colors.bg} ${
        isExpanded ? 'shadow-md' : 'hover:border-opacity-80'
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl" role="img" aria-label={`${milestone.type} milestone`}>
            {getMilestoneIcon(milestone.type)}
          </span>
          <div>
            <h4 class="font-semibold text-gray-900 text-sm">{display.title}</h4>
            <p class="text-xs text-gray-600">{display.date}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
            {milestone.category}
          </span>
          <button
            class="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            <svg
              class={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Primary detail */}
      <div class="mb-2">
        <p class="text-sm text-gray-700">{display.primaryDetail}</p>
      </div>

      {/* Financial impact */}
      {display.financialImpact.text !== "No financial impact" && (
        <div class="mb-3">
          <span class={`text-sm font-medium ${display.financialImpact.className}`}>
            {display.financialImpact.text}
          </span>
        </div>
      )}

      {/* Expandable details */}
      {isExpanded && (
        <div class="mt-4 pt-3 border-t border-gray-200 fade-in">
          <div class="space-y-2">
            <p class="text-sm text-gray-600">{display.description}</p>
            
            {display.secondaryDetails.length > 0 && (
              <div class="mt-3">
                <h5 class="text-xs font-medium text-gray-700 mb-2">Details:</h5>
                <ul class="space-y-1">
                  {display.secondaryDetails.map((detail, index) => (
                    <li key={index} class="text-xs text-gray-600 flex items-start gap-2">
                      <span class="text-gray-400 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click hint */}
      <div class="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
          />
        </svg>
        <span>Click to {isExpanded ? 'collapse' : 'expand'} details</span>
      </div>
    </div>
  );
}

/**
 * MilestoneTimeline component displays milestones in a chronological timeline view
 */
function MilestoneTimelineCore({
  milestones,
  simulationStates: _simulationStates,
  onMilestoneClick,
  isLoading = false,
  error = null,
  detectionErrors = [],
  onRetry,
  showSkeleton = false,
}: MilestoneTimelineProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Handle loading state
  if (isLoading) {
    return showSkeleton ? <MilestoneSkeletonLoader /> : (
      <MilestoneLoadingState 
        message="Detecting milestones..." 
        details="Analyzing your financial timeline for major events"
      />
    );
  }

  // Handle error state
  if (error) {
    return (
      <MilestoneDetectionFailedDisplay
        onRetry={onRetry}
        context={error.message}
      />
    );
  }

  // Handle detection errors
  if (detectionErrors.length > 0) {
    const criticalErrors = detectionErrors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      return (
        <MilestoneDetectionFailedDisplay
          onRetry={onRetry}
          context={criticalErrors[0].message}
        />
      );
    }
  }

  // Handle insufficient data
  if (!milestones || milestones.length === 0) {
    // Check if we have simulation states to determine if this is a data issue
    if (!_simulationStates || _simulationStates.length < 2) {
      return (
        <InsufficientDataDisplay
          onRetry={onRetry}
          context="Need at least 2 simulation periods to detect milestones"
          dataType="simulation timeline data"
        />
      );
    }
    
    // No milestones found but data is sufficient
    return <NoMilestonesDisplay onRetry={onRetry} />;
  }

  // Sort milestones chronologically
  const sortedMilestones = [...milestones].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Format milestones for display with error handling
  let formattedMilestones: MilestoneDisplay[];
  try {
    formattedMilestones = sortedMilestones.map(formatMilestone);
  } catch (formatError) {
    console.error("Error formatting milestones:", formatError);
    return (
      <MilestoneDetectionFailedDisplay
        onRetry={onRetry}
        context="Failed to format milestone data for display"
      />
    );
  }

  /**
   * Toggles the expanded state of a milestone
   */
  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  /**
   * Handles milestone click
   */
  const handleMilestoneClick = (milestone: Milestone) => {
    if (onMilestoneClick) {
      onMilestoneClick(milestone);
    }
  };



  return (
    <div class="card p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-800">Financial Milestones</h3>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
          </span>
          {detectionErrors.length > 0 && (
            <div class="flex items-center gap-1 text-amber-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-xs">
                {detectionErrors.filter(e => e.severity === 'warning').length} warning{detectionErrors.filter(e => e.severity === 'warning').length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline container */}
      <div class="relative">
        {/* Timeline line */}
        <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 hidden sm:block" />

        {/* Milestones */}
        <div class="space-y-6">
          {formattedMilestones.map((display, index) => {
            const milestone = sortedMilestones[index];
            const colors = getCategoryColors(milestone.category);
            const isExpanded = expandedMilestones.has(milestone.id);

            return (
              <div key={milestone.id} class="relative">
                {/* Timeline dot (hidden on mobile) */}
                <div class={`absolute left-4 w-4 h-4 rounded-full border-2 hidden sm:block ${colors.dot}`} />

                {/* Milestone card */}
                <div class="sm:pl-12">
                  <MilestoneCard
                    milestone={milestone}
                    display={display}
                    colors={colors}
                    isExpanded={isExpanded}
                    onToggle={() => toggleMilestone(milestone.id)}
                    onClick={onMilestoneClick ? () => handleMilestoneClick(milestone) : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline end marker (hidden on mobile) */}
        <div class="relative mt-6 hidden sm:block">
          <div class="absolute left-4 w-4 h-4 rounded-full border-2 bg-gray-300 border-gray-300" />
          <div class="pl-12">
            <div class="text-sm text-gray-500 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <span>Timeline complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-specific footer */}
      <div class="mt-6 pt-4 border-t border-gray-200 sm:hidden">
        <p class="text-xs text-gray-500 text-center">
          Tap milestones to view details
        </p>
      </div>
    </div>
  );
}

/**
 * MilestoneTimeline component with error boundary
 */
export default function MilestoneTimeline(props: MilestoneTimelineProps) {
  return (
    <MilestoneErrorBoundary 
      context="displaying milestone timeline"
      onRetry={props.onRetry}
    >
      <MilestoneTimelineCore {...props} />
    </MilestoneErrorBoundary>
  );
}