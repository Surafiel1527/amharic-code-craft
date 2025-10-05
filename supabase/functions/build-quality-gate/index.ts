import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityGateRequest {
  projectId?: string;
  validationResults: {
    codeQualityScore: number;
    securityIssues: number;
    criticalIssues: number;
    testCoverage?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, validationResults }: QualityGateRequest = await req.json();

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

    console.log(`🚦 Checking quality gate for user ${user.id}`);

    // Get user's quality gate settings
    const { data: qualityGate } = await supabaseClient
      .from('build_quality_gates')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId || null)
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no quality gate is set, allow the build
    if (!qualityGate) {
      console.log('⚠️ No quality gate configured, allowing build');
      return new Response(
        JSON.stringify({
          success: true,
          passed: true,
          message: 'No quality gate configured',
          violations: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check each quality gate criterion
    const violations = [];

    if (validationResults.codeQualityScore < qualityGate.min_code_quality_score) {
      violations.push({
        type: 'code_quality',
        message: `Code quality score ${validationResults.codeQualityScore} is below minimum ${qualityGate.min_code_quality_score}`,
        severity: 'error',
        current: validationResults.codeQualityScore,
        required: qualityGate.min_code_quality_score
      });
    }

    if (validationResults.securityIssues > qualityGate.max_security_issues) {
      violations.push({
        type: 'security',
        message: `Found ${validationResults.securityIssues} security issues, maximum allowed is ${qualityGate.max_security_issues}`,
        severity: 'error',
        current: validationResults.securityIssues,
        required: qualityGate.max_security_issues
      });
    }

    if (validationResults.criticalIssues > qualityGate.max_critical_issues) {
      violations.push({
        type: 'critical',
        message: `Found ${validationResults.criticalIssues} critical issues, maximum allowed is ${qualityGate.max_critical_issues}`,
        severity: 'error',
        current: validationResults.criticalIssues,
        required: qualityGate.max_critical_issues
      });
    }

    if (qualityGate.require_tests && (!validationResults.testCoverage || validationResults.testCoverage < qualityGate.min_test_coverage)) {
      violations.push({
        type: 'test_coverage',
        message: `Test coverage ${validationResults.testCoverage || 0}% is below minimum ${qualityGate.min_test_coverage}%`,
        severity: 'error',
        current: validationResults.testCoverage || 0,
        required: qualityGate.min_test_coverage
      });
    }

    const passed = violations.length === 0;
    const blocked = !passed && qualityGate.block_on_fail;

    console.log(`${passed ? '✅' : '❌'} Quality gate ${passed ? 'passed' : 'failed'} with ${violations.length} violations`);

    return new Response(
      JSON.stringify({
        success: true,
        passed,
        blocked,
        message: passed 
          ? 'All quality gates passed' 
          : `Quality gate failed with ${violations.length} violation(s)`,
        violations,
        qualityGate: {
          minCodeQualityScore: qualityGate.min_code_quality_score,
          maxSecurityIssues: qualityGate.max_security_issues,
          maxCriticalIssues: qualityGate.max_critical_issues,
          requireTests: qualityGate.require_tests,
          minTestCoverage: qualityGate.min_test_coverage,
          blockOnFail: qualityGate.block_on_fail
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Quality gate error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
