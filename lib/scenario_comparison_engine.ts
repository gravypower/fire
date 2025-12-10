/**
 * Scenario Comparison Engine
 * Analyzes differences in milestones and advice between simulation scenarios
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type {
  ComparisonSimulationResult,
  MilestoneComparison,
  MilestoneTimingComparison,
  MilestoneTimingDifference,
  AdviceComparison,
  AdviceDifference,
  AdviceChangeComparison,
  SimulationConfiguration,
} from "../types/financial.ts";
import { detectMilestonesFromSimulation } from "./milestone_detector.ts";
import { generateRetirementAdvice } from "./retirement_advice_engine.ts";

/**
 * Scenario Comparison Engine
 * Analyzes and compares milestones and advice between different simulation scenarios
 */
export class ScenarioComparisonEngine {
  /**
   * Enhances a comparison result with milestone and advice analysis
   * Validates: Requirements 5.1, 5.2
   */
  static enhanceComparisonWithMilestonesAndAdvice(
    comparison: ComparisonSimulationResult,
    config: SimulationConfiguration
  ): ComparisonSimulationResult {
    // Generate milestones for both scenarios if not already present
    const withTransitionsMilestones = comparison.withTransitions.milestones || 
      this.generateMilestonesForScenario(comparison.withTransitions, config, true);
    
    const withoutTransitionsMilestones = comparison.withoutTransitions.milestones || 
      this.generateMilestonesForScenario(comparison.withoutTransitions, config, false);

    // Generate advice for both scenarios
    const withTransitionsAdvice = this.generateAdviceForScenario(comparison.withTransitions, config);
    const withoutTransitionsAdvice = this.generateAdviceForScenario(comparison.withoutTransitions, config);

    // Compare milestones
    const milestoneComparison = this.compareMilestones(
      withTransitionsMilestones,
      withoutTransitionsMilestones
    );

    // Compare advice
    const adviceComparison = this.compareAdvice(
      withTransitionsAdvice,
      withoutTransitionsAdvice,
      comparison
    );

    return {
      ...comparison,
      milestoneComparison,
      adviceComparison,
    };
  }

  /**
   * Generates milestones for a scenario if not already present
   */
  private static generateMilestonesForScenario(
    result: any,
    config: SimulationConfiguration,
    hasTransitions: boolean
  ): import("../types/milestones.ts").Milestone[] {
    const transitionPoints = hasTransitions && 'transitionPoints' in result 
      ? result.transitionPoints 
      : undefined;

    const milestoneResult = detectMilestonesFromSimulation(
      result.states,
      config.baseParameters,
      transitionPoints
    );

    return milestoneResult.milestones;
  }

  /**
   * Generates retirement advice for a scenario
   */
  private static generateAdviceForScenario(
    result: any,
    config: SimulationConfiguration
  ): import("../types/milestones.ts").RetirementAdvice {
    const milestones = result.milestones || [];
    const adviceResult = generateRetirementAdvice(
      result,
      config.baseParameters,
      milestones
    );

    return adviceResult.advice;
  }

  /**
   * Compares milestones between two scenarios
   * Validates: Requirements 5.2, 5.3
   */
  static compareMilestones(
    withTransitionsMilestones: import("../types/milestones.ts").Milestone[],
    withoutTransitionsMilestones: import("../types/milestones.ts").Milestone[]
  ): MilestoneComparison {
    const commonMilestones: MilestoneTimingComparison[] = [];
    const uniqueToWithTransitions: import("../types/milestones.ts").Milestone[] = [];
    const uniqueToWithoutTransitions: import("../types/milestones.ts").Milestone[] = [];

    // Find common milestones by type and compare timing
    for (const withMilestone of withTransitionsMilestones) {
      const matchingWithoutMilestone = this.findMatchingMilestone(
        withMilestone,
        withoutTransitionsMilestones
      );

      if (matchingWithoutMilestone) {
        const timingDifferenceInDays = this.calculateTimingDifference(
          withMilestone.date,
          matchingWithoutMilestone.date
        );

        const impactDifference = this.calculateImpactDifference(
          withMilestone,
          matchingWithoutMilestone
        );

        commonMilestones.push({
          milestoneType: withMilestone.type,
          withTransitions: withMilestone,
          withoutTransitions: matchingWithoutMilestone,
          timingDifferenceInDays,
          impactDifference,
        });
      } else {
        uniqueToWithTransitions.push(withMilestone);
      }
    }

    // Find milestones unique to without-transitions scenario
    for (const withoutMilestone of withoutTransitionsMilestones) {
      const hasMatch = withTransitionsMilestones.some(withMilestone =>
        this.milestonesMatch(withMilestone, withoutMilestone)
      );

      if (!hasMatch) {
        uniqueToWithoutTransitions.push(withoutMilestone);
      }
    }

    // Calculate timing differences summary
    const timingDifferences = this.calculateTimingDifferencesSummary(commonMilestones);

    return {
      commonMilestones,
      uniqueToWithTransitions,
      uniqueToWithoutTransitions,
      timingDifferences,
    };
  }

