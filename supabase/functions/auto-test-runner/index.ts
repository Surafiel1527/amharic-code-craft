/**
 * Auto Test Runner - Executes auto-generated tests from production failures
 * 
 * Can be triggered:
 * - Manually via API call
 * - By cron (every 6 hours)
 * - On deployment
 * - When new test is generated
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testId, runAll = false, environment = 'production' } = await req.json();
    
    console.log('🧪 Auto Test Runner started', { testId, runAll, environment });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch tests to run
    let query = supabase
      .from('auto_generated_tests')
      .select('*')
      .eq('is_active', true);
    
    if (!runAll && testId) {
      query = query.eq('id', testId);
    }

    const { data: tests, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!tests || tests.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tests to run' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Running ${tests.length} tests...`);

    const results = [];
    for (const test of tests) {
      const startTime = Date.now();
      
      try {
        console.log(`🏃 Running test: ${test.test_name}`);
        
        // Call unified mega-mind with test prompt
        const { data, error } = await supabase.functions.invoke(
          'mega-mind',
          {
            body: {
              request: test.test_prompt,
              requestType: 'generation',
              context: { framework: test.framework },
              userId: 'test-runner'
            }
          }
        );

        const duration = Date.now() - startTime;

        // Validate result against expected behavior
        const passed = validateTestResult(generationResult, test.expected_behavior, genError);
        
        // Log result
        await supabase.from('test_execution_results').insert({
          test_id: test.id,
          passed,
          duration_ms: duration,
          error_message: genError?.message,
          actual_output: generationResult,
          expected_output: test.expected_behavior,
          environment,
          triggered_by: 'auto_test_runner'
        });

        results.push({
          test_name: test.test_name,
          passed,
          duration_ms: duration,
          error: genError?.message
        });

        console.log(`${passed ? '✅' : '❌'} Test ${test.test_name}: ${passed ? 'PASSED' : 'FAILED'}`);

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        await supabase.from('test_execution_results').insert({
          test_id: test.id,
          passed: false,
          duration_ms: duration,
          error_message: errorMessage,
          environment,
          triggered_by: 'auto_test_runner'
        });

        results.push({
          test_name: test.test_name,
          passed: false,
          duration_ms: duration,
          error: errorMessage
        });

        console.error(`❌ Test ${test.test_name} crashed:`, errorMessage);
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    };

    console.log('📊 Test run complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Test runner error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Validates test result against expected behavior
 */
function validateTestResult(result: any, expected: any, error: any): boolean {
  // If there was an error but test expects no failure
  if (error && expected.shouldNotFail) {
    return false;
  }

  // If no result was returned
  if (!result) {
    return false;
  }

  // Check minimum file count
  if (expected.minimumFiles && result.files) {
    if (result.files.length < expected.minimumFiles) {
      return false;
    }
  }

  // Check specific files exist
  if (expected.requiredFiles && result.files) {
    const filePaths = result.files.map((f: any) => f.path);
    for (const requiredFile of expected.requiredFiles) {
      if (!filePaths.includes(requiredFile)) {
        return false;
      }
    }
  }

  // Check for specific error types (should NOT have this error)
  if (expected.errorType && error) {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes(expected.errorType.toLowerCase())) {
      return false;
    }
  }

  return true;
}
