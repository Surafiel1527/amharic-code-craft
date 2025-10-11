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
  framework: string;
  projectId: string | null;
  conversationContext: any;
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
  framework: string;
  projectId: string | null;
  conversationContext: any;
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
    framework,
    projectId, 
    conversationContext,
    platformSupabase,
    userSupabase,
    broadcast 
  } = ctx;
  
  // Track start time for metrics
  const startTime = ctx.startTime!;

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
    await broadcast('generation:thinking', { 
      status: 'analyzing', 
      message: '🔍 Understanding your request...', 
      progress: 5,
      currentOperation: 'Analyzing requirements and planning architecture',
      phaseName: 'Analyzing Requirements'
    });
    
    await updateJobProgress(5, 'Analyzing requirements', 'Analyzing Requirements', []);

    console.log('🧠 Running Intelligence Engine analysis...');
    try {
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
    } catch (analysisError) {
      console.error('Context analysis failed, continuing without it:', analysisError);
    }

    const analysis = await analyzeRequest(request, conversationContext, framework, broadcast, platformSupabase);
    
    console.log('📊 Analysis complete:', JSON.stringify(analysis, null, 2));

    // AGI: Log decision for learning
    const decisionId = await logDecision(analysis, {
      userId,
      conversationId,
      jobId: projectId || undefined,
      userRequest: request,
      processingTimeMs: Date.now() - startTime
    });
    (conversationContext as any)._decisionId = decisionId;

    // AGI: Self-reflection check
    const reflection = await reflectOnDecision(request, analysis);
    if (!reflection.isConfident) {
      console.log('⚠️ Low confidence in classification, checking for corrections...');
      const correction = await checkForCorrection(
        request,
        analysis.isMetaRequest ? 'meta_request' : analysis.outputType
      );
      
      if (correction.needsCorrection && correction.confidence && correction.confidence > 0.7) {
        console.log('🔄 Auto-correcting classification:', correction);
        // Apply correction to analysis
        if (correction.suggestedClassification === 'code_modification') {
          analysis.outputType = 'modification';
          analysis.isMetaRequest = false;
        }
      }
    }

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
    conversationContext._analysis = conversationContext._analysis || await analyzeRequest(request, conversationContext, framework, broadcast, platformSupabase);
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

  if (needsPlanning) {
    const { analyzeCodebase } = await import('../_shared/codebaseAnalyzer.ts');
    const { generateDetailedPlan, formatPlanForDisplay } = await import('../_shared/implementationPlanner.ts');
    
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

  // Return analysis and prepared context for code generation
  return {
    analysis,
    conversationContext,
    updateJobProgress,
    startTime
  };
}

/**
 * Analyze user request to understand intent and requirements
 */
export async function analyzeRequest(
  request: string,
  conversationContext: any,
  framework: string,
  broadcast: (event: string, data: any) => Promise<void>,
  platformSupabase: any
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  const relevantPatterns = await findRelevantPatterns(platformSupabase, request);

  const prompt = buildAnalysisPrompt(request, 'generation', {
    recentTurns: conversationContext.recentTurns || []
  });

  const response = await callAIWithFallback(
    [{ role: 'user', content: prompt }],
    { 
      systemPrompt: 'You are an expert at analyzing user requests for web development. Always respond with valid JSON.',
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
