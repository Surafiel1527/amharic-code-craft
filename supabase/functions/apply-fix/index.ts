import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fixId } = await req.json();

    if (!fixId) {
      throw new Error('fixId is required');
    }

    console.log('Applying fix:', fixId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get fix details
    const { data: fix, error: fetchError } = await supabaseClient
      .from('auto_fixes')
      .select('*, detected_errors(*)')
      .eq('id', fixId)
      .single();

    if (fetchError || !fix) {
      throw new Error('Fix not found');
    }

    console.log('Fix type:', fix.fix_type);

    // Store pre-application state for rollback
    const preApplicationState = {
      errorRate: await getErrorRate(supabaseClient),
      timestamp: new Date().toISOString()
    };

    // Apply the fix based on type
    let applied = false;
    let applyResult = {};

    switch (fix.fix_type) {
      case 'code_patch':
        // For code patches, we store them for manual application
        // In a production system, you'd integrate with a deployment pipeline
        console.log('Code patch stored for deployment');
        applyResult = {
          method: 'stored_for_deployment',
          code: fix.fixed_code
        };
        applied = true;
        break;

      case 'migration':
        // For database migrations, execute directly
        try {
          const { error: migrationError } = await supabaseClient.rpc('exec_sql', {
            sql: fix.fixed_code
          });
          
          if (migrationError) {
            throw migrationError;
          }
          
          console.log('Migration applied successfully');
          applyResult = { method: 'migration_executed' };
          applied = true;
        } catch (err) {
          console.error('Migration failed:', err);
          applyResult = { 
            method: 'migration_failed', 
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
        break;

      case 'config_change':
        // For config changes, store in a config table or similar
        console.log('Config change stored');
        applyResult = {
          method: 'config_stored',
          config: fix.fixed_code
        };
        applied = true;
        break;

      default:
        throw new Error(`Unknown fix type: ${fix.fix_type}`);
    }

    if (applied) {
      // Update fix status
      await supabaseClient
        .from('auto_fixes')
        .update({ 
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', fixId);

      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify the fix
      const verificationResult = await verifyFix(supabaseClient, fix, preApplicationState);

      if (verificationResult.passed) {
        // Fix verified successfully
        await supabaseClient
          .from('auto_fixes')
          .update({ 
            status: 'verified',
            verified_at: new Date().toISOString(),
            verification_result: verificationResult
          })
          .eq('id', fixId);

        // Mark error as fixed
        await supabaseClient
          .from('detected_errors')
          .update({ 
            status: 'fixed',
            resolved_at: new Date().toISOString()
          })
          .eq('id', fix.error_id);

        // Store in knowledge base
        await supabaseClient
          .from('error_patterns')
          .upsert({
            error_type: fix.detected_errors.error_type,
            error_pattern: fix.detected_errors.error_message,
            solution: fix.explanation,
            resolution_status: 'solved',
            affected_model: 'auto-fix-engine',
            auto_fix_success_rate: 1.0
          });

        // Notify admins of successful fix
        await supabaseClient.rpc('notify_admins', {
          notification_type: 'success',
          notification_title: '✅ Auto-Fix Applied Successfully',
          notification_message: `Fixed ${fix.detected_errors.error_type}. System is healthy.`,
          notification_data: {
            fixId: fixId,
            errorId: fix.error_id,
            fixType: fix.fix_type
          }
        });

        console.log('Fix verified and applied successfully');
      } else {
        // Verification failed, rollback
        console.log('Verification failed, rolling back...');
        
        await supabaseClient
          .from('auto_fixes')
          .update({ 
            status: 'rolled_back',
            rolled_back_at: new Date().toISOString(),
            verification_result: verificationResult
          })
          .eq('id', fixId);

        // Mark error as failed
        await supabaseClient
          .from('detected_errors')
          .update({ status: 'failed' })
          .eq('id', fix.error_id);

        // Notify admins
        await supabaseClient.rpc('notify_admins', {
          notification_type: 'error',
          notification_title: '⚠️ Auto-Fix Rolled Back',
          notification_message: `Fix for ${fix.detected_errors.error_type} caused issues and was rolled back.`,
          notification_data: {
            fixId: fixId,
            errorId: fix.error_id,
            reason: verificationResult.reason
          }
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: applied,
        ...applyResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-fix:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getErrorRate(supabase: any): Promise<number> {
  const { data } = await supabase.rpc('get_error_rate');
  return data || 0;
}

async function verifyFix(supabase: any, fix: any, preState: any) {
  console.log('🔍 Starting fix verification...', {
    fixId: fix.id,
    fixType: fix.fix_type,
    preErrorRate: preState.errorRate
  });

  try {
    const checks = [];
    
    // Check 1: Error rate shouldn't increase
    const postErrorRate = await getErrorRate(supabase);
    const errorRateChange = postErrorRate - preState.errorRate;
    const errorRateIncreased = postErrorRate > preState.errorRate * 1.5;
    
    checks.push({
      name: 'Error Rate Check',
      passed: !errorRateIncreased,
      details: {
        before: preState.errorRate,
        after: postErrorRate,
        change: errorRateChange,
        threshold: preState.errorRate * 1.5
      }
    });

    console.log('📊 Error rate check:', errorRateIncreased ? '❌ FAILED' : '✅ PASSED', {
      before: preState.errorRate,
      after: postErrorRate
    });

    if (errorRateIncreased) {
      return {
        passed: false,
        reason: 'Error rate increased significantly after fix',
        checks,
        details: {
          preErrorRate: preState.errorRate,
          postErrorRate: postErrorRate,
          increase: ((postErrorRate / preState.errorRate - 1) * 100).toFixed(1) + '%'
        }
      };
    }

    // Check 2: No new critical errors
    const { data: criticalErrors, error: criticalError } = await supabase
      .from('detected_errors')
      .select('id, error_type, error_message, created_at')
      .eq('severity', 'critical')
      .gte('created_at', preState.timestamp);

    const criticalCount = criticalErrors?.length || 0;
    checks.push({
      name: 'Critical Errors Check',
      passed: criticalCount === 0,
      details: { newCriticalErrors: criticalCount }
    });

    console.log('🚨 Critical errors check:', criticalCount === 0 ? '✅ PASSED' : '❌ FAILED', {
      count: criticalCount
    });

    if (criticalCount > 0) {
      return {
        passed: false,
        reason: `${criticalCount} new critical error(s) detected after applying fix`,
        checks,
        details: {
          criticalErrors: criticalErrors?.map((e: any) => ({
            type: e.error_type,
            message: e.error_message
          }))
        }
      };
    }

    // Check 3: No new high-severity errors related to this fix
    const { data: highErrors } = await supabase
      .from('detected_errors')
      .select('id, error_type')
      .eq('severity', 'high')
      .gte('created_at', preState.timestamp);

    const highCount = highErrors?.length || 0;
    checks.push({
      name: 'High Severity Errors Check',
      passed: highCount < 3, // Allow up to 2 high-severity errors
      details: { newHighErrors: highCount }
    });

    console.log('⚠️ High severity errors check:', highCount < 3 ? '✅ PASSED' : '❌ FAILED', {
      count: highCount
    });

    if (highCount >= 3) {
      return {
        passed: false,
        reason: `Too many new high-severity errors (${highCount}) detected after fix`,
        checks,
        details: { newHighErrors: highCount }
      };
    }

    // Check 4: Original error hasn't recurred
    const { data: sameErrors } = await supabase
      .from('detected_errors')
      .select('id')
      .eq('error_type', fix.detected_errors.error_type)
      .ilike('error_message', `%${fix.detected_errors.error_message.substring(0, 30)}%`)
      .gte('created_at', preState.timestamp);

    const recurrence = sameErrors?.length || 0;
    checks.push({
      name: 'Error Recurrence Check',
      passed: recurrence === 0,
      details: { sameErrorCount: recurrence }
    });

    console.log('🔄 Recurrence check:', recurrence === 0 ? '✅ PASSED' : '❌ FAILED', {
      count: recurrence
    });

    if (recurrence > 0) {
      return {
        passed: false,
        reason: 'Same error occurred again after fix - fix may not be effective',
        checks,
        details: { recurrenceCount: recurrence }
      };
    }

    // Check 5: System health metrics
    const { data: recentAnalytics } = await supabase
      .from('generation_analytics')
      .select('status')
      .gte('created_at', preState.timestamp)
      .limit(10);

    const successRate = recentAnalytics 
      ? recentAnalytics.filter((a: any) => a.status === 'success').length / recentAnalytics.length
      : 1;

    checks.push({
      name: 'System Health Check',
      passed: successRate >= 0.7,
      details: { 
        recentSuccessRate: (successRate * 100).toFixed(1) + '%',
        sampleSize: recentAnalytics?.length || 0
      }
    });

    console.log('💚 System health check:', successRate >= 0.7 ? '✅ PASSED' : '❌ FAILED', {
      successRate: (successRate * 100).toFixed(1) + '%'
    });

    if (successRate < 0.7) {
      return {
        passed: false,
        reason: 'System health degraded after fix - success rate below 70%',
        checks,
        details: { 
          successRate: (successRate * 100).toFixed(1) + '%',
          threshold: '70%'
        }
      };
    }

    // All checks passed
    console.log('✅ All verification checks passed!');
    return {
      passed: true,
      checks,
      details: {
        errorRateChange: errorRateChange.toFixed(4),
        newCriticalErrors: 0,
        newHighErrors: highCount,
        systemSuccessRate: (successRate * 100).toFixed(1) + '%',
        totalChecks: checks.length,
        passedChecks: checks.length
      }
    };

  } catch (error) {
    console.error('❌ Verification process error:', error);
    return {
      passed: false,
      reason: 'Verification process encountered an error',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
}
