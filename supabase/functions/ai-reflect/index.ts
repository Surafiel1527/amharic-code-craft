import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generatedCode, userRequest, model } = await req.json();

    if (!generatedCode || !userRequest) {
      throw new Error('Generated code and user request are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // AI reflects on its own work
    const reflectionPrompt = `You just generated this code for a user:

USER REQUEST:
${userRequest}

YOUR GENERATED CODE:
${generatedCode}

Now, critique your own work honestly:

1. **Code Quality Score (1-10):** Rate the overall quality
2. **What could be better?** List specific improvements
3. **What did you miss?** Any edge cases or features overlooked
4. **Best practices violated?** Any anti-patterns or issues
5. **What would an expert do differently?** Senior dev perspective
6. **Potential bugs:** Any obvious issues that might break
7. **Performance concerns:** Any optimization opportunities
8. **Security issues:** Any vulnerabilities or concerns

Be brutally honest. This is for learning.

Return JSON:
{
  "qualityScore": 8,
  "strengths": ["what you did well"],
  "improvements": ["specific things to improve"],
  "missedFeatures": ["what you overlooked"],
  "violations": ["best practices violated"],
  "expertAdvice": "what an expert would do",
  "potentialBugs": ["bugs that might occur"],
  "performance": ["optimization suggestions"],
  "security": ["security concerns"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: reflectionPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI reflection');
    }
    
    const reflection = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        success: true,
        reflection
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-reflect function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});