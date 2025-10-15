/**
 * Awash Code Validation Service
 * Validates generated code against workspace reality
 */

import { AwashPlatformContext } from './awashPlatformContext';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'missing_file' | 'invalid_import' | 'syntax_error' | 'routing_error' | 'dependency_missing';
  message: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
}

export interface ValidationWarning {
  type: 'deprecated' | 'performance' | 'security' | 'best_practice';
  message: string;
  file?: string;
}

export interface GeneratedCode {
  filePath: string;
  content: string;
  language: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'json';
}

/**
 * Validates generated code against Awash workspace
 */
export class AwashCodeValidator {
  private static instance: AwashCodeValidator;
  
  private constructor() {}
  
  static getInstance(): AwashCodeValidator {
    if (!this.instance) {
      this.instance = new AwashCodeValidator();
    }
    return this.instance;
  }
  
  /**
   * Validate generated code
   */
  async validate(
    code: GeneratedCode[],
    context: AwashPlatformContext
  ): Promise<ValidationResult> {
    console.log('🔍 Validating generated code against Awash workspace...');
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    for (const file of code) {
      // Validate file path
      const pathErrors = this.validateFilePath(file.filePath, context);
      errors.push(...pathErrors);
      
      // Validate imports
      const importErrors = this.validateImports(file.content, context);
      errors.push(...importErrors);
      
      // Validate syntax
      const syntaxErrors = this.validateSyntax(file.content, file.language);
      errors.push(...syntaxErrors);
      
      // Check best practices
      const practiceWarnings = this.checkBestPractices(file.content, file.language);
      warnings.push(...practiceWarnings);
    }
    
    // Add suggestions based on validation
    if (errors.length === 0 && warnings.length === 0) {
      suggestions.push('✅ Code looks good! Ready to implement.');
    } else if (errors.some(e => e.autoFixable)) {
      suggestions.push('💡 Some errors can be auto-fixed. Should I fix them?');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  /**
   * Validate file path
   */
  private validateFilePath(
    filePath: string,
    context: AwashPlatformContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check if path follows conventions
    if (!filePath.startsWith('src/')) {
      errors.push({
        type: 'invalid_import',
        message: `File path should start with 'src/': ${filePath}`,
        file: filePath,
        autoFixable: true
      });
    }
    
    // Check if directory exists in workspace
    const directory = filePath.split('/').slice(0, -1).join('/');
    const dirExists = context.workspace.fileTree.some(f => 
      f.path.startsWith(directory)
    );
    
    if (!dirExists && directory !== 'src') {
      errors.push({
        type: 'missing_file',
        message: `Directory doesn't exist: ${directory}. Common directories: src/components/, src/hooks/, src/services/`,
        file: filePath,
        autoFixable: false
      });
    }
    
    return errors;
  }
  
  /**
   * Validate imports
   */
  private validateImports(
    content: string,
    context: AwashPlatformContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const importRegex = /import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g;
    const matches = content.matchAll(importRegex);
    
    for (const match of matches) {
      const importPath = match[1];
      
      // Skip node_modules imports
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        // Check if package is installed
        if (!context.workspace.installedPackages.some(pkg => 
          importPath.startsWith(pkg)
        )) {
          errors.push({
            type: 'dependency_missing',
            message: `Package not installed: ${importPath}. Installed: ${context.workspace.installedPackages.join(', ')}`,
            autoFixable: false
          });
        }
        continue;
      }
      
      // Resolve path aliases
      let resolvedPath = importPath;
      if (importPath.startsWith('@/')) {
        resolvedPath = importPath.replace('@/', 'src/');
      } else if (importPath.startsWith('.')) {
        // Would need file context to resolve relative imports
        continue;
      }
      
      // Add common extensions
      const possiblePaths = [
        resolvedPath,
        `${resolvedPath}.ts`,
        `${resolvedPath}.tsx`,
        `${resolvedPath}/index.ts`,
        `${resolvedPath}/index.tsx`
      ];
      
      // Check if file exists
      const fileExists = possiblePaths.some(path =>
        context.workspace.fileTree.some(f => f.path === path)
      );
      
      if (!fileExists && !resolvedPath.includes('supabase')) {
        errors.push({
          type: 'invalid_import',
          message: `Import path not found: ${importPath}. Check file tree.`,
          autoFixable: false
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Validate syntax
   */
  private validateSyntax(
    content: string,
    language: GeneratedCode['language']
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Basic syntax checks
    if (language === 'tsx' || language === 'jsx') {
      // Check for unclosed JSX tags
      const openTags = (content.match(/<[A-Z][a-zA-Z0-9]*[^/>]*>/g) || []).length;
      const closeTags = (content.match(/<\/[A-Z][a-zA-Z0-9]*>/g) || []).length;
      
      if (openTags !== closeTags) {
        errors.push({
          type: 'syntax_error',
          message: 'Possible unclosed JSX tags detected',
          autoFixable: false
        });
      }
      
      // Check for missing React import (if JSX is used)
      if (content.includes('<') && !content.includes('import React')) {
        errors.push({
          type: 'syntax_error',
          message: 'JSX used but React not imported',
          autoFixable: true
        });
      }
    }
    
    // Check for balanced braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push({
        type: 'syntax_error',
        message: 'Unbalanced braces detected',
        autoFixable: false
      });
    }
    
    return errors;
  }
  
  /**
   * Check best practices
   */
  private checkBestPractices(
    content: string,
    language: GeneratedCode['language']
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check for console.log in production code
    if (content.includes('console.log')) {
      warnings.push({
        type: 'best_practice',
        message: 'Remove console.log statements before production'
      });
    }
    
    // Check for any type usage
    if (content.includes(': any')) {
      warnings.push({
        type: 'best_practice',
        message: 'Avoid using "any" type - use specific types instead'
      });
    }
    
    // Check for inline styles
    if (language === 'tsx' && content.includes('style={{')) {
      warnings.push({
        type: 'performance',
        message: 'Consider using Tailwind classes instead of inline styles'
      });
    }
    
    return warnings;
  }
  
  /**
   * Auto-fix common errors
   */
  async autoFix(
    code: GeneratedCode,
    errors: ValidationError[]
  ): Promise<GeneratedCode> {
    let fixedContent = code.content;
    
    for (const error of errors) {
      if (!error.autoFixable) continue;
      
      switch (error.type) {
        case 'invalid_import':
          // Fix src/ prefix
          if (!code.filePath.startsWith('src/')) {
            return {
              ...code,
              filePath: `src/${code.filePath}`
            };
          }
          break;
          
        case 'syntax_error':
          // Add React import
          if (error.message.includes('React not imported')) {
            fixedContent = `import React from 'react';\n${fixedContent}`;
          }
          break;
      }
    }
    
    return {
      ...code,
      content: fixedContent
    };
  }
}

// Export singleton
export const awashValidator = AwashCodeValidator.getInstance();
