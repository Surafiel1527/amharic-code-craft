import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

// ============= BACKWARD COMPATIBILITY WRAPPER =============
// This function now routes requests to the intelligent-conversation master
// Original image generation functionality is preserved through the master
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
    // Rate limiting
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const { prompt } = await req.json();
    console.log('🔄 generate-image wrapper - routing to intelligent-conversation');

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Route to intelligent-conversation master
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: masterResponse, error: masterError } = await supabase.functions.invoke('intelligent-conversation', {
      body: {
        message: `Generate image: ${prompt}`
      },
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    });

    if (masterError) throw masterError;

    // Extract image URL from master response
    const responseData = masterResponse?.data || masterResponse;
    const imageUrl = responseData?.imageUrl || responseData?.response?.imageUrl;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    console.log('✅ generate-image wrapper - image received from master');

    return new Response(
      JSON.stringify({ imageUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
