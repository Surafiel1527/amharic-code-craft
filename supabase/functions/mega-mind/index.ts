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

/**
 * Broadcast AI-generated status updates to frontend
 */
async function broadcastStatus(
  supabase: any,
  channelId: string,
  message: string,
  status: string = 'thinking',
  metadata?: any
) {
  try {
    const channel = supabase.channel(`ai-status-${channelId}`);
    await channel.send({
      type: 'broadcast',
      event: 'status-update',
      payload: {
        status,
        message,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
    console.log(`📡 Broadcast sent: ${message}`);
  } catch (error) {
    console.error('Failed to broadcast status:', error);
  }
}

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

    const body = await req.json();
    const {
      request: userRequest,  // Frontend sends 'request', alias to 'userRequest'
      userId,
      conversationId,
      projectId
    } = body;

    const channelId = projectId || conversationId;

    // Initialize Universal Mega Mind
    const megaMind = new MegaMindOrchestrator(supabase, lovableApiKey);

    console.log('🧠 Universal Mega Mind: Processing request', {
      userId,
      conversationId,
      projectId,
      requestLength: userRequest?.length
    });

    // Broadcast initial thinking message
    await broadcastStatus(
      supabase,
      channelId,
      "I'm analyzing your request to understand what you need... 🤔",
      'analyzing'
    );

    // Single unified processing - AI handles everything
    const { analysis, result } = await megaMind.processRequest({
      userRequest,
      userId,
      conversationId,
      projectId
    });

    // Broadcast completion or error with AI-generated message
    const statusType = result.success ? 'idle' : 'error';
    const errorDetails = result.error ? [result.error.message || String(result.error)] : undefined;
    
    await broadcastStatus(
      supabase,
      channelId,
      result.message || (result.success ? "All done! Your request has been processed. ✅" : "Something went wrong"),
      statusType,
      {
        filesGenerated: result.filesGenerated,
        duration: result.duration,
        errors: errorDetails
      }
    );

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
    
    // Broadcast error with proper status
    try {
      const bodyClone = await req.clone().json();
      const { conversationId, projectId } = bodyClone;
      const channelId = projectId || conversationId;
      
      if (channelId) {
        await broadcastStatus(
          createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),
          channelId,
          error.message || 'An unexpected error occurred. Please try again.',
          'error',
          { error: error.message }
        );
      }
    } catch {}
    
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
