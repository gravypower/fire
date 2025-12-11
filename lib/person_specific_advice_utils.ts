/**
 * Utilities for generating person-specific retirement advice
 * Ensures parameter changes are correctly applied to the right person
 */

import type { 
  UserParameters, 
  Person, 
  IncomeSource, 
  SuperAccount 
} from "../types/financial.ts";
import type { AdviceItem } from "../types/milestones.ts";
import { 
  requiresPersonSelection, 
  isChangeableParameter, 
  getParameterCategory,
  PARAMETER_METADATA 
} from "../types/parameter_categories.ts";

/**
 * Helper to create person-specific advice with proper parameter targeting
 */
export function createPersonSpecificAdvice(
  baseAdvice: Omit<AdviceItem, 'personId' | 'personSpecificChanges'>,
  personId: string,
  personSpecificChanges?: AdviceItem['personSpecificChanges']
): AdviceItem {
  return {
    ...baseAdvice,
    personId,
    personSpecificChanges,
  };
}

/**
 * Helper to create advice for increasing a person's super contribution
 */
export function createSuperContributionAdvice(
  person: Person,
  currentContributionRate: number,
  suggestedRate: number,
  projectedBenefit: number,
  superAccountId?: string
): AdviceItem {
  const increase = suggestedRate - currentContributionRate;
  
  return {
    id: `super-increase-${person.id}-${suggestedRate}`,
    category: 'investment',
    priority: increase <= 2 ? 'high' : 'medium',
    title: `Increase ${person.name}'s Super Contribution to ${suggestedRate}%`,
    description: `Boost ${person.name}'s superannuation contribution from ${currentContributionRate}% to ${suggestedRate}% to accelerate retirement savings by an estimated ${projectedBenefit.toLocaleString()}.`,
    specificActions: [
      `Contact payroll to increase ${person.name}'s super contribution rate`,
      `Update salary sacrifice arrangements if needed`,
      `Monitor impact on take-home pay and budget accordingly`,
      `Review annually and consider further increases`,
    ],
    projectedImpact: {
      additionalAssets: projectedBenefit,
    },
    feasibilityScore: 85,
    effectivenessScore: Math.min(90, (increase / 5) * 100),
    personId: person.id,
    personSpecificChanges: {
      personId: person.id,
      changes: {
        superAccounts: [{
          action: 'update',
          id: superAccountId || person.superAccounts[0]?.id,
          data: {
            contributionRate: suggestedRate,
          },
        }],
      },
    },
  };
}

/**
 * Helper to create advice for adjusting a person's retirement age
 */
export function createRetirementAgeAdvice(
  person: Person,
  suggestedRetirementAge: number,
  currentRetirementAge: number,
  projectedBenefit: number,
  reason: string
): AdviceItem {
  const ageChange = suggestedRetirementAge - currentRetirementAge;
  const direction = ageChange > 0 ? 'Delay' : 'Advance';
  const years = Math.abs(ageChange);
  
  return {
    id: `retirement-age-${person.id}-${suggestedRetirementAge}`,
    category: 'income',
    priority: years <= 2 ? 'medium' : 'low',
    title: `${direction} ${person.name}'s Retirement by ${years} Year${years !== 1 ? 's' : ''}`,
    description: `Consider ${direction.toLowerCase()}ing ${person.name}'s retirement from age ${currentRetirementAge} to ${suggestedRetirementAge}. ${reason}`,
    specificActions: [
      `Review ${person.name}'s career goals and health considerations`,
      `Calculate impact on superannuation and pension eligibility`,
      `Discuss with financial advisor and family members`,
      `Update retirement planning timeline accordingly`,
    ],
    projectedImpact: {
      additionalAssets: projectedBenefit,
      timelineSavings: ageChange > 0 ? years : -years,
    },
    feasibilityScore: years <= 2 ? 70 : 50,
    effectivenessScore: Math.min(85, (Math.abs(projectedBenefit) / 10000) * 10),
    personId: person.id,
    personSpecificChanges: {
      personId: person.id,
      changes: {
        personUpdates: {
          retirementAge: suggestedRetirementAge,
        },
      },
    },
  };
}

/**
 * Helper to create advice for adding/modifying a person's income source
 */
