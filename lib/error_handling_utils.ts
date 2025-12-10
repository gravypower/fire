/**
 * Error Handling Utilities for Milestone and Advice Operations
 * Provides safe wrappers and error recovery mechanisms
 * Validates: Requirements 1.1, 2.1
 */

import type { 
  MilestoneDetectionResult, 
  MilestoneDetectionError,
  AdviceGenerationResult,
  AdviceGenerationError,
  Milestone,
  RetirementAdvice
} from "../types/milestones.ts";

/**
 * Safe wrapper for milestone detection operations
 */
export async function safeMilestoneDetection<T>(
  operation: () => T | Promise<T>,
  context: string,
  fallbackValue: T
): Promise<{ result: T; errors: MilestoneDetectionError[] }> {
  const errors: MilestoneDetectionError[] = [];
  
  try {
    const result = await operation();
    return { result, errors };
  } catch (error) {
    console.error(`Milestone detection error in ${context}:`, error);
    
    errors.push({
      code: 'MILESTONE_OPERATION_FAILED',
      message: `Failed to ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      context: { 
        operation: context,
        error: String(error),
        timestamp: new Date().toISOString()
      },
    });

    return { result: fallbackValue, errors };
  }
}

/**
 * Safe wrapper for advice generation operations
 */
export async function safeAdviceGeneration<T>(
  operation: () => T | Promise<T>,
  context: string,
  fallbackValue: T
): Promise<{ result: T; errors: AdviceGenerationError[] }> {
  const errors: AdviceGenerationError[] = [];
  
  try {
    const result = await operation();
    return { result, errors };
  } catch (error) {
    console.error(`Advice generation error in ${context}:`, error);
    
    errors.push({
      code: 'ADVICE_OPERATION_FAILED',
      message: `Failed to ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      context: { 
        operation: context,
        error: String(error),
        timestamp: new Date().toISOString()
      },
    });

    return { result: fallbackValue, errors };
  }
}

/**
 * Validates milestone data integrity
 */
