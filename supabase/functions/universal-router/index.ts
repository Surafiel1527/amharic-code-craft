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
  const broadcast = context.broadcast; // Extract broadcast function
  
  try {
    switch (decision.route) {
      case 'DIRECT_EDIT':
        // Fast path: Direct surgical edit
        if (broadcast) {
          await broadcast('route:direct_edit', {
            status: 'editing',
            message: '✏️ Making quick surgical edit...',
            progress: 30
          });
        }
        
        const { data: editData, error: editError } = await supabase.functions.invoke('direct-code-editor', {
          body: {
            request,
            ...context
          }
        });
        
        if (editError) throw editError;
        
        if (broadcast) {
          await broadcast('route:complete', {
            status: 'complete',
            message: '✅ Direct edit complete',
            progress: 100
          });
        }
        
        return {
          success: true,
          route: 'DIRECT_EDIT',
          duration: Date.now() - startTime,
          result: editData
        };
        
      case 'META_CHAT':
        // Conversational AI for questions
        if (broadcast) {
          await broadcast('route:meta_chat', {
            status: 'thinking',
            message: '💭 Analyzing your question...',
            progress: 30
          });
        }
        
        const { data: chatData, error: chatError } = await supabase.functions.invoke('conversational-ai', {
          body: {
            request,
            ...context
          }
        });
        
        if (chatError) throw chatError;
        
        if (broadcast) {
          await broadcast('route:complete', {
            status: 'complete',
            message: '✅ Response ready',
            progress: 100
          });
        }
        
        return {
          success: true,
          route: 'META_CHAT',
          duration: Date.now() - startTime,
          result: chatData
        };
        
      case 'FEATURE_BUILD':
        // 🚀 Phase 3: Use Multi-Model Orchestrator for best quality
        console.log('🎨 Using Multi-Model Orchestrator (Phase 3)');
        
        if (broadcast) {
          await broadcast('orchestration:start', {
            status: 'orchestrating',
            message: '🎯 Selecting optimal AI model...',
            progress: 35
          });
        }
        
        const { data: multiModelData, error: multiModelError } = await supabase.functions.invoke('multi-model-orchestrator', {
          body: {
            request,
            ...context,
            parallelExecution: decision.confidence >= 0.85
          }
        });
        
        if (multiModelError || !multiModelData) {
          console.warn('⚠️ Multi-model orchestrator failed, falling back to mega-mind');
          
          if (broadcast) {
            await broadcast('orchestration:fallback', {
              status: 'retrying',
              message: '🔄 Using fallback strategy...',
              progress: 40
            });
          }
          
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('mega-mind-orchestrator', {
            body: {
              request,
              requestType: 'generation',
              operationMode: context.projectId ? 'modify' : 'generate',
              ...context
            }
          });
          
          if (fallbackError) throw fallbackError;
          
          return {
            success: true,
            route: 'FEATURE_BUILD',
            duration: Date.now() - startTime,
            result: fallbackData,
            usedFallback: true
          };
        }
        
        if (broadcast) {
          await broadcast('orchestration:complete', {
            status: 'validating',
            message: `✅ Generated with ${multiModelData?.strategy?.model || 'AI'} (Quality: ${multiModelData?.qualityScore || 0}/100)`,
            progress: 95
          });
        }
        
        return {
          success: true,
          route: 'FEATURE_BUILD',
          duration: Date.now() - startTime,
          result: multiModelData,
          qualityScore: multiModelData?.qualityScore || 0,
          modelUsed: multiModelData?.strategy?.model || 'unknown'
        };
        
      case 'REFACTOR':
        // Refactoring still uses mega-mind for now
        if (broadcast) {
          await broadcast('route:refactor', {
            status: 'refactoring',
            message: '🔧 Optimizing code structure...',
            progress: 30
          });
        }
        
        const { data: orchData, error: orchError } = await supabase.functions.invoke('mega-mind-orchestrator', {
          body: {
            request,
            requestType: 'refactor',
            operationMode: context.projectId ? 'modify' : 'generate',
            ...context
          }
        });
        
        if (orchError) throw orchError;
        
        if (broadcast) {
          await broadcast('route:complete', {
            status: 'complete',
            message: '✅ Refactoring complete',
            progress: 100
          });
        }
        
        return {
          success: true,
          route: 'REFACTOR',
          duration: Date.now() - startTime,
          result: orchData
        };
        
      default:
        throw new Error(`Unknown route: ${decision.route}`);
    }
  } catch (error) {
    console.error(`❌ Routing failed for ${decision.route}:`, error);
    
    if (broadcast) {
      await broadcast('route:error', {
        status: 'error',
        message: `❌ ${decision.route} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0
      });
    }
    
    throw error;
  }
}

/**
 * Main request handler with Phase 2 enhancements
 */
serve(async (req) => {
  console.log('🔍 [ROUTER FUNCTION] Universal-router received request');
  
  if (req.method === 'OPTIONS') {
    console.log('🔍 [ROUTER FUNCTION] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [UNIVERSAL ROUTER] ====== REQUEST RECEIVED ======');
    const body = await req.json();
    const { 
      request, 
      conversationId, 
      userId,
      projectId,
      context = {}
    } = body;

    console.log('📋 [UNIVERSAL ROUTER] Request details:', { 
      requestPreview: request?.substring(0, 100) + '...',
      hasConversationId: !!conversationId,
      hasUserId: !!userId,
      hasProjectId: !!projectId,
      mode: context.mode
    });

    // Initialize Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 🚀 ENTERPRISE: Create unified broadcast function
    const broadcast = async (eventType: string, data: any) => {
      const channelId = projectId || conversationId;
      if (!channelId) return;
      
      try {
        await supabase.channel(`ai-status-${channelId}`)
          .send({
            type: 'broadcast',
            event: eventType,
            payload: { 
              ...data, 
              timestamp: new Date().toISOString(),
              source: 'universal-router'
            }
          });
        console.log(`📡 [BROADCAST] ${eventType}:`, data.message || data.status);
      } catch (error) {
        console.error('❌ Broadcast failed:', error);
      }
    };

    // Broadcast: Starting routing
    await broadcast('routing:start', {
      status: 'analyzing',
      message: '🔍 Understanding your request...',
      progress: 2
    });

    // 🚀 PHASE 2: Check cache first (autonomous decision gate #1)
    await broadcast('cache:checking', {
      status: 'checking',
      message: '💾 Checking if I\'ve seen this before...',
      progress: 5
    });
    
    const { data: cacheData } = await supabase.functions.invoke('intelligent-cache-manager', {
      body: {
        operation: 'get',
        request,
        context: { projectId, route: null }
      }
    });

    if (cacheData?.cached) {
      console.log('⚡ [CACHE HIT] Returning instant cached result');
      
      await broadcast('cache:hit', {
        status: 'complete',
        message: '⚡ Found it! Using cached result (instant)',
        progress: 100
      });
      
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

    console.log('❌ [CACHE MISS] No cached result found, proceeding with classification');
    
    await broadcast('routing:classifying', {
      status: 'analyzing',
      message: '🎯 Determining best approach...',
      progress: 10
    });

    // 🚀 STEP 1: Fast intent classification (autonomous decision gate #2)
    let decision = classifyIntent(request, context);
    
    console.log(`🤖 [CLASSIFICATION] Initial decision:`, {
      route: decision.route,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    });
    
    // Broadcast classification decision
    await broadcast('routing:classified', {
      status: 'classified',
      message: `✅ Classified as: ${decision.route}`,
      progress: 15,
      decision: {
        route: decision.route,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        estimatedTime: decision.estimatedTime
      }
    });
    
    // 🚀 PHASE 2: Adjust routing with learned preferences (autonomous decision gate #3)
    if (userId) {
      await broadcast('routing:learning', {
        status: 'optimizing',
        message: '🧠 Applying learned preferences...',
        progress: 18
      });
      
      const { data: prefData } = await supabase.functions.invoke('user-preference-learner', {
        body: {
          operation: 'adjust-routing',
          userId,
          route: decision.route,
          originalConfidence: decision.confidence
        }
      });

      if (prefData?.adjusted) {
        console.log('🧠 [LEARNING] Adjusted routing with user preferences:', prefData.adjusted);
        
        decision = {
          ...decision,
          route: prefData.adjusted.route as any,
          confidence: prefData.adjusted.confidence,
          reasoning: `${decision.reasoning} | ${prefData.adjusted.reasoning}`
        };
        
        await broadcast('routing:adjusted', {
          status: 'optimized',
          message: '✨ Applied learned optimizations',
          progress: 20,
          adjustment: prefData.adjusted
        });
      }
    }
    
    console.log(`📊 [FINAL DECISION]`, {
      route: decision.route,
      confidence: decision.confidence,
      estimatedTime: decision.estimatedTime,
      estimatedCost: decision.estimatedCost
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

    // 🚀 STEP 2: Route to appropriate handler with event broadcasting
    await broadcast('routing:executing', {
      status: 'routing',
      message: `🎯 Routing to: ${decision.route}`,
      progress: 25,
      route: decision.route
    });
    
    const result = await routeRequest(decision, request, {
      conversationId,
      userId,
      projectId,
      context,
      broadcast // Pass broadcast function to route handlers
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
