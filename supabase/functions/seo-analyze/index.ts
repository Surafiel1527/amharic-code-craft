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

    const { code, optimize } = await req.json();
    
    if (!code) {
      throw new Error('Code is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = optimize
      ? `You are an SEO expert. Optimize the HTML code for search engines by:

1. Adding proper meta tags (title, description, keywords)
2. Adding Open Graph tags for social sharing
3. Adding Twitter Card tags
4. Implementing proper heading structure
5. Adding semantic HTML
6. Adding schema.org structured data (JSON-LD)
7. Optimizing images with proper alt text
8. Adding canonical URLs
9. Ensuring proper internal linking structure
10. Adding meta robots tags

Return ONLY the optimized HTML code without explanations or markdown formatting.`
      : `You are an SEO expert. Analyze the HTML code for SEO optimization opportunities.

Check for:
1. Meta tags (title, description, keywords)
2. Open Graph tags
3. Twitter Card tags
4. Heading structure (h1-h6)
5. Semantic HTML usage
6. Structured data (schema.org)
7. Image optimization (alt text, file names)
8. Internal linking structure
9. Page speed factors
10. Mobile optimization

Return a JSON object with this structure:
{
  "score": <0-100>,
  "issues": [
    {
      "category": "meta|content|technical|performance",
      "severity": "critical|warning|info",
      "issue": "Description of the SEO issue",
      "recommendation": "How to fix it",
      "priority": "high|medium|low"
    }
  ],
  "suggestions": {
    "title": "Suggested title tag (50-60 chars)",
    "description": "Suggested meta description (150-160 chars)",
    "structuredData": "Suggested JSON-LD schema"
  },
  "summary": "Brief SEO analysis summary"
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
          { role: 'user', content: code }
        ],
        temperature: 0.2,
        max_tokens: optimize ? 4000 : 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let result = data.choices[0].message.content;

    if (optimize) {
      // Clean up markdown formatting
      result = result.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      return new Response(
        JSON.stringify({ optimizedCode: result }),
        { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Parse JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = jsonMatch[0];
      }
      const analysis = JSON.parse(result);
      
      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in seo-analyze function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'SEO analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
