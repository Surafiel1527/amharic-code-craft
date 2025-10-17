/**
 * INTELLIGENT DECISION ENGINE API
 * 
 * Makes autonomous decisions between multiple options based on:
 * - Context analysis
 * - Historical patterns
 * - Risk assessment
 * - AI-powered outcome prediction
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  IntelligentDecisionEngine,
  type DecisionOption,
  type DecisionContext 
} from '../_shared/intelligence/intelligentDecisionEngine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤔 [IntelligentDecision] Processing decision request...');
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request
    const { 
      options, 
      context,
      action 
    }: { 
      options?: DecisionOption[], 
      context?: DecisionContext,
      action?: 'make_decision' | 'record_feedback',
      decisionId?: string,
      chosenOptionId?: string,
      wasSuccessful?: boolean,
      feedback?: string
    } = await req.json();

    // Get Lovable API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY') ?? '';
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize decision engine
    const engine = new IntelligentDecisionEngine(supabase, lovableApiKey);

    // Handle different actions
    if (action === 'record_feedback') {
      const { decisionId, chosenOptionId, wasSuccessful, feedback } = await req.json();
      
      if (!decisionId || !chosenOptionId || wasSuccessful === undefined) {
        throw new Error('Missing required fields for feedback');
      }

      await engine.recordUserChoice(decisionId, chosenOptionId, wasSuccessful, feedback);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Feedback recorded successfully'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Default: Make decision
    if (!options || !context) {
      throw new Error('Missing required fields: options and context');
    }

    if (options.length < 2) {
      throw new Error('At least 2 options required for decision-making');
    }

    // Make decision
    const result = await engine.makeDecision(options, context);

    console.log('✅ [IntelligentDecision] Decision made:', {
      bestOption: result.bestOption.name,
      confidence: (result.confidence * 100).toFixed(1) + '%',
      requiresUserInput: result.requiresUserInput
    });

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        decision: {
          bestOption: result.bestOption,
          alternatives: result.allOptions.slice(1, 3), // Top 2 alternatives
          confidence: result.confidence,
          reasoning: result.reasoning,
          requiresUserInput: result.requiresUserInput,
          userInputReason: result.userInputReason
        },
        message: result.requiresUserInput
          ? 'Multiple good options found - your input would help'
          : `Recommendation: ${result.bestOption.name} (${(result.confidence * 100).toFixed(0)}% confidence)`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ [IntelligentDecision] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
