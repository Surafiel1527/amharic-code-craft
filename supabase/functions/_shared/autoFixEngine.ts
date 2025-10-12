/**
 * Enterprise Auto-Fix Engine
 * Automatically detects and fixes code errors using AI with retry logic
 */

import { callAIWithFallback } from './aiHelpers.ts';
import { 
  validateReact, 
  validateJavaScript, 
  validateHTML,
  validateCSS,
  ReactValidationResult,
  ValidationResult,
  HTMLValidationResult 
} from './codeValidator.ts';

export interface CodeFile {
  path: string;
  content: string;
  language: 'typescript' | 'javascript' | 'html' | 'css' | 'json';
}

export interface FixAttempt {
  attemptNumber: number;
  errorType: string;
  errorDetails: string[];
  fixApplied: boolean;
  fixDescription?: string;
  timestamp: string;
}

export interface AutoFixResult {
  success: boolean;
  fixed: boolean;
  originalFiles: CodeFile[];
  fixedFiles: CodeFile[];
  errors: string[];
  warnings: string[];
  attempts: FixAttempt[];
  totalAttempts: number;
  fixedErrorTypes: string[];
}

/**
 * Main auto-fix function - validates and fixes code automatically
 */
export async function autoFixCode(
  files: CodeFile[],
  maxAttempts: number = 3
): Promise<AutoFixResult> {
  
  console.log(`🔧 AUTO-FIX ENGINE: Starting with ${files.length} files (max ${maxAttempts} attempts)`);
  
  const result: AutoFixResult = {
    success: false,
    fixed: false,
    originalFiles: [...files],
    fixedFiles: [...files],
    errors: [],
    warnings: [],
    attempts: [],
    totalAttempts: 0,
    fixedErrorTypes: []
  };

  let currentFiles = [...files];
  let attemptNumber = 0;

  while (attemptNumber < maxAttempts) {
    attemptNumber++;
    result.totalAttempts = attemptNumber;
    
    console.log(`📊 Attempt ${attemptNumber}/${maxAttempts}: Validating ${currentFiles.length} files...`);
    
    // Step 1: Validate all files
    const validation = validateAllFiles(currentFiles);
    
    if (validation.isValid) {
      console.log(`✅ Validation passed on attempt ${attemptNumber}!`);
      result.success = true;
      result.fixedFiles = currentFiles;
      result.warnings = validation.warnings;
      return result;
    }

    // Step 2: Collect all errors
    const allErrors = [
      ...validation.syntaxErrors,
      ...validation.importErrors,
      ...validation.typeErrors,
      ...validation.structureErrors
    ];

    console.log(`⚠️ Found ${allErrors.length} errors to fix`);
    result.errors = allErrors;

    // Step 3: Attempt to fix errors
    const attempt: FixAttempt = {
      attemptNumber,
      errorType: detectErrorType(allErrors),
      errorDetails: allErrors,
      fixApplied: false,
      timestamp: new Date().toISOString()
    };

    try {
      // CRITICAL FIX: Try deterministic fixes FIRST (before AI)
      console.log('🔧 Attempting deterministic fixes first...');
      const deterministicFixed = applyAggressiveFixes(currentFiles, allErrors);
      const deterministicWorked = deterministicFixed.some((f, i) => 
        f.content !== currentFiles[i].content
      );
      
      if (deterministicWorked) {
        console.log(`✅ Deterministic fixes applied in attempt ${attemptNumber}`);
        currentFiles = deterministicFixed;
        result.fixed = true;
        result.fixedErrorTypes.push('deterministic_' + attempt.errorType);
        attempt.fixApplied = true;
        attempt.fixDescription = `Fixed ${allErrors.length} ${attempt.errorType} errors deterministically`;
      } else {
        // If deterministic fixes didn't work, try AI
        console.log('🤖 Deterministic fixes insufficient, trying AI...');
        
        // Fix each file with errors using AI
        const fixPromises = currentFiles.map(async (file) => {
          const fileErrors = getFileErrors(file, validation);
          
          if (fileErrors.length === 0) {
            return file; // No errors in this file
          }

          console.log(`🔨 AI fixing ${fileErrors.length} errors in ${file.path}`);
          
          // Use AI to fix the code
          const fixed = await fixCodeWithAI(file, fileErrors);
          return fixed || file; // Return original if fix failed
        });

        const fixedFiles = await Promise.all(fixPromises);
        
        // Check if any files were actually fixed
        const wasFixed = fixedFiles.some((fixed, i) => 
          fixed.content !== currentFiles[i].content
        );

        if (wasFixed) {
          console.log(`✅ AI fixes applied in attempt ${attemptNumber}`);
          currentFiles = fixedFiles;
          result.fixed = true;
          result.fixedErrorTypes.push('ai_' + attempt.errorType);
          attempt.fixApplied = true;
          attempt.fixDescription = `Fixed ${allErrors.length} ${attempt.errorType} errors with AI`;
        } else {
          console.log(`❌ No fixes could be applied in attempt ${attemptNumber}`);
          attempt.fixApplied = false;
        }
      }

    } catch (error) {
      console.error(`❌ Fix attempt ${attemptNumber} failed:`, error);
      attempt.fixApplied = false;
    }

    result.attempts.push(attempt);
  }

  result.fixedFiles = currentFiles;
  
  // Final validation
  const finalValidation = validateAllFiles(currentFiles);
  if (finalValidation.isValid) {
    result.success = true;
    result.warnings = finalValidation.warnings;
    console.log(`✅ Code fixed after ${attemptNumber} attempts`);
  } else {
    result.success = false;
    result.errors = [
      ...finalValidation.syntaxErrors,
      ...finalValidation.importErrors,
      ...finalValidation.typeErrors,
      ...finalValidation.structureErrors
    ];
    console.log(`❌ Code still has errors after ${attemptNumber} attempts`);
  }

  return result;
}

