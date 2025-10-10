/**
 * React Builder - React/TypeScript applications
 * 
 * Handles generation of React applications using the ProgressiveBuilder
 * for complex projects and simple generation for smaller ones
 */

import { IFrameworkBuilder, GeneratedCode, BuildContext, ValidationResult } from './IFrameworkBuilder.ts';
import { ProgressiveBuilder } from '../progressiveBuilder.ts';
import { callAIWithFallback } from '../aiHelpers.ts';
import { buildWebsitePrompt } from '../promptTemplates.ts';

export class ReactBuilder implements IFrameworkBuilder {
  getFrameworkName(): string {
    return 'react';
  }

  async analyzeRequest(context: BuildContext): Promise<any> {
    const { analysis } = context;
    
    // Determine build strategy based on complexity
    const estimatedFileCount = analysis.estimatedFiles || 
                              analysis._orchestrationPlan?.totalFiles || 
                              (analysis.backendRequirements?.databaseTables?.length || 0) * 3;

    return {
      ...analysis,
      buildStrategy: estimatedFileCount >= 5 ? 'progressive' : 'simple',
      estimatedFileCount,
      needsProgressiveBuilder: estimatedFileCount >= 5 && analysis._implementationPlan
    };
  }

  async planGeneration(context: BuildContext, analysis: any): Promise<any> {
    // Plan is either from implementation planner or simple structure
    if (analysis.needsProgressiveBuilder && analysis._implementationPlan) {
      return {
        framework: 'react',
        strategy: 'progressive',
        plan: analysis._implementationPlan,
        estimatedFiles: analysis.estimatedFileCount
      };
    }

    return {
      framework: 'react',
      strategy: 'simple',
      files: [{
        path: 'src/App.tsx',
        type: 'component',
        purpose: 'Main application component'
      }]
    };
  }

  async generateFiles(context: BuildContext, plan: any): Promise<GeneratedCode> {
    const { request, analysis, broadcast } = context;

    if (plan.strategy === 'progressive') {
      return this.generateProgressively(context, plan);
    } else {
      return this.generateSimple(context, plan);
    }
  }

  private async generateProgressively(context: BuildContext, plan: any): Promise<GeneratedCode> {
    const { request, analysis, broadcast } = context;

    await broadcast('generation:react_progressive', {
      status: 'progressive',
      message: `⚛️ Building React app with ${plan.estimatedFiles} files in validated phases...`,
      progress: 52
    });

    // Use ProgressiveBuilder for complex React apps
    const progressiveBuilder = new ProgressiveBuilder(
      request,
      analysis,
      'react',
      broadcast
    );

    const phaseResults = await progressiveBuilder.buildInPhases(analysis._implementationPlan);

    const allFiles = phaseResults
      .flatMap(r => r.phase.files.map(file => ({
        path: file.path,
        content: file.content,
        language: 'typescript',
        imports: file.dependencies
      })));

    await broadcast('generation:progressive_complete', {
      status: 'success',
      message: `✅ Built ${phaseResults.length} phases with ${allFiles.length} files`,
      progress: 65,
      details: {
        phases: phaseResults.length,
        files: allFiles.length,
        framework: 'react'
      }
    });

    return {
      files: allFiles,
      description: `Generated ${allFiles.length} React/TypeScript files in ${phaseResults.length} phases`,
      framework: 'react'
    };
  }

  private async generateSimple(context: BuildContext, plan: any): Promise<GeneratedCode> {
    const { request, analysis, broadcast } = context;

    await broadcast('generation:react_simple', {
      status: 'generating',
      message: '⚛️ Generating React component...',
      progress: 60
    });

    const prompt = `${buildWebsitePrompt(request, analysis)}\n\nGenerate as a React component with TypeScript.`;

    const result = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are an expert React developer. Generate clean, production-ready React code with TypeScript, hooks, and modern React best practices.',
        preferredModel: 'google/gemini-2.5-flash',
        maxTokens: 8000
      }
    );

    const content = result.data.choices[0].message.content;

    await broadcast('generation:react_complete', {
      status: 'success',
      message: '✅ React component generated',
      progress: 80
    });

    return {
      files: [{
        path: 'src/App.tsx',
        content,
        language: 'typescript',
        imports: ['react']
      }],
      description: 'Generated React/TypeScript component',
      framework: 'react'
    };
  }

  async validateFiles(files: GeneratedCode['files']): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      // React-specific validation
      
      // Check for import statements
      const hasReactImport = file.content.includes('import') && file.content.includes('react');
      if (!hasReactImport && file.path.includes('.tsx')) {
        warnings.push(`${file.path}: Missing React import`);
      }

      // Check for TypeScript issues (basic)
      if (file.language === 'typescript') {
        const hasExplicitAny = file.content.match(/:\s*any(?!\w)/g);
        if (hasExplicitAny && hasExplicitAny.length > 2) {
          warnings.push(`${file.path}: Excessive use of 'any' type (${hasExplicitAny.length} occurrences)`);
        }
      }

      // Check for unbalanced braces
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`${file.path}: Unbalanced braces`);
      }

      // Check for component export
      if (file.path.includes('component') || file.path.includes('Component')) {
        if (!file.content.includes('export default') && !file.content.includes('export function') && !file.content.includes('export const')) {
          warnings.push(`${file.path}: Component might not be exported`);
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings
    };
  }

  async packageOutput(generatedCode: GeneratedCode): Promise<string> {
    // Package React files for storage
    return generatedCode.files
      .map(f => `// File: ${f.path}\n${f.content}`)
      .join('\n\n');
  }
}
