import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildRequest {
  projectId?: string;
  buildId?: string;
  deployTarget?: string; // 'vercel', 'netlify', 'custom'
  force?: boolean; // Bypass quality gates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      buildId,
      deployTarget = 'vercel',
      force = false 
    }: BuildRequest = await req.json();

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

    console.log(`🚦 Build request for user ${user.id}, project ${projectId}, force: ${force}`);

    // If force flag is set, skip quality gates
    if (force) {
      console.log('⚠️  Force flag set, bypassing quality gates');
      return new Response(
        JSON.stringify({
          success: true,
          allowed: true,
          bypassed: true,
          message: 'Build allowed (quality gates bypassed)',
          buildId: buildId || crypto.randomUUID()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest validation results for the project
    const { data: latestValidation } = await supabaseClient
      .from('validation_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestValidation) {
      return new Response(
        JSON.stringify({
          success: false,
          allowed: false,
          blocked: true,
          reason: 'no_validation',
          message: 'No code validation found. Run validation before deploying.',
          recommendations: [
            'Run code analysis',
            'Fix any critical issues',
            'Run tests to verify functionality'
          ]
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get quality gate configuration
    const { data: qualityGate } = await supabaseClient
      .from('build_quality_gates')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no quality gate configured, allow build with warning
    if (!qualityGate) {
      console.log('⚠️  No quality gate configured');
      return new Response(
        JSON.stringify({
          success: true,
          allowed: true,
          noGate: true,
          message: 'Build allowed (no quality gates configured)',
          warning: 'Consider configuring quality gates for production deployments',
          buildId: buildId || crypto.randomUUID()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check quality gate criteria
    const violations = [];
    
    if (latestValidation.score < qualityGate.min_code_quality_score) {
      violations.push({
        type: 'code_quality',
        message: `Code quality score ${latestValidation.score} is below minimum ${qualityGate.min_code_quality_score}`,
        severity: 'critical',
        blocking: true
      });
    }

    // Count security issues from validation
    const securityIssues = (latestValidation.issues || []).filter(
      (issue: any) => issue.severity === 'error' && 
      (issue.rule?.includes('security') || issue.message?.toLowerCase().includes('security'))
    ).length;

    if (securityIssues > qualityGate.max_security_issues) {
      violations.push({
        type: 'security',
        message: `Found ${securityIssues} security issues, maximum allowed is ${qualityGate.max_security_issues}`,
        severity: 'critical',
        blocking: true
      });
    }

    // Count critical issues
    const criticalIssues = (latestValidation.issues || []).filter(
      (issue: any) => issue.severity === 'error'
    ).length;

    if (criticalIssues > qualityGate.max_critical_issues) {
      violations.push({
        type: 'critical_issues',
        message: `Found ${criticalIssues} critical issues, maximum allowed is ${qualityGate.max_critical_issues}`,
        severity: 'critical',
        blocking: true
      });
    }

    // Check test requirements
    if (qualityGate.require_tests) {
      const { data: tests } = await supabaseClient
        .from('generated_tests')
        .select('execution_status, coverage_percentage')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tests || tests.execution_status !== 'passed') {
        violations.push({
          type: 'tests',
          message: 'No passing tests found',
          severity: 'critical',
          blocking: true
        });
      } else if ((tests.coverage_percentage || 0) < qualityGate.min_test_coverage) {
        violations.push({
          type: 'test_coverage',
          message: `Test coverage ${tests.coverage_percentage}% is below minimum ${qualityGate.min_test_coverage}%`,
          severity: 'high',
          blocking: qualityGate.block_on_fail
        });
      }
    }

    const blockingViolations = violations.filter(v => v.blocking);
    const blocked = qualityGate.block_on_fail && blockingViolations.length > 0;

    // Log build attempt
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: blocked ? 'build_blocked' : 'build_allowed',
        resource_type: 'deployment',
        resource_id: projectId || null,
        metadata: {
          violations,
          qualityGate: {
            minCodeQuality: qualityGate.min_code_quality_score,
            maxSecurityIssues: qualityGate.max_security_issues,
            maxCriticalIssues: qualityGate.max_critical_issues
          },
          validationScore: latestValidation.score,
          deployTarget
        },
        severity: blocked ? 'high' : 'info'
      });

    if (blocked) {
      console.log(`🚫 Build BLOCKED: ${blockingViolations.length} blocking violations`);
      
      return new Response(
        JSON.stringify({
          success: false,
          allowed: false,
          blocked: true,
          reason: 'quality_gate_failed',
          message: `Build blocked: ${blockingViolations.length} critical violation(s) must be fixed`,
          violations,
          blockingViolations,
          recommendations: [
            'Fix all critical issues',
            'Run code analysis and address errors',
            'Ensure tests pass with required coverage',
            'Use --force flag to bypass (not recommended for production)'
          ],
          qualityGate: {
            minCodeQuality: qualityGate.min_code_quality_score,
            maxSecurityIssues: qualityGate.max_security_issues,
            maxCriticalIssues: qualityGate.max_critical_issues,
            requireTests: qualityGate.require_tests,
            minTestCoverage: qualityGate.min_test_coverage
          },
          currentMetrics: {
            codeQuality: latestValidation.score,
            securityIssues,
            criticalIssues,
            lastValidation: latestValidation.created_at
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Build ALLOWED: ${violations.length} non-blocking warnings`);

    return new Response(
      JSON.stringify({
        success: true,
        allowed: true,
        blocked: false,
        message: violations.length > 0 
          ? `Build allowed with ${violations.length} warning(s)` 
          : 'Build allowed: All quality gates passed',
        violations,
        buildId: buildId || crypto.randomUUID(),
        qualityGate: {
          minCodeQuality: qualityGate.min_code_quality_score,
          maxSecurityIssues: qualityGate.max_security_issues,
          maxCriticalIssues: qualityGate.max_critical_issues
        },
        currentMetrics: {
          codeQuality: latestValidation.score,
          securityIssues,
          criticalIssues,
          lastValidation: latestValidation.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Build blocker error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Build check failed due to internal error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
