/**
 * Code Generator - Framework-specific code generation and packaging
 * 
 * Handles code generation, validation, auto-fix, and final packaging
 */

import { FrameworkBuilderFactory } from '../_shared/frameworkBuilders/FrameworkBuilderFactory.ts';
import { autoFixGeneratedCode } from './autoFixIntegration.ts';
import { 
  storeFileDependency 
} from '../_shared/fileDependencies.ts';
import { 
  storeSuccessfulPattern 
} from '../_shared/patternLearning.ts';
import { 
  logGenerationSuccess
} from './productionMonitoring.ts';

/**
 * Generate, validate, and package code using framework-specific builders
 */
export async function generateAndPackageCode(ctx: {
  request: string;
  conversationId: string;
  userId: string;
  framework: string;
  projectId: string | null;
  analysis: any;
  conversationContext: any;
  dependencies: any[];
  platformSupabase: any;
  userSupabase: any;
  broadcast: (event: string, data: any) => Promise<void>;
  updateJobProgress: (progress: number, currentStep: string, phaseName: string, phases?: any[]) => Promise<void>;
  startTime: number;
}): Promise<string> {
  
  const { 
    request,
    conversationId,
    userId,
    framework,
    projectId,
    analysis,
    conversationContext,
    dependencies,
    platformSupabase,
    userSupabase,
    broadcast,
    updateJobProgress,
    startTime
  } = ctx;

  // Check for retry
  const isRetry = conversationContext.isRetry || false;
  const resumeProgress = conversationContext.resumeFromProgress || 0;
  const existingFiles = conversationContext.existingFiles || [];

  // Step 4: Generate code
  let generatedCode;
  let frameworkBuilder;
  
  if (isRetry && resumeProgress >= 75 && existingFiles.length > 0) {
    console.log('⏭️ Skipping code generation - using existing files');
    generatedCode = {
      files: existingFiles,
      framework: framework,
      description: 'Resumed from existing files'
    };
    frameworkBuilder = FrameworkBuilderFactory.createBuilder(framework);
  } else {
    await broadcast('generation:coding', { 
      status: 'generating', 
      message: '🔧 Initializing framework-specific builder...', 
      progress: 50 
    });

    console.log(`🏗️ Using ${framework} builder for code generation`);
    
    frameworkBuilder = FrameworkBuilderFactory.createBuilder(framework);
    
    const buildContext = {
      request,
      analysis,
      projectId,
      userId,
      conversationId,
      platformSupabase,
      userSupabase,
      broadcast
    };

    const frameworkAnalysis = await frameworkBuilder.analyzeRequest(buildContext);
    Object.assign(analysis, frameworkAnalysis);

    const generationPlan = await frameworkBuilder.planGeneration(buildContext, analysis);
    console.log(`📋 Generation plan: ${generationPlan.strategy} strategy with ${generationPlan.estimatedFiles || generationPlan.files?.length || 0} files`);

    generatedCode = await frameworkBuilder.generateFiles(buildContext, generationPlan);
    console.log(`✅ Generated ${generatedCode.files.length} files using ${generatedCode.framework} builder`);

    await updateJobProgress(75, 'Code generation complete', 'Building Components', []);
  }

  // Step 5: Validate files
  await broadcast('generation:validating', { 
    status: 'validating', 
    message: '🔍 Validating generated files...', 
    progress: 70,
    currentOperation: 'Checking code quality and dependencies',
    phaseName: 'Validating Code'
  });

  const validationResult = await frameworkBuilder.validateFiles(generatedCode.files);
  
  if (!validationResult.success) {
    console.warn('⚠️ Validation warnings:', validationResult.warnings);
    console.error('❌ Validation errors:', validationResult.errors);
    
    await broadcast('generation:validation_warning', {
      status: 'warning',
      message: `⚠️ ${validationResult.errors.length} validation issue(s) found`,
      progress: 72,
      details: {
        errors: validationResult.errors,
        warnings: validationResult.warnings
      }
    });
  } else if (validationResult.warnings.length > 0) {
    console.warn('⚠️ Validation passed with warnings:', validationResult.warnings);
    
    await broadcast('generation:validation_success', {
      status: 'success',
      message: `✅ Validation passed (${validationResult.warnings.length} warnings)`,
      progress: 75,
      details: {
        warnings: validationResult.warnings
      }
    });
  } else {
    console.log('✅ Validation passed with no issues');
    
    await broadcast('generation:validation_success', {
      status: 'success',
      message: '✅ All validation checks passed',
      progress: 75
    });
  }

  // Step 6: AUTO-FIX
  interface AutoFixResult {
    success: boolean;
    fixed: boolean;
    totalAttempts: number;
    fixedErrorTypes: string[];
    errors: string[];
    warnings: string[];
    fixedFiles?: Array<{ path: string; content: string; language: string; imports?: string[] }>;
  }
  
  let autoFixResult: AutoFixResult = { 
    success: true, 
    fixed: false, 
    totalAttempts: 0, 
    fixedErrorTypes: [], 
    errors: [], 
    warnings: [] 
  };
  
  if (validationResult.errors.length > 0) {
    await broadcast('generation:auto_fixing', { 
      status: 'auto_fixing', 
      message: '🔧 Auto-fixing validation errors...', 
      progress: 76 
    });

    autoFixResult = await autoFixGeneratedCode(
      generatedCode.files, 
      platformSupabase, 
      userId,
      broadcast
    );

    if (autoFixResult.success && autoFixResult.fixed && autoFixResult.fixedFiles) {
      console.log(`✅ Auto-fixed ${autoFixResult.fixedErrorTypes.length} error types in ${autoFixResult.totalAttempts} attempts`);
      generatedCode.files = autoFixResult.fixedFiles.map((f: any) => ({
        path: f.path,
        content: f.content,
        language: f.language === 'typescript' ? 'typescript' : f.language,
        imports: f.imports || []
      }));
      
      await broadcast('generation:auto_fixed', {
        status: 'success',
        message: `✅ Auto-fixed ${autoFixResult.fixedErrorTypes.join(', ')}`,
        progress: 80,
        details: {
          attempts: autoFixResult.totalAttempts,
          fixedTypes: autoFixResult.fixedErrorTypes
        }
      });
    }
  }

  await updateJobProgress(90, 'Auto-fix complete', 'Finalizing Project', []);

  await broadcast('generation:finalizing', { 
    status: 'finalizing', 
    message: '📦 Packaging your project...', 
    progress: 85,
    currentOperation: 'Finalizing project structure and assets',
    phaseName: 'Finalizing Project'
  });

  // Step 7: Package output
  const packagedCode = await frameworkBuilder.packageOutput(generatedCode);

  // Step 8: Update project
  if (projectId && generatedCode.files.length > 0) {
    console.log(`📝 Saving project ${projectId} with ${generatedCode.files.length} ${framework} files`);
    
    const { error: updateError } = await platformSupabase
      .from('projects')
      .update({
        html_code: packagedCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
    
    if (updateError) {
      console.error('❌ Failed to update project:', updateError);
      throw new Error(`Failed to save project: ${updateError.message}`);
    } else {
      console.log('✅ Project updated successfully');
    }

    // Save individual files to project_files table
    if (generatedCode.files.length > 1) {
      console.log(`💾 Saving ${generatedCode.files.length} individual files...`);
      
      for (const file of generatedCode.files) {
        const { error: fileError } = await platformSupabase
          .from('project_files')
          .upsert({
            project_id: projectId,
            file_path: file.path,
            file_content: file.content,
            file_type: file.language || 'typescript',
            created_by: userId
          });
        
        if (fileError) {
          console.error(`⚠️ Failed to save file ${file.path}:`, fileError);
        }
      }
      
      console.log('✅ All files saved to project_files table');
    }

    // Update job as complete
    await platformSupabase
      .from('ai_generation_jobs')
      .update({ 
        status: 'complete',
        output_data: { files: generatedCode.files },
        completed_at: new Date().toISOString(),
        progress: 100
      })
      .eq('project_id', projectId)
      .eq('user_id', userId);

    // Restore original project title
    const { data: project } = await platformSupabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();
    
    if (project) {
      const originalTitle = project.title
        .replace(/\[Generating\.\.\.\]/g, '')
        .replace(/- (Analyzing|Building|Creating|Setting up|Finalizing).*$/g, '')
        .trim();
      
      await platformSupabase
        .from('projects')
        .update({ title: originalTitle })
        .eq('id', projectId);
      
      console.log(`✅ Restored original title: "${originalTitle}"`);
    }
  }

  // Step 9: Log success metrics
  const generationTime = Date.now() - startTime;
  await logGenerationSuccess(platformSupabase, {
    userId,
    projectId: projectId || 'unknown',
    userRequest: request,
    framework,
    fileCount: generatedCode.files.length,
    duration: generationTime
  });

  // Step 10: Final operations (non-blocking)
  await Promise.allSettled([
    // Store successful pattern
    storeSuccessfulPattern(platformSupabase, {
      category: 'code_generation',
      patternName: `${framework}_${analysis.intent}`,
      useCase: request.substring(0, 100),
      codeTemplate: packagedCode.substring(0, 1000),
      context: {
        framework,
        fileCount: generatedCode.files.length,
        validationPassed: validationResult.success,
        autoFixed: autoFixResult.fixed
      }
    }),
    
    // Store file dependencies
    ...generatedCode.files.flatMap((file: any) =>
      file.imports?.map((imp: string) =>
        storeFileDependency(platformSupabase, {
          conversationId,
          componentName: file.path,
          componentType: file.language || 'typescript',
          dependsOn: [imp],
          usedBy: [],
          complexityScore: file.content.length / 100,
          criticality: 'medium'
        })
      ) || []
    )
  ]);

  return packagedCode;
}