/**
 * Apply aggressive fallback fixes when normal fixing fails
 */
function applyAggressiveFixes(
  files: CodeFile[],
  errors: string[]
): CodeFile[] {
  const errorText = errors.join(' ').toLowerCase();
  
  return files.map(file => {
    let content = file.content;
    
    // Fix CSS unbalanced braces by auto-balancing
    if (file.language === 'css' && errorText.includes('brace')) {
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      if (openBraces > closeBraces) {
        // Add missing closing braces
        content += '\n' + '}'.repeat(openBraces - closeBraces);
        console.log(`🔧 Added ${openBraces - closeBraces} missing closing braces to ${file.path}`);
      } else if (closeBraces > openBraces) {
        // Remove extra closing braces from end
        const toRemove = closeBraces - openBraces;
        for (let i = 0; i < toRemove; i++) {
          content = content.replace(/\}\s*$/, '');
        }
        console.log(`🔧 Removed ${toRemove} extra closing braces from ${file.path}`);
      }
    }
    
    // Fix HTML unclosed tags
    if (file.language === 'html' && errorText.includes('unclosed')) {
      const unclosedTags = ['div', 'span', 'p', 'section', 'main', 'nav', 'header', 'footer'];
      unclosedTags.forEach(tag => {
        const openCount = (content.match(new RegExp(`<${tag}[^>]*>`, 'g')) || []).length;
        const closeCount = (content.match(new RegExp(`</${tag}>`, 'g')) || []).length;
        if (openCount > closeCount) {
          content += '\n' + `</${tag}>`.repeat(openCount - closeCount);
          console.log(`🔧 Closed ${openCount - closeCount} unclosed <${tag}> tags`);
        }
      });
    }
    
    return { ...file, content };
  });
}

/**
 * Validate all files and return comprehensive error report
 */
interface ValidationReport {
  isValid: boolean;
  syntaxErrors: string[];
  importErrors: string[];
  typeErrors: string[];
  structureErrors: string[];
  warnings: string[];
  fileValidations: Map<string, ValidationResult | HTMLValidationResult | ReactValidationResult>;
}

function validateAllFiles(files: CodeFile[]): ValidationReport {
  const report: ValidationReport = {
    isValid: true,
    syntaxErrors: [],
    importErrors: [],
    typeErrors: [],
    structureErrors: [],
    warnings: [],
    fileValidations: new Map()
  };

  for (const file of files) {
    let validation: ValidationResult | HTMLValidationResult | ReactValidationResult;

    // Validate based on file type
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      validation = validateReact(file.content, file.path);
      const reactValidation = validation as ReactValidationResult;
      
      if (reactValidation.missingImports.length > 0) {
        report.importErrors.push(...reactValidation.missingImports.map(imp => 
          `${file.path}: Missing import - ${imp}`
        ));
      }
      if (reactValidation.syntaxErrors.length > 0) {
        report.syntaxErrors.push(...reactValidation.syntaxErrors.map(err => 
          `${file.path}: ${err}`
        ));
      }
    } else if (file.path.endsWith('.html')) {
      validation = validateHTML(file.content);
      const htmlValidation = validation as HTMLValidationResult;
      
      if (htmlValidation.unclosedTags.length > 0) {
        report.syntaxErrors.push(...htmlValidation.unclosedTags.map(tag => 
          `${file.path}: Unclosed tag <${tag}>`
        ));
      }
    } else if (file.path.endsWith('.css')) {
      validation = validateCSS(file.content);
    } else if (file.path.endsWith('.js') || file.path.endsWith('.ts')) {
      validation = validateJavaScript(file.content);
    } else if (file.path.endsWith('.json')) {
      validation = validateJSON(file.content);
    } else {
      continue; // Skip unknown file types
    }

    report.fileValidations.set(file.path, validation);
    
    if (!validation.isValid) {
      report.isValid = false;
      report.syntaxErrors.push(...validation.errors.map(e => `${file.path}: ${e}`));
    }
    
    report.warnings.push(...validation.warnings.map(w => `${file.path}: ${w}`));
  }

  return report;
}

