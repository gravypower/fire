/**
 * Utilities for parameter change UI - helps determine which parameters need person selection
 */

import type { UserParameters, Person } from "../types/financial.ts";
import { 
  getParameterCategory, 
  requiresPersonSelection, 
  isChangeableParameter,
  getAdvisableParameters,
  getPersonSpecificParameters,
  getHouseholdParameters,
  PARAMETER_METADATA,
  type ParameterMetadata 
} from "../types/parameter_categories.ts";

/**
 * Parameter change option for UI display
 */
export interface ParameterChangeOption {
  /** Parameter key */
  key: string;
  /** Display name */
  displayName: string;
  /** Current value */
  currentValue: any;
  /** Whether this parameter requires person selection */
  requiresPersonSelection: boolean;
  /** Category of parameter */
  category: 'person' | 'household' | 'flexible' | 'non-changeable';
  /** Description for tooltip/help */
  description: string;
  /** Data type for input validation */
  dataType: 'number' | 'string' | 'boolean' | 'date' | 'array' | 'object';
  /** Whether this parameter is recommended for advice */
  advisable: boolean;
  /** Available people to select from (if person-specific) */
  availablePeople?: Person[];
}

/**
 * Gets all changeable parameters for the parameter change UI
 */
export function getChangeableParameters(params: UserParameters): ParameterChangeOption[] {
  const options: ParameterChangeOption[] = [];
  
  for (const [key, metadata] of Object.entries(PARAMETER_METADATA)) {
    if (!metadata.isChangeable) {
      continue; // Skip non-changeable parameters
    }
    
    const currentValue = getCurrentParameterValue(params, key);
    const needsPersonSelection = requiresPersonSelection(key, params.householdMode || 'single');
    
    options.push({
      key,
      displayName: metadata.displayName,
      currentValue,
      requiresPersonSelection: needsPersonSelection,
      category: metadata.category,
      description: metadata.description,
      dataType: metadata.dataType,
      advisable: metadata.advisable,
      availablePeople: needsPersonSelection ? params.people : undefined,
    });
  }
  
  return options.sort((a, b) => {
    // Sort by category, then by advisable, then by name
    if (a.category !== b.category) {
      const categoryOrder = { 'person': 0, 'household': 1, 'flexible': 2, 'non-changeable': 3 };
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    if (a.advisable !== b.advisable) {
      return a.advisable ? -1 : 1; // Advisable parameters first
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Gets parameters grouped by category for organized UI display
 */
export function getParametersByCategory(params: UserParameters): {
  personSpecific: ParameterChangeOption[];
  household: ParameterChangeOption[];
  flexible: ParameterChangeOption[];
} {
  const allParams = getChangeableParameters(params);
  
  return {
    personSpecific: allParams.filter(p => p.category === 'person'),
    household: allParams.filter(p => p.category === 'household'),
    flexible: allParams.filter(p => p.category === 'flexible'),
  };
}

/**
 * Gets only the most commonly advised parameters for simplified UI
 */
export function getRecommendedParameters(params: UserParameters): ParameterChangeOption[] {
  return getChangeableParameters(params).filter(p => p.advisable);
}

/**
 * Gets current value of a parameter from UserParameters
 */
function getCurrentParameterValue(params: UserParameters, parameterKey: string): any {
  // Handle nested parameter access
  const keys = parameterKey.split('.');
  let value: any = params;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Validates a parameter change value
 */
export function validateParameterValue(
  parameterKey: string, 
  value: any, 
  params: UserParameters
): { isValid: boolean; error?: string } {
  const metadata = PARAMETER_METADATA[parameterKey];
  if (!metadata) {
    return { isValid: false, error: `Unknown parameter: ${parameterKey}` };
  }
  
  // Type validation
  switch (metadata.dataType) {
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { isValid: false, error: `${metadata.displayName} must be a valid number` };
      }
      // Additional number validations
      if (parameterKey.includes('Rate') && (value < 0 || value > 100)) {
        return { isValid: false, error: `${metadata.displayName} must be between 0 and 100` };
      }
      if (parameterKey.includes('Age') && (value < 0 || value > 120)) {
        return { isValid: false, error: `${metadata.displayName} must be between 0 and 120` };
      }
      if (parameterKey.includes('Amount') || parameterKey.includes('Balance') || parameterKey.includes('Salary')) {
        if (value < 0) {
          return { isValid: false, error: `${metadata.displayName} cannot be negative` };
        }
      }
      break;
      
    case 'string':
      if (typeof value !== 'string') {
        return { isValid: false, error: `${metadata.displayName} must be text` };
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { isValid: false, error: `${metadata.displayName} must be true or false` };
      }
      break;
  }
  
  return { isValid: true };
}

/**
 * Creates a parameter change object for a specific person
 */
export function createPersonParameterChange(
  parameterKey: string,
  value: any,
  personId: string,
  params: UserParameters
): { parameterChanges?: Partial<UserParameters>; personSpecificChanges?: any; error?: string } {
  const metadata = PARAMETER_METADATA[parameterKey];
  if (!metadata) {
    return { error: `Unknown parameter: ${parameterKey}` };
  }
  
  // Validate the value
  const validation = validateParameterValue(parameterKey, value, params);
  if (!validation.isValid) {
    return { error: validation.error };
  }
  
  // Check if person exists (only for person-specific parameters)
  if (metadata.category === 'person' && personId) {
    const person = params.people?.find(p => p.id === personId);
    if (!person) {
      return { error: `Person with ID ${personId} not found` };
    }
  } else if (metadata.category === 'person' && !personId) {
    return { error: `Person ID required for ${metadata.displayName}` };
  }
  
  // Handle person-specific parameters
  if (metadata.category === 'person') {
    switch (parameterKey) {
      case 'annualSalary': {
        const person = params.people?.find(p => p.id === personId);
        return {
          personSpecificChanges: {
            personId,
            changes: {
              incomeSources: [{
                action: 'update',
                id: person?.incomeSources[0]?.id,
                data: { amount: value }
              }]
            }
          }
        };
      }
        
      case 'superContributionRate': {
        const person = params.people?.find(p => p.id === personId);
        return {
          personSpecificChanges: {
            personId,
            changes: {
              superAccounts: [{
                action: 'update',
                id: person?.superAccounts[0]?.id,
                data: { contributionRate: value }
              }]
            }
          }
        };
      }
        
      case 'retirementAge':
        return {
          personSpecificChanges: {
            personId,
            changes: {
              personUpdates: { retirementAge: value }
            }
          }
        };
        
      default:
        // For other person-specific parameters, update the legacy fields
        return {
          parameterChanges: { [parameterKey]: value }
        };
    }
  }
  
  // Handle household-level parameters (no person ID needed)
  return {
    parameterChanges: { [parameterKey]: value }
  };
}

/**
 * Gets a user-friendly description of what a parameter change will do
 */
export function getParameterChangeDescription(
  parameterKey: string,
  currentValue: any,
  newValue: any,
  personName?: string
): string {
  const metadata = PARAMETER_METADATA[parameterKey];
  if (!metadata) {
    return `Change ${parameterKey} from ${currentValue} to ${newValue}`;
  }
  
  const target = personName ? `${personName}'s` : 'household';
  const displayName = metadata.displayName.toLowerCase();
  
  // Format values for display
  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      if (parameterKey.includes('Rate')) {
        return `${value}%`;
      }
      if (parameterKey.includes('Amount') || parameterKey.includes('Balance') || parameterKey.includes('Salary')) {
        return `$${value.toLocaleString()}`;
      }
      if (parameterKey.includes('Age')) {
        return `${value} years old`;
      }
      return value.toLocaleString();
    }
    return String(value);
  };
  
  return `Change ${target} ${displayName} from ${formatValue(currentValue)} to ${formatValue(newValue)}`;
}

/**
 * Interface for parameter change form data
 */
export interface ParameterChangeFormData {
  /** Selected parameter key */
  parameterKey: string;
  /** New value for the parameter */
  newValue: any;
  /** Selected person ID (if person-specific parameter) */
  personId?: string;
  /** Transition date when change takes effect */
  transitionDate: Date;
  /** Optional label for the transition */
  label?: string;
}

/**
 * Validates a complete parameter change form
 */
export function validateParameterChangeForm(
  formData: ParameterChangeFormData,
  params: UserParameters
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate parameter exists and is changeable
  const metadata = PARAMETER_METADATA[formData.parameterKey];
  if (!metadata) {
    errors.push(`Unknown parameter: ${formData.parameterKey}`);
    return { isValid: false, errors };
  }
  
  if (!metadata.isChangeable) {
    errors.push(`Parameter '${metadata.displayName}' cannot be changed`);
  }
  
  // Validate person selection for person-specific parameters
  if (metadata.requiresPersonSelection && params.householdMode === 'couple') {
    if (!formData.personId) {
      errors.push(`Person selection required for ${metadata.displayName}`);
    } else {
      const person = params.people?.find(p => p.id === formData.personId);
      if (!person) {
        errors.push(`Selected person not found`);
      }
    }
  }
  
  // Validate the new value
  const valueValidation = validateParameterValue(formData.parameterKey, formData.newValue, params);
  if (!valueValidation.isValid) {
    errors.push(valueValidation.error!);
  }
  
  // Validate transition date
  if (!formData.transitionDate || formData.transitionDate <= new Date()) {
    errors.push('Transition date must be in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}