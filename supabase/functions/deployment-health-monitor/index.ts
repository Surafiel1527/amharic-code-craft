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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running deployment health monitoring...');

    // Get all active deployments (deployed in last 24 hours)
    const { data: deployments, error: deploymentsError } = await supabase
      .from('vercel_deployments' as any)
      .select('id, deployment_url, vercel_deployment_id, user_id')
      .eq('status', 'ready')
      .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (deploymentsError) {
      throw deploymentsError;
    }

    if (!deployments || deployments.length === 0) {
      console.log('No active deployments to monitor');
      return new Response(
        JSON.stringify({ message: 'No active deployments' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Monitoring ${deployments.length} deployments...`);

    // Check health of each deployment
    const healthChecks = await Promise.allSettled(
      deployments.map(async (deployment: any) => {
        if (!deployment.deployment_url) return null;

        const checks = [];

        // Uptime check
        const startTime = Date.now();
        try {
          const response = await fetch(deployment.deployment_url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });

          const responseTime = Date.now() - startTime;
          const status = response.ok ? 'healthy' : 'degraded';

          checks.push({
            deployment_id: deployment.id,
            check_type: 'uptime',
            status,
            response_time_ms: responseTime
          });

          // Response time check
          checks.push({
            deployment_id: deployment.id,
            check_type: 'response_time',
            status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
            response_time_ms: responseTime
          });

          // SSL check
          if (deployment.deployment_url.startsWith('https://')) {
            checks.push({
              deployment_id: deployment.id,
              check_type: 'ssl',
              status: 'healthy',
              response_time_ms: 0
            });
          }

        } catch (error) {
          checks.push({
            deployment_id: deployment.id,
            check_type: 'uptime',
            status: 'unhealthy',
            response_time_ms: Date.now() - startTime,
            error_details: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }

        // Insert health checks
        if (checks.length > 0) {
          await supabase
            .from('deployment_health_checks' as any)
            .insert(checks as any);
        }

        // Check if we need to trigger auto-rollback
        const unhealthyChecks = checks.filter(c => c.status === 'unhealthy');
        if (unhealthyChecks.length > 0) {
          console.log(`Deployment ${deployment.id} has ${unhealthyChecks.length} unhealthy checks`);
          
          // Get recent health check history (last 10 checks)
          const { data: recentChecks } = await supabase
            .from('deployment_health_checks' as any)
            .select('status')
            .eq('deployment_id', deployment.id)
            .order('checked_at', { ascending: false })
            .limit(10);

          // If more than 5 of the last 10 checks failed, trigger rollback
          if (recentChecks) {
            const failedCount = recentChecks.filter((c: any) => c.status === 'unhealthy').length;
            if (failedCount >= 5) {
              console.log(`Triggering auto-rollback for deployment ${deployment.id}`);
              await supabase.rpc('trigger_auto_rollback', {
                p_from_deployment_id: deployment.id,
                p_reason: `Health checks failed: ${failedCount}/10 checks unhealthy`,
                p_triggered_by: 'auto_health_check'
              });
            }
          }
        }

        return { deployment_id: deployment.id, checks };
      })
    );

    const successfulChecks = healthChecks.filter(r => r.status === 'fulfilled' && r.value !== null);
    const failedChecks = healthChecks.filter(r => r.status === 'rejected');

    console.log(`Health monitoring complete: ${successfulChecks.length} successful, ${failedChecks.length} failed`);

    // Record monitoring metrics
    await supabase.rpc('record_system_metric', {
      p_metric_type: 'deployments_monitored',
      p_metric_value: deployments.length,
      p_metadata: {
        successful_checks: successfulChecks.length,
        failed_checks: failedChecks.length
      }
    });

    return new Response(
      JSON.stringify({
        message: 'Health monitoring complete',
        deployments_checked: deployments.length,
        successful: successfulChecks.length,
        failed: failedChecks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Health monitoring error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
