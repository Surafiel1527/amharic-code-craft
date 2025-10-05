import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CICDPayload {
  projectId?: string;
  buildId: string;
  provider: 'github' | 'gitlab' | 'vercel' | 'custom';
  results: {
    eslint?: {
      errorCount: number;
      warningCount: number;
      issues: any[];
    };
    typescript?: {
      errorCount: number;
      diagnostics: any[];
    };
    tests?: {
      passed: number;
      failed: number;
      total: number;
      coverage: number;
      results: any[];
    };
    bundle?: {
      sizeKb: number;
      assets: any[];
    };
  };
  status: 'success' | 'failure' | 'partial';
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: CICDPayload = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 CI/CD webhook received from ${payload.provider} for build ${payload.buildId}`);

    // Calculate overall score
    const eslintScore = payload.results.eslint 
      ? Math.max(0, 100 - (payload.results.eslint.errorCount * 10) - (payload.results.eslint.warningCount * 2))
      : 100;
    
    const tsScore = payload.results.typescript
      ? Math.max(0, 100 - (payload.results.typescript.errorCount * 15))
      : 100;

    const testScore = payload.results.tests
      ? (payload.results.tests.passed / payload.results.tests.total) * 100
      : 100;

    const overallScore = Math.round((eslintScore + tsScore + testScore) / 3);

    // Store validation results
    const { data: validationResult, error: insertError } = await supabaseClient
      .from('validation_results')
      .insert({
        user_id: user.id,
        score: overallScore,
        issues: [
          ...(payload.results.eslint?.issues || []),
          ...(payload.results.typescript?.diagnostics || [])
        ],
        validation_type: 'ci_cd',
        metadata: {
          provider: payload.provider,
          buildId: payload.buildId,
          eslintScore,
          tsScore,
          testScore,
          bundleSize: payload.results.bundle?.sizeKb,
          timestamp: payload.timestamp
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing validation results:', insertError);
      throw insertError;
    }

    // Store test results if present
    if (payload.results.tests) {
      await supabaseClient
        .from('generated_tests')
        .insert({
          user_id: user.id,
          test_code: JSON.stringify(payload.results.tests.results),
          test_framework: 'ci_cd',
          target_file: `build-${payload.buildId}`,
          execution_status: payload.results.tests.failed === 0 ? 'passed' : 'failed',
          execution_time: 0,
          coverage_percentage: payload.results.tests.coverage,
          test_results: payload.results.tests.results
        });
    }

    // Check quality gates
    const { data: qualityGateResponse } = await supabaseClient.functions.invoke(
      'build-quality-gate',
      {
        body: {
          projectId: payload.projectId,
          validationResults: {
            codeQualityScore: overallScore,
            securityIssues: (payload.results.eslint?.issues || []).filter(
              (i: any) => i.severity === 'error' && i.rule?.includes('security')
            ).length,
            criticalIssues: (payload.results.eslint?.errorCount || 0) + (payload.results.typescript?.errorCount || 0),
            testCoverage: payload.results.tests?.coverage
          }
        },
        headers: {
          Authorization: authHeader
        }
      }
    );

    console.log(`✅ CI/CD results processed: score=${overallScore}, passed=${qualityGateResponse?.passed}`);

    return new Response(
      JSON.stringify({
        success: true,
        validationId: validationResult.id,
        score: overallScore,
        qualityGate: qualityGateResponse,
        message: `Build ${payload.buildId} processed successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ CI/CD webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
