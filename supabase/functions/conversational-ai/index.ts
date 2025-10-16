/**
 * Conversational AI Function
 * Handles Q&A, guidance, and help requests WITHOUT triggering code generation
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { loadConversationHistory } from '../_shared/conversationMemory.ts';
import { getResource, detectRequiredResources, generateSetupMessage } from '../_shared/externalResourceGuide.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request, conversationId, userId, context = {} } = await req.json();

    console.log('💬 Conversational AI started', { request: request.substring(0, 100) });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const platformSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Load conversation context
    const conversationContext = await loadConversationHistory(
      platformSupabase,
      conversationId,
      10, // More history for Q&A
      true // Full history mode
    );

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(context, conversationContext);

    // Detect if user is asking about external resources
    const requiredResources = detectRequiredResources(request, []);
    let resourceGuidance = '';
    
    if (requiredResources.length > 0) {
      resourceGuidance = '\n\nDetected External Services:\n' + 
        requiredResources.map(r => generateSetupMessage(r)).join('\n\n');
    }

    // Call Lovable AI for conversational response
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt + resourceGuidance },
          ...(conversationContext.recentTurns || []).flatMap((turn: any) => {
            // Extract messages from turn's request/intent structure
            return [
              { role: 'user', content: turn.request || '' }
            ].filter(m => m.content);
          }),
          { role: 'user', content: request }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    // Save the Q&A to conversation history using resilient wrapper
    const { createResilientDb } = await import('../_shared/resilientDbWrapper.ts');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const resilientDb = createResilientDb(platformSupabase, lovableApiKey);
    
    await resilientDb.insert('messages', {
      conversation_id: conversationId,
      role: 'user',
      content: request,
      user_id: userId,
      metadata: { type: 'question', intentDetected: true }
    });
    
    await resilientDb.insert('messages', {
      conversation_id: conversationId,
      role: 'assistant',
      user_id: userId,
      content: answer,
      metadata: { 
        type: 'conversational_response',
        resourcesDetected: requiredResources.map(r => r.id)
      }
    });

    return new Response(JSON.stringify({ 
      answer,
      type: 'conversational',
      resourcesDetected: requiredResources.length > 0 ? requiredResources : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Conversational AI error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(context: any, conversationContext: any): string {
  const basePrompt = `You are a helpful AI assistant for a development platform. Your role is to:

1. **Answer questions** about how to use features, troubleshoot issues, and understand concepts
2. **Provide guidance** on where to get API keys, set up services, and configure integrations
3. **Explain errors** and suggest solutions without modifying code
4. **Guide users** through debugging and problem-solving

IMPORTANT RULES:
- You are in CONVERSATIONAL mode - do NOT write or modify code
- Provide clear, actionable guidance and explanations
- When users ask "how do I get X", provide step-by-step instructions with links
- When users report errors, help them understand the issue and suggest fixes they can apply
- Be concise but thorough - users want solutions, not essays
- If external services are needed (Stripe, APIs, etc.), explain exactly where and how to get credentials

Current Project Context:
${context.projectId ? `- Project ID: ${context.projectId}` : '- No active project'}
${context.framework ? `- Framework: ${context.framework}` : ''}
${conversationContext.totalTurns ? `- Conversation history: ${conversationContext.totalTurns} messages` : ''}

Remember: You're here to HELP and GUIDE, not to build or modify code.`;

  return basePrompt;
}
