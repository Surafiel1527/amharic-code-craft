/**
 * Code Validation Utilities
 * HTML, CSS, and JavaScript validation helpers
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  type: 'html' | 'react' | 'css' | 'javascript';
}

export interface HTMLValidationResult extends ValidationResult {
  type: 'html';
  hasHtml: boolean;
  hasHead: boolean;
  hasBody: boolean;
  unclosedTags: string[];
}

export interface WebsiteValidation {
  isValid: boolean;
  html: HTMLValidationResult;
  css?: ValidationResult;
  js?: ValidationResult;
  overallErrors: string[];
  overallWarnings: string[];
}

/**
 * Validate HTML content
 */
export function validateHTML(html: string): HTMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unclosedTags: string[] = [];
  
  const hasHtml = /<html[^>]*>/i.test(html);
  const hasHead = /<head[^>]*>/i.test(html);
  const hasBody = /<body[^>]*>/i.test(html);
  
  if (!hasHtml) warnings.push('Missing <html> tag');
  if (!hasHead) warnings.push('Missing <head> tag');
  if (!hasBody) errors.push('Missing <body> tag - required');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    type: 'html',
    hasHtml,
    hasHead,
    hasBody,
    unclosedTags
  };
}

/**
 * Validate complete website structure
 */
export function validateWebsite(files: Array<{ path: string; content: string }>): WebsiteValidation {
  const results: WebsiteValidation = {
    isValid: true,
    html: validateHTML(''),
    overallErrors: [],
    overallWarnings: []
  };
  
  for (const file of files) {
    if (file.path.endsWith('.html')) {
      results.html = validateHTML(file.content);
      if (!results.html.isValid) {
        results.isValid = false;
      }
    }
  }
  
  results.overallErrors.push(...results.html.errors);
  results.overallWarnings.push(...results.html.warnings);
  
  return results;
}
