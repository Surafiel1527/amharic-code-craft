import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

// ============= BACKWARD COMPATIBILITY WRAPPER =============
// This function now routes requests to the intelligent-conversation master
// Original functionality is preserved through the master's routing system
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
    const { message, history = [], currentCode, userId, conversationId, projectId, conversationHistory } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const identifier = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።' }),
        { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route to intelligent-conversation master
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔄 chat-generate wrapper - routing to intelligent-conversation');
    
    const { data: masterResponse, error: masterError } = await supabase.functions.invoke('intelligent-conversation', {
      body: {
        message,
        history: history || conversationHistory || [],
        currentCode,
        conversationId,
        projectId
      },
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    });

    if (masterError) throw masterError;

    // Extract response data from master
    const responseData = masterResponse?.data || masterResponse;
    const assistantMessage = responseData?.message || responseData?.content || 'No response generated';
    const extractedCode = responseData?.code || null;

    console.log('✅ chat-generate wrapper - response received from master');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        code: extractedCode 
      }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-generate wrapper:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
