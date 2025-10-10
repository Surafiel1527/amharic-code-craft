/**
 * Phase Validator - Validates phase completion and readiness
 * 
 * Ensures each phase is complete before moving to next phase.
 */

import { Phase, Feature } from './featureOrchestrator.ts';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completionPercentage: number;
  nextSteps: string[];
}

export interface PhaseStatus {
  phase: Phase;
  completed: boolean;
  filesGenerated: number;
  filesExpected: number;
  featuresCompleted: string[];
  featuresRemaining: string[];
  issues: string[];
}

export class PhaseValidator {
  /**
   * Validates phase completion
   */
  validatePhase(
    phase: Phase,
    generatedFiles: string[],
    completedFeatures: Set<string>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    // Check feature completion
    phase.features.forEach(feature => {
      if (!completedFeatures.has(feature.id)) {
        errors.push(`Feature "${feature.name}" not completed`);
      }
    });

    // Validate file generation
    const expectedFiles = phase.filesCount;
    const actualFiles = generatedFiles.length;
    
    if (actualFiles < expectedFiles * 0.8) {
      errors.push(
        `Expected ~${expectedFiles} files but only ${actualFiles} generated`
      );
    } else if (actualFiles < expectedFiles) {
      warnings.push(
        `Generated ${actualFiles} files, expected ${expectedFiles}`
      );
    }

    // Check for critical files
    const criticalPatterns = [
      /auth|login|signup/i,
      /database|schema|migration/i,
      /api|endpoint|route/i,
    ];

    const hasCriticalFiles = criticalPatterns.some(pattern =>
      generatedFiles.some(file => pattern.test(file))
    );

    if (phase.phaseNumber === 1 && !hasCriticalFiles) {
      warnings.push('Phase 1 should include authentication or database files');
    }

    // Calculate completion
    const completionPercentage = Math.min(
      100,
      (actualFiles / expectedFiles) * 100
    );

    // Generate next steps
    if (errors.length === 0) {
      if (phase.phaseNumber < 10) {
        nextSteps.push(`Proceed to Phase ${phase.phaseNumber + 1}`);
      } else {
        nextSteps.push('All phases complete - run final validation');
      }
    } else {
      nextSteps.push('Fix errors before proceeding');
      errors.forEach(error => {
        nextSteps.push(`- ${error}`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completionPercentage,
      nextSteps,
    };
  }

  /**
   * Checks if phase is ready to start
   */
  isPhaseReady(
    phase: Phase,
    completedPhases: number[],
    availableAPIs: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    // Check previous phases completed
    if (phase.phaseNumber > 1) {
      const previousPhase = phase.phaseNumber - 1;
      if (!completedPhases.includes(previousPhase)) {
        errors.push(`Phase ${previousPhase} must be completed first`);
      }
    }

    // Check required APIs
    const requiredAPIs = phase.features
      .flatMap(f => f.requiredAPIs || [])
      .filter((api, index, self) => self.indexOf(api) === index);

    requiredAPIs.forEach(api => {
      if (!availableAPIs.includes(api)) {
        warnings.push(`API "${api}" credentials not configured`);
        nextSteps.push(`Configure ${api} API credentials`);
      }
    });

    // Check dependencies
    const allDependencies = new Set<string>();
    phase.features.forEach(feature => {
      feature.dependencies.forEach(dep => allDependencies.add(dep));
    });

    if (allDependencies.size > 0) {
      nextSteps.push(
        `Ensure dependencies are complete: ${Array.from(allDependencies).join(', ')}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completionPercentage: errors.length === 0 ? 100 : 0,
      nextSteps,
    };
  }

  /**
   * Gets phase status summary
   */
  getPhaseStatus(
    phase: Phase,
    generatedFiles: string[],
    completedFeatures: Set<string>
  ): PhaseStatus {
    const featuresCompleted = phase.features
      .filter(f => completedFeatures.has(f.id))
      .map(f => f.name);

    const featuresRemaining = phase.features
      .filter(f => !completedFeatures.has(f.id))
      .map(f => f.name);

    const validation = this.validatePhase(phase, generatedFiles, completedFeatures);

    return {
      phase,
      completed: validation.isValid && validation.completionPercentage >= 80,
      filesGenerated: generatedFiles.length,
      filesExpected: phase.filesCount,
      featuresCompleted,
      featuresRemaining,
      issues: [...validation.errors, ...validation.warnings],
    };
  }
}
