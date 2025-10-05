import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_action, outcome, context = {} } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('Learning from user pattern:', user_action);

    // Analyze the pattern using AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a pattern recognition AI. Analyze user actions and identify reusable patterns.
Return JSON with: pattern_name, pattern_type, confidence (0-100), applicability, optimization_suggestion.`
          },
          {
            role: 'user',
            content: `Action: ${user_action}\nOutcome: ${outcome}\nContext: ${JSON.stringify(context)}`
          }
        ],
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    let analysis;
    try {
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisText);
    } catch {
      analysis = {
        pattern_name: 'Generic Pattern',
        pattern_type: 'workflow',
        confidence: 50,
        applicability: 'General use case',
        optimization_suggestion: analysisText
      };
    }

    // Check if pattern exists
    const { data: existingPattern } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('user_id', user.id)
      .eq('pattern_name', analysis.pattern_name)
      .single();

    let patternData;
    if (existingPattern) {
      // Update existing pattern
      const { data: updated } = await supabase
        .from('learned_patterns')
        .update({
          usage_count: existingPattern.usage_count + 1,
          confidence: Math.min(100, existingPattern.confidence + 5),
          last_used_at: new Date().toISOString(),
          success_rate: outcome === 'success' 
            ? ((existingPattern.success_rate * existingPattern.usage_count + 100) / (existingPattern.usage_count + 1))
            : ((existingPattern.success_rate * existingPattern.usage_count) / (existingPattern.usage_count + 1))
        })
        .eq('id', existingPattern.id)
        .select()
        .single();
      
      patternData = updated;
    } else {
      // Create new pattern
      const { data: created } = await supabase
        .from('learned_patterns')
        .insert({
          user_id: user.id,
          pattern_name: analysis.pattern_name,
          pattern_type: analysis.pattern_type,
          pattern_data: {
            action: user_action,
            context,
            optimization: analysis.optimization_suggestion
          },
          confidence: analysis.confidence,
          success_rate: outcome === 'success' ? 100 : 0,
          usage_count: 1
        })
        .select()
        .single();
      
      patternData = created;
    }

    return new Response(
      JSON.stringify({
        pattern: patternData,
        analysis,
        message: existingPattern ? 'Pattern reinforced' : 'New pattern learned'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in learn-pattern:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
