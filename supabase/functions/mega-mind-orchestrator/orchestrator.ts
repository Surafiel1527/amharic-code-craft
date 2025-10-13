/**
 * Orchestrator - Core AI orchestration logic
 * 
 * Handles AI calls, request analysis, planning, and enterprise features
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { callAIWithFallback, parseAIJsonResponse } from '../_shared/aiHelpers.ts';
import { 
  storeConversationTurn 
} from '../_shared/conversationMemory.ts';
import { 
  storeSuccessfulPattern, 
  findRelevantPatterns 
} from '../_shared/patternLearning.ts';
import { 
  setupDatabaseTables, 
  ensureAuthInfrastructure 
} from '../_shared/databaseHelpers.ts';
import { 
  buildAnalysisPrompt, 
  buildWebsitePrompt 
} from '../_shared/promptTemplates.ts';
import { analyzeContext, makeIntelligentDecision } from '../_shared/intelligenceEngine.ts';
import { 
  logGenerationSuccess,
} from './productionMonitoring.ts';
import { logDecision, reflectOnDecision, checkForCorrection } from '../_shared/agiIntegration.ts';
import { evolvePatterns, detectPatternCategory } from '../_shared/patternLearning.ts';
import { ThinkingStepTracker } from '../_shared/thinkingStepTracker.ts';

// Learning integration
import {
  applyLearnedFixes,
  recordGenerationOutcome,
  evolvePatternsAutonomously,
  getDynamicConfidenceThreshold
} from './learning-integration.ts';

// Enterprise modules
import { FeatureOrchestrator } from '../_shared/featureOrchestrator.ts';
import { FeatureDependencyGraph } from '../_shared/featureDependencyGraph.ts';
import { SchemaArchitect } from '../_shared/schemaArchitect.ts';

/**
 * Core processing pipeline with timeout protection
 */
export async function processRequest(ctx: {
  request: string;
  conversationId: string;
  userId: string;
  requestType: string;
  operationMode?: string; // 'generate' | 'modify'
  framework: string;
  projectId: string | null;
  conversationContext: any;
  projectMemory?: any; // 🆕 Cross-conversation memory
  dependencies: any[];
  platformSupabase: any;
  userSupabase: any;
  userSupabaseConnection: any;
  broadcast: (event: string, data: any) => Promise<void>;
}): Promise<any> {
  
  const { 
    request, 
    broadcast 
  } = ctx;

  // Timeout protection: maximum 5 minutes for generation
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Generation timeout: Process exceeded 5 minutes')), TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      executeGeneration({ ...ctx, startTime: Date.now() }),
      timeoutPromise
    ]);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('timeout')) {
      console.error('❌ Generation timeout after 5 minutes');
      await broadcast('generation:timeout', {
        status: 'error',
        message: '⏱️ Generation timed out after 5 minutes. Please try a simpler request or contact support.',
        progress: 0
      });
    }
    throw error;
  }
}

/**
 * Execute the actual generation process
 */
