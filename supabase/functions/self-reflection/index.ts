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
    const { generatedResponse, originalRequest, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Reflection prompt
    const reflectionPrompt = `You are a self-reflection system. Analyze this AI-generated response critically:

ORIGINAL REQUEST: ${originalRequest}

GENERATED RESPONSE: ${generatedResponse}

CONTEXT: ${JSON.stringify(context || {})}

Perform critical self-reflection and provide:
{
  "quality_score": 0.0-1.0,
  "strengths": ["What was done well"],
  "weaknesses": ["What could be improved"],
  "missing_elements": ["What was not addressed"],
  "suggestions": ["Specific improvements"],
  "should_regenerate": true/false,
  "improved_approach": "If regeneration needed, describe better approach"
}

Be honest and critical. The goal is continuous improvement.`;

    // Call Lovable AI for reflection
    const reflectionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a critical self-reflection system. Be honest and thorough in your analysis. Always respond with valid JSON.'
          },
          { role: 'user', content: reflectionPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
    });

    if (!reflectionResponse.ok) {
      const errorText = await reflectionResponse.text();
      console.error('Lovable AI reflection error:', reflectionResponse.status, errorText);
      throw new Error(`Lovable AI reflection failed: ${reflectionResponse.status}`);
    }

    const reflectionData = await reflectionResponse.json();
    const reflectionContent = reflectionData.choices[0].message.content;

    // Parse reflection
    let reflection;
    try {
      reflection = JSON.parse(reflectionContent);
    } catch {
      reflection = {
        quality_score: 0.7,
        raw_reflection: reflectionContent,
        should_regenerate: false
      };
    }

    // Store reflection for learning
    await supabase
      .from('conversation_learnings')
      .insert({
        user_id: context.userId || null,
        pattern_category: 'self_reflection',
        learned_pattern: `Quality score: ${reflection.quality_score} - ${reflection.suggestions?.[0] || 'Reflection completed'}`,
        confidence: reflection.quality_score || 0.7,
        context: { 
          reflection, 
          original_request: originalRequest,
          generated_response: generatedResponse.substring(0, 500) // Truncate for storage
        }
      });

    return new Response(
      JSON.stringify({ 
        reflection,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in self-reflection:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
