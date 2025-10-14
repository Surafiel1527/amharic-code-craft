/**
 * Multi-Model Orchestrator - Phase 3
 * 
 * Orchestrates code generation across multiple AI models/strategies:
 * - Tries multiple models in parallel or sequence
 * - Quality scores all results
 * - Automatically selects best output
 * - Falls back on failures
 * - Learns from performance
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerationStrategy {
  model: string;
  approach: 'progressive' | 'simple' | 'hybrid';
  timeout: number;
  priority: number;
}

interface GenerationResult {
  success: boolean;
  files: any[];
  qualityScore: number;
  strategy: GenerationStrategy;
  duration: number;
  error?: string;
}

/**
 * Select optimal generation strategies based on request complexity
 */
function selectStrategies(request: string, context: any): GenerationStrategy[] {
  const wordCount = request.split(/\s+/).length;
  const isComplex = wordCount > 50 || context.projectId;
  
  // Define available strategies in priority order
  const strategies: GenerationStrategy[] = [];
  
  if (isComplex) {
    // Complex requests: Try progressive first, then fallback
    strategies.push(
      {
        model: 'google/gemini-2.5-flash',
        approach: 'progressive',
        timeout: 45000,
        priority: 1
      },
      {
        model: 'google/gemini-2.5-pro',
        approach: 'progressive',
        timeout: 60000,
        priority: 2
      },
      {
        model: 'google/gemini-2.5-flash',
        approach: 'simple',
        timeout: 30000,
        priority: 3
      }
    );
  } else {
    // Simple requests: Fast models first
    strategies.push(
      {
        model: 'google/gemini-2.5-flash',
        approach: 'simple',
        timeout: 15000,
        priority: 1
      },
      {
        model: 'google/gemini-2.5-flash-lite',
        approach: 'simple',
        timeout: 10000,
        priority: 2
      },
      {
        model: 'google/gemini-2.5-pro',
        approach: 'simple',
        timeout: 30000,
        priority: 3
      }
    );
  }
  
  return strategies;
}

/**
 * Generate code using a specific strategy
 */
async function generateWithStrategy(
  strategy: GenerationStrategy,
  request: string,
  context: any,
  supabase: any
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔨 Attempting generation with ${strategy.model} (${strategy.approach})`);
    
    // Call the framework builder with the specific model
    const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
      body: {
        request,
        ...context,
        _modelOverride: strategy.model,
        _approachOverride: strategy.approach
      }
    });
    
    if (error) throw error;
    
    // Handle different response formats from mega-mind-orchestrator
    const files = data?.files || data?.generatedCode?.files || data?.result?.files || [];
    
    // Calculate quality score
    const qualityScore = await calculateQualityScore(files, request, supabase);
    
    return {
      success: true,
      files,
      qualityScore,
      strategy,
      duration: Date.now() - startTime,
      metadata: data?.metadata || {}
    };
  } catch (error) {
    console.error(`❌ Strategy ${strategy.model} failed:`, error);
    
    return {
      success: false,
      files: [],
      qualityScore: 0,
      strategy,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate quality score for generated code
 */
async function calculateQualityScore(
  files: any[],
  request: string,
  supabase: any
): Promise<number> {
  // Handle undefined or empty files
  if (!files || !Array.isArray(files) || files.length === 0) {
    return 0;
  }
  
  let score = 0;
  
  // File completeness (30 points)
  score += 30;
  
  // Code structure (20 points)
  const hasMainFile = files.some(f => 
    f.path?.includes('App.tsx') || f.path?.includes('index.html')
  );
  if (hasMainFile) score += 20;
  
  // Infrastructure files (20 points)
  const hasPackageJson = files.some(f => f.path === 'package.json');
  const hasConfig = files.some(f => f.path?.includes('config'));
  if (hasPackageJson) score += 10;
  if (hasConfig) score += 10;
  
  // Code quality (30 points)
  const avgFileSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0) / files.length;
  if (avgFileSize > 100) score += 10; // Not empty files
  if (avgFileSize < 5000) score += 10; // Not too large
  
  const hasImports = files.some(f => f.content?.includes('import'));
  if (hasImports) score += 10;
  
  return Math.min(100, score);
}

/**
 * Main orchestrator - tries multiple strategies and selects best result
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      request, 
      conversationId, 
      userId,
      projectId,
      context = {},
      parallelExecution = false
    } = body;

    console.log('🎯 Multi-Model Orchestrator (Phase 3):', { 
      request: request.substring(0, 50) + '...',
      projectId,
      parallelExecution
    });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Select optimal strategies
    const strategies = selectStrategies(request, { projectId, ...context });
    console.log(`📋 Selected ${strategies.length} generation strategies`);

    let results: GenerationResult[] = [];
    
    if (parallelExecution && strategies.length > 1) {
      // PARALLEL: Try top 2 strategies simultaneously
      console.log('⚡ Running 2 strategies in parallel...');
      
      const parallelResults = await Promise.allSettled([
        generateWithStrategy(strategies[0], request, { conversationId, userId, projectId, context }, supabase),
        generateWithStrategy(strategies[1], request, { conversationId, userId, projectId, context }, supabase)
      ]);
      
      results = parallelResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<GenerationResult>).value);
    } else {
      // SEQUENTIAL: Try strategies one by one until success
      console.log('🔄 Running strategies sequentially with fallback...');
      
      for (const strategy of strategies) {
        const result = await generateWithStrategy(
          strategy,
          request,
          { conversationId, userId, projectId, context },
          supabase
        );
        
        results.push(result);
        
        // If we got a good result (score > 70), stop trying
        if (result.success && result.qualityScore >= 70) {
          console.log(`✅ Strategy ${strategy.model} succeeded with score ${result.qualityScore}`);
          break;
        }
        
        console.log(`⚠️ Strategy ${strategy.model} score: ${result.qualityScore}, trying next...`);
      }
    }

    // Select best result
    const bestResult = results
      .filter(r => r.success)
      .sort((a, b) => b.qualityScore - a.qualityScore)[0];

    if (!bestResult) {
      throw new Error('All generation strategies failed');
    }

    console.log(`🏆 Selected best result: ${bestResult.strategy.model} (${bestResult.qualityScore}/100)`);

    // Log performance metrics
    await supabase.from('model_performance').insert({
      user_id: userId,
      model_name: bestResult.strategy.model,
      approach: bestResult.strategy.approach,
      quality_score: bestResult.qualityScore,
      duration_ms: bestResult.duration,
      success: true,
      request_complexity: request.split(/\s+/).length,
      file_count: bestResult.files.length
    });

    // Log failed attempts for learning
    for (const result of results.filter(r => !r.success || r.qualityScore < 70)) {
      await supabase.from('model_performance').insert({
        user_id: userId,
        model_name: result.strategy.model,
        approach: result.strategy.approach,
        quality_score: result.qualityScore,
        duration_ms: result.duration,
        success: result.success,
        error_message: result.error,
        request_complexity: request.split(/\s+/).length
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        files: bestResult.files,
        qualityScore: bestResult.qualityScore,
        strategy: {
          model: bestResult.strategy.model,
          approach: bestResult.strategy.approach
        },
        metrics: {
          duration: bestResult.duration,
          strategiesTried: results.length,
          alternativeScores: results
            .filter(r => r !== bestResult)
            .map(r => ({ model: r.strategy.model, score: r.qualityScore }))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Multi-Model Orchestrator error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
