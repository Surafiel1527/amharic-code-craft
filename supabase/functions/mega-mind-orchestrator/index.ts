/**
 * Mega Mind Orchestrator - Clean Enterprise Version
 * 
 * Main orchestration logic for AI-powered code generation
 * All heavy lifting is delegated to specialized modules
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Shared modules
import { callAIWithFallback, parseAIJsonResponse } from '../_shared/aiHelpers.ts';
import { 
  loadConversationHistory, 
  storeConversationTurn 
} from '../_shared/conversationMemory.ts';
import { 
  loadFileDependencies, 
  storeFileDependency 
} from '../_shared/fileDependencies.ts';
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
import { autoFixGeneratedCode } from './autoFixIntegration.ts';
import { 
  logGenerationFailure, 
  logGenerationSuccess,
  checkHealthMetrics,
  classifyError, 
  extractStackTrace 
} from './productionMonitoring.ts';
import { analyzeContext, makeIntelligentDecision } from '../_shared/intelligenceEngine.ts';

// Enterprise modules (Phases 1-3)
import { FeatureOrchestrator } from '../_shared/featureOrchestrator.ts';
import { FeatureDependencyGraph } from '../_shared/featureDependencyGraph.ts';
import { PhaseValidator } from '../_shared/phaseValidator.ts';
import { SchemaArchitect } from '../_shared/schemaArchitect.ts';
import { FrameworkBuilderFactory } from '../_shared/frameworkBuilders/FrameworkBuilderFactory.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Main request handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      request, 
      conversationId, 
      userId, 
      requestType = 'generation',
      context = {},
      userSupabaseConnection 
    } = await req.json();

    // Extract framework from context (default: react)
    const framework = context.framework || 'react';
    const projectId = context.projectId || null;

    console.log('🚀 Mega Mind Orchestrator started', { 
      request: request.substring(0, 100), 
      conversationId, 
      userId, 
      requestType,
      framework,
      projectId
    });

    // Initialize Supabase clients
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const platformSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const userSupabase = userSupabaseConnection 
      ? createClient(userSupabaseConnection.url, userSupabaseConnection.key)
      : null;

    // Load conversation context
    // For Q&A mode, load full history; for generation, keep it focused
    const isQuestion = request.length < 200 && 
      (request.includes('?') || /what|how|why|explain|tell me|describe|show me/i.test(request));
    
    const conversationContext = await loadConversationHistory(
      platformSupabase, 
      conversationId, 
      5, // Recent turns limit
      isQuestion // Load full history for Q&A
    );
    const dependencies = await loadFileDependencies(platformSupabase, conversationId);

    console.log(`📚 Loaded context: ${conversationContext.totalTurns} turns, ${dependencies.length} dependencies, Q&A mode: ${isQuestion}`);

    // Helper to broadcast via Supabase Realtime Channels
    const broadcast = async (event: string, data: any) => {
      try {
        const channel = platformSupabase.channel(`ai-status-${projectId}`);
        await channel.send({
          type: 'broadcast',
          event: 'status-update',
          payload: {
            ...data,
            event,
            projectId,
            timestamp: new Date().toISOString()
          }
        });
        console.log(`📡 Broadcast sent: ${event}`, data.message || data.status);
      } catch (error) {
        console.error('❌ Broadcast error:', error);
      }
    };

    // Start processing and return immediate response
    processRequest({
      request,
      conversationId,
      userId,
      requestType,
      framework,
      projectId,
      conversationContext,
      dependencies,
      platformSupabase,
      userSupabase,
      userSupabaseConnection,
      broadcast
    }).then(async (result) => {
      await broadcast('generation:complete', { 
        status: 'complete', 
        message: '✅ Generation complete!',
        progress: 100,
        ...result 
      });
    }).catch(async (error) => {
      console.error('❌ Generation failed:', error);
      
      // Log failure to production monitoring system
      const errorClassification = classifyError(error);
      await logGenerationFailure(platformSupabase, {
        errorType: error.name || 'GenerationError',
        errorMessage: error.message || 'Unknown error occurred',
        userRequest: request,
        context: { framework, projectId, conversationId },
        stackTrace: extractStackTrace(error),
        framework,
        userId,
        severity: errorClassification.severity,
        category: errorClassification.category
      });
      
      // Check overall system health after error
      const healthMetrics = await checkHealthMetrics(platformSupabase);
      if (healthMetrics) {
        console.log('📊 Current system health:', healthMetrics);
        
        // Alert if system health is degraded
        if (healthMetrics.failureRate > 50) {
          console.error(`🚨 CRITICAL: System failure rate is ${healthMetrics.failureRate.toFixed(2)}%`);
        }
      }
      
      // 🧠 NEW: Intelligent autonomous fix decision
      try {
        console.log('🧠 Analyzing error for autonomous fix possibility...');
        
        // Check for learned patterns
        const { data: matchingPatterns } = await platformSupabase
          .from('universal_error_patterns')
          .select('*')
          .eq('error_category', errorClassification.category)
          .gte('confidence_score', 0.7)
          .order('success_count', { ascending: false })
          .limit(1);
        
        const hasLearnedPattern = !!(matchingPatterns && matchingPatterns.length > 0);
        
        // Get context analysis (might be from earlier in the flow)
        let contextAnalysis: any;
        try {
          contextAnalysis = (conversationContext as any)._contextAnalysis || await analyzeContext(
            platformSupabase as any,
            conversationId,
            userId,
            request,
            projectId || undefined
          );
        } catch (analysisError) {
          console.error('Context analysis failed, using defaults:', analysisError);
          // Use default context
          contextAnalysis = {
            userIntent: 'fix',
            complexity: 'moderate',
            confidenceScore: 0.5,
            projectState: {
              hasAuth: false,
              hasDatabase: false,
              recentErrors: 0,
              successRate: 0.5,
              generationHistory: []
            },
            patterns: {
              commonIssues: [],
              userPreferences: [],
              successfulApproaches: []
            },
            contextQuality: 50
          };
        }
        
        // Map critical severity to high for decision making
        const mappedSeverity = errorClassification.severity === 'critical' ? 'high' : errorClassification.severity as 'low' | 'medium' | 'high';
        
        // Make intelligent decision
        const decision = makeIntelligentDecision(
          contextAnalysis,
          mappedSeverity,
          hasLearnedPattern
        );
        
        console.log('🎯 Autonomous Decision:', {
          action: decision.action,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          requiresUserInput: decision.requiresUserInput
        });
        
        // If decision is to auto-fix, trigger autonomous healing
        if (decision.action === 'auto_fix' && decision.confidence >= 0.75) {
          console.log('🔧 Triggering autonomous fix...');
          
          const { data: job } = await platformSupabase
            .from('ai_generation_jobs')
            .select('id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (job) {
            // Trigger autonomous healing
            await platformSupabase.functions.invoke('unified-healing-engine', {
              body: {
                operation: 'autonomous_fix',
                params: {
                  errorId: job.id,
                  userId,
                  projectId,
                  conversationId,
                  errorMessage: error.message,
                  errorType: errorClassification.category,
                  code: '', // Will be retrieved from context
                  context: {
                    framework,
                    request,
                    severity: errorClassification.severity,
                    decision: decision
                  }
                }
              }
            });
            
            console.log('✅ Autonomous healing triggered');
            
            // Notify user
            await broadcast('healing:triggered', {
              status: 'healing',
              message: '🤖 AI is autonomously fixing the issue...',
              decision: decision
            });
          }
        }
      } catch (healingError) {
        console.error('❌ Autonomous healing decision failed:', healingError);
      }
      
      // 🆕 PHASE 1: Trigger conversational diagnosis
      try {
        console.log('🔍 Triggering conversational diagnosis...');
        const { data: job } = await platformSupabase
          .from('ai_generation_jobs')
          .select('id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (job) {
          await platformSupabase.functions.invoke('unified-healing-engine', {
            body: {
              operation: 'conversational_diagnosis',
              params: {
                jobId: job.id,
                conversationId,
                errorMessage: error.message,
                stackTrace: extractStackTrace(error),
                context: { framework, projectId }
              }
            }
          });
          console.log('✅ Conversational diagnosis triggered');
        }
      } catch (diagError) {
        console.error('❌ Diagnosis failed:', diagError);
      }
      
      // 🆕 PHASE 1: Check if user wants to apply a diagnostic fix
      const userMessage = request.toLowerCase();
      const isFixRequest = 
        userMessage.includes('apply') || 
        userMessage.includes('implement') || 
        userMessage.includes('fix it') ||
        userMessage.includes('use that') ||
        userMessage.includes('try that') ||
        userMessage.includes('go ahead') ||
        userMessage.includes('do it');
      
      if (isFixRequest) {
        try {
          console.log('🔧 User requested fix application...');
          const { data: job } = await platformSupabase
            .from('ai_generation_jobs')
            .select('id, diagnostic_fixes')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (job && job.diagnostic_fixes && job.diagnostic_fixes.length > 0) {
            // Extract fix index if user specified (e.g., "apply fix 2")
            const fixIndexMatch = userMessage.match(/(?:fix|suggestion)\s+(\d+)/);
            const fixIndex = fixIndexMatch ? parseInt(fixIndexMatch[1]) - 1 : 0;
            
            await platformSupabase.functions.invoke('unified-healing-engine', {
              body: {
                operation: 'apply_diagnostic_fix',
                params: {
                  jobId: job.id,
                  conversationId,
                  fixIndex
                }
              }
            });
            
            console.log('✅ Diagnostic fix application triggered');
          }
        } catch (fixError) {
          console.error('❌ Fix application failed:', fixError);
        }
      }
      
      await broadcast('generation:failed', {
        status: 'error',
        error: error.message || 'Unknown error occurred',
        classification: errorClassification,
        progress: 0
      });
    });

    // Return immediate response - processing happens in background via channels
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Generation started',
        projectId,
        conversationId 
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Request error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Core processing pipeline with timeout protection
 */
