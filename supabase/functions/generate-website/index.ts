import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting based on IP or user identifier
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    const { prompt, userId, projectId } = await req.json();
    console.log('Received prompt:', prompt);
    const startTime = Date.now();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client for tracking
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // A/B Testing: Select prompt based on traffic percentage
    const { data: activePrompts } = await supabaseClient
      .from('prompt_versions')
      .select('system_prompt, version, traffic_percentage')
      .gt('traffic_percentage', 0)
      .order('version', { ascending: false });

    let selectedPrompt = activePrompts?.[0];
    
    if (activePrompts && activePrompts.length > 1) {
      // Weighted random selection based on traffic_percentage
      const random = Math.random() * 100;
      let cumulative = 0;
      
      for (const prompt of activePrompts) {
        cumulative += prompt.traffic_percentage;
        if (random <= cumulative) {
          selectedPrompt = prompt;
          break;
        }
      }
    }

    const promptVersion = selectedPrompt?.version || 'v1.0.0';

    // Use versioned prompt if available, otherwise use default
    const systemPrompt = selectedPrompt?.system_prompt || `You are an expert web developer. Generate complete, beautiful, and modern HTML/CSS code based on the user's description.

CRITICAL LANGUAGE REQUIREMENT:
- **IMPORTANT**: If the user's prompt is in Amharic, generate ALL website content (text, headings, buttons, navigation, descriptions) in AMHARIC
- If the user's prompt is in English, generate content in English
- Always match the language of the generated website to the user's prompt language
- For Amharic content, use natural, appropriate Amharic text for all UI elements

CRITICAL TECHNICAL REQUIREMENTS:
1. Generate a COMPLETE, self-contained HTML page with inline CSS
2. Use modern, beautiful design with gradients, shadows, and animations
3. Make it fully responsive with mobile-first approach
4. Use semantic HTML5 elements
5. Include appropriate meta tags with correct language attribute (lang="am" for Amharic)
6. Use a modern color palette (consider Ethiopian colors: green, yellow, red for Amharic sites)
7. Add smooth transitions and hover effects
8. The design should be production-ready and visually appealing
9. **CRITICAL**: Always include Noto Sans Ethiopic font for Amharic text rendering
10. Add relevant emoji or icons where appropriate

FONT INCLUSION (REQUIRED FOR AMHARIC):
Always include this in the <head> section for Amharic websites:
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap" rel="stylesheet">
And use: font-family: 'Noto Sans Ethiopic', sans-serif; in CSS

IMPORTANT: Return ONLY the raw HTML code without any markdown formatting, code blocks, or explanations. Just the pure HTML starting with <!DOCTYPE html>.`;

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
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let html = data.choices[0].message.content;
    
    // Clean up the HTML if it's wrapped in markdown code blocks
    html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    
    const generationTime = Date.now() - startTime;
    console.log('Generated HTML length:', html.length, 'Time:', generationTime, 'ms');

    // Track successful generation
    if (userId) {
      await supabaseClient
        .from('generation_analytics')
        .insert({
        user_id: userId,
        project_id: projectId,
        prompt_version: promptVersion,
          model_used: 'google/gemini-2.5-flash',
          user_prompt: prompt,
          system_prompt: systemPrompt,
          generated_code: html,
          generation_time_ms: generationTime,
          status: 'success'
        });
    }

    return new Response(
      JSON.stringify({ html }),
      { 
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in generate-website function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    // Track error if userId available
    try {
      const { userId, projectId, prompt } = await req.json();
      if (userId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        
        await supabaseClient
          .from('generation_analytics')
          .insert({
            user_id: userId,
            project_id: projectId,
            prompt_version: 'v1.0.0',
            model_used: 'google/gemini-2.5-flash',
            user_prompt: prompt || 'Error during request',
            system_prompt: '',
            generated_code: '',
            status: 'error',
            error_message: errorMessage
          });
      }
    } catch (trackError) {
      console.error('Error tracking failed generation:', trackError);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
