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

    const { code, autoFix } = await req.json();
    
    if (!code) {
      throw new Error('Code is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = autoFix 
      ? `You are an accessibility expert. Analyze the HTML code and fix ALL WCAG 2.1 Level AA accessibility issues:

1. Add proper ARIA labels and roles
2. Ensure proper heading hierarchy (h1-h6)
3. Add alt text to all images
4. Ensure sufficient color contrast
5. Add keyboard navigation support
6. Add focus indicators
7. Use semantic HTML elements
8. Add skip links where needed
9. Ensure form labels and error messages
10. Add screen reader only text where needed

Return ONLY the fixed HTML code without explanations or markdown formatting.`
      : `You are an accessibility expert. Analyze the HTML code for WCAG 2.1 Level AA compliance issues.

Check for:
1. Missing ARIA labels and roles
2. Improper heading hierarchy
3. Missing alt text on images
4. Poor color contrast
5. Missing keyboard navigation
6. Missing focus indicators
7. Non-semantic HTML
8. Missing form labels
9. Missing skip links
10. Other accessibility issues

Return a JSON object with this structure:
{
  "score": <0-100>,
  "issues": [
    {
      "severity": "critical|warning|info",
      "wcagLevel": "A|AA|AAA",
      "criterion": "WCAG criterion number",
      "issue": "Description of the issue",
      "element": "HTML element or selector",
      "recommendation": "How to fix it"
    }
  ],
  "summary": "Brief overview of accessibility status"
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
        max_tokens: autoFix ? 4000 : 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let result = data.choices[0].message.content;

    if (autoFix) {
      // Clean up markdown formatting
      result = result.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      return new Response(
        JSON.stringify({ fixedCode: result }),
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
    console.error('Error in accessibility-check function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Accessibility check failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
