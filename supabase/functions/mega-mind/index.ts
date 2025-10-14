/**
 * UNIVERSAL MEGA MIND EDGE FUNCTION
 * Award-Winning Enterprise AI Development Platform
 * 
 * Single endpoint powered by:
 * - Meta-Cognitive Analyzer (AI determines strategy)
 * - Natural Communicator (AI generates all messages)
 * - Adaptive Executor (Dynamic execution)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MegaMindOrchestrator } from "../_shared/megaMindOrchestrator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      userRequest,
      userId,
      conversationId,
      projectId
    } = await req.json();

    // Initialize Universal Mega Mind
    const megaMind = new MegaMindOrchestrator(supabase, lovableApiKey);

    console.log('🧠 Universal Mega Mind: Processing request', {
      userId,
      conversationId,
      projectId,
      requestLength: userRequest?.length
    });

    // Single unified processing - AI handles everything
    const { analysis, result } = await megaMind.processRequest({
      userRequest,
      userId,
      conversationId,
      projectId
    });

    // Return unified response
    return new Response(
      JSON.stringify({
        success: result.success,
        analysis: {
          intent: analysis.userIntent.primaryGoal,
          complexity: analysis.complexity.level,
          strategy: analysis.executionStrategy.primaryApproach,
          confidence: analysis.confidence
        },
        result: {
          message: result.message,
          output: result.output,
          filesGenerated: result.filesGenerated,
          duration: result.duration
        },
        error: result.error?.message
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[Universal Mega Mind] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
