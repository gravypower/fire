/**
 * AdviceComparisonView Component
 * Displays side-by-side comparison of retirement advice between scenarios
 * Validates: Requirements 5.4, 5.5
 */

import type { AdviceComparison, AdviceChangeComparison } from "../types/financial.ts";
import type { AdviceItem, AdviceCategory } from "../types/milestones.ts";
import { formatCurrency } from "../lib/result_utils.ts";

interface AdviceComparisonViewProps {
  comparison: AdviceComparison;
}

/**
 * AdviceComparisonView component
 * 
 * Displays advice differences between scenarios with explanations
 * of why recommendations vary based on different outcomes.
 */
export default function AdviceComparisonView({ comparison }: AdviceComparisonViewProps) {
  const getCategoryIcon = (category: AdviceCategory): string => {
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
        return '📋';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssessmentColor = (assessment: string): string => {
    switch (assessment) {
      case 'on_track':
        return 'text-green-600';
      case 'needs_improvement':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatImpact = (impact: any): string => {
    const parts: string[] = [];
    
    if (impact.timelineSavings) {
      parts.push(`${impact.timelineSavings.toFixed(1)} years saved`);
    }
    if (impact.costSavings) {
      parts.push(`${formatCurrency(impact.costSavings)} saved`);
    }
    if (impact.additionalAssets) {
      parts.push(`${formatCurrency(impact.additionalAssets)} additional assets`);
    }
    
    return parts.join(', ') || 'No quantified impact';
  };

  const renderAdviceItem = (advice: AdviceItem, _scenario: string) => (
    <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="flex items-center mb-2">
            <span class="text-lg mr-2">{getCategoryIcon(advice.category)}</span>
            <h5 class="font-medium text-gray-800">{advice.title}</h5>
          </div>
          <p class="text-sm text-gray-600 mb-2">{advice.description}</p>
        </div>
        <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(advice.priority)}`}>
          {advice.priority}
        </span>
      </div>
      
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-gray-600">Effectiveness: <span class="font-medium">{Math.floor(advice.effectivenessScore)}%</span></p>
          <p class="text-gray-600">Feasibility: <span class="font-medium">{Math.floor(advice.feasibilityScore)}%</span></p>
        </div>
        <div>
          <p class="text-gray-600 text-xs">Impact:</p>
          <p class="text-xs text-gray-700">{formatImpact(advice.projectedImpact)}</p>
        </div>
      </div>
    </div>
  );

  const renderChangeComparison = (change: AdviceChangeComparison) => (
    <div class="border border-gray-200 rounded-lg p-4 bg-white">
      <div class="mb-4">
        <div class="flex items-center mb-2">
          <span class="text-lg mr-2">{getCategoryIcon(change.withTransitions.category)}</span>
          <h5 class="font-medium text-gray-800">{change.withTransitions.title}</h5>
        </div>
        <p class="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          {change.changeExplanation}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* With Transitions */}
        <div class="bg-blue-50 p-3 rounded-md border border-blue-200">
          <h6 class="font-medium text-blue-800 mb-2">With Transitions</h6>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Priority:</span>
              <span class={`px-2 py-0.5 rounded text-xs ${getPriorityColor(change.withTransitions.priority)}`}>
                {change.withTransitions.priority}
              </span>
            </div>
            <div class="flex justify-between">
              <span>Effectiveness:</span>
              <span class="font-medium">{Math.floor(change.withTransitions.effectivenessScore)}%</span>
            </div>
            <div class="flex justify-between">
              <span>Feasibility:</span>
              <span class="font-medium">{Math.floor(change.withTransitions.feasibilityScore)}%</span>
            </div>
          </div>
        </div>

        {/* Without Transitions */}
        <div class="bg-gray-50 p-3 rounded-md border border-gray-200">
          <h6 class="font-medium text-gray-800 mb-2">Without Transitions</h6>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Priority:</span>
              <span class={`px-2 py-0.5 rounded text-xs ${getPriorityColor(change.withoutTransitions.priority)}`}>
                {change.withoutTransitions.priority}
              </span>
            </div>
            <div class="flex justify-between">
              <span>Effectiveness:</span>
              <span class="font-medium">{Math.floor(change.withoutTransitions.effectivenessScore)}%</span>
            </div>
            <div class="flex justify-between">
              <span>Feasibility:</span>
              <span class="font-medium">{Math.floor(change.withoutTransitions.feasibilityScore)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div class="space-y-6">
      {/* Overall Assessment Comparison */}
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">
          Retirement Readiness Assessment
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* With Transitions */}
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 class="font-medium text-blue-800 mb-3">With Transitions</h4>
            <div class="space-y-2">
              <p class="text-sm">
                <span class="text-gray-600">Overall Assessment:</span>
                <span class={`ml-2 font-semibold capitalize ${getAssessmentColor(comparison.withTransitionsAdvice.overallAssessment)}`}>
                  {comparison.withTransitionsAdvice.overallAssessment.replace('_', ' ')}
                </span>
              </p>
              <p class="text-sm">
                <span class="text-gray-600">Can Retire at Target:</span>
                <span class={`ml-2 font-semibold ${comparison.withTransitionsAdvice.retirementFeasibility.canRetireAtTarget ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.withTransitionsAdvice.retirementFeasibility.canRetireAtTarget ? 'Yes' : 'No'}
                </span>
              </p>
              <p class="text-sm text-gray-600">
                Total Recommendations: {comparison.withTransitionsAdvice.recommendations.length}
              </p>
            </div>
          </div>

          {/* Without Transitions */}
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 class="font-medium text-gray-800 mb-3">Without Transitions</h4>
            <div class="space-y-2">
              <p class="text-sm">
                <span class="text-gray-600">Overall Assessment:</span>
                <span class={`ml-2 font-semibold capitalize ${getAssessmentColor(comparison.withoutTransitionsAdvice.overallAssessment)}`}>
                  {comparison.withoutTransitionsAdvice.overallAssessment.replace('_', ' ')}
                </span>
              </p>
              <p class="text-sm">
                <span class="text-gray-600">Can Retire at Target:</span>
                <span class={`ml-2 font-semibold ${comparison.withoutTransitionsAdvice.retirementFeasibility.canRetireAtTarget ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.withoutTransitionsAdvice.retirementFeasibility.canRetireAtTarget ? 'Yes' : 'No'}
                </span>
              </p>
              <p class="text-sm text-gray-600">
                Total Recommendations: {comparison.withoutTransitionsAdvice.recommendations.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Variation Explanation */}
      {comparison.variationExplanation.length > 0 && (
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Why Advice Varies Between Scenarios
          </h3>
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <ul class="space-y-2">
              {comparison.variationExplanation.map((explanation, index) => (
                <li key={index} class="flex items-start">
                  <svg class="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-sm text-gray-700">{explanation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Advice Differences by Category */}
      {comparison.adviceDifferences.map((categoryDiff, index) => (
        <div key={index} class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span class="text-2xl mr-2">{getCategoryIcon(categoryDiff.category)}</span>
            {categoryDiff.category.charAt(0).toUpperCase() + categoryDiff.category.slice(1)} Advice Differences
          </h3>

          {/* Changed Advice */}
          {categoryDiff.changedAdvice.length > 0 && (
            <div class="mb-6">
              <h4 class="font-medium text-gray-800 mb-3">Modified Recommendations</h4>
              <div class="space-y-4">
                {categoryDiff.changedAdvice.map((change, changeIndex) => (
                  <div key={changeIndex}>
                    {renderChangeComparison(change)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unique Advice Items */}
          {(categoryDiff.uniqueToWithTransitions.length > 0 || categoryDiff.uniqueToWithoutTransitions.length > 0) && (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unique to With Transitions */}
              {categoryDiff.uniqueToWithTransitions.length > 0 && (
                <div>
                  <h4 class="font-medium text-blue-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Only with Transitions ({categoryDiff.uniqueToWithTransitions.length})
                  </h4>
                  <div class="space-y-3">
                    {categoryDiff.uniqueToWithTransitions.map((advice, adviceIndex) => (
                      <div key={adviceIndex}>
                        {renderAdviceItem(advice, 'with')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unique to Without Transitions */}
              {categoryDiff.uniqueToWithoutTransitions.length > 0 && (
                <div>
                  <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                    Only without Transitions ({categoryDiff.uniqueToWithoutTransitions.length})
                  </h4>
                  <div class="space-y-3">
                    {categoryDiff.uniqueToWithoutTransitions.map((advice, adviceIndex) => (
                      <div key={adviceIndex}>
                        {renderAdviceItem(advice, 'without')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* No Differences Message */}
      {comparison.adviceDifferences.length === 0 && (
        <div class="card p-6 text-center">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-600 mb-2">Similar Advice Across Scenarios</h3>
          <p class="text-gray-500">
            The retirement advice recommendations are very similar between both scenarios, 
            indicating consistent strategic direction regardless of transitions.
          </p>
        </div>
      )}
    </div>
  );
}