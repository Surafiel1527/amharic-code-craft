/**
 * Universal Router - Fast Intent Classification & Routing
 * 
 * Routes requests to the appropriate handler based on complexity:
 * - DIRECT_EDIT: Simple changes (< 2s, ~$0.02)
 * - FEATURE_BUILD: Complex generation (10-30s, ~$0.10)
 * - META_CHAT: Questions/planning (3-5s, ~$0.05)
 * - REFACTOR: Code optimization (30-60s, ~$0.20)
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoutingDecision {
  route: 'DIRECT_EDIT' | 'FEATURE_BUILD' | 'META_CHAT' | 'REFACTOR';
  confidence: number;
  reasoning: string;
  estimatedTime: string;
  estimatedCost: string;
}

/**
 * Fast pattern-based intent classification (no AI needed)
 */
function classifyIntent(request: string, context: any): RoutingDecision {
  const lowerRequest = request.toLowerCase().trim();
  
  // Pattern 1: META_CHAT - Questions about platform/project
  const metaPatterns = [
    /^(what|how|why|can you explain|tell me about|describe|show me)\s/i,
    /what (can|does|is|are)/i,
    /how (do|does|can|to)/i,
    /\?$/
  ];
  
  if (metaPatterns.some(p => p.test(request))) {
    return {
      route: 'META_CHAT',
      confidence: 0.95,
      reasoning: 'Question/information request detected',
      estimatedTime: '3-5s',
      estimatedCost: '$0.05'
    };
  }
  
  // Pattern 2: DIRECT_EDIT - Simple, focused changes
  const directEditPatterns = [
    // Color/style changes
    /^(change|update|make|set)\s+(the\s+)?(background|color|text|font|size|padding|margin)/i,
    /^(change|update)\s+\w+\s+(color|to|from)/i,
    
    // Simple text changes
    /^(change|update|replace)\s+(text|title|heading|label|button\s+text)/i,
    
    // Simple visibility/state changes
    /^(show|hide|remove|add)\s+(the\s+)?\w+$/i,
    
    // Single-line changes (detected by brevity + action words)
    /^(fix|update|change|remove|add)\s+[\w\s]{1,30}$/i
  ];
  
  const wordCount = request.split(/\s+/).length;
  const hasSimpleAction = /^(change|update|fix|add|remove)\s/i.test(request);
  const isShort = wordCount <= 10;
  
  if (directEditPatterns.some(p => p.test(request)) || (hasSimpleAction && isShort)) {
    return {
      route: 'DIRECT_EDIT',
      confidence: 0.90,
      reasoning: 'Simple, focused change detected',
      estimatedTime: '< 2s',
      estimatedCost: '$0.02'
    };
  }
  
  // Pattern 3: REFACTOR - Optimization requests
  const refactorPatterns = [
    /^(refactor|optimize|improve|restructure|reorganize)/i,
    /(clean up|tidy|better structure|more efficient)/i,
    /make.*better/i
  ];
  
  if (refactorPatterns.some(p => p.test(request))) {
    return {
      route: 'REFACTOR',
      confidence: 0.85,
      reasoning: 'Code optimization request detected',
      estimatedTime: '30-60s',
      estimatedCost: '$0.20'
    };
  }
  
  // Pattern 4: FEATURE_BUILD - Everything else (complex generation)
  return {
    route: 'FEATURE_BUILD',
    confidence: 0.80,
    reasoning: 'Complex feature implementation required',
    estimatedTime: '10-30s',
    estimatedCost: '$0.10'
  };
}

/**
 * Route request to appropriate handler
 */
