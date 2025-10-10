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

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE events
    const broadcast = async (event: string, data: any) => {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Start processing in background
    processRequest({
      request,
      conversationId,
      userId,
      requestType,
      framework, // Pass framework through
      projectId, // Pass projectId through
      conversationContext,
      dependencies,
      platformSupabase,
      userSupabase,
      userSupabaseConnection,
      broadcast
    }).then(async (result) => {
      await broadcast('generation:complete', result);
      await writer.close();
    }).catch(async (error) => {
      console.error('❌ Generation failed:', error);
      
      // Log failure to production monitoring system with comprehensive details
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
      
      await broadcast('generation:error', { 
        error: error.message || 'Unknown error occurred',
        errorType: errorClassification.category 
      });
      await writer.close();
    });

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

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
      executeGeneration(ctx),
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

  // Step 1: Analyze request
  await broadcast('generation:thinking', { 
    status: 'analyzing', 
    message: '🔍 Understanding your request...', 
    progress: 5 
  });

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
      progress: 10 
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
      progress: 20 
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
        progress: 35
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

  // Step 3: Setup backend if needed
  if (analysis.backendRequirements?.needsDatabase && userSupabase) {
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

  if (analysis.backendRequirements?.needsAuth && userSupabase) {
    await ensureAuthInfrastructure(userSupabase);
  }

  // Step 4: Generate code using framework-specific builders
  await broadcast('generation:coding', { 
    status: 'generating', 
    message: '🔧 Initializing framework-specific builder...', 
    progress: 50 
  });

  console.log(`🏗️ Using ${framework} builder for code generation`);
  
  // Create framework-specific builder
  const frameworkBuilder = FrameworkBuilderFactory.createBuilder(framework);
  
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
  const generatedCode = await frameworkBuilder.generateFiles(buildContext, generationPlan);
  console.log(`✅ Generated ${generatedCode.files.length} files using ${generatedCode.framework} builder`);

  // Step 5: Validate files (framework-specific validation)
  await broadcast('generation:validating', { 
    status: 'validating', 
    message: '🔍 Validating generated files...', 
    progress: 70 
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

  // Step 7: Learn from success
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
  }

  // Step 8: Store file dependencies
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

  await broadcast('generation:finalizing', { 
    status: 'finalizing', 
    message: '📦 Packaging your project...', 
    progress: 85 
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
    backendSetup: analysis.backendRequirements
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