export async function executeGeneration(ctx: {
  request: string;
  conversationId: string;
  userId: string;
  requestType: string;
  operationMode?: string; // 'generate' | 'modify'
  framework: string;
  projectId: string | null;
  conversationContext: any;
  projectMemory?: any; // 🆕 Cross-conversation memory
  dependencies: any[];
  platformSupabase: any;
  userSupabase: any;
  userSupabaseConnection: any;
  broadcast: (event: string, data: any) => Promise<void>;
  startTime?: number;
}): Promise<any> {
  const { 
    request, 
    conversationId, 
    userId,
    operationMode = 'generate',
    framework,
    projectId, 
    conversationContext,
    projectMemory, // 🆕 Extract project memory
    platformSupabase,
    userSupabase,
    broadcast 
  } = ctx;
  
  // Check if in modify mode
  const isModifyMode = operationMode === 'modify' && projectId;
  
  // Track start time for metrics
  const startTime = ctx.startTime!;
  
  // Get or create job ID for tracking
  let jobId: string | null = null;
  if (projectId) {
    const { data: existingJob } = await platformSupabase
      .from('ai_generation_jobs')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    jobId = existingJob?.id || null;
  }
  
  // Initialize thinking step tracker with DB persistence
  const stepTracker = new ThinkingStepTracker(platformSupabase, jobId, projectId, conversationId);

  // Retry logic
  const isRetry = conversationContext.isRetry || false;
  const resumeProgress = conversationContext.resumeFromProgress || 0;
  const existingFiles = conversationContext.existingFiles || [];

  if (isRetry && resumeProgress > 0) {
    console.log(`🔄 RETRY MODE: Resuming from ${resumeProgress}% with ${existingFiles.length} existing files`);
    
    await broadcast('generation:retrying', {
      status: 'retrying',
      message: `🔄 Resuming generation from ${resumeProgress}%...`,
      progress: resumeProgress
    });
  }

  // Helper: Update job progress in database and project title
  const updateJobProgress = async (progress: number, currentStep: string, phaseName: string, phases: any[] = []) => {
    if (!projectId) return;
    
    try {
      await platformSupabase.from('ai_generation_jobs').update({
        progress,
        current_step: currentStep,
        phases,
        updated_at: new Date().toISOString()
      }).eq('project_id', projectId).eq('user_id', userId);

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
        
        const newTitle = `${originalTitle} - ${phaseName}`;
        
        await platformSupabase.from('projects').update({
          title: newTitle
        }).eq('id', projectId);
        
        console.log(`📝 Updated project title: "${newTitle}"`);
      }
    } catch (error) {
      console.error('⚠️ Failed to update job progress:', error);
    }
  };

  // Step 1: Analyze request
  if (!isRetry || resumeProgress < 25) {
    await stepTracker.trackStep('analyze_request', 'Reading and understanding your request', broadcast, 'start');
    await broadcast('generation:thinking', { 
      status: 'analyzing', 
      message: '🔍 Understanding your request...', 
      progress: 5,
      currentOperation: 'Analyzing requirements and planning architecture',
      phaseName: 'Analyzing Requirements'
    });
    
    await updateJobProgress(5, 'Analyzing requirements', 'Analyzing Requirements', []);

    console.log('🧠 Running Intelligence Engine analysis...');
    const contextAnalysis = await analyzeContext(
      platformSupabase as any,
      conversationId,
      userId,
      request,
      projectId || undefined
    );
    
    console.log('📊 Context Analysis:', {
      intent: contextAnalysis.userIntent,
      complexity: contextAnalysis.complexity,
      confidence: contextAnalysis.confidenceScore,
      contextQuality: contextAnalysis.contextQuality
    });

    (conversationContext as any)._contextAnalysis = contextAnalysis;
    
    // ✅ CRITICAL FIX: Load existing project files if projectId exists
    let existingProjectCode: any = null;
    if (projectId) {
      console.log(`🔍 Loading existing project files for project ${projectId}...`);
      const { data: projectData } = await platformSupabase
        .from('projects')
        .select('html_code, framework')
        .eq('id', projectId)
        .single();
      
      const { data: projectFiles } = await platformSupabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (projectData || projectFiles?.length) {
        existingProjectCode = {
          mainCode: projectData?.html_code,
          framework: projectData?.framework || framework,
          files: projectFiles || [],
          hasExistingCode: true
        };
        console.log(`✅ Loaded ${projectFiles?.length || 0} existing files from project`);
        (conversationContext as any)._existingProject = existingProjectCode;
      }
    }

    // Find relevant learned patterns before analysis
    console.log('🎯 Searching for relevant learned patterns...');
    const patternCategory = detectPatternCategory(request);
    const learnedPatterns = await findRelevantPatterns(platformSupabase, request, patternCategory);
    console.log(`📚 Found ${learnedPatterns.length} relevant patterns from past successes`);
    (conversationContext as any)._learnedPatterns = learnedPatterns;

    const analysis = await analyzeRequest(request, conversationContext, framework, broadcast, platformSupabase, projectMemory);
    
    // 🚨 CRITICAL SAFETY CHECK: Force modification mode when appropriate
    // Case 1: Explicit modify mode with existing project
    if (isModifyMode && existingProjectCode?.hasExistingCode) {
      console.log(`🔧 MODIFY MODE: Forcing modification for existing project`);
      console.log(`📁 Existing project has ${existingProjectCode.files?.length || 0} files`);
      
      // Force modification
      analysis.outputType = 'modification';
      analysis.isMetaRequest = false;
      
      await broadcast('generation:info', {
        status: 'modify_mode',
        message: '🔧 Modifying existing project',
        progress: 8
      });
    }
    // Case 2: Existing project detected but not in explicit modify mode (safety fallback)
    else if (existingProjectCode?.hasExistingCode && 
        (analysis.outputType === 'html-website' || analysis.outputType === 'react-app')) {
      console.log(`🚨 SAFETY OVERRIDE: Forcing outputType from "${analysis.outputType}" to "modification" because existing project detected!`);
      console.log(`📁 Existing project has ${existingProjectCode.files?.length || 0} files`);
      
      // Force modification
      analysis.outputType = 'modification';
      analysis.isMetaRequest = false;
      
      // Log warning
      await broadcast('generation:warning', {
        status: 'corrected',
        message: '✅ Detected existing project - will modify instead of creating new',
        progress: 8
      });
    }
    
    await stepTracker.trackStep('analyze_request', `Classified as ${analysis.outputType || 'code generation'}`, broadcast, 'complete');
    
    console.log('📊 Analysis complete:', JSON.stringify(analysis, null, 2));
    console.log('🤖 AI Analysis:', {
      isMetaRequest: analysis.isMetaRequest,
      outputType: analysis.outputType,
      confidence: analysis.confidence || 0.5,
      backendNeeds: analysis.backendRequirements
    });

    // AGI: Log decision for learning
    await stepTracker.trackStep('make_decision', 'Evaluating confidence and approach', broadcast, 'start');
    const decisionId = await logDecision(analysis, {
      userId,
      conversationId,
      jobId: projectId || undefined,
      userRequest: request,
      processingTimeMs: Date.now() - startTime
    });
    (conversationContext as any)._decisionId = decisionId;

    // ============ CONFIDENCE GATE SYSTEM ============
    // Use weighted average instead of multiplication to avoid being too strict
    // 60% weight on context analysis, 40% on AI analysis
    const finalConfidence = (contextAnalysis.confidenceScore * 0.6) + ((analysis.confidence || 0.5) * 0.4);
    await stepTracker.trackStep('make_decision', `Confidence: ${(finalConfidence * 100).toFixed(0)}%`, broadcast, 'complete');
    console.log(`🎯 Final confidence: ${(finalConfidence * 100).toFixed(0)}%`);
    console.log(`   - Context: ${(contextAnalysis.confidenceScore * 100).toFixed(0)}%, AI: ${((analysis.confidence || 0.5) * 100).toFixed(0)}%`);

    // Helper: Generate contextual questions based on what's unclear
    const generateContextualQuestions = (): string[] => {
      const questions: string[] = [];
      
      // Check what's unclear about the request
      if (request.length < 50) {
        questions.push('Could you provide more details about what you want to build?');
      }
      
      // If output type is unclear
      if (!analysis.outputType || analysis.confidence < 0.5) {
        questions.push('Are you looking to create a new website/app or modify existing code?');
      }
      
      // If backend needs are unclear
      if (analysis.backendRequirements && 
          (analysis.backendRequirements.needsDatabase === undefined || 
           analysis.backendRequirements.needsAuth === undefined)) {
        questions.push('Will this need user accounts and data storage?');
      }
      
      // If user intent is unclear (question vs build request)
      if (contextAnalysis.userIntent === 'explore' || contextAnalysis.userIntent === 'question') {
        questions.push('Are you asking a question or requesting me to build/modify something?');
      }
      
      // If complexity is unclear
      if (contextAnalysis.complexity === 'complex' && contextAnalysis.confidenceScore < 0.5) {
        questions.push('What are the main features or sections you want to include?');
      }
      
      // Default fallback questions if none generated
      if (questions.length === 0) {
        questions.push('What specific features or functionality do you want to focus on?');
        questions.push('Do you have any design preferences or examples?');
      }
      
      return questions.slice(0, 3); // Max 3 questions
    };

    // GATE 1: Very Low Confidence (<30%) - Ask User for Clarification
    if (finalConfidence < 0.3) {
      console.log('❌ CONFIDENCE TOO LOW - Requesting user clarification');
      
      const contextualQuestions = generateContextualQuestions();
      const concerns: string[] = [];
      
      if (contextAnalysis.confidenceScore < 0.4) {
        concerns.push('Context quality is low - need more conversation history or details');
      }
      if (analysis.confidence && analysis.confidence < 0.4) {
        concerns.push('Request classification is uncertain - unclear what type of work is needed');
      }
      if (request.length < 50) {
        concerns.push('Request is very brief - more details would help ensure accuracy');
      }
      
      await broadcast('confidence:low', {
        status: 'needs_clarification',
        message: '🤔 I need more information to proceed confidently',
        progress: 10,
        confidence: finalConfidence,
        decision: {
          classification: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
          confidence: finalConfidence,
          intent: contextAnalysis.userIntent,
          userRequest: request
        },
        questions: contextualQuestions,
        concerns
      });

      return {
        needsClarification: true,
        confidence: finalConfidence,
        analysis,
        conversationContext,
        questions: contextualQuestions,
        concerns
      };
    }

    // GATE 2: Low Confidence (40-60%) - AGI Self-Reflection
    if (finalConfidence < 0.6) {
      console.log('⚠️ LOW CONFIDENCE - Triggering AGI self-reflection');
      
      await broadcast('confidence:reflecting', {
        status: 'reflecting',
        message: '🤔 Validating my understanding through self-reflection...',
        progress: 12,
        confidence: finalConfidence,
        decision: {
          classification: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
          confidence: finalConfidence,
          intent: contextAnalysis.userIntent,
          reflectionReason: 'Low confidence detected, validating decision'
        }
      });

      const reflection = await reflectOnDecision(request, analysis);
      
      if (!reflection.isConfident) {
        console.log('🔄 Self-reflection suggests reclassification');
        
        const correction = await checkForCorrection(
          request,
          analysis.isMetaRequest ? 'meta_request' : analysis.outputType
        );
        
        if (correction.needsCorrection && correction.confidence && correction.confidence > 0.7) {
          console.log('✅ APPLYING CORRECTION:', correction);
          
          // Apply correction
          if (correction.suggestedClassification === 'code_modification') {
            analysis.outputType = 'modification';
            analysis.isMetaRequest = false;
          } else if (correction.suggestedClassification === 'meta_request') {
            analysis.isMetaRequest = true;
          }
          
          // Update confidence
          analysis.confidence = correction.confidence;
          
          await broadcast('confidence:corrected', {
            status: 'corrected',
            message: '✅ Self-correction applied - proceeding with higher confidence',
            progress: 15,
            confidence: correction.confidence,
            originalClassification: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
            correctedClassification: correction.suggestedClassification,
            reasoning: correction.reasoning,
            correction: {
              from: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
              to: correction.suggestedClassification,
              reasoning: correction.reasoning
            }
          });
        } else {
          console.log('⚠️ No high-confidence correction available - proceeding with caution');
          
          await broadcast('confidence:proceeding', {
            status: 'proceeding',
            message: '⚠️ Proceeding with moderate confidence - monitoring closely',
            progress: 15,
            confidence: finalConfidence
          });
        }
      }
    } else {
      // GATE 3: High Confidence (>60%) - Proceed with monitoring
      console.log('✅ HIGH CONFIDENCE - Proceeding with real-time monitoring');
      
      await broadcast('confidence:high', {
        status: 'confident',
        message: '✅ High confidence - proceeding with execution',
        progress: 15,
        confidence: finalConfidence,
        decision: {
          classification: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
          confidence: finalConfidence,
          intent: contextAnalysis.userIntent
        }
      });
    }

    (conversationContext as any)._finalConfidence = finalConfidence;

    await storeConversationTurn(platformSupabase, {
      conversationId,
      userId,
      userRequest: request,
      intent: analysis,
      executionPlan: { steps: analysis.subTasks }
    });

    await updateJobProgress(25, 'Analysis complete', 'Planning Components', []);
    
    conversationContext._analysis = analysis;
  } else {
    console.log('⏭️ Skipping analysis - already completed');
    conversationContext._analysis = conversationContext._analysis || await analyzeRequest(request, conversationContext, framework, broadcast, platformSupabase, projectMemory);
  }

  const analysis = conversationContext._analysis;

  // Step 2: Handle meta-requests
  if (analysis.isMetaRequest) {
    return handleMetaRequest(request, conversationContext, broadcast);
  }

  // Pre-implementation analysis
  const needsPlanning = !request.toLowerCase().includes('fix') && 
                       !request.toLowerCase().includes('debug') &&
                       !request.toLowerCase().includes('error') &&
                       analysis.outputType !== 'conversation';

  // Detect if this is a simple text/content update vs full generation
  const isSimpleUpdate = request.toLowerCase().includes('update') && 
                         (request.toLowerCase().includes('name') ||
                          request.toLowerCase().includes('title') ||
                          request.toLowerCase().includes('text')) ||
                         request.toLowerCase().includes('change') && request.toLowerCase().includes('text') ||
                         request.toLowerCase().includes('replace') && request.length < 100;

  // ONLY run codebase analysis and planning if NOT a simple update
  if (needsPlanning && !isSimpleUpdate) {
    const { analyzeCodebase } = await import('../_shared/codebaseAnalyzer.ts');
    const { generateDetailedPlan, formatPlanForDisplay } = await import('../_shared/implementationPlanner.ts');
    
    await stepTracker.trackStep('read_codebase', 'Scanning project files and structure', broadcast, 'start');
    await broadcast('generation:planning', { 
      status: 'analyzing_codebase', 
      message: '🔍 Analyzing existing codebase...', 
      progress: 10,
      currentOperation: 'Scanning project files and dependencies',
      phaseName: 'Analyzing Codebase'
    });

    const codebaseAnalysis = await analyzeCodebase(
      request,
      analysis,
      conversationContext,
      platformSupabase
    );

    console.log(`📁 Codebase analysis: ${codebaseAnalysis.totalFiles} files, ${codebaseAnalysis.similarFunctionality.length} similar`);
    
    // Dynamic detail text based on actual codebase state
    const detailText = codebaseAnalysis.totalFiles === 0 
      ? 'Starting fresh project'
      : codebaseAnalysis.similarFunctionality.length > 0
        ? `Found ${codebaseAnalysis.totalFiles} files, ${codebaseAnalysis.similarFunctionality.length} similar to request`
        : `Analyzed ${codebaseAnalysis.totalFiles} existing files`;
    
    await stepTracker.trackStep('read_codebase', detailText, broadcast, 'complete');

    await stepTracker.trackStep('create_plan', 'Breaking down implementation into steps', broadcast, 'start');
    await broadcast('generation:planning', { 
      status: 'creating_plan', 
      message: '📋 Creating detailed implementation plan...', 
      progress: 20,
      currentOperation: 'Breaking down features and dependencies',
      phaseName: 'Planning Implementation'
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const detailedPlan = await generateDetailedPlan(
      request,
      analysis,
      codebaseAnalysis,
      LOVABLE_API_KEY
    );

    const formattedPlan = formatPlanForDisplay(detailedPlan);
    
    // Dynamic plan completion message
    const planSteps = detailedPlan.steps?.length || 0;
    const planDetailText = planSteps > 0
      ? `Created plan with ${planSteps} implementation steps`
      : 'Implementation approach determined';
    
    await stepTracker.trackStep('create_plan', planDetailText, broadcast, 'complete');
    
    await broadcast('generation:plan_ready', { 
      status: 'awaiting_approval', 
      message: '📋 Implementation plan ready for review', 
      progress: 25,
      plan: {
        summary: detailedPlan.summary,
        approach: detailedPlan.approach,
        codebaseAnalysis: {
          totalFiles: codebaseAnalysis.totalFiles,
          similarFunctionality: codebaseAnalysis.similarFunctionality,
          duplicates: codebaseAnalysis.duplicates,
          recommendations: codebaseAnalysis.recommendations
        },
        implementationPlan: detailedPlan,
        formattedPlan
      }
    });

    analysis._implementationPlan = detailedPlan;
    analysis._codebaseAnalysis = codebaseAnalysis;

    // Multi-feature orchestration
    const featureCount = detailedPlan.steps?.length || 0;
    if (featureCount >= 3) {
      console.log('🎯 Enterprise orchestration: detected', featureCount, 'features');
      
      await broadcast('orchestration:analyzing', {
        status: 'orchestrating',
        message: `Orchestrating ${featureCount} features with dependency resolution...`,
        progress: 35,
        currentOperation: `Analyzing dependencies for ${featureCount} features`,
        phaseName: 'Orchestrating Features'
      });

      const orchestrator = new FeatureOrchestrator();
      const orchestrationPlan = await orchestrator.orchestrateFeatures(request, detailedPlan);
      
      const dependencyGraph = new FeatureDependencyGraph();
      dependencyGraph.buildGraph(orchestrationPlan.phases.flatMap(p => p.features));
      const dependencyAnalysis = dependencyGraph.analyzeDependencies();
      
      if (!dependencyAnalysis.isValid) {
        console.error('❌ Dependency validation failed:', dependencyAnalysis.errors);
        throw new Error(`Dependency errors: ${dependencyAnalysis.errors.join(', ')}`);
      }

      await broadcast('orchestration:planned', {
        status: 'success',
        message: `✅ ${orchestrationPlan.phases.length} phases planned with ${orchestrationPlan.totalFiles} files`,
        progress: 38,
        details: {
          phases: orchestrationPlan.phases.length,
          totalFiles: orchestrationPlan.totalFiles,
          estimatedTime: orchestrationPlan.estimatedTimeline,
          externalAPIs: orchestrationPlan.externalAPIs
        }
      });

      analysis._orchestrationPlan = orchestrationPlan;
      analysis._dependencyGraph = dependencyGraph;
    }
  }

  // Step 3: Setup backend if needed
  if ((!isRetry || resumeProgress < 50) && analysis.backendRequirements?.needsDatabase && userSupabase) {
    const tableCount = analysis.backendRequirements?.databaseTables?.length || 0;
    
    if (tableCount >= 5 && analysis._orchestrationPlan) {
      console.log('🗄️ Complex schema: generating', tableCount, 'interconnected tables');
      
      await broadcast('database:architecting', {
        status: 'architecting',
        message: `Architecting complex schema with ${tableCount} tables...`,
        progress: 42
      });

      const schemaArchitect = new SchemaArchitect(userSupabase);
      const features = analysis._orchestrationPlan.phases.flatMap((p: any) => p.features);
      const fullSchema = await schemaArchitect.generateFullSchema(features);
      
      await broadcast('database:schema_generated', {
        status: 'success',
        message: `✅ Generated ${fullSchema.tables.length} tables with ${fullSchema.relationships.length} relationships`,
        progress: 45,
        details: {
          tables: fullSchema.tables.length,
          relationships: fullSchema.relationships.length,
          warnings: fullSchema.warnings
        }
      });

      analysis._databaseSchema = fullSchema;
      
      if (fullSchema.warnings.length === 0) {
        console.log('📝 Executing database schema...');
      }
    } else {
      await setupDatabaseTables(
        analysis,
        userId,
        broadcast,
        userSupabase,
        platformSupabase
      );
    }
  }

  if ((!isRetry || resumeProgress < 50) && analysis.backendRequirements?.needsAuth && userSupabase) {
    await ensureAuthInfrastructure(userSupabase);
  }

  if (!isRetry || resumeProgress < 50) {
    await updateJobProgress(50, 'Database setup complete', 'Setting up Backend', analysis._orchestrationPlan?.phases || []);
  }

  // Store successful pattern for learning
  const learnedPatterns = (conversationContext as any)._learnedPatterns || [];
  const patternCategory = detectPatternCategory(request);
  try {
    await storeSuccessfulPattern(platformSupabase, {
      category: patternCategory || 'general',
      patternName: analysis.intent || 'user_request',
      useCase: request,
      codeTemplate: JSON.stringify(analysis),
      context: { 
        confidence: (conversationContext as any)._finalConfidence || 0.7,
        patterns_used: learnedPatterns.length,
        contextAnalysis: (conversationContext as any)._contextAnalysis
      }
    });
    console.log('✅ Stored successful pattern for future learning');
  } catch (error) {
    console.error('⚠️ Failed to store pattern:', error);
  }

  // Record outcome for feedback loop
  await recordGenerationOutcome(platformSupabase, {
    decisionId: (conversationContext as any)._decisionId,
    userId,
    success: true,
    actualOutput: analysis,
    expectedOutput: { intent: analysis.intent }
  }).catch(console.error);

  // Trigger autonomous pattern evolution (async, don't wait)
  evolvePatternsAutonomously(platformSupabase).catch(console.error);

  // Return analysis and prepared context for code generation
  return {
    analysis,
    conversationContext,
    updateJobProgress,
    startTime,
    // Real-time monitoring callback
    monitorExecution: async (executionData: {
      step: string;
      progress: number;
      success: boolean;
      error?: any;
      output?: any;
    }) => {
      return await monitorExecutionWithCorrection({
        ...executionData,
        userId,
        conversationId,
        decisionId: (conversationContext as any)._decisionId,
        analysis,
        broadcast
      });
    }
  };
}

/**
 * Monitor execution in real-time and apply corrections if needed
 */
async function monitorExecutionWithCorrection(ctx: {
  step: string;
  progress: number;
  success: boolean;
  error?: any;
  output?: any;
  userId: string;
  conversationId: string;
  decisionId: string | null;
  analysis: any;
  broadcast: (event: string, data: any) => Promise<void>;
}): Promise<{
  shouldRetry: boolean;
  correctedAnalysis?: any;
  correctionReasoning?: string;
}> {
  const { step, success, error, analysis, broadcast, userId, conversationId, decisionId } = ctx;

  // If execution is successful, no correction needed
  if (success) {
    console.log(`✅ Step "${step}" completed successfully`);
    
    await broadcast('execution:complete', {
      status: 'success',
      message: `✅ ${step} completed successfully`,
      step
    });
    
    return { shouldRetry: false };
  }

  // Execution failed - trigger real-time correction
  console.log(`❌ Step "${step}" failed:`, error);

  await broadcast('execution:monitoring', {
    status: 'analyzing_failure',
    message: '🔍 Analyzing execution failure...',
    step,
    error: error?.message
  });

  try {
    // Check if autonomous corrector has a solution
    const correctionResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/autonomous-corrector`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'apply_correction',
          correctionData: {
            userId,
            originalClassification: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
            correctClassification: null, // Let corrector determine
            userRequest: ctx.step,
            errorContext: {
              step,
              error: error?.message,
              stackTrace: error?.stack
            }
          }
        })
      }
    );

    if (!correctionResponse.ok) {
      console.log('⚠️ No automatic correction available');
      
      await broadcast('correction:failed', {
        status: 'failed',
        message: '❌ Could not auto-correct - manual review needed',
        step,
        error: error?.message
      });
      
      return { shouldRetry: false };
    }

    const correctionResult = await correctionResponse.json();

    if (correctionResult.correctionApplied && correctionResult.shouldRetry) {
      console.log('✅ REAL-TIME CORRECTION APPLIED:', correctionResult);

      // Try to apply learned fixes from self-learning engine
      console.log('🧠 Checking for learned fixes...');
      
      // Use the existing platformSupabase (passed through ctx if available)
      const platformSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const learnedFix = await applyLearnedFixes(
        platformSupabase as any,
        `${step}_failure`,
        { step, error: error?.message, analysis }
      );
      
      if (learnedFix.applied) {
        await broadcast('learned_fix_applied', {
          status: 'learned_fix',
          message: `🧠 Applied learned fix from past cases (${(learnedFix.confidence! * 100).toFixed(0)}% confidence)`,
          step,
          fix: learnedFix.fix,
          confidence: learnedFix.confidence
        });
        
        console.log('✅ Learned fix applied successfully');
      }

      await broadcast('correction:applied', {
        status: 'corrected',
        message: '✅ Issue detected and corrected - retrying automatically',
        step,
        correction: {
          issue: error?.message,
          fix: correctionResult.correctionReasoning,
          confidence: correctionResult.confidence
        },
        originalClassification: analysis.isMetaRequest ? 'meta_request' : analysis.outputType,
        correctedClassification: correctionResult.correctedClassification
      });

      // Validate outcome for learning
      if (decisionId) {
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/decision-validator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              action: 'validate_outcome',
              outcomeData: {
                decisionId,
                userId,
                executionFailed: true,
                detectedBy: 'real_time_monitoring',
                detectionConfidence: 0.9,
                errorSeverity: 'medium',
                symptoms: [error?.message || 'execution_failure'],
                correctionApplied: true
              }
            })
          }
        );
      }

      return {
        shouldRetry: true,
        correctedAnalysis: correctionResult.correctedClassification,
        correctionReasoning: correctionResult.correctionReasoning
      };
    }

    console.log('⚠️ Correction attempted but not confident enough to retry');
    return { shouldRetry: false };

  } catch (correctionError) {
    console.error('Error during real-time correction:', correctionError);
    return { shouldRetry: false };
  }
}

/**
 * Analyze user request to understand intent and requirements
 */
export async function analyzeRequest(
  request: string,
  conversationContext: any,
  framework: string,
  broadcast: (event: string, data: any) => Promise<void>,
  platformSupabase: any,
  projectMemory?: any // 🆕 Cross-conversation memory
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  const relevantPatterns = (conversationContext as any)._learnedPatterns || [];

  let prompt = buildAnalysisPrompt(request, 'generation', {
    recentTurns: conversationContext.recentTurns || []
  });
  
  // 🆕 Include cross-conversation memory if available
  if (projectMemory && projectMemory.recentMessages && projectMemory.recentMessages.length > 0) {
    const { buildProjectMemorySummary } = await import('../_shared/conversationMemory.ts');
    const memorySummary = buildProjectMemorySummary(projectMemory);
    if (memorySummary) {
      prompt += '\n\n' + memorySummary;
    }
  }
  
  // Include learned patterns in the prompt
  if (relevantPatterns.length > 0) {
    prompt += '\n\n🎓 LEARNED PATTERNS (from past successful generations):\n';
    prompt += 'These patterns have worked well in similar situations:\n\n';
    relevantPatterns.forEach((match: any, idx: number) => {
      const p = match.pattern;
      prompt += `${idx + 1}. ${p.pattern_name} (${(match.relevanceScore * 100).toFixed(0)}% relevant)\n`;
      prompt += `   Success Rate: ${p.success_rate}%\n`;
      prompt += `   Use Case: ${p.use_case}\n`;
      prompt += `   Times Used: ${p.times_used}\n`;
      if (p.code_template) {
        prompt += `   Pattern Template:\n${p.code_template.substring(0, 200)}...\n`;
      }
      prompt += '\n';
    });
    prompt += 'Consider using these patterns if they fit the current request.\n';
  }

  const response = await callAIWithFallback(
    [{ role: 'user', content: prompt }],
    { 
      systemPrompt: 'You are an expert at analyzing user requests for web development. Always respond with valid JSON. Use learned patterns when relevant.',
      preferredModel: 'google/gemini-2.5-flash'
    }
  );

  return parseAIJsonResponse(response.data.content, {
    intent: 'create-website',
    outputType: 'html',
    backendRequirements: {
      needsDatabase: false,
      needsAuth: false,
      needsFileStorage: false
    }
  });
}

/**
 * Handle meta-requests (questions about the system)
 */
export async function handleMetaRequest(
  request: string,
  conversationContext: any,
  broadcast: (event: string, data: any) => Promise<void>
): Promise<any> {
  await broadcast('generation:responding', { 
    status: 'thinking', 
    message: '💬 Preparing response...', 
    progress: 50 
  });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  
  const systemContext = await buildSystemContext();
  const enhancedPrompt = `
${systemContext}

User question: ${request}

Conversation history:
${JSON.stringify(conversationContext.recentTurns || [])}

Please provide a helpful, detailed response about the system capabilities, recent work, or platform features.
`;

  const response = await callAIWithFallback(
    [{ role: 'user', content: enhancedPrompt }],
    { 
      systemPrompt: 'You are a helpful AI assistant explaining platform capabilities and features.',
      preferredModel: 'google/gemini-2.5-flash'
    }
  );

  await broadcast('generation:response_ready', {
    status: 'complete',
    message: '✅ Response ready',
    progress: 100,
    conversationOnly: true,
    response: response.data.content
  });

  return {
    conversationOnly: true,
    response: response.data.content
  };
}

/**
 * Build system context for meta-requests
 */
async function buildSystemContext(): Promise<string> {
  return `
**Platform Capabilities:**
- React, HTML, Vue project generation
- Database & Auth integration (Supabase)
- Multi-file project structure
- Real-time collaboration
- Version history & rollback
- AI-powered code generation
- Pattern learning & optimization
`;
}
