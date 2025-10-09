/**
 * DEPRECATED: Use codeValidator.ts instead
 * This file is kept for backward compatibility
 * All validation logic has been moved to _shared/codeValidator.ts
 */

export { 
  validateHTML,
  validateWebsite,
  type ValidationResult,
  type HTMLValidationResult,
  type WebsiteValidation 
} from './codeValidator.ts';