/**
 * Validate JSON content
 */
function validateJSON(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    JSON.parse(content);
  } catch (e) {
    const error = e as Error;
    errors.push(`Invalid JSON: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    type: 'javascript'
  };
}

/**
 * Get errors specific to a file
 */
function getFileErrors(file: CodeFile, validation: ValidationReport): string[] {
  const errors: string[] = [];
  
  for (const error of [
    ...validation.syntaxErrors,
    ...validation.importErrors,
    ...validation.typeErrors,
    ...validation.structureErrors
  ]) {
    if (error.startsWith(file.path)) {
      errors.push(error.replace(`${file.path}: `, ''));
    }
  }
  
  return errors;
}

/**
 * Detect the primary error type
 */
function detectErrorType(errors: string[]): string {
  const errorText = errors.join(' ').toLowerCase();
  
  if (errorText.includes('json') || errorText.includes('parse')) return 'json_parse';
  if (errorText.includes('import') || errorText.includes('missing')) return 'import';
  if (errorText.includes('unclosed') || errorText.includes('unbalanced')) return 'syntax';
  if (errorText.includes('type') || errorText.includes('typescript')) return 'type';
  if (errorText.includes('jsx') || errorText.includes('tag')) return 'jsx';
  
  return 'general';
}

/**
 * Fix code using AI
 */
async function fixCodeWithAI(
  file: CodeFile,
  errors: string[]
): Promise<CodeFile | null> {
  
  console.log(`🤖 Using AI to fix ${file.path}...`);
  
  const prompt = `You are a code fixing expert. Fix the following code errors.

FILE: ${file.path}
ERRORS FOUND:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

ORIGINAL CODE:
\`\`\`${file.language}
${file.content}
\`\`\`

INSTRUCTIONS:
1. Fix ALL listed errors
2. Preserve the original functionality
3. Do NOT add new features
4. Return ONLY the fixed code, no explanations
5. Maintain the same structure and style

FIXED CODE:`;

  try {
    const result = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are a code fixing assistant. Return only valid, fixed code without explanations.',
        preferredModel: 'google/gemini-2.5-flash',
        maxTokens: 4000
      }
    );

    let fixedCode = result.data.choices[0].message.content;
    
    // Extract code from markdown if present
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;
    const match = fixedCode.match(codeBlockRegex);
    if (match) {
      fixedCode = match[1].trim();
    }

    // Validate the fix
    const validation = file.path.endsWith('.tsx') || file.path.endsWith('.jsx')
      ? validateReact(fixedCode, file.path)
      : file.path.endsWith('.html')
      ? validateHTML(fixedCode)
      : validateJavaScript(fixedCode);

    if (validation.isValid || validation.errors.length < errors.length) {
      console.log(`✅ AI successfully fixed ${file.path}`);
      return {
        ...file,
        content: fixedCode
      };
    } else {
      console.warn(`⚠️ AI fix for ${file.path} still has errors`);
      return null;
    }

  } catch (error) {
    console.error(`❌ AI fix failed for ${file.path}:`, error);
    return null;
  }
}

/**
 * Quick fix for common errors without AI
 */
export function quickFixCommonErrors(content: string, fileType: string): string {
  let fixed = content;

  // Fix 1: Missing semicolons in JS/TS
  if (fileType === 'javascript' || fileType === 'typescript') {
    // Add semicolons after return statements
    fixed = fixed.replace(/return\s+([^;\n]+)(?!\s*;)/g, 'return $1;');
  }

  // Fix 2: Unclosed strings
  const lines = fixed.split('\n');
  const fixedLines = lines.map(line => {
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0 && !line.trim().startsWith('//')) {
      return line + "'";
    }
    if (doubleQuotes % 2 !== 0 && !line.trim().startsWith('//')) {
      return line + '"';
    }
    return line;
  });
  fixed = fixedLines.join('\n');

  // Fix 3: Missing React imports
  if (fileType === 'typescript' && (fixed.includes('useState') || fixed.includes('useEffect'))) {
    if (!fixed.includes("import") || !fixed.includes("'react'")) {
      fixed = "import React, { useState, useEffect } from 'react';\n\n" + fixed;
    }
  }

  // Fix 4: Fix common JSON errors
  if (fileType === 'json') {
    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  }

  return fixed;
}
