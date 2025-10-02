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
    const { code, projectId, framework = 'jest' } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are an expert test engineer. Generate comprehensive unit tests for the provided code.

Framework: ${framework}
Requirements:
- Generate complete, runnable test files
- Include test cases for happy paths, edge cases, and error handling
- Add clear test descriptions
- Include setup and teardown if needed
- Aim for high code coverage
- Use best practices for ${framework}

Return ONLY valid ${framework} test code, nothing else.`;

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
          { role: 'user', content: `Generate ${framework} tests for this code:\n\n${code}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const generatedTests = aiData.choices[0].message.content;

    // Estimate coverage (simple heuristic based on test count)
    const testCount = (generatedTests.match(/test\(|it\(/g) || []).length;
    const coverageEstimate = Math.min(95, 30 + (testCount * 8));

    // Save to database
    const { data: testSuite, error: dbError } = await supabaseClient
      .from('test_suites')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name: `Test Suite - ${new Date().toISOString().split('T')[0]}`,
        test_framework: framework,
        code_to_test: code,
        generated_tests: generatedTests,
        coverage_estimate: coverageEstimate,
        status: 'generated'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ 
        testSuite,
        generatedTests,
        coverageEstimate,
        testCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-tests:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});