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
import { UniversalMegaMind } from "../_shared/intelligence/index.ts";

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

    // Initialize Universal Mega Mind with broadcast callback
    const megaMind = new UniversalMegaMind(supabase, lovableApiKey);
    
    // Wire up status broadcasting
    const broadcastCallback = async (status: any) => {
      await broadcastStatus(
        supabase,
        channelId,
        status.message || status.status,
        status.status || 'thinking',
        status.metadata
      );
    };

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
    const result = await megaMind.processRequest({
      userRequest,
      userId,
      conversationId,
      projectId
    });
    
    const analysis = result.analysis;

    // ✅ ENTERPRISE: Save conversation to database for permanent persistence
    console.log('💾 Persisting conversation to database...');
    
    try {
      // 1. Save user message
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userRequest,
          user_id: userId,
          metadata: {
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      
      if (userMsgError) {
        console.error('❌ Failed to save user message:', userMsgError);
      } else {
        console.log('✅ User message saved to database');
      }

      // 2. Save AI response (MUST be AI-generated, no templates)
      if (!result.message) {
        console.error('❌ No AI message generated! This should never happen.');
      }
      
      const { error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: result.message,
          user_id: userId,
          metadata: {
            success: result.success,
            filesGenerated: result.filesGenerated?.length || 0,
            duration: result.duration,
            intent: analysis.understanding.userGoal,
            complexity: analysis.actionPlan.complexity,
            confidence: analysis.meta.confidence,
            error: result.error ? {
              message: typeof result.error === 'string' ? result.error : result.error.message,
              type: 'generation_error'
            } : undefined,
            timestamp: new Date().toISOString()
          },
          generated_code: result.output ? JSON.stringify(result.output) : null
        });
      
      if (aiMsgError) {
        console.error('❌ Failed to save AI message:', aiMsgError);
      } else {
        console.log('✅ AI response saved to database');
      }
    } catch (dbError) {
      console.error('❌ Database persistence error:', dbError);
      // Don't fail the request if DB save fails - just log it
    }

    // Broadcast completion or error - MUST use AI-generated message only
    const finalStatus = result.success ? 'idle' : 'error';
    const errorArray = result.error 
      ? [typeof result.error === 'string' ? result.error : (result.error.message || 'Unknown error')]
      : undefined;
    
    const safeFilesGenerated = result.filesGenerated?.length || 0;
    
    // Critical: result.message MUST be AI-generated by the orchestrator
    if (!result.message) {
      console.error('🚨 CRITICAL: No AI completion message generated!');
    }
    
    await broadcastStatus(
      supabase,
      channelId,
      result.message || '⚠️ Process completed but no AI message was generated',
      finalStatus,
      {
        filesGenerated: safeFilesGenerated,
        duration: result.duration,
        errors: errorArray
      }
    );
    
    // ✅ Add delay to ensure broadcast delivery
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return unified response
    return new Response(
      JSON.stringify({
        success: result.success,
        analysis: {
          intent: analysis.understanding.userGoal,
          complexity: analysis.actionPlan.complexity,
          confidence: analysis.meta.confidence
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
          { errors: [error.message || 'Unknown error occurred'] }
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
