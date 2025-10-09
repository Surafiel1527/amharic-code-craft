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
      userSupabaseConnection 
    } = await req.json();

    console.log('🚀 Mega Mind Orchestrator started', { 
      request: request.substring(0, 100), 
      conversationId, 
      userId, 
      requestType 
    });

    // Initialize Supabase clients
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const platformSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const userSupabase = userSupabaseConnection 
      ? createClient(userSupabaseConnection.url, userSupabaseConnection.key)
      : null;

    // Load conversation context
    const conversationContext = await loadConversationHistory(platformSupabase, conversationId, 5);
    const dependencies = await loadFileDependencies(platformSupabase, conversationId);

    console.log(`📚 Loaded context: ${conversationContext.totalTurns} turns, ${dependencies.length} dependencies`);

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
      await broadcast('generation:error', { 
        error: error.message || 'Unknown error occurred' 
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
 * Core processing pipeline
 */
async function processRequest(ctx: {
  request: string;
  conversationId: string;
  userId: string;
  requestType: string;
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
    conversationContext,
    platformSupabase,
    userSupabase,
    userSupabaseConnection,
    broadcast 
  } = ctx;

  // Step 1: Analyze request
  await broadcast('generation:thinking', { 
    status: 'analyzing', 
    message: 'Understanding your request...', 
    progress: 5 
  });

  const analysis = await analyzeRequest(request, conversationContext, broadcast);
  
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

  // Step 3: Setup backend if needed
  if (analysis.backendRequirements?.needsDatabase && userSupabase) {
    await setupDatabaseTables(
      analysis,
      userId,
      broadcast,
      userSupabase,
      platformSupabase
    );
  }

  if (analysis.backendRequirements?.needsAuth && userSupabase) {
    await ensureAuthInfrastructure(userSupabase);
  }

  // Step 4: Generate code
  await broadcast('generation:coding', { 
    status: 'generating', 
    message: 'Generating your code...', 
    progress: 40 
  });

  const generatedCode = await generateCode(analysis, request, broadcast);

  // Step 5: AUTO-FIX - Validate and fix code automatically
  await broadcast('generation:validating', { 
    status: 'auto_fixing', 
    message: 'Validating and auto-fixing code...', 
    progress: 70 
  });

  const autoFixResult = await autoFixGeneratedCode(
    generatedCode.files, 
    platformSupabase, 
    userId,
    broadcast
  );

  // Use fixed files if auto-fix succeeded
  if (autoFixResult.success && autoFixResult.fixed) {
    console.log(`✅ Auto-fixed ${autoFixResult.fixedErrorTypes.length} error types in ${autoFixResult.totalAttempts} attempts`);
    generatedCode.files = autoFixResult.fixedFiles.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language === 'typescript' ? 'typescript' : 'javascript',
      imports: [] // Will be extracted later
    }));
    
    await broadcast('generation:auto_fixed', {
      status: 'success',
      message: `✅ Auto-fixed ${autoFixResult.fixedErrorTypes.join(', ')} errors`,
      progress: 75,
      details: {
        attempts: autoFixResult.totalAttempts,
        fixedTypes: autoFixResult.fixedErrorTypes
      }
    });
  } else if (!autoFixResult.success) {
    console.warn('⚠️ Auto-fix could not resolve all errors:', autoFixResult.errors);
    
    await broadcast('generation:validation_warning', {
      status: 'warning',
      message: '⚠️ Some errors remain - please review',
      progress: 75,
      details: {
        errors: autoFixResult.errors,
        warnings: autoFixResult.warnings
      }
    });
  }

  // Step 6: Learn from success
  if (generatedCode.files.length > 0) {
    await storeSuccessfulPattern(platformSupabase, {
      category: analysis.outputType,
      patternName: `${analysis.mainGoal} pattern`,
      useCase: request,
      codeTemplate: JSON.stringify(generatedCode.files[0]),
      context: { 
        analysis, 
        autoFix: {
          success: autoFixResult.success,
          attempts: autoFixResult.totalAttempts,
          fixedTypes: autoFixResult.fixedErrorTypes
        }
      }
    });
  }

  // Step 7: Store file dependencies
  for (const file of generatedCode.files) {
    await storeFileDependency(platformSupabase, {
      conversationId,
      componentName: file.path,
      componentType: file.path.endsWith('.tsx') ? 'component' : 'file',
      dependsOn: file.imports || [],
      usedBy: [],
      complexityScore: Math.floor(file.content.length / 100),
      criticality: 'medium'
    });
  }

  await broadcast('generation:finalizing', { 
    status: 'finalizing', 
    message: 'Preparing your code...', 
    progress: 90 
  });

  return {
    success: true,
    files: generatedCode.files,
    analysis,
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

  console.log(`✅ Analysis completed with ${result.modelUsed}${result.wasFallback ? ' (fallback)' : ''}`);
  
  return analysis;
}

/**
 * Handle meta-requests (questions about the system)
 */
async function handleMetaRequest(
  request: string, 
  context: any, 
  broadcast: any
): Promise<any> {
  
  await broadcast('generation:meta', { 
    status: 'processing', 
    message: 'Analyzing system state...', 
    progress: 50 
  });

  const result = await callAIWithFallback(
    [{ role: 'user', content: `Answer this question about the system: ${request}` }],
    {
      systemPrompt: 'You are a helpful assistant explaining system behavior. Be concise and clear.',
      preferredModel: 'google/gemini-2.5-flash'
    }
  );

  return {
    success: true,
    isMetaResponse: true,
    message: result.data.choices[0].message.content,
    files: []
  };
}

/**
 * Generate code based on analysis
 */
async function generateCode(
  analysis: any, 
  originalRequest: string, 
  broadcast: any
): Promise<any> {
  
  const prompt = buildWebsitePrompt(originalRequest, analysis);

  const result = await callAIWithFallback(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: 'You are an expert web developer. Generate clean, production-ready code.',
      preferredModel: 'google/gemini-2.5-flash',
      maxTokens: 8000
    }
  );

  const generatedCode = result.data.choices[0].message.content;

  // Parse generated files
  const files = parseGeneratedCode(generatedCode, analysis);

  return { files, modelUsed: result.modelUsed };
}

/**
 * Parse AI-generated code into structured files
 */
function parseGeneratedCode(code: string, analysis: any): any[] {
  // Simple parser - in production, this would be more sophisticated
  const files = [];

  if (analysis.outputType === 'html-website') {
    files.push({
      path: 'index.html',
      content: code,
      language: 'html',
      imports: []
    });
  } else if (analysis.outputType === 'react-app') {
    files.push({
      path: 'src/App.tsx',
      content: code,
      language: 'typescript',
      imports: ['react']
    });
  }

  return files;
}

console.log('✅ Mega Mind Orchestrator (Clean) initialized');
