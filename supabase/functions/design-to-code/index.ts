import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const identifier = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።' }),
        { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData, requirements } = await req.json();
    
    if (!imageData) {
      throw new Error('Image data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert web developer who converts design mockups, wireframes, and screenshots into production-ready HTML/CSS code.

Generate clean, semantic HTML with modern CSS that:
1. Matches the design's layout, colors, typography, and spacing
2. Is fully responsive and mobile-friendly
3. Uses semantic HTML5 elements
4. Includes proper accessibility attributes
5. Uses modern CSS (Flexbox, Grid, custom properties)
6. Is well-commented and maintainable

${requirements ? `Additional requirements: ${requirements}` : ''}

Return ONLY the complete HTML code with inline CSS, no explanations or markdown formatting.`;

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
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Convert this design/wireframe/screenshot into production-ready HTML/CSS code:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedCode = data.choices[0].message.content;
    
    // Clean up markdown formatting if present
    generatedCode = generatedCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    return new Response(
      JSON.stringify({ code: generatedCode }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in design-to-code function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Design conversion failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
