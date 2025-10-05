import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    console.log(`📚 Learning from ${action}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;

    switch (action) {
      case 'learn_from_success':
        result = await learnFromSuccess(supabase, data);
        break;
      
      case 'learn_from_error':
        result = await learnFromError(supabase, data);
        break;
      
      case 'update_confidence':
        result = await updateConfidence(supabase, data);
        break;
      
      case 'search_knowledge':
        result = await searchKnowledge(supabase, data);
        break;

      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Learning error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Learning failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function learnFromSuccess(supabase: any, data: any) {
  const { provider, credentials, connectionName } = data;

  console.log(`✅ Learning from successful connection: ${connectionName}`);

  // Store successful pattern
  const configuration = {
    host: credentials.host,
    port: credentials.port,
    ssl: credentials.ssl,
    connection_type: credentials.connectionType,
    environment: credentials.environment || 'production'
  };

  // Check if similar pattern exists
  const { data: existingPatterns } = await supabase
    .from('database_connection_patterns')
    .select('*')
    .eq('provider', provider)
    .contains('configuration', configuration);

  if (existingPatterns && existingPatterns.length > 0) {
    // Update existing pattern
    const pattern = existingPatterns[0];
    await supabase
      .from('database_connection_patterns')
      .update({
        success_count: pattern.success_count + 1,
        last_success_at: new Date().toISOString()
      })
      .eq('id', pattern.id);

    return { updated: pattern.id, success_count: pattern.success_count + 1 };
  } else {
    // Create new pattern
    const { data: newPattern, error } = await supabase
      .from('database_connection_patterns')
      .insert({
        provider,
        configuration,
        success_count: 1,
        notes: `Successful connection for ${connectionName}`
      })
      .select()
      .single();

    if (error) throw error;

    return { created: newPattern.id };
  }
}

async function learnFromError(supabase: any, data: any) {
  const { provider, errorMessage, errorId, fixApplied, fixWorked } = data;

  console.log(`🔍 Learning from error: ${errorMessage.slice(0, 50)}...`);

  // Use AI to extract knowledge from error
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: 'You are a database expert. Extract knowledge from errors to help prevent future issues. Respond with JSON.' 
        },
        { 
          role: 'user', 
          content: `Analyze this ${provider} database error and create a knowledge base entry:
          
Error: ${errorMessage}
Fix Applied: ${fixApplied ? 'Yes' : 'No'}
Fix Worked: ${fixWorked ? 'Yes' : 'No'}

Provide:
{
  "title": "Brief title",
  "description": "What this error means",
  "solution": "How to fix it",
  "category": "error_resolution|security|optimization|configuration",
  "tags": ["tag1", "tag2"],
  "code_examples": [
    {"description": "Example", "code": "..."}
  ]
}` 
        }
      ],
    }),
  });

  if (!aiResponse.ok) {
    console.error('AI analysis failed');
    return { error: 'AI analysis failed' };
  }

  const aiData = await aiResponse.json();
  const knowledge = JSON.parse(aiData.choices[0].message.content);

  // Check for duplicate knowledge
  const { data: existing } = await supabase
    .from('database_knowledge_base')
    .select('*')
    .eq('provider', provider)
    .eq('title', knowledge.title)
    .single();

  if (existing) {
    // Update existing knowledge
    const newUsageCount = existing.usage_count + 1;
    const newSuccessRate = fixWorked 
      ? ((existing.success_rate * existing.usage_count) + 100) / newUsageCount
      : ((existing.success_rate * existing.usage_count) + 0) / newUsageCount;

    await supabase
      .from('database_knowledge_base')
      .update({
        usage_count: newUsageCount,
        success_rate: newSuccessRate,
        confidence_score: Math.min(100, existing.confidence_score + (fixWorked ? 10 : -5)),
        last_used_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    return { updated: existing.id, success_rate: newSuccessRate };
  } else {
    // Create new knowledge entry
    const { data: newKnowledge, error } = await supabase
      .from('database_knowledge_base')
      .insert({
        provider,
        category: knowledge.category,
        title: knowledge.title,
        description: knowledge.description,
        solution: knowledge.solution,
        learned_from_error_id: errorId,
        code_examples: knowledge.code_examples,
        tags: knowledge.tags,
        success_rate: fixWorked ? 100 : 50,
        confidence_score: fixWorked ? 80 : 40
      })
      .select()
      .single();

    if (error) throw error;

    return { created: newKnowledge.id };
  }
}

async function updateConfidence(supabase: any, data: any) {
  const { knowledgeId, worked } = data;

  const { data: knowledge } = await supabase
    .from('database_knowledge_base')
    .select('*')
    .eq('id', knowledgeId)
    .single();

  if (!knowledge) {
    throw new Error('Knowledge entry not found');
  }

  const confidenceChange = worked ? 5 : -10;
  const newConfidence = Math.max(0, Math.min(100, knowledge.confidence_score + confidenceChange));

  await supabase
    .from('database_knowledge_base')
    .update({
      confidence_score: newConfidence,
      usage_count: knowledge.usage_count + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', knowledgeId);

  return { new_confidence: newConfidence };
}

async function searchKnowledge(supabase: any, data: any) {
  const { provider, category, query } = data;

  let queryBuilder = supabase
    .from('database_knowledge_base')
    .select('*')
    .eq('provider', provider);

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  queryBuilder = queryBuilder
    .order('confidence_score', { ascending: false })
    .order('success_rate', { ascending: false })
    .limit(10);

  const { data: results, error } = await queryBuilder;

  if (error) throw error;

  // Filter by query if provided
  if (query && results) {
    const filtered = results.filter((k: any) => 
      k.title.toLowerCase().includes(query.toLowerCase()) ||
      k.description.toLowerCase().includes(query.toLowerCase()) ||
      k.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
    );
    return filtered;
  }

  return results;
}
