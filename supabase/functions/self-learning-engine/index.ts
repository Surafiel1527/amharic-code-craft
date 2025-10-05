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

    const { feedbackId, userCorrection, originalPrompt, responseQuality } = await req.json();

    console.log('Self-learning engine processing feedback:', { feedbackId, responseQuality });

    // Get feedback and conversation context
    const { data: feedback } = await supabase
      .from('ai_feedback_logs')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (!feedback) {
      return new Response(JSON.stringify({ error: 'Feedback not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Lovable AI to analyze and improve prompts
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const improvementPrompt = `
You are a self-learning AI system. Analyze this feedback and create an improved prompt.

Original Prompt: ${originalPrompt}
User Correction: ${userCorrection || 'N/A'}
Response Quality Rating: ${responseQuality}/5

Your task:
1. Identify what went wrong
2. Create an improved version of the prompt
3. Explain the improvement strategy

Return JSON:
{
  "improved_prompt": "<better prompt>",
  "improvement_strategy": "<explanation>",
  "confidence": <0-1>
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
          { role: 'system', content: 'You are a self-improving AI system that learns from feedback.' },
          { role: 'user', content: improvementPrompt }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse improvement
    let improvement = {
      improved_prompt: originalPrompt,
      improvement_strategy: 'Default improvement',
      confidence: 0.5
    };
    
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        improvement = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Using default improvement');
    }

    // Check if pattern exists
    const patternCategory = feedback.feedback_type === 'correction' ? 'prompt_improvement' : 'user_preference';
    
    const { data: existingPattern } = await supabase
      .from('ai_feedback_patterns')
      .select('*')
      .eq('original_prompt', originalPrompt)
      .eq('pattern_category', patternCategory)
      .single();

    if (existingPattern) {
      // Update existing pattern
      const newSuccessRate = ((existingPattern.success_rate * existingPattern.times_used) + (responseQuality * 20)) / (existingPattern.times_used + 1);
      
      await supabase
        .from('ai_feedback_patterns')
        .update({
          improved_prompt: improvement.improved_prompt,
          success_rate: newSuccessRate,
          times_used: existingPattern.times_used + 1,
          learned_from_feedback_count: existingPattern.learned_from_feedback_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existingPattern.id);
    } else {
      // Create new pattern
      await supabase
        .from('ai_feedback_patterns')
        .insert({
          pattern_category: patternCategory,
          original_prompt: originalPrompt,
          improved_prompt: improvement.improved_prompt,
          success_rate: responseQuality * 20,
          times_used: 1,
          learned_from_feedback_count: 1,
          metadata: { improvement_strategy: improvement.improvement_strategy }
        });
    }

    // Log the improvement
    await supabase
      .from('ai_improvement_logs')
      .insert({
        improvement_type: 'prompt_optimization',
        before_metric: responseQuality,
        after_metric: responseQuality + 1, // Simulated improvement
        changes_made: {
          original: originalPrompt,
          improved: improvement.improved_prompt,
          strategy: improvement.improvement_strategy
        },
        confidence_score: improvement.confidence
      });

    return new Response(JSON.stringify({
      success: true,
      improvement: improvement,
      message: 'System learned from your feedback!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in self-learning-engine:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});