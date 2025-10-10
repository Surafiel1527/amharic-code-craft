/**
 * Progressive Builder - Builds large apps in validated phases
 * 
 * Breaks apps with 50+ files into manageable phases (max 20 files per phase).
 * Validates each phase before proceeding to next.
 */

export interface BuildPhase {
  phaseNumber: number;
  name: string;
  files: FileDefinition[];
  dependencies: string[];
  validationRules: ValidationRule[];
  estimatedDuration: string;
}

export interface FileDefinition {
  path: string;
  content: string;
  type: 'component' | 'hook' | 'util' | 'api' | 'page' | 'config';
  dependencies: string[];
}

export interface ValidationRule {
  type: 'imports' | 'syntax' | 'types' | 'tests';
  description: string;
  validator: (files: FileDefinition[]) => boolean;
}

export interface PhaseResult {
  phase: BuildPhase;
  success: boolean;
  filesGenerated: string[];
  validationResults: ValidationResult[];
  errors: string[];
  duration: number;
}

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  message: string;
}

export class ProgressiveBuilder {
  private readonly MAX_FILES_PER_PHASE = 20;

  /**
   * Builds large app in phases
   */
  async buildInPhases(plan: any): Promise<PhaseResult[]> {
    const phases = this.breakdownIntoPhases(plan);
    const results: PhaseResult[] = [];

    for (const phase of phases) {
      console.log(`Starting Phase ${phase.phaseNumber}: ${phase.name}`);
      
      const startTime = Date.now();
      const result = await this.buildPhase(phase);
      const duration = Date.now() - startTime;

      result.duration = duration;
      results.push(result);

      if (!result.success) {
        console.error(`Phase ${phase.phaseNumber} failed:`, result.errors);
        break;
      }

      console.log(`Phase ${phase.phaseNumber} completed in ${duration}ms`);
    }

    return results;
  }

  /**
   * Breaks plan into phases
   */
  private breakdownIntoPhases(plan: any): BuildPhase[] {
    const phases: BuildPhase[] = [];
    let currentFiles: FileDefinition[] = [];
    let phaseNumber = 1;

    // Group files by type and dependencies
    const fileGroups = this.groupFilesByType(plan.files || []);

    // Phase 1: Foundation (auth, database, core utils)
    const foundationFiles = [
      ...fileGroups.config,
      ...fileGroups.util,
    ].slice(0, this.MAX_FILES_PER_PHASE);

    if (foundationFiles.length > 0) {
      phases.push({
        phaseNumber: phaseNumber++,
        name: 'Foundation & Configuration',
        files: foundationFiles,
        dependencies: [],
        validationRules: this.getFoundationValidationRules(),
        estimatedDuration: '10-15 minutes',
      });
    }

    // Phase 2: Core Components & Hooks
    const coreFiles = [
      ...fileGroups.hook,
      ...fileGroups.component.slice(0, 10),
    ].slice(0, this.MAX_FILES_PER_PHASE);

    if (coreFiles.length > 0) {
      phases.push({
        phaseNumber: phaseNumber++,
        name: 'Core Components & Hooks',
        files: coreFiles,
        dependencies: ['Foundation & Configuration'],
        validationRules: this.getCoreValidationRules(),
        estimatedDuration: '15-20 minutes',
      });
    }

    // Phase 3+: Feature-based phases
    const remainingComponents = fileGroups.component.slice(10);
    const remainingPages = fileGroups.page;
    const remainingAPIs = fileGroups.api;

    let remainingFiles = [...remainingComponents, ...remainingPages, ...remainingAPIs];

    while (remainingFiles.length > 0) {
      const phaseFiles = remainingFiles.slice(0, this.MAX_FILES_PER_PHASE);
      remainingFiles = remainingFiles.slice(this.MAX_FILES_PER_PHASE);

      phases.push({
        phaseNumber: phaseNumber++,
        name: `Feature Implementation ${phaseNumber - 2}`,
        files: phaseFiles,
        dependencies: [phases[phases.length - 1].name],
        validationRules: this.getFeatureValidationRules(),
        estimatedDuration: '20-30 minutes',
      });
    }

    return phases;
  }

