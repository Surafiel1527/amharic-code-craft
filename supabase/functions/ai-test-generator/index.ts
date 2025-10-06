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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { filePath, sourceCode, testType = 'unit', projectId } = await req.json();

    console.log('[AI Test Generator] Generating tests for:', filePath);

    // Create generation request
    const { data: request, error: requestError } = await supabaseClient
      .from('test_generation_requests')
      .insert({
        user_id: user.id,
        project_id: projectId,
        file_path: filePath,
        source_code: sourceCode,
        test_type: testType,
        status: 'generating'
      })
      .select()
      .single();

    if (requestError) throw requestError;

    const startTime = Date.now();

    try {
      // Call Lovable AI to generate tests
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Generate comprehensive ${testType} tests for the following code.

File: ${filePath}
Code:
\`\`\`
${sourceCode}
\`\`\`

Generate tests that:
1. Cover all functions and edge cases
2. Test error handling
3. Mock external dependencies
4. Use descriptive test names
5. Include setup and teardown if needed

Return ONLY a JSON array of test objects with this structure:
[{
  "testName": "should do something",
  "testCode": "test('should do something', () => { ... })",
  "assertionsCount": 3,
  "confidenceScore": 0.9
}]`
          }],
          temperature: 0.7
        })
      });

      if (!aiResponse.ok) {
        throw new Error(`AI generation failed: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      const generatedContent = aiData.choices[0].message.content;

      // Extract JSON from response
      const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const generatedTests = JSON.parse(jsonMatch[0]);
      const generationTime = Date.now() - startTime;

      // Update request with results
      await supabaseClient
        .from('test_generation_requests')
        .update({
          status: 'completed',
          generated_tests: generatedTests,
          tests_count: generatedTests.length,
          generation_time_ms: generationTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      // Create test suite if it doesn't exist
      let { data: suite } = await supabaseClient
        .from('test_suites')
        .select('*')
        .eq('project_id', projectId)
        .eq('suite_type', testType)
        .single();

      if (!suite) {
        const { data: newSuite, error: suiteError } = await supabaseClient
          .from('test_suites')
          .insert({
            user_id: user.id,
            project_id: projectId,
            suite_name: `${testType} Tests`,
            suite_type: testType
          })
          .select()
          .single();

        if (suiteError) throw suiteError;
        suite = newSuite;
      }

      // Create test cases
      const testCases = generatedTests.map((test: any) => ({
        suite_id: suite.id,
        user_id: user.id,
        test_name: test.testName,
        test_file_path: filePath.replace(/\.(ts|tsx|js|jsx)$/, `.test.$1`),
        test_code: test.testCode,
        assertions_count: test.assertionsCount || 1,
        confidence_score: test.confidenceScore || 0.8,
        ai_generated: true
      }));

      const { error: casesError } = await supabaseClient
        .from('test_cases')
        .insert(testCases);

      if (casesError) throw casesError;

      // Update suite statistics
      await supabaseClient
        .from('test_suites')
        .update({
          total_tests: suite.total_tests + generatedTests.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', suite.id);

      console.log(`[AI Test Generator] ✓ Generated ${generatedTests.length} tests`);

      return new Response(JSON.stringify({
        success: true,
        requestId: request.id,
        suiteId: suite.id,
        testsGenerated: generatedTests.length,
        generationTimeMs: generationTime,
        tests: generatedTests
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('[AI Test Generator] Generation error:', error);
      
      await supabaseClient
        .from('test_generation_requests')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      throw error;
    }

  } catch (error) {
    console.error('[AI Test Generator] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});