async function routeRequest(
  decision: RoutingDecision,
  request: string,
  context: any,
  supabase: any
): Promise<any> {
  console.log(`🎯 Routing to ${decision.route}:`, decision.reasoning);
  
  const startTime = Date.now();
  
  try {
    switch (decision.route) {
      case 'DIRECT_EDIT':
        // Fast path: Direct surgical edit
        const { data: editData, error: editError } = await supabase.functions.invoke('direct-code-editor', {
          body: {
            request,
            ...context
          }
        });
        
        if (editError) throw editError;
        
        return {
          success: true,
          route: 'DIRECT_EDIT',
          duration: Date.now() - startTime,
          result: editData
        };
        
      case 'META_CHAT':
        // Conversational AI for questions
        const { data: chatData, error: chatError } = await supabase.functions.invoke('conversational-ai', {
          body: {
            request,
            ...context
          }
        });
        
        if (chatError) throw chatError;
        
        return {
          success: true,
          route: 'META_CHAT',
          duration: Date.now() - startTime,
          result: chatData
        };
        
      case 'REFACTOR':
      case 'FEATURE_BUILD':
        // Complex path: Full orchestration
        const { data: orchData, error: orchError } = await supabase.functions.invoke('mega-mind-orchestrator', {
          body: {
            request,
            requestType: decision.route === 'REFACTOR' ? 'refactor' : 'generation',
            operationMode: context.projectId ? 'modify' : 'generate',
            ...context
          }
        });
        
        if (orchError) throw orchError;
        
        return {
          success: true,
          route: decision.route,
          duration: Date.now() - startTime,
          result: orchData
        };
        
      default:
        throw new Error(`Unknown route: ${decision.route}`);
    }
  } catch (error) {
    console.error(`❌ Routing failed for ${decision.route}:`, error);
    throw error;
  }
}

/**
 * Main request handler with Phase 2 enhancements
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
      context = {}
    } = body;

    console.log('🚀 Universal Router (Phase 2):', { 
      request: request.substring(0, 50) + '...',
      projectId
    });

    // Initialize Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // PHASE 2: Check cache first
    const { data: cacheData } = await supabase.functions.invoke('intelligent-cache-manager', {
      body: {
        operation: 'get',
        request,
        context: { projectId, route: null }
      }
    });

    if (cacheData?.cached) {
      console.log('⚡ Returning cached result');
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          result: cacheData.result,
          metrics: {
            duration: 0,
            route: 'CACHED'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fast intent classification (pattern-based, no AI)
    let decision = classifyIntent(request, context);
    
    // PHASE 2: Adjust routing based on user preferences
    if (userId) {
      const { data: prefData } = await supabase.functions.invoke('user-preference-learner', {
        body: {
          operation: 'adjust-routing',
          userId,
          route: decision.route,
          originalConfidence: decision.confidence
        }
      });

      if (prefData?.adjusted) {
        decision = {
          ...decision,
          route: prefData.adjusted.route as any,
          confidence: prefData.adjusted.confidence,
          reasoning: `${decision.reasoning} | ${prefData.adjusted.reasoning}`
        };
        console.log('🧠 Adjusted routing with user preferences:', prefData.adjusted);
      }
    }
    
    console.log(`📊 Classification:`, {
      route: decision.route,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    });

    // Log routing decision
    await supabase.from('routing_decisions').insert({
      user_id: userId,
      conversation_id: conversationId,
      project_id: projectId,
      request_text: request,
      route: decision.route,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      estimated_time: decision.estimatedTime,
      estimated_cost: decision.estimatedCost
    });

    // Step 2: Route to appropriate handler
    const result = await routeRequest(decision, request, {
      conversationId,
      userId,
      projectId,
      context
    }, supabase);

    // Log metrics
    await supabase.from('routing_metrics').insert({
      user_id: userId,
      route: decision.route,
      actual_duration_ms: result.duration,
      success: result.success,
      estimated_time: decision.estimatedTime
    });

    // PHASE 2: Cache successful results
    if (result.success && decision.route !== 'META_CHAT') {
      await supabase.functions.invoke('intelligent-cache-manager', {
        body: {
          operation: 'set',
          request,
          context: { projectId, userId },
          route: decision.route,
          result: result.result,
          ttlMinutes: decision.route === 'DIRECT_EDIT' ? 30 : 60
        }
      });
    }

    // PHASE 2: Record preference feedback
    if (userId) {
      await supabase.functions.invoke('user-preference-learner', {
        body: {
          operation: 'record-feedback',
          userId,
          route: decision.route,
          success: result.success,
          duration: result.duration
        }
      });
    }

    console.log(`✅ Routed successfully to ${decision.route} in ${result.duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        decision,
        result: result.result,
        metrics: {
          duration: result.duration,
          route: decision.route
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Universal Router error:', error);
    
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
