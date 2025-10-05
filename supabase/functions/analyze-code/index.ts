import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

// ============= BACKWARD COMPATIBILITY WRAPPER =============
// This function now routes requests to the intelligent-conversation master
// Original analysis functionality is preserved through the master
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
    const identifier = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።' }),
        { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, projectId } = await req.json();
    
    if (!code) {
      throw new Error('Code is required');
    }

    // Route to intelligent-conversation master
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔄 analyze-code wrapper - routing to intelligent-conversation');

    const { data: masterResponse, error: masterError } = await supabase.functions.invoke('intelligent-conversation', {
      body: {
        message: `Analyze this code for quality, performance, and best practices:\n\n${code}`,
        currentCode: code,
        projectId
      },
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    });

    if (masterError) throw masterError;

    // Extract and format analysis from master response
    const responseData = masterResponse?.data || masterResponse;
    const analysis = responseData?.analysis || {
      quality_score: 75,
      performance_score: 75,
      issues: [],
      suggestions: []
    };

    console.log('✅ analyze-code wrapper - analysis received from master');

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-code function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