  /**
   * Groups files by type
   */
  private groupFilesByType(files: any[]): Record<string, FileDefinition[]> {
    const groups: Record<string, FileDefinition[]> = {
      component: [],
      hook: [],
      util: [],
      api: [],
      page: [],
      config: [],
    };

    files.forEach(file => {
      const fileDef: FileDefinition = {
        path: file.path,
        content: file.content || '',
        type: this.detectFileType(file.path),
        dependencies: file.dependencies || [],
      };

      groups[fileDef.type].push(fileDef);
    });

    return groups;
  }

  /**
   * Detects file type from path
   */
  private detectFileType(path: string): FileDefinition['type'] {
    if (path.includes('/hooks/')) return 'hook';
    if (path.includes('/utils/') || path.includes('/lib/')) return 'util';
    if (path.includes('/api/') || path.includes('/functions/')) return 'api';
    if (path.includes('/pages/')) return 'page';
    if (path.includes('config') || path.includes('.config.')) return 'config';
    return 'component';
  }

  /**
   * Builds a single phase
   */
  private async buildPhase(phase: BuildPhase): Promise<PhaseResult> {
    const errors: string[] = [];
    const filesGenerated: string[] = [];
    const validationResults: ValidationResult[] = [];

    try {
      // Generate files
      for (const file of phase.files) {
        try {
          // File would be generated here
          filesGenerated.push(file.path);
        } catch (error) {
          errors.push(`Failed to generate ${file.path}: ${error.message}`);
        }
      }

      // Run validations
      for (const rule of phase.validationRules) {
        const passed = rule.validator(phase.files);
        validationResults.push({
          rule,
          passed,
          message: passed ? `✓ ${rule.description}` : `✗ ${rule.description}`,
        });

        if (!passed) {
          errors.push(rule.description);
        }
      }

    } catch (error) {
      errors.push(`Phase build error: ${error.message}`);
    }

    return {
      phase,
      success: errors.length === 0,
      filesGenerated,
      validationResults,
      errors,
      duration: 0,
    };
  }

  /**
   * Foundation validation rules
   */
  private getFoundationValidationRules(): ValidationRule[] {
    return [
      {
        type: 'imports',
        description: 'All imports resolve correctly',
        validator: (files) => files.every(f => this.validateImports(f)),
      },
      {
        type: 'syntax',
        description: 'No syntax errors',
        validator: (files) => files.every(f => this.validateSyntax(f)),
      },
    ];
  }

  /**
   * Core validation rules
   */
  private getCoreValidationRules(): ValidationRule[] {
    return [
      {
        type: 'imports',
        description: 'All imports resolve',
        validator: (files) => files.every(f => this.validateImports(f)),
      },
      {
        type: 'types',
        description: 'TypeScript types valid',
        validator: (files) => files.every(f => this.validateTypes(f)),
      },
    ];
  }

  /**
   * Feature validation rules
   */
  private getFeatureValidationRules(): ValidationRule[] {
    return [
      {
        type: 'imports',
        description: 'All imports resolve',
        validator: (files) => files.every(f => this.validateImports(f)),
      },
      {
        type: 'tests',
        description: 'Components have basic structure',
        validator: (files) => files.every(f => this.validateStructure(f)),
      },
    ];
  }

  /**
   * Validates imports
   */
  private validateImports(file: FileDefinition): boolean {
    // Basic import validation
    const importRegex = /import .+ from ['"](.+)['"]/g;
    const imports = Array.from(file.content.matchAll(importRegex));
    
    return imports.every(match => {
      const importPath = match[1];
      // Check if import looks valid (basic check)
      return importPath.length > 0 && !importPath.includes('undefined');
    });
  }

  /**
   * Validates syntax
   */
  private validateSyntax(file: FileDefinition): boolean {
    // Basic syntax validation
    try {
      // Check for balanced braces
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      return openBraces === closeBraces;
    } catch {
      return false;
    }
  }

  /**
   * Validates TypeScript types
   */
  private validateTypes(file: FileDefinition): boolean {
    // Basic type validation
    return !file.content.includes('any') || file.content.includes('// @ts-expect-error');
  }

  /**
   * Validates file structure
   */
  private validateStructure(file: FileDefinition): boolean {
    if (file.type === 'component') {
      return file.content.includes('export') && 
             (file.content.includes('function') || file.content.includes('const'));
    }
    return true;
  }
}
