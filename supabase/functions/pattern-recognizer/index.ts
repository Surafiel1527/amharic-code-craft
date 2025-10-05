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

    const { conversationId, codeContext, errorType } = await req.json();

    console.log('Pattern recognizer analyzing:', { conversationId, errorType });

    // Create pattern signature
    const signature = `${errorType}_${codeContext?.substring(0, 100)}`;

    // Check if pattern exists
    const { data: existingPattern } = await supabase
      .from('pattern_recognition_cache')
      .select('*')
      .eq('pattern_type', errorType)
      .eq('pattern_signature', signature)
      .single();

    if (existingPattern) {
      // Update pattern
      await supabase
        .from('pattern_recognition_cache')
        .update({
          occurrence_count: existingPattern.occurrence_count + 1,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', existingPattern.id);

      return new Response(JSON.stringify({
        success: true,
        pattern_recognized: true,
        recommended_action: existingPattern.recommended_action,
        confidence: existingPattern.success_rate / 100
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to analyze new pattern
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const analysisPrompt = `
Analyze this error pattern and recommend a solution:

Error Type: ${errorType}
Code Context: ${codeContext}

Provide:
1. Root cause analysis
2. Recommended fix
3. Prevention strategy

Return JSON:
{
  "root_cause": "<analysis>",
  "recommended_fix": "<fix>",
  "prevention_strategy": "<strategy>"
}
    `;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a pattern recognition system for code errors.' },
          { role: 'user', content: analysisPrompt }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let analysis = {
      root_cause: 'Unknown',
      recommended_fix: 'Manual review required',
      prevention_strategy: 'Add tests'
    };
    
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Using default analysis');
    }

    // Store new pattern
    await supabase
      .from('pattern_recognition_cache')
      .insert({
        pattern_type: errorType,
        pattern_signature: signature,
        recommended_action: analysis
      });

    return new Response(JSON.stringify({
      success: true,
      pattern_recognized: false,
      is_new_pattern: true,
      recommended_action: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pattern-recognizer:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});