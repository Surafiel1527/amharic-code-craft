import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============= BACKWARD COMPATIBILITY WRAPPER =============
// This function now routes requests to the intelligent-conversation master
// Original orchestration functionality is preserved through the master
// =========================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userRequest, conversationId, currentCode, autoRefine = true, autoLearn = true } = await req.json();

    if (!userRequest) {
      return new Response(
        JSON.stringify({ error: 'userRequest is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('🔄 smart-orchestrator wrapper - routing to intelligent-conversation');

    const orchestrationStart = Date.now();

    // Route to intelligent-conversation master
    const { data: masterResponse, error: masterError } = await supabaseClient.functions.invoke('intelligent-conversation', {
      body: {
        message: userRequest,
        conversationId,
        currentCode,
        projectId: null
      },
      headers: {
        Authorization: authHeader
      }
    });

    if (masterError) throw masterError;

    // Extract response from master
    const responseData = masterResponse?.data || masterResponse;
    const orchestrationTime = Date.now() - orchestrationStart;

    console.log('✅ smart-orchestrator wrapper - response received from master');

    // Format response in expected orchestrator format
    const finalResponse = {
      success: true,
      code: responseData?.code || responseData?.generatedCode,
      plan: responseData?.plan,
      reasoning: responseData?.reasoning,
      reflection: responseData?.reflection,
      proactiveInsights: responseData?.proactiveInsights,
      metadata: {
        totalTime: orchestrationTime,
        ...(responseData?.metadata || {})
      }
    };

    // Record orchestration run
    await supabaseClient
      .from('orchestration_runs')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        request: userRequest,
        status: 'completed',
        phases_completed: [],
        total_duration_ms: orchestrationTime,
        results: finalResponse,
        completed_at: new Date().toISOString()
      });

    console.log(`✨ smart-orchestrator wrapper completed in ${orchestrationTime}ms`);

    return new Response(
      JSON.stringify(finalResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in smart-orchestrator wrapper:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
