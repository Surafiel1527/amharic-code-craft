/**
 * Intelligent Code Assistant - Phase 5 Unified Edge Function
 * Implements Master System Prompt with full context awareness
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ContextBuilder } from "../_shared/contextBuilder.ts";
import { MasterPromptBuilder } from "../_shared/masterPromptBuilder.ts";
import { ResponseParser } from "../_shared/responseParser.ts";
import { ChangeApplicator } from "../_shared/changeApplicator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authorization');
    }

    const {
      projectId,
      conversationId,
      userInstruction,
      mode = 'generate', // 'generate' or 'propose'
      proposalId // For confirming proposals
    } = await req.json();

    if (!projectId || !userInstruction) {
      throw new Error('Missing required fields: projectId, userInstruction');
    }

    // Handle proposal confirmation
    if (proposalId) {
      return await handleProposalConfirmation(
        supabaseClient,
        user.id,
        projectId,
        proposalId,
        conversationId
      );
    }

    console.log('🧠 Building project context...');
    const contextBuilder = new ContextBuilder(
      supabaseClient,
      projectId,
      user.id,
      conversationId
    );
    const context = await contextBuilder.buildRichContext();

    console.log('📝 Building master prompt...');
    const promptBuilder = new MasterPromptBuilder();
    const prompt = promptBuilder.buildPrompt(context, userInstruction);

    console.log('🤖 Calling AI with Lovable API...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      throw new Error(`AI API error: ${error}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log('🔍 Parsing AI response...');
    const parser = new ResponseParser();
    const parsed = parser.parse(aiContent);

    // If AI requires confirmation, create proposal
    if (parsed.requiresConfirmation || mode === 'propose') {
      const { data: proposal } = await supabaseClient
        .from('code_proposals')
        .insert({
          project_id: projectId,
          user_id: user.id,
          conversation_id: conversationId,
          proposed_changes: parsed.files,
          proposal_plan: parsed.plan,
          proposal_reasoning: parsed.thought,
          ai_message: parsed.messageToUser
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          requiresConfirmation: true,
          proposalId: proposal.id,
          message: parsed.messageToUser,
          plan: parsed.plan,
          thought: parsed.thought
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply changes immediately
    console.log('✍️ Applying changes...');
    const applicator = new ChangeApplicator(
      supabaseClient,
      projectId,
      user.id
    );

    const result = await applicator.applyChanges(
      parsed.files,
      userInstruction,
      conversationId
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log('✅ Changes applied successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: parsed.messageToUser,
        filesChanged: result.appliedFiles,
        thought: parsed.thought,
        plan: parsed.plan
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-code-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Handle proposal confirmation
 */
async function handleProposalConfirmation(
  supabase: any,
  userId: string,
  projectId: string,
  proposalId: string,
  conversationId?: string
) {
  // Get proposal
  const { data: proposal } = await supabase
    .from('code_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  // Apply changes
  const applicator = new ChangeApplicator(supabase, projectId, userId);
  const result = await applicator.applyChanges(
    proposal.proposed_changes,
    'Confirmed proposal',
    conversationId
  );

  // Update proposal status
  await supabase
    .from('code_proposals')
    .update({
      status: result.success ? 'approved' : 'rejected',
      user_decision: result.success ? 'approved' : 'rejected',
      decided_at: new Date().toISOString()
    })
    .eq('id', proposalId);

  return new Response(
    JSON.stringify({
      success: result.success,
      message: result.success 
        ? 'Proposal applied successfully'
        : `Failed to apply proposal: ${result.error}`,
      filesChanged: result.appliedFiles
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
