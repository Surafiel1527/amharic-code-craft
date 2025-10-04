import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('Unauthorized: No authorization header');
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      throw new Error('Unauthorized: Invalid token');
    }
    
    console.log('✅ Authenticated user:', user.id);

    const startTime = Date.now();
    const phases: any[] = [];
    let currentResult: any = {};

    // Create orchestration run record
    const { data: runRecord } = await supabaseClient
      .from('orchestration_runs')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        request: userRequest,
        status: 'running'
      })
      .select()
      .single();

    console.log('Starting smart orchestration for:', userRequest);

    // Use smart-diff-update for code changes
    console.log('Generating code update with smart-diff-update...');
    const updateStart = Date.now();
    
    const updateResponse = await supabaseClient.functions.invoke('smart-diff-update', {
      body: {
        userRequest,
        currentCode: currentCode || '',
        conversationId,
        userId: user.id
      }
    });

    if (updateResponse.error) {
      console.error('Update error:', updateResponse.error);
      throw updateResponse.error;
    }
    
    phases.push({ 
      name: 'code_update', 
      duration: Date.now() - updateStart,
      result: updateResponse.data 
    });
    
    currentResult.generatedCode = updateResponse.data.code;
    currentResult.explanation = updateResponse.data.explanation;
    currentResult.changeAnalysis = updateResponse.data.changeAnalysis;

    const totalDuration = Date.now() - startTime;

    // Update orchestration run
    await supabaseClient
      .from('orchestration_runs')
      .update({
        phases_completed: phases.map(p => p.name),
        total_duration_ms: totalDuration,
        status: 'completed',
        results: currentResult,
        completed_at: new Date().toISOString()
      })
      .eq('id', runRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        orchestrationId: runRecord.id,
        phases,
        totalDuration,
        finalCode: currentResult.generatedCode,
        explanation: currentResult.explanation,
        changeAnalysis: currentResult.changeAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Smart orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});