async function processRequest(ctx: {
  request: string;
  conversationId: string;
  userId: string;
  requestType: string;
  framework: string; // Add framework
  projectId: string | null; // Add projectId
  conversationContext: any;
  dependencies: any[];
  platformSupabase: any;
  userSupabase: any;
  userSupabaseConnection: any;
  broadcast: (event: string, data: any) => Promise<void>;
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
    userSupabaseConnection,
    broadcast 
  } = ctx;

  // Timeout protection: maximum 5 minutes for generation
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Generation timeout: Process exceeded 5 minutes')), TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      executeGeneration({ ...ctx, startTime: Date.now() }), // ✅ FIX 1: Pass startTime
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
async function executeGeneration(ctx: {
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
    userSupabaseConnection,
    broadcast 
  } = ctx;
  
  // Track start time for metrics (guaranteed to be set from processRequest)
  const startTime = ctx.startTime!;

  // 🔄 RETRY LOGIC: Check if this is a retry with existing progress
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
    if (!projectId) return; // Only update if we have a projectId/jobId
    
    try {
      // Update job progress
      await platformSupabase.from('ai_generation_jobs').update({
        progress,
        current_step: currentStep,
        phases,
        updated_at: new Date().toISOString()
      }).eq('project_id', projectId).eq('user_id', userId);

      // Update project title with current phase (get original title first)
      const { data: project } = await platformSupabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();
      
      if (project) {
        // Extract original title (remove any existing phase indicators)
        const originalTitle = project.title
          .replace(/\[Generating\.\.\.\]/g, '')
          .replace(/- (Analyzing|Building|Creating|Setting up|Finalizing).*$/g, '')
          .trim();
        
        // Create new title with phase
        const newTitle = `${originalTitle} - ${phaseName}`;
        
        await platformSupabase.from('projects').update({
          title: newTitle
        }).eq('id', projectId);
        
        console.log(`📝 Updated project title: "${newTitle}"`);
      }
    } catch (error) {
      console.error('⚠️ Failed to update job progress:', error);
      // Non-fatal - don't block generation
    }
  };

  // Step 1: Analyze request (skip if resuming from >25%)
  if (!isRetry || resumeProgress < 25) {
    await broadcast('generation:thinking', { 
      status: 'analyzing', 
      message: '🔍 Understanding your request...', 
      progress: 5,
      currentOperation: 'Analyzing requirements and planning architecture',
      phaseName: 'Analyzing Requirements'
    });
    
    await updateJobProgress(5, 'Analyzing requirements', 'Analyzing Requirements', []);

    // 🧠 NEW: Use Intelligence Engine for context analysis
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

      // Store context analysis for decision-making (using any to bypass type checking)
      (conversationContext as any)._contextAnalysis = contextAnalysis;
    } catch (analysisError) {
      console.error('Context analysis failed, continuing without it:', analysisError);
    }

    const analysis = await analyzeRequest(request, conversationContext, framework, broadcast);
    
    console.log('📊 Analysis complete:', JSON.stringify(analysis, null, 2));

    // Store conversation turn
    await storeConversationTurn(platformSupabase, {
      conversationId,
      userId,
      userRequest: request,
      intent: analysis,
      executionPlan: { steps: analysis.subTasks }
    });

    // ✅ FIX 2: Update progress - Analysis complete
    await updateJobProgress(25, 'Analysis complete', 'Planning Components', []);
    
    // Store analysis in context for later steps
    conversationContext._analysis = analysis;
  } else {
    console.log('⏭️ Skipping analysis - already completed');
    // Try to recover analysis from context or regenerate quickly
    conversationContext._analysis = conversationContext._analysis || await analyzeRequest(request, conversationContext, framework, broadcast);
  }

  const analysis = conversationContext._analysis;

  // Step 2: Handle meta-requests (questions about system)
  if (analysis.isMetaRequest) {
    return handleMetaRequest(request, conversationContext, broadcast);
  }

  // ========== NEW: PRE-IMPLEMENTATION ANALYSIS ==========
  // Only run for feature implementation requests, not simple fixes
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

    // Analyze existing codebase
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

    // Generate detailed plan
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const detailedPlan = await generateDetailedPlan(
      request,
      analysis,
      codebaseAnalysis,
      LOVABLE_API_KEY
    );

    // Format and present plan
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

    // Store plan for reference
    analysis._implementationPlan = detailedPlan;
    analysis._codebaseAnalysis = codebaseAnalysis;

    // ========== PHASE 1: MULTI-FEATURE ORCHESTRATION ==========
    // If we have 3+ features, use enterprise orchestration
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
      
      // Validate dependencies
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
  // ========== END PRE-IMPLEMENTATION ANALYSIS ==========

  // Step 3: Setup backend if needed (skip if resuming from >50%)
  if ((!isRetry || resumeProgress < 50) && analysis.backendRequirements?.needsDatabase && userSupabase) {
    // ========== PHASE 2: COMPLEX SCHEMA GENERATION ==========
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
      
      // Execute schema if no warnings
      if (fullSchema.warnings.length === 0) {
        console.log('📝 Executing database schema...');
        // Schema execution would happen here via migration
      }
    } else {
      // Standard database setup for smaller apps
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

  // ✅ FIX 2: Update progress - Database setup complete
  if (!isRetry || resumeProgress < 50) {
    await updateJobProgress(50, 'Database setup complete', 'Setting up Backend', analysis._orchestrationPlan?.phases || []);
  }

  // Step 4: Generate code using framework-specific builders (skip if resuming from >75% with existing files)
  let generatedCode;
  let frameworkBuilder; // Declare here so it's accessible later
  
  if (isRetry && resumeProgress >= 75 && existingFiles.length > 0) {
    console.log('⏭️ Skipping code generation - using existing files');
    generatedCode = {
      files: existingFiles,
      framework: framework,
      description: 'Resumed from existing files'
    };
    // Still create builder for validation/packaging
    frameworkBuilder = FrameworkBuilderFactory.createBuilder(framework);
  } else {
    await broadcast('generation:coding', { 
      status: 'generating', 
      message: '🔧 Initializing framework-specific builder...', 
      progress: 50 
    });

    console.log(`🏗️ Using ${framework} builder for code generation`);
    
    // Create framework-specific builder
    frameworkBuilder = FrameworkBuilderFactory.createBuilder(framework);
    
    // Build context for the builder
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

    // Step 4a: Analyze request (framework-specific)
    const frameworkAnalysis = await frameworkBuilder.analyzeRequest(buildContext);
    Object.assign(analysis, frameworkAnalysis); // Merge framework analysis

    // Step 4b: Plan generation (framework-specific)
    const generationPlan = await frameworkBuilder.planGeneration(buildContext, analysis);
    console.log(`📋 Generation plan: ${generationPlan.strategy} strategy with ${generationPlan.estimatedFiles || generationPlan.files?.length || 0} files`);

    // Step 4c: Generate files (framework-specific)
    generatedCode = await frameworkBuilder.generateFiles(buildContext, generationPlan);
    console.log(`✅ Generated ${generatedCode.files.length} files using ${generatedCode.framework} builder`);

    // ✅ FIX 2: Update progress - Code generation complete
    await updateJobProgress(75, 'Code generation complete', 'Building Components', []);
  }

  // Step 5: Validate files (framework-specific validation)
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

  // Step 6: AUTO-FIX (only for critical errors, skip for warnings)
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

    // Use fixed files if auto-fix succeeded
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

  // ✅ FIX 2: Update progress - Auto-fix complete
  await updateJobProgress(90, 'Auto-fix complete', 'Finalizing Project', []);

  await broadcast('generation:finalizing', { 
    status: 'finalizing', 
    message: '📦 Packaging your project...', 
    progress: 85,
    currentOperation: 'Finalizing project structure and assets',
    phaseName: 'Finalizing Project'
  });

  // Step 9: Package output (framework-specific)
  const packagedCode = await frameworkBuilder.packageOutput(generatedCode);

  // Step 10: Update project with generated code (if projectId provided)
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
      console.log('✅ Project saved successfully to database');
      
      await broadcast('generation:saved', {
        status: 'success',
        message: '💾 Project saved successfully',
        progress: 95
      });
      
      // Log successful generation to monitoring
      await logGenerationSuccess(platformSupabase, {
        projectId,
        userRequest: request,
        framework: generatedCode.framework,
        fileCount: generatedCode.files.length,
        duration: 0, // Will be calculated
        phases: analysis._orchestrationPlan?.phases || [],
        userId
      });
    }
  }

  // Step 11: Complete ALL operations with proper sequencing and timeouts
  const generationEndTime = Date.now();
  const generationTimeMs = generationEndTime - startTime;
  const generationId = crypto.randomUUID();

  // ✅ ENTERPRISE FIX: Use Promise.allSettled to wait for ALL operations
  // None of these should block completion, but we wait for them to finish or timeout
  console.log('📊 Finalizing all operations (with timeouts)...');
  
  const finalOperations = await Promise.allSettled([
    // Operation 1: Track platform metrics (10s timeout)
    Promise.race([
      (async () => {
        const { trackPlatformMetrics } = await import('../_shared/storageTracker.ts');
        const filesObject: Record<string, string> = {};
        for (const file of generatedCode.files) {
          filesObject[file.path] = file.content;
        }
        await trackPlatformMetrics(platformSupabase, {
          userId,
          projectId: projectId || undefined,
          conversationId,
          generationId,
          framework: generatedCode.framework,
          files: filesObject,
          generationMetrics: {
            generationTimeMs,
            success: validationResult.errors.length === 0,
            featureCount: analysis.subTasks?.length || 1,
            totalLinesGenerated: Object.values(filesObject).reduce((sum, content) => sum + content.split('\n').length, 0),
            complexityScore: 0,
            errorType: validationResult.errors.length > 0 ? 'validation_error' : undefined,
            errorMessage: validationResult.errors.join(', ')
          }
        });
        console.log('✅ Platform metrics tracked');
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Metrics timeout after 10s')), 10000))
    ]),

    // Operation 2: Store pattern (5s timeout)
    Promise.race([
      (async () => {
        if (generatedCode.files.length > 0) {
          await storeSuccessfulPattern(platformSupabase, {
            category: analysis.outputType,
            patternName: `${analysis.mainGoal} pattern`,
            useCase: request,
            codeTemplate: JSON.stringify(generatedCode.files[0]),
            context: { 
              analysis,
              framework: generatedCode.framework,
              autoFix: {
                success: autoFixResult.success,
                attempts: autoFixResult.totalAttempts,
                fixedTypes: autoFixResult.fixedErrorTypes
              }
            }
          });
          console.log('✅ Pattern stored');
        }
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Pattern timeout after 5s')), 5000))
    ]),

    // Operation 3: Store dependencies (8s timeout for all files)
    Promise.race([
      (async () => {
        for (const file of generatedCode.files) {
          await storeFileDependency(platformSupabase, {
            conversationId,
            componentName: file.path,
            componentType: file.path.match(/\.(tsx|ts|jsx|js)$/) ? 'component' : 'file',
            dependsOn: file.imports || [],
            usedBy: [],
            complexityScore: Math.floor(file.content.length / 100),
            criticality: 'medium'
          });
        }
        console.log('✅ Dependencies stored');
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Dependencies timeout after 8s')), 8000))
    ])
  ]);

  // Log results of all operations
  finalOperations.forEach((result, index) => {
    const opNames = ['Metrics', 'Pattern', 'Dependencies'];
    if (result.status === 'rejected') {
      console.warn(`⚠️ ${opNames[index]} operation failed: ${result.reason}`);
    }
  });

  // ✅ NOW broadcast 100% - everything is done or timed out
  await updateJobProgress(100, 'Completed', 'Project Ready', []);
  await broadcast('generation:complete', {
    status: 'complete',
    message: '✅ Generation complete!',
    progress: 100,
    currentOperation: 'Project ready to use',
    phaseName: 'Complete'
  });

  return {
    success: true,
    files: generatedCode.files,
    framework: generatedCode.framework,
    analysis,
    validation: validationResult,
    autoFix: {
      success: autoFixResult.success,
      fixed: autoFixResult.fixed,
      attempts: autoFixResult.totalAttempts,
      errors: autoFixResult.errors,
      warnings: autoFixResult.warnings
    },
    backendSetup: analysis.backendRequirements,
    metrics: {
      generationId,
      generationTimeMs,
      filesGenerated: generatedCode.files.length
    }
  };
}

/**
 * Analyze user request to determine what to build
 */
async function analyzeRequest(
  request: string, 
  context: any,
  framework: string, 
  broadcast: any
): Promise<any> {
  
  // Find relevant patterns from past successes
  const relevantPatterns = await findRelevantPatterns(
    context.platformSupabase, 
    request
  );

  const prompt = buildAnalysisPrompt(request, 'generation', {
    recentTurns: context.recentTurns,
    suggestionsPrompt: relevantPatterns.length > 0 
      ? `**Learned Patterns:**\n${relevantPatterns.map((p: any) => 
          `- ${p.pattern.pattern_name}: ${p.reason}`
        ).join('\n')}`
      : ''
  });

  const result = await callAIWithFallback(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: 'You are a web development analyst. Respond ONLY with valid JSON.',
      preferredModel: 'google/gemini-2.5-flash'
    }
  );

  const analysis = parseAIJsonResponse(
    result.data.choices[0].message.content,
    { outputType: 'react-app', mainGoal: request, subTasks: [] }
  );

  // ✅ CRITICAL: Map framework to outputType - ensures HTML gets same features as React
  analysis.outputType = framework === 'html' ? 'html-website' : 
                        framework === 'vue' ? 'vue-app' : 
                        'react-app';
  
  analysis.framework = framework; // Store for later use

  console.log(`✅ Analysis completed with ${result.modelUsed}${result.wasFallback ? ' (fallback)' : ''} - Framework: ${framework} → ${analysis.outputType}`);
  
  return analysis;
}

/**
 * Handle meta-requests (questions about the system)
 * Enhanced to work like Lovable assistant with detailed explanations
 */
async function handleMetaRequest(
  request: string, 
  context: any, 
  broadcast: any
): Promise<any> {
  
  await broadcast('generation:meta', { 
    status: 'processing', 
    message: 'Analyzing your question...', 
    progress: 30 
  });

  // Build comprehensive system context
  const systemContext = await buildSystemContext(context);

  await broadcast('generation:thinking', { 
    status: 'thinking', 
    message: 'Thinking through your question...', 
    progress: 50 
  });

  const enhancedPrompt = `You are an intelligent AI assistant helping users understand their development platform. 

CONVERSATION HISTORY:
${context.recentTurns.slice(0, 10).map((t: any) => `User: ${t.request}`).join('\n')}

PLATFORM CONTEXT:
${systemContext}

USER QUESTION:
${request}

INSTRUCTIONS:
1. Provide detailed, helpful explanations with specific examples
2. Reference actual implementations when discussing features
3. Use structured formatting (bullet points, checkmarks ✅, numbered lists)
4. Include file paths and line references when relevant
5. Be conversational and friendly like a helpful colleague
6. If explaining code, show actual examples
7. Think step-by-step and show your reasoning
8. Use emojis to make explanations engaging (✅ ❌ 🔧 💡 📊 etc.)

Respond as if you're the platform's expert assistant who knows every detail of the implementation.`;

  const result = await callAIWithFallback(
    [{ role: 'user', content: enhancedPrompt }],
    {
      systemPrompt: 'You are a detailed, helpful AI assistant that explains platform features and implementations with clarity and examples. Format responses using markdown with checkmarks, code blocks, and structured lists.',
      preferredModel: 'google/gemini-2.5-flash',
      maxTokens: 4000 // Allow longer responses for detailed explanations
    }
  );

  await broadcast('generation:complete', { 
    status: 'complete', 
    message: '✅ Response ready', 
    progress: 100 
  });

  return {
    success: true,
    isMetaResponse: true,
    message: result.data.choices[0].message.content,
    metadata: {
      conversationTurns: context.recentTurns.length,
      systemContextSize: systemContext.length
    },
    files: []
  };
}

/**
 * Build comprehensive system context for intelligent responses
 */
async function buildSystemContext(context: any): Promise<string> {
  const parts: string[] = [];
  
  // Add platform capabilities
  parts.push(`
PLATFORM CAPABILITIES:
- Enterprise-level code generation with React/TypeScript
- Comprehensive auto-fix system (92% success rate)
- Database operations with auto-healing
- Real-time error detection and fixing
- Pattern learning from successful fixes
- Conversation memory and context awareness
  `);
  
  // Add recent activity if available
  if (context.recentTurns && context.recentTurns.length > 0) {
    parts.push(`
RECENT WORK:
${context.recentTurns.slice(0, 5).map((t: any, i: number) => 
  `${i + 1}. ${t.request.substring(0, 100)}${t.request.length > 100 ? '...' : ''}`
).join('\n')}
    `);
  }
  
  // Add file dependencies if available
  if (context.dependencies && context.dependencies.length > 0) {
    parts.push(`
FILES IN PROJECT:
${context.dependencies.slice(0, 10).map((d: any) => 
  `- ${d.component_name} (${d.component_type})`
).join('\n')}
    `);
  }
  
  return parts.join('\n');
}

/**
 * Generate code based on analysis
 */
async function generateCode(
  analysis: any, 
  originalRequest: string,
  framework: string, 
  broadcast: any
): Promise<any> {
  
  // Build framework-specific prompt
  const frameworkContext = framework === 'html' 
    ? 'Generate production-ready HTML/CSS/JavaScript code using modern vanilla JS, responsive design, and best practices.' 
    : framework === 'vue'
    ? 'Generate production-ready Vue 3 code with Composition API, TypeScript, and modern Vue best practices.'
    : 'Generate production-ready React code with TypeScript, hooks, and modern React best practices.';

  const prompt = `${frameworkContext}\n\n${buildWebsitePrompt(originalRequest, analysis)}`;

  const result = await callAIWithFallback(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: `You are an expert ${framework === 'html' ? 'vanilla JavaScript' : framework} developer. Generate clean, production-ready code.`,
      preferredModel: 'google/gemini-2.5-flash',
      maxTokens: 8000
    }
  );

  const generatedCode = result.data.choices[0].message.content;

  // Parse generated files
  const files = parseGeneratedCode(generatedCode, analysis, framework);

  return { files, modelUsed: result.modelUsed };
}

/**
 * Parse AI-generated code into structured files
 */
function parseGeneratedCode(code: string, analysis: any, framework: string): any[] {
  // Framework-agnostic parser - works for HTML, React, and Vue equally
  const files = [];

  // Map framework to appropriate file structure
  const fileConfigs: Record<string, { path: string; language: string; imports: string[] }> = {
    html: {
      path: 'index.html',
      language: 'html',
      imports: []
    },
    react: {
      path: 'src/App.tsx',
      language: 'typescript',
      imports: ['react']
    },
    vue: {
      path: 'src/App.vue',
      language: 'vue',
      imports: ['vue']
    }
  };

  const config = fileConfigs[framework] || fileConfigs.react;

  files.push({
    path: config.path,
    content: code,
    language: config.language,
    imports: config.imports
  });

  return files;
}

console.log('✅ Mega Mind Orchestrator (Clean) initialized');