  /**
   * Finds a matching milestone in the other scenario
   */
  private static findMatchingMilestone(
    milestone: import("../types/milestones.ts").Milestone,
    otherMilestones: import("../types/milestones.ts").Milestone[]
  ): import("../types/milestones.ts").Milestone | null {
    return otherMilestones.find(other => this.milestonesMatch(milestone, other)) || null;
  }

  /**
   * Determines if two milestones represent the same event
   */
  private static milestonesMatch(milestone1: import("../types/milestones.ts").Milestone, milestone2: import("../types/milestones.ts").Milestone): boolean {
    // Match by type and specific identifiers
    if (milestone1.type !== milestone2.type) {
      return false;
    }

    switch (milestone1.type) {
      case 'loan_payoff':
        return 'loanId' in milestone1 && 'loanId' in milestone2 && 
               milestone1.loanId === milestone2.loanId;
      
      case 'offset_completion':
        return 'loanId' in milestone1 && 'loanId' in milestone2 && 
               milestone1.loanId === milestone2.loanId;
      
      case 'retirement_eligibility':
        return true; // Only one retirement milestone per scenario
      
      case 'parameter_transition':
        return 'transitionId' in milestone1 && 'transitionId' in milestone2 && 
               milestone1.transitionId === milestone2.transitionId;
      
      default:
        return false;
    }
  }

