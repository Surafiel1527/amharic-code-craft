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
    const { code, filePath, framework, testType, projectId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log(`Generating ${testType} tests for ${filePath} using ${framework}`);

    // Call Lovable AI to generate tests
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert test engineer. Generate comprehensive ${testType} tests using ${framework}. 
            
Return ONLY valid ${framework} test code without explanations or markdown formatting.
Use modern best practices and cover edge cases.`
          },
          {
            role: 'user',
            content: `Generate ${testType} tests for this code:\n\nFile: ${filePath}\n\n\`\`\`typescript\n${code}\n\`\`\``
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedTest = aiData.choices[0].message.content;

    // Clean the generated code
    const cleanedTest = cleanTestCode(generatedTest);

    // Store generated test
    const { data: savedTest, error: saveError } = await supabaseClient
      .from('generated_tests')
      .insert({
        user_id: user.id,
        project_id: projectId,
        file_path: filePath,
        test_framework: framework,
        test_code: cleanedTest,
        target_code: code,
        test_type: testType,
        confidence_score: 0.85
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        success: true,
        test: {
          id: savedTest.id,
          code: cleanedTest,
          framework,
          type: testType,
          filePath
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function cleanTestCode(code: string): string {
  // Remove markdown code blocks if present
  let cleaned = code.replace(/```(?:typescript|javascript|ts|js)?\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}
