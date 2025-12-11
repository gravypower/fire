/**
 * RetirementAdvicePanel - Component for displaying retirement recommendations
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { 
  RetirementAdvice, 
  AdviceItem, 
  RankedAdvice, 
  AdviceCategory, 
  AdvicePriority,
  RetirementAssessment,
  AdviceGenerationError
} from "../types/milestones.ts";
import type { SimulationResult } from "../types/financial.ts";
import { formatCurrency } from "../lib/result_utils.ts";
import { useState } from "preact/hooks";
import AdviceErrorBoundary from "./AdviceErrorBoundary.tsx";
import { 
  AdviceLoadingState, 
  AdviceSkeletonLoader, 
  InlineLoadingState 
} from "./LoadingStates.tsx";
import { 
  NoAdviceDisplay, 
  AdviceGenerationFailedDisplay, 
  InsufficientDataDisplay 
} from "./FallbackDisplays.tsx";

interface RetirementAdvicePanelProps {
  /** Retirement advice to display */
  advice: RetirementAdvice;
  /** Current simulation result for context */
  currentScenario: SimulationResult;
  /** Optional callback when user wants to implement a strategy */
  onImplementStrategy?: (strategy: AdviceItem) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Generation errors */
  generationErrors?: AdviceGenerationError[];
  /** Retry callback for error recovery */
  onRetry?: () => void;
  /** Whether to show skeleton loader instead of empty state */
  showSkeleton?: boolean;
}

/**
 * Gets the appropriate icon for an advice category
 */
function getCategoryIcon(category: AdviceCategory): string {
  switch (category) {
    case 'debt':
      return '💳';
    case 'investment':
      return '📈';
    case 'expense':
      return '💰';
    case 'income':
      return '💼';
    default:
      return '💡';
  }
}

/**
 * Gets the appropriate color scheme for an advice category
 */
function getCategoryColors(category: AdviceCategory): {
  badge: string;
  border: string;
  bg: string;
  accent: string;
} {
  switch (category) {
    case 'debt':
      return {
        badge: 'bg-green-100 text-green-800',
        border: 'border-green-200',
        bg: 'bg-green-50',
        accent: 'text-green-600',
      };
    case 'investment':
      return {
        badge: 'bg-blue-100 text-blue-800',
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        accent: 'text-blue-600',
      };
    case 'expense':
      return {
        badge: 'bg-orange-100 text-orange-800',
        border: 'border-orange-200',
        bg: 'bg-orange-50',
        accent: 'text-orange-600',
      };
    case 'income':
      return {
        badge: 'bg-purple-100 text-purple-800',
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        accent: 'text-purple-600',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-800',
        border: 'border-gray-200',
        bg: 'bg-gray-50',
        accent: 'text-gray-600',
      };
  }
}

/**
 * Gets the appropriate color scheme for priority levels
 */
function getPriorityColors(priority: AdvicePriority): {
  badge: string;
  dot: string;
  text: string;
} {
  switch (priority) {
    case 'high':
      return {
        badge: 'bg-red-100 text-red-800',
        dot: 'bg-red-500',
        text: 'text-red-600',
      };
    case 'medium':
      return {
        badge: 'bg-yellow-100 text-yellow-800',
        dot: 'bg-yellow-500',
        text: 'text-yellow-600',
      };
    case 'low':
      return {
        badge: 'bg-gray-100 text-gray-800',
        dot: 'bg-gray-500',
        text: 'text-gray-600',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-800',
        dot: 'bg-gray-500',
        text: 'text-gray-600',
      };
  }
}

/**
 * Gets the appropriate color scheme for overall assessment
 */
function getAssessmentColors(assessment: RetirementAssessment): {
  badge: string;
  bg: string;
  text: string;
  icon: string;
} {
  switch (assessment) {
    case 'on_track':
      return {
        badge: 'bg-green-100 text-green-800',
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: '✅',
      };
    case 'needs_improvement':
      return {
        badge: 'bg-yellow-100 text-yellow-800',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        icon: '⚠️',
      };
    case 'critical':
      return {
        badge: 'bg-red-100 text-red-800',
        bg: 'bg-red-50',
        text: 'text-red-700',
        icon: '🚨',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-800',
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        icon: '❓',
      };
  }
}

