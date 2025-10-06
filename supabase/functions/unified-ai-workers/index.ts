import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { operation, ...params } = await req.json();

    console.log('AI Worker Operation:', operation);

    let result;

    switch (operation) {
      case 'chat':
        result = await handleChat(params, supabase);
        break;
      case 'code_generation':
        result = await handleCodeGeneration(params, supabase);
        break;
      case 'debug_assistance':
        result = await handleDebugAssistance(params, supabase);
        break;
      case 'test_generation':
        result = await handleTestGeneration(params, supabase);
        break;
      case 'basic_reasoning':
        result = await handleBasicReasoning(params, supabase);
        break;
      case 'knowledge_retrieval':
        result = await handleKnowledgeRetrieval(params, supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified-ai-workers:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleChat(params: any, supabase: any) {
  const { conversationId, message, context } = params;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant for developers.' },
        { role: 'user', content: message }
      ]
    })
  });

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Store conversation
  await supabase.from('assistant_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: aiResponse
  });

  return { response: aiResponse };
}

async function handleCodeGeneration(params: any, supabase: any) {
  const { prompt, language, context } = params;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `You are a code generation expert. Generate clean, efficient ${language} code.` },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await response.json();
  return { code: data.choices[0].message.content };
}

async function handleDebugAssistance(params: any, supabase: any) {
  const { code, error, context } = params;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const debugPrompt = `
Debug this code error:

Code:
${code}

Error:
${error}

Provide:
1. Root cause
2. Fix suggestion
3. Prevention tips
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a debugging expert.' },
        { role: 'user', content: debugPrompt }
      ]
    })
  });

  const data = await response.json();
  return { analysis: data.choices[0].message.content };
}

async function handleTestGeneration(params: any, supabase: any) {
  const { code, framework } = params;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `Generate comprehensive tests using ${framework}.` },
        { role: 'user', content: `Generate tests for:\n\n${code}` }
      ]
    })
  });

  const data = await response.json();
  return { tests: data.choices[0].message.content };
}

async function handleBasicReasoning(params: any, supabase: any) {
  const { problem, context } = params;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a reasoning assistant. Break down problems step by step.' },
        { role: 'user', content: problem }
      ]
    })
  });

  const data = await response.json();
  return { reasoning: data.choices[0].message.content };
}

async function handleKnowledgeRetrieval(params: any, supabase: any) {
  const { query, category } = params;
  
  // Retrieve from knowledge base
  const { data: knowledge } = await supabase
    .from('ai_knowledge_base')
    .select('*')
    .eq('category', category)
    .or(`pattern_name.ilike.%${query}%,best_approach.ilike.%${query}%`)
    .order('confidence_score', { ascending: false })
    .limit(5);

  return { knowledge: knowledge || [] };
}
