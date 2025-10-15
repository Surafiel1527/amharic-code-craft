/**
 * Universal Router - Autonomous AI Proxy
 * 
 * Thin proxy layer that routes ALL requests to Universal Mega Mind.
 * AI makes ALL decisions autonomously:
 * - What needs to be done
 * - How to execute it
 * - When to think/plan/validate
 * - How to communicate progress
 * 
 * NO hardcoded routing logic - AI is in full control.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { request, userId, conversationId, projectId, context } = body;

    console.log('🧠 Universal Router → Delegating to Autonomous AI');
    console.log('📋 Workspace Context:', { projectId, conversationId, userId });

    // Simply pass everything to mega-mind
    // AI will autonomously decide:
    // - What the user truly wants
    // - How complex the task is
    // - Whether to think, plan, or act directly
    // - How to communicate progress
    // - What execution strategy to use
    const { data: result, error: megaMindError } = await supabase.functions.invoke('mega-mind', {
      body: {
        request,           // What user wants
        userId,            // Who is asking
        conversationId,    // Conversation context
        projectId,         // Where to work (workspace)
        ...context         // Additional workspace info
      }
    });

    if (megaMindError) {
      console.error('❌ Mega-mind error:', megaMindError);
      throw megaMindError;
    }

    console.log('✅ AI completed autonomously');

    // Return AI's autonomous decisions and results
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Universal Router error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
