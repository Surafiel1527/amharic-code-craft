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
    const { code, componentName, projectId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are an expert React/TypeScript developer specializing in code refactoring and architecture.

Analyze the provided code and suggest refactoring improvements focusing on:
1. Code complexity reduction
2. Better separation of concerns
3. Performance optimizations
4. Readability improvements
5. Following React best practices
6. TypeScript type safety

Return a JSON object with this structure:
{
  "suggestedCode": "the refactored code",
  "reasoning": "detailed explanation of changes",
  "complexityBefore": estimated complexity score 1-10,
  "complexityAfter": estimated complexity score 1-10,
  "confidenceScore": 0.0-1.0,
  "improvements": ["list", "of", "specific", "improvements"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Refactor this ${componentName}:\n\n${code}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      suggestedCode: content,
      reasoning: 'Refactoring suggestions provided',
      complexityBefore: 7,
      complexityAfter: 4,
      confidenceScore: 0.8,
      improvements: ['Code refactored']
    };

    // Save to database
    const { data: suggestion, error: dbError } = await supabaseClient
      .from('refactoring_suggestions')
      .insert({
        user_id: user.id,
        project_id: projectId,
        component_name: componentName,
        original_code: code,
        suggested_code: parsed.suggestedCode,
        reasoning: parsed.reasoning,
        complexity_before: parsed.complexityBefore,
        complexity_after: parsed.complexityAfter,
        confidence_score: parsed.confidenceScore,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ suggestion, improvements: parsed.improvements }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-refactoring:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});