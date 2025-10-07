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
      case 'code_review':
        result = await handleCodeReview(params, supabase, req);
        break;
      case 'smart_debug':
        result = await handleSmartDebug(params, supabase, req);
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

async function handleCodeReview(params: any, supabase: any, req: any) {
  const { code, filePath, language = 'typescript', userId } = params;
  if (!code || !filePath) throw new Error('code and filePath required');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Authorization required');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw new Error('Invalid authorization');

  const { data: session, error: sessionError } = await supabase
    .from('code_review_sessions')
    .insert({ user_id: userId || user.id, file_path: filePath, code_content: code, language })
    .select()
    .single();

  if (sessionError || !session) throw new Error('Failed to create review session');

  const { data: learnings } = await supabase
    .from('code_review_learnings')
    .select('*')
    .eq('user_id', userId || user.id)
    .order('confidence_score', { ascending: false })
    .limit(20);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const learningContext = learnings?.length > 0
    ? `\nUser patterns: ${learnings.map((l: any) => `${l.pattern_type}: ${l.pattern_description}`).join(', ')}`
    : '';

  const prompt = `Code review for ${language}:\n\`\`\`${language}\n${code}\n\`\`\`${learningContext}\n\nAnalyze for bugs, security, performance, quality, best practices. Return JSON array of suggestions with: lineNumber, type, severity, title, description, currentCode, suggestedFix, explanation.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: 'You are an expert code reviewer. Respond with JSON array only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) throw new Error(`AI API failed: ${response.status}`);

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  const suggestions = result.suggestions || result || [];

  const suggestionRecords = suggestions.map((s: any) => ({
    session_id: session.id,
    line_number: s.lineNumber,
    suggestion_type: s.type,
    severity: s.severity,
    title: s.title,
    description: s.description,
    current_code: s.currentCode,
    suggested_fix: s.suggestedFix,
    explanation: s.explanation
  }));

  const { data: savedSuggestions } = await supabase
    .from('code_review_suggestions')
    .insert(suggestionRecords)
    .select();

  await supabase
    .from('code_review_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', session.id);

  return {
    sessionId: session.id,
    suggestions: savedSuggestions || suggestions,
    summary: {
      total: suggestions.length,
      critical: suggestions.filter((s: any) => s.severity === 'critical').length,
      warnings: suggestions.filter((s: any) => s.severity === 'warning').length
    }
  };
}

async function handleSmartDebug(params: any, supabase: any, req: any) {
  const { error, context = {}, projectId, userId } = params;
  if (!error?.message) throw new Error('error.message required');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Authorization required');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw new Error('Invalid authorization');

  const { data: runtimeError, error: errorInsertError } = await supabase
    .from('runtime_errors')
    .insert({
      user_id: userId || user.id,
      project_id: projectId,
      error_type: error.type || 'runtime',
      error_message: error.message,
      stack_trace: error.stack,
      file_path: error.file,
      line_number: error.line,
      severity: error.message.toLowerCase().includes('crash') || error.message.toLowerCase().includes('fatal') ? 'critical' : 'error',
      status: 'analyzing'
    })
    .select()
    .single();

  if (errorInsertError || !runtimeError) throw new Error('Failed to store error');

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const analysisPrompt = `Debug this error:\n\nError: ${error.message}\nStack: ${error.stack || 'N/A'}\nFile: ${error.file || 'Unknown'}\n\nContext:\n${context.code ? `Code:\n${context.code.substring(0, 1000)}` : ''}\n\nProvide JSON: { "rootCause": "...", "category": "type-error|null-reference|api-error|logic-error", "affectedComponents": [], "confidence": 0-100, "relatedIssues": [], "preventionStrategy": "..." }`;

  const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: 'You are an expert debugger. Respond with JSON only.' },
        { role: 'user', content: analysisPrompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const analysisData = await analysisResponse.json();
  const analysis = JSON.parse(analysisData.choices[0].message.content);

  const fixPrompt = `Generate 3 fixes for:\n\nError: ${error.message}\nRoot Cause: ${analysis.rootCause}\n\nReturn JSON array: [{ "type": "code-change|dependency|config", "priority": 1, "description": "...", "originalCode": "...", "fixedCode": "...", "explanation": "...", "steps": [] }]`;

  const fixResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a fix generator. Respond with JSON array only.' },
        { role: 'user', content: fixPrompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const fixData = await fixResponse.json();
  const fixResult = JSON.parse(fixData.choices[0].message.content);
  const fixes = fixResult.fixes || fixResult || [];

  await supabase
    .from('runtime_errors')
    .update({ status: 'fixed' })
    .eq('id', runtimeError.id);

  return {
    errorId: runtimeError.id,
    analysis,
    fixes,
    summary: { rootCause: analysis.rootCause, confidence: analysis.confidence, fixesGenerated: fixes.length }
  };
}
