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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { testSuite = 'all', commitHash } = await req.json();

    console.log(`🧪 Running automated tests for suite: ${testSuite}`);

    const testResults = [];
    const startTime = Date.now();

    // Test 1: Authentication System
    if (testSuite === 'all' || testSuite === 'auth') {
      const authStart = Date.now();
      try {
        // Test user signup
        const { error: signupError } = await supabase.auth.signUp({
          email: `test-${Date.now()}@example.com`,
          password: 'TestPass123!'
        });

        testResults.push({
          test_suite: 'auth',
          test_name: 'user_signup',
          status: signupError ? 'failed' : 'passed',
          duration_ms: Date.now() - authStart,
          error_message: signupError?.message || null
        });
      } catch (error) {
        testResults.push({
          test_suite: 'auth',
          test_name: 'user_signup',
          status: 'failed',
          duration_ms: Date.now() - authStart,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 2: Database Operations
    if (testSuite === 'all' || testSuite === 'database') {
      const dbStart = Date.now();
      try {
        // Test read operation
        const { error: readError } = await supabase
          .from('projects')
          .select('id')
          .limit(1);

        testResults.push({
          test_suite: 'database',
          test_name: 'read_operation',
          status: readError ? 'failed' : 'passed',
          duration_ms: Date.now() - dbStart,
          error_message: readError?.message || null
        });
      } catch (error) {
        testResults.push({
          test_suite: 'database',
          test_name: 'read_operation',
          status: 'failed',
          duration_ms: Date.now() - dbStart,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 3: Edge Functions
    if (testSuite === 'all' || testSuite === 'edge-functions') {
      const edgeStart = Date.now();
      try {
        // Test AI assistant function
        const { error: aiError } = await supabase.functions.invoke('ai-assistant', {
          body: { message: 'test' }
        });

        testResults.push({
          test_suite: 'edge-functions',
          test_name: 'ai_assistant',
          status: aiError ? 'failed' : 'passed',
          duration_ms: Date.now() - edgeStart,
          error_message: aiError?.message || null
        });
      } catch (error) {
        testResults.push({
          test_suite: 'edge-functions',
          test_name: 'ai_assistant',
          status: 'failed',
          duration_ms: Date.now() - edgeStart,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 4: Performance Tests
    if (testSuite === 'all' || testSuite === 'performance') {
      const perfStart = Date.now();
      try {
        // Test query performance
        const queryStart = Date.now();
        await supabase.from('projects').select('*').limit(100);
        const queryTime = Date.now() - queryStart;

        testResults.push({
          test_suite: 'performance',
          test_name: 'query_speed',
          status: queryTime < 100 ? 'passed' : 'failed',
          duration_ms: Date.now() - perfStart,
          error_message: queryTime >= 100 ? `Query too slow: ${queryTime}ms` : null
        });
      } catch (error) {
        testResults.push({
          test_suite: 'performance',
          test_name: 'query_speed',
          status: 'failed',
          duration_ms: Date.now() - perfStart,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Store test results
    for (const result of testResults) {
      await supabase.from('test_results').insert({
        ...result,
        commit_hash: commitHash || 'manual',
        metadata: { test_run_id: crypto.randomUUID() }
      });
    }

    const totalDuration = Date.now() - startTime;
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;

    console.log('✅ Test run complete');
    console.log(`📊 Passed: ${passed}, Failed: ${failed}, Total: ${testResults.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total: testResults.length,
        passed,
        failed,
        duration_ms: totalDuration
      },
      results: testResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in automated-test-runner:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
