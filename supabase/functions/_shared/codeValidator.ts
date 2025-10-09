/**
 * Code Validation & Quality Assurance System
 * Validates HTML, CSS, JS, and React code before delivery
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

export interface ReactValidationResult extends ValidationResult {
  type: 'react';
  hasExport: boolean;
  hasImports: boolean;
  missingImports: string[];
  syntaxErrors: string[];
}

/**
 * Validate HTML content
 */
export function validateHTML(html: string): HTMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unclosedTags: string[] = [];

  // Check for basic HTML structure
  const hasHtml = /<html[^>]*>/i.test(html);
  const hasHead = /<head[^>]*>/i.test(html);
  const hasBody = /<body[^>]*>/i.test(html);

  if (!hasHtml) warnings.push('Missing <html> tag');
  if (!hasHead) warnings.push('Missing <head> tag');
  if (!hasBody) errors.push('Missing <body> tag - required');

  // Check for unclosed tags
  const tagPattern = /<(\w+)[^>]*>/g;
  const closePattern = /<\/(\w+)>/g;
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
  
  const openTags: { [key: string]: number } = {};
  const closeTags: { [key: string]: number } = {};

  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    if (!selfClosing.includes(tag)) {
      openTags[tag] = (openTags[tag] || 0) + 1;
    }
  }

  while ((match = closePattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    closeTags[tag] = (closeTags[tag] || 0) + 1;
  }

  for (const tag in openTags) {
    if ((closeTags[tag] || 0) < openTags[tag]) {
      unclosedTags.push(tag);
      errors.push(`Unclosed <${tag}> tag (${openTags[tag]} opened, ${closeTags[tag] || 0} closed)`);
    }
  }

  // Check for common syntax errors
  if (html.includes('<script>alert(') && html.includes('credentials')) {
    errors.push('SECURITY: Never use alert() to display credentials');
  }

  // Check for malformed attributes
  const malformedAttr = /<\w+[^>]*\s\w+=[^"'\s>]/g;
  if (malformedAttr.test(html)) {
    warnings.push('Potential malformed attributes (missing quotes)');
  }

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
 * Validate CSS content
 */
export function validateCSS(css: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unclosed braces
  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces (${openBraces} opened, ${closeBraces} closed)`);
  }

  // Check for unclosed strings
  const lines = css.split('\n');
  lines.forEach((line, i) => {
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      warnings.push(`Line ${i + 1}: Potential unclosed string`);
    }
  });

  // Check for invalid properties (common typos)
  const invalidProps = /\s(color|background|border|margin|padding)\s*:\s*[^;{]*\s[^;{]*(?!;|{)/g;
  if (invalidProps.test(css)) {
    warnings.push('Potential invalid CSS property values');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    type: 'css'
  };
}

/**
 * Validate JavaScript content
 */
export function validateJavaScript(js: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unclosed braces/brackets/parens
  const braces = { '{': 0, '}': 0, '[': 0, ']': 0, '(': 0, ')': 0 };
  
  for (const char of js) {
    if (char in braces) braces[char as keyof typeof braces]++;
  }

  if (braces['{'] !== braces['}']) {
    errors.push(`Unbalanced braces (${braces['{']} opened, ${braces['}']} closed)`);
  }
  if (braces['['] !== braces[']']) {
    errors.push(`Unbalanced brackets (${braces['[']} opened, ${braces[']']} closed)`);
  }
  if (braces['('] !== braces[')']) {
    errors.push(`Unbalanced parentheses (${braces['(']} opened, ${braces[')']} closed)`);
  }

  // Check for common syntax errors
  if (/function\s+\w+\s*\([^)]*\)\s*;/.test(js)) {
    errors.push('Function declaration with semicolon after parameters');
  }

  // Check for unterminated strings
  const lines = js.split('\n');
  lines.forEach((line, i) => {
    // Skip comments
    if (line.trim().startsWith('//')) return;
    
    const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
    const backticks = (line.match(/(?<!\\)`/g) || []).length;
    
    if (singleQuotes % 2 !== 0) warnings.push(`Line ${i + 1}: Unclosed single quote`);
    if (doubleQuotes % 2 !== 0) warnings.push(`Line ${i + 1}: Unclosed double quote`);
    if (backticks % 2 !== 0) warnings.push(`Line ${i + 1}: Unclosed template literal`);
  });

  // Try basic syntax check
  try {
    new Function(js);
  } catch (e) {
    const err = e as Error;
    errors.push(`Syntax error: ${err.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    type: 'javascript'
  };
}

/**
 * Validate React/JSX component
 */
export function validateReact(code: string, fileName: string = 'Component.tsx'): ReactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingImports: string[] = [];
  const syntaxErrors: string[] = [];

  // Check for export
  const hasExport = /export\s+(default\s+)?/.test(code);
  if (!hasExport) {
    errors.push('Component must have an export statement');
  }

  // Check for imports
  const hasImports = /import\s+/.test(code);
  
  // Check for React import if using JSX
  if (/<[A-Z]\w*/.test(code) && !code.includes('import') && !code.includes('React')) {
    warnings.push('JSX used but no React import found');
  }

  // Check for common missing imports
  if (code.includes('useState') && !code.includes("'react'")) {
    missingImports.push('useState from react');
  }
  if (code.includes('useEffect') && !code.includes("'react'")) {
    missingImports.push('useEffect from react');
  }
  if (/className=["'][^"']*\b(flex|grid|p-|m-|bg-|text-)/.test(code) && !hasImports) {
    warnings.push('Tailwind classes used - ensure Tailwind is configured');
  }

  // Check for JSX syntax errors
  const jsxTagPattern = /<(\w+)[^>]*>/g;
  const jsxClosePattern = /<\/(\w+)>/g;
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];

  const openTags: { [key: string]: number } = {};
  const closeTags: { [key: string]: number } = {};

  let match;
  while ((match = jsxTagPattern.exec(code)) !== null) {
    const tag = match[1];
    // Skip self-closing or HTML elements
    if (!selfClosing.includes(tag.toLowerCase()) && !/\/>/.test(match[0])) {
      openTags[tag] = (openTags[tag] || 0) + 1;
    }
  }

  while ((match = jsxClosePattern.exec(code)) !== null) {
    const tag = match[1];
    closeTags[tag] = (closeTags[tag] || 0) + 1;
  }

  for (const tag in openTags) {
    if ((closeTags[tag] || 0) < openTags[tag]) {
      syntaxErrors.push(`Unclosed JSX tag: <${tag}>`);
    }
  }

  // Check for TypeScript errors (basic)
  if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) {
    // Check for missing type annotations in function params (warning only)
    if (/function\s+\w+\s*\([\w\s,]+\)\s*{/.test(code)) {
      warnings.push('Consider adding TypeScript type annotations');
    }
  }

  // Check for unbalanced braces
  const braces = { '{': 0, '}': 0 };
  for (const char of code) {
    if (char === '{') braces['{']++;
    if (char === '}') braces['}']++;
  }
  
  if (braces['{'] !== braces['}']) {
    errors.push(`Unbalanced braces in component (${braces['{']} opened, ${braces['}']} closed)`);
  }

  return {
    isValid: errors.length === 0 && syntaxErrors.length === 0,
    errors: [...errors, ...syntaxErrors],
    warnings,
    type: 'react',
    hasExport,
    hasImports,
    missingImports,
    syntaxErrors
  };
}

/**
 * Validate a complete HTML website (HTML + CSS + JS)
 */
export interface WebsiteValidation {
  isValid: boolean;
  html: HTMLValidationResult;
  css?: ValidationResult;
  js?: ValidationResult;
  overallErrors: string[];
  overallWarnings: string[];
}

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
      if (!results.html.isValid) results.isValid = false;
    } else if (file.path.endsWith('.css')) {
      results.css = validateCSS(file.content);
      if (!results.css.isValid) results.isValid = false;
    } else if (file.path.endsWith('.js')) {
      results.js = validateJavaScript(file.content);
      if (!results.js.isValid) results.isValid = false;
    }
  }

  // Collect all errors and warnings
  results.overallErrors.push(...results.html.errors);
  results.overallWarnings.push(...results.html.warnings);
  
  if (results.css) {
    results.overallErrors.push(...results.css.errors.map(e => `CSS: ${e}`));
    results.overallWarnings.push(...results.css.warnings.map(w => `CSS: ${w}`));
  }
  
  if (results.js) {
    results.overallErrors.push(...results.js.errors.map(e => `JS: ${e}`));
    results.overallWarnings.push(...results.js.warnings.map(w => `JS: ${w}`));
  }

  return results;
}

/**
 * Validate React component files
 */
export interface ReactProjectValidation {
  isValid: boolean;
  files: Array<{ path: string; validation: ReactValidationResult }>;
  overallErrors: string[];
  overallWarnings: string[];
}

export function validateReactProject(files: Array<{ path: string; code: string }>): ReactProjectValidation {
  const results: ReactProjectValidation = {
    isValid: true,
    files: [],
    overallErrors: [],
    overallWarnings: []
  };

  for (const file of files) {
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      const validation = validateReact(file.code, file.path);
      results.files.push({ path: file.path, validation });
      
      if (!validation.isValid) {
        results.isValid = false;
        results.overallErrors.push(...validation.errors.map(e => `${file.path}: ${e}`));
      }
      results.overallWarnings.push(...validation.warnings.map(w => `${file.path}: ${w}`));
    }
  }

  return results;
}
