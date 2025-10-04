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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { patternName, category, issue, solution, codeExample } = await req.json();

    // Store the learned pattern
    const { data: pattern, error } = await supabaseClient
      .from('ai_knowledge_base')
      .insert({
        pattern_name: patternName,
        category: category,
        best_approach: solution,
        code_examples: [codeExample],
        common_mistakes: [issue],
        success_rate: 100,
        learned_from_cases: 1,
        confidence_score: 0.9,
        tags: ['navigation', 'links', 'spa', 'header']
      })
      .select()
      .single();

    if (error) {
      // Pattern might exist, try to get it and update
      const { data: existing } = await supabaseClient
        .from('ai_knowledge_base')
        .select('*')
        .eq('pattern_name', patternName)
        .single();

      if (existing) {
        const newLearnedCases = existing.learned_from_cases + 1;
        const newSuccessRate = (existing.success_rate * existing.learned_from_cases + 100) / newLearnedCases;
        
        const { error: updateError } = await supabaseClient
          .from('ai_knowledge_base')
          .update({
            learned_from_cases: newLearnedCases,
            success_rate: newSuccessRate,
            updated_at: new Date().toISOString()
          })
          .eq('pattern_name', patternName);

        if (updateError) throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, pattern }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error learning pattern:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
