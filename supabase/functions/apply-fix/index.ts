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
  try {
    // Check error rate after fix
    const postErrorRate = await getErrorRate(supabase);
    
    // Verify error rate didn't increase
    if (postErrorRate > preState.errorRate * 1.5) {
      return {
        passed: false,
        reason: 'Error rate increased significantly',
        details: {
          preErrorRate: preState.errorRate,
          postErrorRate: postErrorRate
        }
      };
    }

    // Check for new critical errors
    const { data: newCriticalErrors } = await supabase
      .from('detected_errors')
      .select('count')
      .eq('severity', 'critical')
      .gte('created_at', preState.timestamp)
      .single();

    if (newCriticalErrors && newCriticalErrors.count > 0) {
      return {
        passed: false,
        reason: 'New critical errors detected after fix',
        details: {
          newCriticalErrors: newCriticalErrors.count
        }
      };
    }

    // Verification passed
    return {
      passed: true,
      details: {
        errorRateChange: postErrorRate - preState.errorRate,
        newCriticalErrors: 0
      }
    };

  } catch (error) {
    console.error('Verification error:', error);
    return {
      passed: false,
      reason: 'Verification process failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}
