// Research Engine Validation - Main Exports
// Centralized exports for all validation utilities

export {
  Stage0Validators,
  Stage1Validators,
  SchemaValidator,
  type ValidationResult
} from './schema-validators';

import type { ValidationResult } from './schema-validators';

// Re-export common validation patterns
export type ValidationError = {
  field: string;
  message: string;
  value?: unknown;
};

export type ValidationErrorMap = Record<string, ValidationError[]>;

/**
 * Convert AJV validation result to structured error map
 */
export function toValidationErrorMap(result: ValidationResult): ValidationErrorMap | null {
  if (result.valid || !result.errors) {
    return null;
  }

  const errorMap: ValidationErrorMap = {};
  result.errors.forEach((errorMessage: string) => {
    const [field, message] = errorMessage.split(': ', 2);
    const cleanField = field.replace(/^\//, ''); // Remove leading slash
    
    if (!errorMap[cleanField]) {
      errorMap[cleanField] = [];
    }
    
    errorMap[cleanField].push({
      field: cleanField,
      message: message || 'Validation error'
    });
  });

  return errorMap;
}
