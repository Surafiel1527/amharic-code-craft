import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phase, userRequest, conversationId, currentCode, plan, suggestedPatterns } = await req.json();
    console.log(`🎯 Phase: ${phase}`);

    if (phase === 'plan') {
      const planPrompt = `Analyze and create architecture plan for: "${userRequest}"
${currentCode ? `\nExisting code: ${currentCode.substring(0, 500)}...` : ''}

Return JSON with: architecture_overview, component_breakdown (array), technology_stack (array), file_structure (object), estimated_complexity, recommended_approach`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: planPrompt }],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const planData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const { data: savedPlan } = await supabase.from('architecture_plans').insert({
        conversation_id: conversationId,
        user_request: userRequest,
        architecture_overview: planData.architecture_overview || '',
        component_breakdown: planData.component_breakdown || [],
        technology_stack: planData.technology_stack || [],
        file_structure: planData.file_structure || {},
        estimated_complexity: planData.estimated_complexity || 'medium',
        recommended_approach: planData.recommended_approach || ''
      }).select().single();

      return new Response(JSON.stringify({ success: true, plan: planData, planId: savedPlan?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (phase === 'generate') {
      const prompt = `Generate code for: "${userRequest}"
${plan ? `\nPlan: ${JSON.stringify(plan)}` : ''}
${suggestedPatterns?.length ? `\nPatterns: ${JSON.stringify(suggestedPatterns)}` : ''}
${currentCode ? `\nEnhance this code:\n${currentCode}` : ''}

Generate complete working HTML/CSS/JS code in <code></code> tags.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
      const code = codeMatch ? codeMatch[1].trim() : aiResponse;

      return new Response(JSON.stringify({ success: true, code, explanation: 'Code generated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error('Invalid phase');
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
