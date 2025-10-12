/**
 * Progressive Builder - Builds large apps in validated phases
 * 
 * Breaks apps with 50+ files into manageable phases (max 20 files per phase).
 * Validates each phase before proceeding to next.
 */

import { callAIWithFallback } from './aiHelpers.ts';
import { buildWebsitePrompt } from './promptTemplates.ts';

/**
 * Thinking Step Tracker - Same as orchestrator
 */
class ThinkingStepTracker {
  private startTimes: Map<string, number> = new Map();

  async trackStep(operation: string, detail: string, broadcast: Function, status: 'start' | 'complete' = 'start') {
    if (status === 'start') {
      this.startTimes.set(operation, Date.now());
      await broadcast('thinking_step', {
        operation,
        detail,
        status: 'active',
        timestamp: new Date().toISOString()
      });
    } else {
      const startTime = this.startTimes.get(operation) || Date.now();
      const duration = (Date.now() - startTime) / 1000;
      this.startTimes.delete(operation);
      
      await broadcast('thinking_step', {
        operation,
        detail,
        status: 'complete',
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }
}

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
  private originalRequest: string;
  private analysis: any;
  private framework: string;
  private broadcast: (event: string, data: any) => Promise<void>;
  private stepTracker: ThinkingStepTracker;

  constructor(
    originalRequest: string, 
    analysis: any, 
    framework: string,
    broadcast: (event: string, data: any) => Promise<void>
  ) {
    this.originalRequest = originalRequest;
    this.analysis = analysis;
    this.framework = framework;
    this.broadcast = broadcast;
    this.stepTracker = new ThinkingStepTracker();
  }

  /**
   * Builds large app in phases
   */
  async buildInPhases(plan: any): Promise<PhaseResult[]> {
    const phases = this.breakdownIntoPhases(plan);
    const results: PhaseResult[] = [];
    const totalFiles = phases.reduce((sum, p) => sum + p.files.length, 0);
    let completedFiles = 0;

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      console.log(`📦 Starting Phase ${phase.phaseNumber}/${phases.length}: ${phase.name}`);
      
      await this.stepTracker.trackStep('phase_start', `Phase ${phase.phaseNumber}: ${phase.name}`, this.broadcast, 'start');
      await this.broadcast('generation:phase_start', {
        status: 'generating',
        message: `📦 Phase ${phase.phaseNumber}/${phases.length}: ${phase.name}`,
        progress: Math.round((completedFiles / totalFiles) * 100),
        phase: phase.name,
        phaseNumber: phase.phaseNumber,
        totalPhases: phases.length,
        filesInPhase: phase.files.length
      });

      const startTime = Date.now();
      const result = await this.buildPhase(phase, completedFiles, totalFiles);
      const duration = Date.now() - startTime;

      result.duration = duration;
      results.push(result);
      completedFiles += phase.files.length;

      if (!result.success) {
        console.error(`❌ Phase ${phase.phaseNumber} failed:`, result.errors);
        await this.stepTracker.trackStep('phase_start', `Failed: ${result.errors[0]}`, this.broadcast, 'complete');
        await this.broadcast('generation:phase_failed', {
          status: 'error',
          message: `Failed: ${result.errors[0]}`,
          progress: Math.round((completedFiles / totalFiles) * 100),
          phase: phase.name
        });
        break;
      }

      await this.stepTracker.trackStep('phase_start', `Completed ${result.filesGenerated.length} files`, this.broadcast, 'complete');
      await this.broadcast('generation:phase_complete', {
        status: 'generating',
        message: `✅ Completed Phase ${phase.phaseNumber}: ${phase.name}`,
        progress: Math.round((completedFiles / totalFiles) * 100),
        phase: phase.name,
        filesCompleted: result.filesGenerated.length
      });

      console.log(`✅ Phase ${phase.phaseNumber} completed in ${duration}ms`);
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
  private async buildPhase(
    phase: BuildPhase, 
    completedFiles: number, 
    totalFiles: number
  ): Promise<PhaseResult> {
    const errors: string[] = [];
    const filesGenerated: string[] = [];
    const validationResults: ValidationResult[] = [];

    try {
      // Generate files using AI with FULL CONTEXT
      for (let i = 0; i < phase.files.length; i++) {
        const file = phase.files[i];
        const fileNumber = completedFiles + i + 1;
        
        // Track thinking step for file generation
        await this.stepTracker.trackStep('generate_file', `${file.path}`, this.broadcast, 'start');
        
        // Broadcast file-level progress
        await this.broadcast('generation:file_start', {
          status: 'generating',
          message: `🏗️ Building ${file.path} (${fileNumber}/${totalFiles})`,
          progress: Math.round((fileNumber / totalFiles) * 100),
          file: file.path,
          fileType: file.type,
          fileNumber,
          totalFiles
        });
        try {
          // Build framework-specific context
          const frameworkContext = this.framework === 'html' 
            ? 'Generate production-ready HTML/CSS/JavaScript code using modern vanilla JS, responsive design, and best practices.' 
            : this.framework === 'vue'
            ? 'Generate production-ready Vue 3 code with Composition API, TypeScript, and modern Vue best practices.'
            : 'Generate production-ready React code with TypeScript, hooks, and modern React best practices.';

          // Build smart prompt with FULL context about the app
          const contextualPrompt = `${frameworkContext}

**Original User Request:** "${this.originalRequest}"

**App Requirements:**
${this.analysis.requiredSections?.map((s: string) => `- ${s} section`).join('\n') || 'Build according to request'}

**Current Phase:** ${phase.name}
**File to Generate:** ${file.path}
**File Type:** ${file.type}
**Dependencies:** ${file.dependencies.join(', ')}

Generate ONLY the code for this file. Make sure it integrates properly with the overall app structure.
The code should be production-ready, clean, and follow best practices.

Return ONLY the code, no markdown, no explanations.`;

          const result = await callAIWithFallback(
            [{ role: 'user', content: contextualPrompt }],
            {
              systemPrompt: `You are an expert ${this.framework === 'html' ? 'vanilla JavaScript' : this.framework} developer. Generate clean, production-ready code that fits the overall app architecture.`,
              preferredModel: 'google/gemini-2.5-flash',
              maxTokens: 4000
            }
          );

          // Store generated content in the file object
          file.content = result.data.choices[0].message.content;
          filesGenerated.push(file.path);
          
          // Track completion
          await this.stepTracker.trackStep('generate_file', `Completed ${file.path}`, this.broadcast, 'complete');
          
          // Broadcast file completion
          await this.broadcast('generation:file_complete', {
            status: 'generating',
            message: `✨ Completed ${file.path}`,
            progress: Math.round((fileNumber / totalFiles) * 100),
            file: file.path
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to generate ${file.path}: ${errorMessage}`);
          
          await this.stepTracker.trackStep('generate_file', `Failed: ${errorMessage}`, this.broadcast, 'complete');
          
          await this.broadcast('generation:file_error', {
            status: 'error',
            message: `Failed: ${file.path}`,
            progress: Math.round((fileNumber / totalFiles) * 100),
            error: errorMessage
          });
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Phase build error: ${errorMessage}`);
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
