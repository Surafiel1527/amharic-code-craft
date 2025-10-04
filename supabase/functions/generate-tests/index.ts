import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, filePath, testType = 'unit' } = await req.json();
    
    console.log('🧪 Generating', testType, 'tests for', filePath);

    const prompt = `Generate comprehensive ${testType} tests for this code using Vitest and React Testing Library:

\`\`\`${code}\`\`\`

Return ONLY the test code.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    const testCode = data.choices[0].message.content
      .replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();

    return new Response(
      JSON.stringify({ success: true, testCode, testFilePath: filePath.replace(/\.(tsx?|jsx?)$/, '.test.$1') }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
