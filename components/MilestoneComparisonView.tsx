/**
 * MilestoneComparisonView Component
 * Displays side-by-side comparison of milestones between scenarios
 * Validates: Requirements 5.2, 5.3
 */

import type { MilestoneComparison } from "../types/financial.ts";
import type { Milestone } from "../types/milestones.ts";
import { formatCurrency } from "../lib/result_utils.ts";

interface MilestoneComparisonViewProps {
  comparison: MilestoneComparison;
}

/**
 * MilestoneComparisonView component
 * 
 * Displays milestone differences between scenarios with timing highlights
 * and explanations of how transitions affect milestone achievement.
 */
export default function MilestoneComparisonView({ comparison }: MilestoneComparisonViewProps) {
  const formatTimingDifference = (days: number): string => {
    const absDays = Math.abs(days);
    if (absDays === 0) return "Same timing";
    
    const years = Math.floor(absDays / 365);
    const months = Math.floor((absDays % 365) / 30);
    const remainingDays = absDays % 30;
    
    let result = "";
    if (years > 0) result += `${years}y `;
    if (months > 0) result += `${months}m `;
    if (remainingDays > 0 || result === "") result += `${remainingDays}d`;
    
    return `${result.trim()} ${days > 0 ? 'earlier' : 'later'}`;
  };

  const getMilestoneIcon = (milestone: Milestone): string => {
    switch (milestone.type) {
      case 'loan_payoff':
        return '🏠';
      case 'offset_completion':
        return '⚖️';
      case 'retirement_eligibility':
        return '🎯';
      case 'parameter_transition':
        return '📈';
      default:
        return '📅';
    }
  };

  const getTimingColor = (days: number): string => {
    if (days === 0) return 'text-gray-600';
    return days > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getEffectBadge = (effect: string) => {
    const colors = {
      'accelerates': 'bg-green-100 text-green-800',
      'delays': 'bg-red-100 text-red-800',
      'mixed': 'bg-yellow-100 text-yellow-800',
      'no_change': 'bg-gray-100 text-gray-800',
    };

    return (
      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[effect as keyof typeof colors] || colors.no_change}`}>
        {effect.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div class="space-y-6">
      {/* Timing Differences Summary */}
      {comparison.timingDifferences.length > 0 && (
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Milestone Timing Impact Summary
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparison.timingDifferences.map((diff, index) => (
              <div key={index} class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-medium text-gray-800 capitalize">
                    {diff.milestoneType.replace('_', ' ')}
                  </h4>
                  {getEffectBadge(diff.effect)}
                </div>
                <p class="text-sm text-gray-600 mb-1">
                  {diff.count} milestone{diff.count !== 1 ? 's' : ''} compared
                </p>
                <p class={`text-lg font-semibold ${getTimingColor(diff.averageTimingDifference)}`}>
                  {formatTimingDifference(diff.averageTimingDifference)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Milestones with Timing Differences */}
      {comparison.commonMilestones.length > 0 && (
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Milestone Timing Comparison
          </h3>
          <div class="space-y-4">
            {comparison.commonMilestones.map((milestone, index) => (
              <div key={index} class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center">
                    <span class="text-2xl mr-3">{getMilestoneIcon(milestone.withTransitions)}</span>
                    <div>
                      <h4 class="font-semibold text-gray-800">
                        {milestone.withTransitions.title}
                      </h4>
                      <p class="text-sm text-gray-600 capitalize">
                        {milestone.milestoneType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class={`text-lg font-semibold ${getTimingColor(milestone.timingDifferenceInDays)}`}>
                      {formatTimingDifference(milestone.timingDifferenceInDays)}
                    </p>
                    {milestone.impactDifference !== undefined && (
                      <p class="text-sm text-gray-600">
                        Impact: {milestone.impactDifference > 0 ? '+' : ''}{formatCurrency(milestone.impactDifference)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Side-by-side milestone details */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* With Transitions */}
                  <div class="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <h5 class="font-medium text-blue-800 mb-2">With Transitions</h5>
                    <p class="text-sm text-gray-700 mb-1">
                      <strong>Date:</strong> {milestone.withTransitions.date.toLocaleDateString()}
                    </p>
                    {milestone.withTransitions.financialImpact !== undefined && (
                      <p class="text-sm text-gray-700 mb-1">
                        <strong>Impact:</strong> {formatCurrency(milestone.withTransitions.financialImpact)}
                      </p>
                    )}
                    <p class="text-xs text-gray-600 mt-2">
                      {milestone.withTransitions.description}
                    </p>
                  </div>

                  {/* Without Transitions */}
                  <div class="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <h5 class="font-medium text-gray-800 mb-2">Without Transitions</h5>
                    <p class="text-sm text-gray-700 mb-1">
                      <strong>Date:</strong> {milestone.withoutTransitions.date.toLocaleDateString()}
                    </p>
                    {milestone.withoutTransitions.financialImpact !== undefined && (
                      <p class="text-sm text-gray-700 mb-1">
                        <strong>Impact:</strong> {formatCurrency(milestone.withoutTransitions.financialImpact)}
                      </p>
                    )}
                    <p class="text-xs text-gray-600 mt-2">
                      {milestone.withoutTransitions.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unique Milestones */}
      {(comparison.uniqueToWithTransitions.length > 0 || comparison.uniqueToWithoutTransitions.length > 0) && (
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-800">
            Scenario-Specific Milestones
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unique to With Transitions */}
            {comparison.uniqueToWithTransitions.length > 0 && (
              <div>
                <h4 class="font-medium text-blue-800 mb-3 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Only with Transitions ({comparison.uniqueToWithTransitions.length})
                </h4>
                <div class="space-y-3">
                  {comparison.uniqueToWithTransitions.map((milestone, index) => (
                    <div key={index} class="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div class="flex items-center mb-2">
                        <span class="text-lg mr-2">{getMilestoneIcon(milestone)}</span>
                        <h5 class="font-medium text-gray-800">{milestone.title}</h5>
                      </div>
                      <p class="text-sm text-gray-600 mb-1">
                        {milestone.date.toLocaleDateString()}
                      </p>
                      {milestone.financialImpact !== undefined && (
                        <p class="text-sm text-green-600 font-medium">
                          {formatCurrency(milestone.financialImpact)} impact
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unique to Without Transitions */}
            {comparison.uniqueToWithoutTransitions.length > 0 && (
              <div>
                <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                  Only without Transitions ({comparison.uniqueToWithoutTransitions.length})
                </h4>
                <div class="space-y-3">
                  {comparison.uniqueToWithoutTransitions.map((milestone, index) => (
                    <div key={index} class="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div class="flex items-center mb-2">
                        <span class="text-lg mr-2">{getMilestoneIcon(milestone)}</span>
                        <h5 class="font-medium text-gray-800">{milestone.title}</h5>
                      </div>
                      <p class="text-sm text-gray-600 mb-1">
                        {milestone.date.toLocaleDateString()}
                      </p>
                      {milestone.financialImpact !== undefined && (
                        <p class="text-sm text-green-600 font-medium">
                          {formatCurrency(milestone.financialImpact)} impact
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Milestones Message */}
      {comparison.commonMilestones.length === 0 && 
       comparison.uniqueToWithTransitions.length === 0 && 
       comparison.uniqueToWithoutTransitions.length === 0 && (
        <div class="card p-6 text-center">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-600 mb-2">No Milestones to Compare</h3>
          <p class="text-gray-500">
            No significant financial milestones were detected in either scenario during the simulation period.
          </p>
        </div>
      )}
    </div>
  );
}