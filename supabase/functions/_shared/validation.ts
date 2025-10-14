/**
 * INPUT VALIDATION & SECURITY
 * Comprehensive validation utilities for all AGI inputs
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

/**
 * Validate SQL identifier (table name, column name, etc.)
 */
export function validateSqlIdentifier(identifier: string): ValidationResult<string> {
  if (!identifier || typeof identifier !== 'string') {
    return { success: false, error: 'Identifier is required and must be a string' };
  }

  // SQL identifiers: start with letter/underscore, contain only alphanumeric and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(identifier)) {
    return { 
      success: false, 
      error: 'Invalid SQL identifier. Must start with letter/underscore and contain only alphanumeric characters and underscores (max 63 chars)' 
    };
  }

  // Check for SQL reserved keywords
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TABLE', 'DATABASE'];
  if (sqlKeywords.includes(identifier.toUpperCase())) {
    return { success: false, error: 'Identifier cannot be a SQL reserved keyword' };
  }

  return { success: true, data: identifier };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult<string> {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'URL is required and must be a string' };
  }

  try {
    const parsed = new URL(url);
    
    // Only allow https and http
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return { success: false, error: 'URL must use http or https protocol' };
    }

    // Basic length check
    if (url.length > 2048) {
      return { success: false, error: 'URL too long (max 2048 characters)' };
    }

    return { success: true, data: url };
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate string with constraints
 */
export function validateString(
  value: string,
  options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    required?: boolean;
  } = {}
): ValidationResult<string> {
  const { minLength = 0, maxLength = 10000, pattern, required = true } = options;

  if (required && (!value || typeof value !== 'string')) {
    return { success: false, error: 'Value is required and must be a string' };
  }

  if (!value) {
    return { success: true, data: '' };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { success: false, error: `Value must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { success: false, error: `Value must not exceed ${maxLength} characters` };
  }

  if (pattern && !pattern.test(trimmed)) {
    return { success: false, error: 'Value does not match required pattern' };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate email
 */
export function validateEmail(email: string): ValidationResult<string> {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  const stringResult = validateString(email, { 
    maxLength: 255,
    pattern: emailPattern 
  });

  if (!stringResult.success) {
    return { success: false, error: 'Invalid email address' };
  }

  return stringResult;
}

/**
 * Validate UUID
 */
export function validateUuid(uuid: string): ValidationResult<string> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuid || !uuidPattern.test(uuid)) {
    return { success: false, error: 'Invalid UUID format' };
  }

  return { success: true, data: uuid.toLowerCase() };
}

/**
 * Validate API key format
 */
export function validateApiKey(key: string, prefix?: string): ValidationResult<string> {
  const result = validateString(key, { 
    minLength: 10,
    maxLength: 500 
  });

  if (!result.success) {
    return result;
  }

  if (prefix && !key.startsWith(prefix)) {
    return { success: false, error: `API key must start with ${prefix}` };
  }

  return result;
}

/**
 * Sanitize user input for logging
 */
export function sanitizeForLog(value: string, maxLength: number = 100): string {
  if (!value) return '';
  
  // Remove potential sensitive patterns
  const sanitized = value
    .replace(/\b(password|token|key|secret|api[_-]?key)[\s:=]+[^\s]+/gi, '[REDACTED]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .slice(0, maxLength);

  return sanitized + (value.length > maxLength ? '...' : '');
}

/**
 * Validate numeric value
 */
export function validateNumber(
  value: number,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult<number> {
  const { min, max, integer = false } = options;

  if (typeof value !== 'number' || isNaN(value)) {
    return { success: false, error: 'Value must be a valid number' };
  }

  if (integer && !Number.isInteger(value)) {
    return { success: false, error: 'Value must be an integer' };
  }

  if (min !== undefined && value < min) {
    return { success: false, error: `Value must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { success: false, error: `Value must not exceed ${max}` };
  }

  return { success: true, data: value };
}