/**
 * Formats the assessment message
 */
function getAssessmentMessage(assessment: RetirementAssessment): string {
  switch (assessment) {
    case 'on_track':
      return 'You\'re on track for retirement!';
    case 'needs_improvement':
      return 'Your retirement plan needs some adjustments';
    case 'critical':
      return 'Immediate action needed for retirement goals';
    default:
      return 'Assessment unavailable';
  }
}

/**
 * Individual advice item card component
 */
function AdviceCard({ 
  advice, 
  isExpanded, 
  onToggle, 
  onImplement 
}: {
  advice: RankedAdvice;
  isExpanded: boolean;
  onToggle: () => void;
  onImplement?: () => void;
}) {
  const categoryColors = getCategoryColors(advice.category);
  const priorityColors = getPriorityColors(advice.priority);

  const handleCardClick = (e: Event) => {
    e.stopPropagation();
    onToggle();
  };

  const handleImplementClick = (e: Event) => {
    e.stopPropagation();
    if (onImplement) {
      onImplement();
    }
  };

  return (
    <div
      class={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${categoryColors.border} ${categoryColors.bg} ${
        isExpanded ? 'shadow-md' : 'hover:border-opacity-80'
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl" role="img" aria-label={`${advice.category} advice`}>
            {getCategoryIcon(advice.category)}
          </span>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-semibold text-gray-900 text-sm">{advice.title}</h4>
              <div class={`w-2 h-2 rounded-full ${priorityColors.dot}`} />
            </div>
            <div class="flex items-center gap-2">
              <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors.badge}`}>
                {advice.category}
              </span>
              <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors.badge}`}>
                {advice.priority} priority
              </span>
              <span class="text-xs text-gray-500">
                Rank #{advice.rank}
              </span>
            </div>
          </div>
        </div>
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

      {/* Description */}
      <div class="mb-3">
        <p class="text-sm text-gray-700">{advice.description}</p>
      </div>

      {/* Projected Impact */}
      <div class="mb-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {advice.projectedImpact.timelineSavings && (
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-blue-600 font-medium">
                {advice.projectedImpact.timelineSavings.toFixed(1)} years saved
              </span>
            </div>
          )}
          {advice.projectedImpact.costSavings && (
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span class="text-green-600 font-medium">
                {formatCurrency(advice.projectedImpact.costSavings)} saved
              </span>
            </div>
          )}
          {advice.projectedImpact.additionalAssets && (
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span class="text-purple-600 font-medium">
                {formatCurrency(advice.projectedImpact.additionalAssets)} gained
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Effectiveness and Feasibility Scores */}
      <div class="mb-3">
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-600">Effectiveness</span>
              <span class="font-medium">{Math.floor(advice.effectivenessScore)}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                class="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                style={`width: ${Math.floor(advice.effectivenessScore)}%`}
              />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-600">Feasibility</span>
              <span class="font-medium">{advice.feasibilityScore}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                class="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                style={`width: ${advice.feasibilityScore}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div class="mt-4 pt-3 border-t border-gray-200 fade-in">
          <div class="space-y-3">
            {/* Specific Actions */}
            {advice.specificActions.length > 0 && (
              <div>
                <h5 class="text-xs font-medium text-gray-700 mb-2">Action Steps:</h5>
                <ul class="space-y-1">
                  {advice.specificActions.map((action, index) => (
                    <li key={index} class="text-xs text-gray-600 flex items-start gap-2">
                      <span class="text-blue-500 mt-0.5 font-bold">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Implementation button */}
            {onImplement && (
              <div class="pt-2">
                <button
                  onClick={handleImplementClick}
                  class={`w-full px-3 py-2 text-xs font-medium rounded-md transition-colors ${categoryColors.accent} border ${categoryColors.border} hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  Implement This Strategy
                </button>
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
 * RetirementAdvicePanel component displays retirement recommendations with categorization and priority
 */
function RetirementAdvicePanelCore({
  advice,
  currentScenario: _currentScenario,
  onImplementStrategy,
  isLoading = false,
  error = null,
  generationErrors = [],
  onRetry,
  showSkeleton = false,
}: RetirementAdvicePanelProps) {
  const [expandedAdvice, setExpandedAdvice] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<AdviceCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<AdvicePriority | 'all'>('all');

  // Handle loading state
  if (isLoading) {
    return showSkeleton ? <AdviceSkeletonLoader /> : (
      <AdviceLoadingState 
        message="Generating retirement advice..." 
        details="Analyzing your financial situation and creating personalized recommendations"
      />
    );
  }

  // Handle error state
  if (error) {
    return (
      <AdviceGenerationFailedDisplay
        onRetry={onRetry}
        context={error.message}
      />
    );
  }

  // Handle generation errors
  if (generationErrors.length > 0) {
    const criticalErrors = generationErrors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      return (
        <AdviceGenerationFailedDisplay
          onRetry={onRetry}
          context={criticalErrors[0].message}
        />
      );
    }
  }

  // Handle insufficient data or no advice
  if (!advice || !advice.recommendations || advice.recommendations.length === 0) {
    // Check if we have simulation data to determine if this is a data issue
    if (!_currentScenario || !_currentScenario.states || _currentScenario.states.length < 2) {
      return (
        <InsufficientDataDisplay
          onRetry={onRetry}
          context="Need complete simulation results to generate advice"
          dataType="simulation results"
        />
      );
    }
    
    // No advice generated but data is sufficient
    return <NoAdviceDisplay onRetry={onRetry} />;
  }

  const assessmentColors = getAssessmentColors(advice.overallAssessment);

  /**
   * Toggles the expanded state of an advice item
   */
  const toggleAdvice = (adviceId: string) => {
    const newExpanded = new Set(expandedAdvice);
    if (newExpanded.has(adviceId)) {
      newExpanded.delete(adviceId);
    } else {
      newExpanded.add(adviceId);
    }
    setExpandedAdvice(newExpanded);
  };

  /**
   * Handles implementing a strategy
   */
  const handleImplementStrategy = (strategy: AdviceItem) => {
    if (onImplementStrategy) {
      onImplementStrategy(strategy);
    }
  };

  /**
   * Filters recommendations based on selected category and priority
   */
  const filteredRecommendations = advice.recommendations.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || item.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  /**
   * Gets unique categories from recommendations
   */
  const availableCategories = Array.from(new Set(advice.recommendations.map(item => item.category)));

  /**
   * Gets unique priorities from recommendations
   */
  const availablePriorities = Array.from(new Set(advice.recommendations.map(item => item.priority)));



  return (
    <div class="card p-6">
      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-800">Retirement Advice</h3>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">
            {advice.recommendations.length} recommendation{advice.recommendations.length !== 1 ? 's' : ''}
          </span>
          {generationErrors.length > 0 && (
            <div class="flex items-center gap-1 text-blue-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-xs">
                {generationErrors.filter(e => e.severity === 'warning').length} warning{generationErrors.filter(e => e.severity === 'warning').length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Assessment */}
      <div class={`rounded-lg p-4 mb-6 ${assessmentColors.bg} border ${assessmentColors.badge.includes('green') ? 'border-green-200' : assessmentColors.badge.includes('yellow') ? 'border-yellow-200' : 'border-red-200'}`}>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl" role="img" aria-label="assessment">
            {assessmentColors.icon}
          </span>
          <div>
            <h4 class={`font-semibold ${assessmentColors.text}`}>
              {getAssessmentMessage(advice.overallAssessment)}
            </h4>
            <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${assessmentColors.badge}`}>
              {advice.overallAssessment.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Retirement Feasibility */}
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <span class={advice.retirementFeasibility.canRetireAtTarget ? 'text-green-600' : 'text-red-600'}>
              {advice.retirementFeasibility.canRetireAtTarget ? '✓' : '✗'}
            </span>
            <span class={assessmentColors.text}>
              {advice.retirementFeasibility.canRetireAtTarget 
                ? 'Can retire at target age' 
                : 'Cannot retire at target age'}
            </span>
          </div>
          
          {advice.retirementFeasibility.actualRetirementAge && (
            <div class="flex items-center gap-2">
              <span class="text-blue-600">📅</span>
              <span class={assessmentColors.text}>
                Projected retirement age: {advice.retirementFeasibility.actualRetirementAge}
              </span>
            </div>
          )}

          {advice.retirementFeasibility.shortfallAmount && (
            <div class="flex items-center gap-2">
              <span class="text-red-600">💸</span>
              <span class={assessmentColors.text}>
                Shortfall: {formatCurrency(advice.retirementFeasibility.shortfallAmount)}
              </span>
            </div>
          )}

          {advice.retirementFeasibility.surplusAmount && (
            <div class="flex items-center gap-2">
              <span class="text-green-600">💰</span>
              <span class={assessmentColors.text}>
                Surplus: {formatCurrency(advice.retirementFeasibility.surplusAmount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Wins Section */}
      {advice.quickWins.length > 0 && (
        <div class="mb-6">
          <h4 class="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span class="text-lg">⚡</span>
            Quick Wins ({advice.quickWins.length})
          </h4>
          <div class="space-y-3">
            {advice.quickWins.slice(0, 3).map((item) => {
              const rankedItem = advice.recommendations.find(r => r.id === item.id) as RankedAdvice;
              if (!rankedItem) return null;
              
              return (
                <AdviceCard
                  key={item.id}
                  advice={rankedItem}
                  isExpanded={expandedAdvice.has(item.id)}
                  onToggle={() => toggleAdvice(item.id)}
                  onImplement={onImplementStrategy ? () => handleImplementStrategy(item) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div class="mb-4">
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-gray-700">Filter by:</span>
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory((e.target as HTMLSelectElement).value as AdviceCategory | 'all')}
            class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority((e.target as HTMLSelectElement).value as AdvicePriority | 'all')}
            class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            {availablePriorities.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </option>
            ))}
          </select>

          <span class="text-xs text-gray-500">
            ({filteredRecommendations.length} of {advice.recommendations.length})
          </span>
        </div>
      </div>

      {/* All Recommendations */}
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-800 flex items-center gap-2">
          <span class="text-lg">📋</span>
          All Recommendations
        </h4>
        
        {filteredRecommendations.length === 0 ? (
          <div class="text-center py-6 text-gray-500">
            <p class="text-sm">No recommendations match the selected filters</p>
          </div>
        ) : (
          <div class="space-y-3">
            {filteredRecommendations.map((item) => (
              <AdviceCard
                key={item.id}
                advice={item}
                isExpanded={expandedAdvice.has(item.id)}
                onToggle={() => toggleAdvice(item.id)}
                onImplement={onImplementStrategy ? () => handleImplementStrategy(item) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Long-term Strategies Section */}
      {advice.longTermStrategies.length > 0 && (
        <div class="mt-6 pt-6 border-t border-gray-200">
          <h4 class="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span class="text-lg">🎯</span>
            Long-term Strategies ({advice.longTermStrategies.length})
          </h4>
          <div class="text-sm text-gray-600 mb-3">
            These strategies require more planning but offer significant long-term benefits.
          </div>
          <div class="space-y-3">
            {advice.longTermStrategies.slice(0, 3).map((item) => {
              const rankedItem = advice.recommendations.find(r => r.id === item.id) as RankedAdvice;
              if (!rankedItem) return null;
              
              return (
                <AdviceCard
                  key={item.id}
                  advice={rankedItem}
                  isExpanded={expandedAdvice.has(item.id)}
                  onToggle={() => toggleAdvice(item.id)}
                  onImplement={onImplementStrategy ? () => handleImplementStrategy(item) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div class="mt-6 pt-4 border-t border-gray-200">
        <p class="text-xs text-gray-500 text-center">
          Tap recommendations to view detailed action steps
        </p>
      </div>
    </div>
  );
}

/**
 * RetirementAdvicePanel component with error boundary
 */
export default function RetirementAdvicePanel(props: RetirementAdvicePanelProps) {
  return (
    <AdviceErrorBoundary 
      context="displaying retirement advice"
      onRetry={props.onRetry}
    >
      <RetirementAdvicePanelCore {...props} />
    </AdviceErrorBoundary>
  );
}