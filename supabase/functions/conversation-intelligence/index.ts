import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadConversationContext, updateConversationContext } from '../_shared/contextHelpers.ts';
import { callLovableAIWithJson } from '../_shared/aiHelpers.ts';
import { INTENT_PARSER_PROMPT, EXECUTION_PLANNER_PROMPT } from '../_shared/aiPrompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Conversation Intelligence Engine
 * Understands complex requests, maintains context, and orchestrates intelligently
 * Makes the platform understand like a human AI assistant
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      userRequest,
      conversationId,
      userId,
      projectId
    } = await req.json();

    console.log('🧠 Conversation Intelligence analyzing request...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // **Step 1: Load Conversation Context**
    const context = await loadConversationContext(supabase, conversationId, userId, projectId);
    console.log('📚 Context loaded:', {
      messagesCount: context.previousMessages.length,
      hasAuth: context.projectState.has_auth,
      hasTodos: context.projectState.generated_features.includes('todos'),
      hasProfiles: context.projectState.has_profiles
    });

    // **Step 2: Parse Intent with AI**
    const intentAnalysis = await callLovableAIWithJson(
      LOVABLE_API_KEY,
      INTENT_PARSER_PROMPT({ ...context.projectState, messages_count: context.previousMessages.length }),
      userRequest,
      { intent: userRequest, primary_action: 'generate', complexity: 'moderate', is_multi_step: false }
    );
    console.log('🎯 Intent parsed:', intentAnalysis);

    // **Step 3: Build Execution Plan**
    const executionPlan = await callLovableAIWithJson(
      LOVABLE_API_KEY,
      EXECUTION_PLANNER_PROMPT(intentAnalysis, context.projectState),
      'Create execution plan',
      { steps: [], total_steps: 0 }
    );
    console.log('📋 Execution plan:', executionPlan);

    // **Step 4: Save Understanding to Context**
    await updateConversationContext(supabase, conversationId, userId, {
      last_request: userRequest,
      intent: intentAnalysis,
      execution_plan: executionPlan,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      understanding: {
        intent: intentAnalysis.intent,
        complexity: intentAnalysis.complexity,
        requires_existing_features: intentAnalysis.dependencies,
        multi_step: intentAnalysis.is_multi_step
      },
      execution_plan: executionPlan,
      context_used: {
        previous_features: context.projectState.generated_features,
        has_auth: context.projectState.has_auth,
        conversation_depth: context.previousMessages.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in conversation-intelligence:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// All helper functions moved to _shared modules for reusability