  /**
   * Calculates timing difference between two dates in days
   */
  private static calculateTimingDifference(date1: Date, date2: Date): number {
    const diffMs = date1.getTime() - date2.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates difference in financial impact between milestones
   */
  private static calculateImpactDifference(
    milestone1: import("../types/milestones.ts").Milestone,
    milestone2: import("../types/milestones.ts").Milestone
  ): number | undefined {
    if (milestone1.financialImpact !== undefined && milestone2.financialImpact !== undefined) {
      return milestone1.financialImpact - milestone2.financialImpact;
    }
    return undefined;
  }

  /**
   * Calculates summary of timing differences by milestone type
   */
  private static calculateTimingDifferencesSummary(
    commonMilestones: MilestoneTimingComparison[]
  ): MilestoneTimingDifference[] {
    const summaryMap = new Map<import("../types/milestones.ts").MilestoneType, {
      differences: number[];
      count: number;
    }>();

    // Group by milestone type
    for (const comparison of commonMilestones) {
      const existing = summaryMap.get(comparison.milestoneType) || {
        differences: [],
        count: 0,
      };

      existing.differences.push(comparison.timingDifferenceInDays);
      existing.count++;
      summaryMap.set(comparison.milestoneType, existing);
    }

    // Calculate summaries
    const summaries: MilestoneTimingDifference[] = [];
    for (const [milestoneType, data] of summaryMap.entries()) {
      const averageTimingDifference = data.differences.reduce((sum, diff) => sum + diff, 0) / data.count;
      
      // Determine effect
      let effect: 'accelerates' | 'delays' | 'mixed' | 'no_change';
      const positiveCount = data.differences.filter(d => d > 0).length;
      const negativeCount = data.differences.filter(d => d < 0).length;
      const zeroCount = data.differences.filter(d => d === 0).length;

      if (zeroCount === data.count) {
        effect = 'no_change';
      } else if (positiveCount > 0 && negativeCount > 0) {
        effect = 'mixed';
      } else if (positiveCount > negativeCount) {
        effect = 'accelerates';
      } else {
        effect = 'delays';
      }

      summaries.push({
        milestoneType,
        averageTimingDifference,
        count: data.count,
        effect,
      });
    }

    return summaries;
  }

  /**
   * Compares retirement advice between two scenarios
   * Validates: Requirements 5.4, 5.5
   */
  static compareAdvice(
    withTransitionsAdvice: import("../types/milestones.ts").RetirementAdvice,
    withoutTransitionsAdvice: import("../types/milestones.ts").RetirementAdvice,
    comparison: ComparisonSimulationResult
  ): AdviceComparison {
    const adviceDifferences = this.analyzeAdviceDifferences(
      withTransitionsAdvice,
      withoutTransitionsAdvice
    );

    const variationExplanation = this.generateAdviceVariationExplanation(
      withTransitionsAdvice,
      withoutTransitionsAdvice,
      comparison
    );

    return {
      withTransitionsAdvice,
      withoutTransitionsAdvice,
      adviceDifferences,
      variationExplanation,
    };
  }

  /**
   * Analyzes differences in advice between scenarios
   */
  private static analyzeAdviceDifferences(
    withTransitionsAdvice: import("../types/milestones.ts").RetirementAdvice,
    withoutTransitionsAdvice: import("../types/milestones.ts").RetirementAdvice
  ): AdviceDifference[] {
    const categories: import("../types/milestones.ts").AdviceCategory[] = ['debt', 'investment', 'expense', 'income'];
    const differences: AdviceDifference[] = [];

    for (const category of categories) {
      const withTransitionsItems = withTransitionsAdvice.recommendations
        .filter(item => item.category === category);
      
      const withoutTransitionsItems = withoutTransitionsAdvice.recommendations
        .filter(item => item.category === category);

      const uniqueToWithTransitions: import("../types/milestones.ts").AdviceItem[] = [];
      const uniqueToWithoutTransitions: import("../types/milestones.ts").AdviceItem[] = [];
      const changedAdvice: AdviceChangeComparison[] = [];

      // Find unique and changed advice items
      for (const withItem of withTransitionsItems) {
        const matchingWithoutItem = this.findMatchingAdviceItem(withItem, withoutTransitionsItems);
        
        if (matchingWithoutItem) {
          const changes = this.analyzeAdviceChanges(withItem, matchingWithoutItem);
          if (this.hasSignificantChanges(changes)) {
            changedAdvice.push({
              withTransitions: withItem,
              withoutTransitions: matchingWithoutItem,
              changes,
              changeExplanation: this.generateChangeExplanation(withItem, matchingWithoutItem, changes),
            });
          }
        } else {
          uniqueToWithTransitions.push(withItem);
        }
      }

      // Find items unique to without-transitions scenario
      for (const withoutItem of withoutTransitionsItems) {
        const hasMatch = withTransitionsItems.some(withItem =>
          this.adviceItemsMatch(withItem, withoutItem)
        );

        if (!hasMatch) {
          uniqueToWithoutTransitions.push(withoutItem);
        }
      }

      // Only include categories that have differences
      if (uniqueToWithTransitions.length > 0 || 
          uniqueToWithoutTransitions.length > 0 || 
          changedAdvice.length > 0) {
        differences.push({
          category,
          uniqueToWithTransitions,
          uniqueToWithoutTransitions,
          changedAdvice,
        });
      }
    }

    return differences;
  }

  /**
   * Finds matching advice item in the other scenario
   */
  private static findMatchingAdviceItem(
    adviceItem: import("../types/milestones.ts").AdviceItem,
    otherItems: import("../types/milestones.ts").AdviceItem[]
  ): import("../types/milestones.ts").AdviceItem | null {
    return otherItems.find(other => this.adviceItemsMatch(adviceItem, other)) || null;
  }

  /**
   * Determines if two advice items represent the same recommendation
   */
  private static adviceItemsMatch(item1: import("../types/milestones.ts").AdviceItem, item2: import("../types/milestones.ts").AdviceItem): boolean {
    // Match by category and similar title/description
    if (item1.category !== item2.category) {
      return false;
    }

    // Simple matching based on title similarity
    const title1 = item1.title.toLowerCase();
    const title2 = item2.title.toLowerCase();
    
    // Check if titles contain similar key phrases
    const keyPhrases1 = this.extractKeyPhrases(title1);
    const keyPhrases2 = this.extractKeyPhrases(title2);
    
    return keyPhrases1.some(phrase => keyPhrases2.includes(phrase));
  }

  /**
   * Extracts key phrases from advice titles for matching
   */
  private static extractKeyPhrases(title: string): string[] {
    const phrases: string[] = [];
    
    // Common patterns in advice titles
    if (title.includes('increase') && title.includes('payment')) {
      phrases.push('increase_payment');
    }
    if (title.includes('reduce') && title.includes('expense')) {
      phrases.push('reduce_expense');
    }
    if (title.includes('investment') && title.includes('contribution')) {
      phrases.push('investment_contribution');
    }
    if (title.includes('offset')) {
      phrases.push('offset_optimization');
    }
    if (title.includes('allocation')) {
      phrases.push('allocation_optimization');
    }
    if (title.includes('raise') || title.includes('income')) {
      phrases.push('income_increase');
    }
    
    return phrases;
  }

  /**
   * Analyzes changes between two advice items
   */
  private static analyzeAdviceChanges(
    withTransitions: import("../types/milestones.ts").AdviceItem,
    withoutTransitions: import("../types/milestones.ts").AdviceItem
  ) {
    return {
      priorityChanged: withTransitions.priority !== withoutTransitions.priority,
      effectivenessChanged: Math.abs(withTransitions.effectivenessScore - withoutTransitions.effectivenessScore) > 5,
      feasibilityChanged: Math.abs(withTransitions.feasibilityScore - withoutTransitions.feasibilityScore) > 5,
      impactChanged: this.hasImpactChanged(withTransitions, withoutTransitions),
    };
  }

  /**
   * Checks if projected impact has changed significantly
   */
  private static hasImpactChanged(item1: import("../types/milestones.ts").AdviceItem, item2: import("../types/milestones.ts").AdviceItem): boolean {
    const impact1 = item1.projectedImpact;
    const impact2 = item2.projectedImpact;

    if (impact1.timelineSavings && impact2.timelineSavings) {
      if (Math.abs(impact1.timelineSavings - impact2.timelineSavings) > 0.5) {
        return true;
      }
    }

    if (impact1.costSavings && impact2.costSavings) {
      if (Math.abs(impact1.costSavings - impact2.costSavings) > 1000) {
        return true;
      }
    }

    if (impact1.additionalAssets && impact2.additionalAssets) {
      if (Math.abs(impact1.additionalAssets - impact2.additionalAssets) > 5000) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determines if changes are significant enough to report
   */
  private static hasSignificantChanges(changes: any): boolean {
    return changes.priorityChanged || 
           changes.effectivenessChanged || 
           changes.feasibilityChanged || 
           changes.impactChanged;
  }

  /**
   * Generates explanation for why advice changed
   */
  private static generateChangeExplanation(
    withTransitions: import("../types/milestones.ts").AdviceItem,
    withoutTransitions: import("../types/milestones.ts").AdviceItem,
    changes: any
  ): string {
    const explanations: string[] = [];

    if (changes.priorityChanged) {
      explanations.push(`Priority changed from ${withoutTransitions.priority} to ${withTransitions.priority}`);
    }

    if (changes.effectivenessChanged) {
      const diff = withTransitions.effectivenessScore - withoutTransitions.effectivenessScore;
      explanations.push(`Effectiveness ${diff > 0 ? 'increased' : 'decreased'} by ${Math.abs(diff).toFixed(0)} points`);
    }

    if (changes.feasibilityChanged) {
      const diff = withTransitions.feasibilityScore - withoutTransitions.feasibilityScore;
      explanations.push(`Feasibility ${diff > 0 ? 'improved' : 'worsened'} by ${Math.abs(diff).toFixed(0)} points`);
    }

    if (changes.impactChanged) {
      explanations.push('Projected impact changed due to different scenario outcomes');
    }

    return explanations.join('; ');
  }

  /**
   * Generates explanation for why advice varies between scenarios
   */
  private static generateAdviceVariationExplanation(
    withTransitionsAdvice: import("../types/milestones.ts").RetirementAdvice,
    withoutTransitionsAdvice: import("../types/milestones.ts").RetirementAdvice,
    comparison: ComparisonSimulationResult
  ): string[] {
    const explanations: string[] = [];

    // Overall assessment differences
    if (withTransitionsAdvice.overallAssessment !== withoutTransitionsAdvice.overallAssessment) {
      explanations.push(
        `Overall retirement readiness improved from "${withoutTransitionsAdvice.overallAssessment}" to "${withTransitionsAdvice.overallAssessment}" with transitions`
      );
    }

    // Retirement feasibility differences
    const withFeasible = withTransitionsAdvice.retirementFeasibility.canRetireAtTarget;
    const withoutFeasible = withoutTransitionsAdvice.retirementFeasibility.canRetireAtTarget;
    
    if (withFeasible !== withoutFeasible) {
      if (withFeasible) {
        explanations.push('Transitions enable retirement at target age, changing advice focus to optimization rather than catch-up strategies');
      } else {
        explanations.push('Transitions delay retirement feasibility, requiring more aggressive strategies');
      }
    }

    // Net worth impact on advice
    if (comparison.comparison.finalNetWorthDifference !== 0) {
      const impact = comparison.comparison.finalNetWorthDifference;
      if (impact > 0) {
        explanations.push(`Improved financial position (${Math.abs(impact).toLocaleString()} higher net worth) allows for more conservative advice strategies`);
      } else {
        explanations.push(`Reduced financial position (${Math.abs(impact).toLocaleString()} lower net worth) requires more aggressive advice strategies`);
      }
    }

    // Retirement timing impact
    if (comparison.comparison.retirementDateDifference !== null) {
      const yearsDiff = comparison.comparison.retirementDateDifference;
      if (yearsDiff < 0) {
        explanations.push(`Earlier retirement (${Math.abs(yearsDiff).toFixed(1)} years) reduces urgency of some recommendations`);
      } else if (yearsDiff > 0) {
        explanations.push(`Later retirement (${yearsDiff.toFixed(1)} years) increases urgency and aggressiveness of recommendations`);
      }
    }

    // Sustainability impact
    if (comparison.comparison.sustainabilityChanged) {
      if (comparison.withTransitions.isSustainable) {
        explanations.push('Improved sustainability with transitions reduces need for emergency financial measures');
      } else {
        explanations.push('Reduced sustainability with transitions requires immediate corrective actions');
      }
    }

    return explanations;
  }
}