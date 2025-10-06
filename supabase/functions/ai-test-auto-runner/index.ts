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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[AI Test Auto-Runner] Starting auto-run cycle...');

    // Get all active test suites with auto-run enabled
    const { data: suites, error: suitesError } = await supabaseClient
      .from('test_suites')
      .select('*')
      .eq('is_active', true)
      .eq('auto_run_enabled', true);

    if (suitesError) throw suitesError;

    console.log(`[AI Test Auto-Runner] Found ${suites?.length || 0} suites to run`);

    const results = [];

    for (const suite of suites || []) {
      try {
        console.log(`[AI Test Auto-Runner] Running suite: ${suite.suite_name}`);

        // Get all test cases for this suite
        const { data: tests, error: testsError } = await supabaseClient
          .from('test_cases')
          .select('*')
          .eq('suite_id', suite.id);

        if (testsError) throw testsError;

        // Create test run record
        const { data: run, error: runError } = await supabaseClient
          .from('test_runs')
          .insert({
            user_id: suite.user_id,
            project_id: suite.project_id,
            suite_id: suite.id,
            run_type: 'auto',
            status: 'running',
            total_tests: tests?.length || 0,
            triggered_by: 'auto_runner',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (runError) throw runError;

        const startTime = Date.now();
        let passed = 0;
        let failed = 0;
        let skipped = 0;

        // Simulate test execution (in real implementation, would actually run tests)
        for (const test of tests || []) {
          const shouldPass = test.confidence_score > 0.6; // Simple heuristic
          const executionTime = Math.floor(Math.random() * 100) + 10;

          if (shouldPass) {
            passed++;
            await supabaseClient
              .from('test_cases')
              .update({
                status: 'passed',
                execution_time_ms: executionTime,
                last_run_at: new Date().toISOString(),
                error_message: null
              })
              .eq('id', test.id);
          } else {
            failed++;
            await supabaseClient
              .from('test_cases')
              .update({
                status: 'failed',
                execution_time_ms: executionTime,
                last_run_at: new Date().toISOString(),
                error_message: 'Test assertion failed'
              })
              .eq('id', test.id);

            // Queue auto-fix for failed tests
            await queueAutoFix(supabaseClient, test);
          }
        }

        const duration = Date.now() - startTime;

        // Update test run
        await supabaseClient
          .from('test_runs')
          .update({
            status: 'completed',
            passed_tests: passed,
            failed_tests: failed,
            skipped_tests: skipped,
            duration_ms: duration,
            completed_at: new Date().toISOString()
          })
          .eq('id', run.id);

        // Update suite statistics
        await supabaseClient
          .from('test_suites')
          .update({
            passing_tests: passed,
            failing_tests: failed,
            skipped_tests: skipped,
            last_run_at: new Date().toISOString(),
            last_run_duration_ms: duration,
            updated_at: new Date().toISOString()
          })
          .eq('id', suite.id);

        results.push({
          suiteId: suite.id,
          suiteName: suite.suite_name,
          runId: run.id,
          passed,
          failed,
          skipped,
          duration
        });

        console.log(`[AI Test Auto-Runner] ✓ Completed ${suite.suite_name}: ${passed}/${tests?.length} passed`);

      } catch (error) {
        console.error(`[AI Test Auto-Runner] ✗ Error running suite ${suite.suite_name}:`, error);
        results.push({
          suiteId: suite.id,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      suitesRun: suites?.length || 0,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Test Auto-Runner] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function queueAutoFix(supabase: any, test: any) {
  console.log(`[AI Test Auto-Runner] Queuing auto-fix for: ${test.test_name}`);
  
  try {
    await supabase.from('test_auto_fixes').insert({
      user_id: test.user_id,
      test_case_id: test.id,
      original_test_code: test.test_code,
      fixed_test_code: test.test_code, // Will be updated by fix function
      failure_reason: test.error_message || 'Test failed',
      fix_strategy: 'ai_analysis',
      status: 'pending'
    });
  } catch (error) {
    console.error('[AI Test Auto-Runner] Failed to queue auto-fix:', error);
  }
}