export function createIncomeSourceAdvice(
  person: Person,
  incomeSourceChange: {
    action: 'add' | 'update' | 'remove';
    id?: string;
    data?: Partial<IncomeSource>;
  },
  title: string,
  description: string,
  projectedBenefit: number
): AdviceItem {
  return {
    id: `income-${incomeSourceChange.action}-${person.id}-${incomeSourceChange.id || 'new'}`,
    category: 'income',
    priority: 'medium',
    title: `${title} for ${person.name}`,
    description: `${description} This could improve ${person.name}'s financial position by ${projectedBenefit.toLocaleString()}.`,
    specificActions: [
      `Evaluate ${incomeSourceChange.action} income source opportunity`,
      `Consider impact on work-life balance and career goals`,
      `Update tax planning and budgeting accordingly`,
      `Monitor progress and adjust as needed`,
    ],
    projectedImpact: {
      additionalAssets: projectedBenefit,
    },
    feasibilityScore: 60,
    effectivenessScore: Math.min(80, (projectedBenefit / 5000) * 10),
    personId: person.id,
    personSpecificChanges: {
      personId: person.id,
      changes: {
        incomeSources: [incomeSourceChange],
      },
    },
  };
}

/**
 * Validates parameter changes based on categorization rules
 */
export function validateParameterChanges(
  parameterChanges: Partial<UserParameters>,
  params: UserParameters,
  personId?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [paramKey, value] of Object.entries(parameterChanges)) {
    // Check if parameter is changeable
    if (!isChangeableParameter(paramKey)) {
      errors.push(`Parameter '${paramKey}' cannot be changed in transitions`);
      continue;
    }
    
    // Check if person selection is required
    if (params.householdMode === 'couple' && requiresPersonSelection(paramKey, 'couple')) {
      if (!personId) {
        errors.push(`Parameter '${paramKey}' requires person selection in couple mode`);
      }
    }
    
    // Validate parameter metadata if available
    const metadata = PARAMETER_METADATA[paramKey];
    if (metadata) {
      // Type validation
      if (metadata.dataType === 'number' && typeof value !== 'number') {
        errors.push(`Parameter '${paramKey}' must be a number`);
      }
      if (metadata.dataType === 'string' && typeof value !== 'string') {
        errors.push(`Parameter '${paramKey}' must be a string`);
      }
      if (metadata.dataType === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Parameter '${paramKey}' must be a boolean`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that person-specific changes are correctly targeted
 */
export function validatePersonSpecificAdvice(
  advice: AdviceItem,
  params: UserParameters
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if personId exists in household
  if (advice.personId) {
    const person = params.people?.find(p => p.id === advice.personId);
    if (!person) {
      errors.push(`Person ID ${advice.personId} not found in household`);
    }
  }

  // Validate general parameter changes
  if (advice.parameterChanges) {
    const paramValidation = validateParameterChanges(
      advice.parameterChanges, 
      params, 
      advice.personId
    );
    errors.push(...paramValidation.errors);
  }

  // Validate person-specific changes
  if (advice.personSpecificChanges) {
    const { personId, changes } = advice.personSpecificChanges;
    const person = params.people?.find(p => p.id === personId);
    
    if (!person) {
      errors.push(`Person ID ${personId} in personSpecificChanges not found in household`);
    } else {
      // Validate income source changes
      if (changes.incomeSources) {
        for (const incomeChange of changes.incomeSources) {
          if (incomeChange.action === 'update' || incomeChange.action === 'remove') {
            if (!incomeChange.id) {
              errors.push(`Income source ID required for ${incomeChange.action} action`);
            } else {
              const existingIncome = person.incomeSources.find(i => i.id === incomeChange.id);
              if (!existingIncome) {
                errors.push(`Income source ${incomeChange.id} not found for person ${personId}`);
              }
            }
          }
          
          if (incomeChange.action === 'add' && incomeChange.data) {
            // Ensure personId is set correctly
            if (incomeChange.data.personId && incomeChange.data.personId !== personId) {
              errors.push(`Income source personId mismatch: expected ${personId}, got ${incomeChange.data.personId}`);
            }
          }
        }
      }

      // Validate super account changes
      if (changes.superAccounts) {
        for (const superChange of changes.superAccounts) {
          if (superChange.action === 'update' || superChange.action === 'remove') {
            if (!superChange.id) {
              errors.push(`Super account ID required for ${superChange.action} action`);
            } else {
              const existingSuper = person.superAccounts.find(s => s.id === superChange.id);
              if (!existingSuper) {
                errors.push(`Super account ${superChange.id} not found for person ${personId}`);
              }
            }
          }
          
          if (superChange.action === 'add' && superChange.data) {
            // Ensure personId is set correctly
            if (superChange.data.personId && superChange.data.personId !== personId) {
              errors.push(`Super account personId mismatch: expected ${personId}, got ${superChange.data.personId}`);
            }
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Applies person-specific advice changes to user parameters
 * Returns updated parameters with changes applied
 */
export function applyPersonSpecificAdvice(
  params: UserParameters,
  advice: AdviceItem
): UserParameters {
  let updatedParams = { ...params };

  // Apply general parameter changes first
  if (advice.parameterChanges) {
    updatedParams = {
      ...updatedParams,
      ...advice.parameterChanges,
    };
  }

  // Apply person-specific changes
  if (advice.personSpecificChanges && updatedParams.people) {
    const { personId, changes } = advice.personSpecificChanges;
    
    updatedParams.people = updatedParams.people.map(person => {
      if (person.id !== personId) {
        return person;
      }

      let updatedPerson = { ...person };

      // Apply person updates
      if (changes.personUpdates) {
        updatedPerson = {
          ...updatedPerson,
          ...changes.personUpdates,
        };
      }

      // Apply income source changes
      if (changes.incomeSources) {
        let updatedIncomeSources = [...updatedPerson.incomeSources];
        
        for (const incomeChange of changes.incomeSources) {
          switch (incomeChange.action) {
            case 'add':
              if (incomeChange.data) {
                const newIncomeSource: IncomeSource = {
                  id: incomeChange.data.id || `income-${Date.now()}`,
                  label: incomeChange.data.label || 'New Income Source',
                  amount: incomeChange.data.amount || 0,
                  frequency: incomeChange.data.frequency || 'yearly',
                  isBeforeTax: incomeChange.data.isBeforeTax ?? true,
                  personId: personId,
                  ...incomeChange.data,
                };
                updatedIncomeSources.push(newIncomeSource);
              }
              break;
              
            case 'update':
              if (incomeChange.id && incomeChange.data) {
                const index = updatedIncomeSources.findIndex(i => i.id === incomeChange.id);
                if (index >= 0) {
                  updatedIncomeSources[index] = {
                    ...updatedIncomeSources[index],
                    ...incomeChange.data,
                    personId: personId, // Ensure personId stays correct
                  };
                }
              }
              break;
              
            case 'remove':
              if (incomeChange.id) {
                updatedIncomeSources = updatedIncomeSources.filter(i => i.id !== incomeChange.id);
              }
              break;
          }
        }
        
        updatedPerson.incomeSources = updatedIncomeSources;
      }

      // Apply super account changes
      if (changes.superAccounts) {
        let updatedSuperAccounts = [...updatedPerson.superAccounts];
        
        for (const superChange of changes.superAccounts) {
          switch (superChange.action) {
            case 'add':
              if (superChange.data) {
                const newSuperAccount: SuperAccount = {
                  id: superChange.data.id || `super-${Date.now()}`,
                  label: superChange.data.label || 'New Super Account',
                  balance: superChange.data.balance || 0,
                  contributionRate: superChange.data.contributionRate || 11,
                  returnRate: superChange.data.returnRate || 7,
                  personId: personId,
                  ...superChange.data,
                };
                updatedSuperAccounts.push(newSuperAccount);
              }
              break;
              
            case 'update':
              if (superChange.id && superChange.data) {
                const index = updatedSuperAccounts.findIndex(s => s.id === superChange.id);
                if (index >= 0) {
                  updatedSuperAccounts[index] = {
                    ...updatedSuperAccounts[index],
                    ...superChange.data,
                    personId: personId, // Ensure personId stays correct
                  };
                }
              }
              break;
              
            case 'remove':
              if (superChange.id) {
                updatedSuperAccounts = updatedSuperAccounts.filter(s => s.id !== superChange.id);
              }
              break;
          }
        }
        
        updatedPerson.superAccounts = updatedSuperAccounts;
      }

      return updatedPerson;
    });
  }

  return updatedParams;
}

/**
 * Gets the display name for a person or "Household" for general advice
 */
export function getAdviceTargetName(advice: AdviceItem, params: UserParameters): string {
  if (!advice.personId) {
    return 'Household';
  }
  
  const person = params.people?.find(p => p.id === advice.personId);
  return person?.name || `Person ${advice.personId}`;
}