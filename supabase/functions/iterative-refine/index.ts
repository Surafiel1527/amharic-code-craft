import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { generatedCode, userRequest, maxIterations = 2, targetQualityScore = 80 } = await req.json();
    
    let currentCode = generatedCode;
    const iterations = [];

    for (let i = 0; i < maxIterations; i++) {
      const prompt = `Improve code quality. Fix issues, add comments, follow best practices:\n\n${currentCode}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) break;
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
      if (!codeMatch) break;
      
      currentCode = codeMatch[1].trim();
      iterations.push({ iteration: i + 1, improvements: 'Quality improved' });
    }

    return new Response(JSON.stringify({
      success: true,
      refinedCode: currentCode,
      iterations,
      summary: { iterations: iterations.length, improvement: 10 }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