export function validateMilestones(milestones: Milestone[]): MilestoneDetectionError[] {
  const errors: MilestoneDetectionError[] = [];
  
  for (const milestone of milestones) {
    // Check required fields
    if (!milestone.id) {
      errors.push({
        code: 'INVALID_MILESTONE_ID',
        message: `Milestone missing required ID field`,
        severity: 'error',
        context: { milestone: milestone.title || 'Unknown' },
      });
    }
    
    if (!milestone.date || isNaN(milestone.date.getTime())) {
      errors.push({
        code: 'INVALID_MILESTONE_DATE',
        message: `Milestone has invalid date: ${milestone.title}`,
        severity: 'error',
        context: { milestoneId: milestone.id, date: milestone.date },
      });
    }
    
    if (!milestone.title || milestone.title.trim().length === 0) {
      errors.push({
        code: 'INVALID_MILESTONE_TITLE',
        message: `Milestone missing title`,
        severity: 'warning',
        context: { milestoneId: milestone.id },
      });
    }
    
    // Check for future dates (might indicate calculation errors)
    if (milestone.date && milestone.date > new Date()) {
      const yearsDiff = (milestone.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);
      if (yearsDiff > 50) {
        errors.push({
          code: 'MILESTONE_FAR_FUTURE',
          message: `Milestone date is unusually far in the future: ${milestone.title}`,
          severity: 'warning',
          context: { 
            milestoneId: milestone.id, 
            date: milestone.date.toISOString(),
            yearsInFuture: yearsDiff.toFixed(1)
          },
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validates retirement advice data integrity
 */
export function validateAdvice(advice: RetirementAdvice): AdviceGenerationError[] {
  const errors: AdviceGenerationError[] = [];
  
  // Check overall assessment
  if (!advice.overallAssessment) {
    errors.push({
      code: 'MISSING_ASSESSMENT',
      message: 'Retirement advice missing overall assessment',
      severity: 'error',
      context: {},
    });
  }
  
  // Check retirement feasibility
  if (!advice.retirementFeasibility) {
    errors.push({
      code: 'MISSING_FEASIBILITY',
      message: 'Retirement advice missing feasibility analysis',
      severity: 'error',
      context: {},
    });
  }
  
  // Validate recommendations
  if (!advice.recommendations || !Array.isArray(advice.recommendations)) {
    errors.push({
      code: 'INVALID_RECOMMENDATIONS',
      message: 'Retirement advice has invalid recommendations array',
      severity: 'error',
      context: { recommendationsType: typeof advice.recommendations },
    });
  } else {
    for (const recommendation of advice.recommendations) {
      // Check required fields
      if (!recommendation.id) {
        errors.push({
          code: 'INVALID_RECOMMENDATION_ID',
          message: 'Recommendation missing required ID field',
          severity: 'error',
          context: { title: recommendation.title || 'Unknown' },
        });
      }
      
      if (!recommendation.title || recommendation.title.trim().length === 0) {
        errors.push({
          code: 'INVALID_RECOMMENDATION_TITLE',
          message: 'Recommendation missing title',
          severity: 'warning',
          context: { recommendationId: recommendation.id },
        });
      }
      
      // Check score ranges
      if (recommendation.effectivenessScore < 0 || recommendation.effectivenessScore > 100) {
        errors.push({
          code: 'INVALID_EFFECTIVENESS_SCORE',
          message: `Recommendation has invalid effectiveness score: ${recommendation.effectivenessScore}`,
          severity: 'warning',
          context: { 
            recommendationId: recommendation.id,
            score: recommendation.effectivenessScore
          },
        });
      }
      
      if (recommendation.feasibilityScore < 0 || recommendation.feasibilityScore > 100) {
        errors.push({
          code: 'INVALID_FEASIBILITY_SCORE',
          message: `Recommendation has invalid feasibility score: ${recommendation.feasibilityScore}`,
          severity: 'warning',
          context: { 
            recommendationId: recommendation.id,
            score: recommendation.feasibilityScore
          },
        });
      }
    }
  }
  
  return errors;
}

/**
 * Creates a safe empty milestone result
 */
export function createEmptyMilestoneResult(errors: MilestoneDetectionError[] = []): MilestoneDetectionResult {
  return {
    milestones: [],
    errors,
    warnings: [],
  };
}

/**
 * Creates a safe empty advice result
 */
export function createEmptyAdviceResult(errors: AdviceGenerationError[] = []): AdviceGenerationResult {
  return {
    advice: {
      overallAssessment: 'critical',
      retirementFeasibility: {
        canRetireAtTarget: false,
      },
      recommendations: [],
      quickWins: [],
      longTermStrategies: [],
    },
    errors,
    warnings: [],
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private attempts = 0;
  private maxAttempts: number;
  private baseDelay: number;

  constructor(maxAttempts = 3, baseDelay = 1000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    while (this.attempts < this.maxAttempts) {
      try {
        const result = await operation();
        this.reset();
        return result;
      } catch (error) {
        this.attempts++;
        
        if (this.attempts >= this.maxAttempts) {
          throw error;
        }
        
        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, this.attempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }

  reset(): void {
    this.attempts = 0;
  }

  getAttempts(): number {
    return this.attempts;
  }
}

/**
 * Graceful degradation helper
 */
export function withGracefulDegradation<T, F>(
  primaryOperation: () => T,
  fallbackOperation: () => F,
  context: string
): T | F {
  try {
    return primaryOperation();
  } catch (error) {
    console.warn(`Primary operation failed in ${context}, using fallback:`, error);
    return fallbackOperation();
  }
}

/**
 * Data sanitization for milestone display
 */
export function sanitizeMilestoneForDisplay(milestone: Milestone): Milestone {
  return {
    ...milestone,
    title: milestone.title || 'Untitled Milestone',
    description: milestone.description || 'No description available',
    date: milestone.date && !isNaN(milestone.date.getTime()) 
      ? milestone.date 
      : new Date(),
    financialImpact: typeof milestone.financialImpact === 'number' && !isNaN(milestone.financialImpact)
      ? milestone.financialImpact
      : undefined,
  };
}

/**
 * Data sanitization for advice display
 */
export function sanitizeAdviceForDisplay(advice: RetirementAdvice): RetirementAdvice {
  return {
    ...advice,
    overallAssessment: advice.overallAssessment || 'critical',
    retirementFeasibility: advice.retirementFeasibility || {
      canRetireAtTarget: false,
    },
    recommendations: (advice.recommendations || []).map(rec => ({
      ...rec,
      title: rec.title || 'Untitled Recommendation',
      description: rec.description || 'No description available',
      specificActions: Array.isArray(rec.specificActions) ? rec.specificActions : [],
      effectivenessScore: typeof rec.effectivenessScore === 'number' && !isNaN(rec.effectivenessScore)
        ? Math.max(0, Math.min(100, rec.effectivenessScore))
        : 0,
      feasibilityScore: typeof rec.feasibilityScore === 'number' && !isNaN(rec.feasibilityScore)
        ? Math.max(0, Math.min(100, rec.feasibilityScore))
        : 0,
    })),
    quickWins: Array.isArray(advice.quickWins) ? advice.quickWins : [],
    longTermStrategies: Array.isArray(advice.longTermStrategies) ? advice.longTermStrategies : [],
  };
}