import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 Starting proactive health monitoring...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active database connections
    const { data: credentials, error: fetchError } = await supabase
      .from('database_credentials')
      .select('*')
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    console.log(`📊 Monitoring ${credentials?.length || 0} active connections`);

    const results = [];

    for (const credential of credentials || []) {
      const startTime = Date.now();
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      let errorMessage = null;

      try {
        // Test connection
        const testResponse = await fetch(`${supabaseUrl}/functions/v1/test-database-connection`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: credential.provider,
            credentials: credential.credentials
          }),
        });

        const responseTime = Date.now() - startTime;
        const testResult = await testResponse.json();

        if (!testResult.success) {
          status = 'down';
          errorMessage = testResult.error || 'Connection failed';
        } else if (responseTime > 5000) {
          status = 'degraded';
          errorMessage = 'Slow response time detected';
        }

        // Record health check
        const { error: healthError } = await supabase
          .from('database_connection_health')
          .insert({
            credential_id: credential.id,
            status,
            response_time_ms: responseTime,
            error_message: errorMessage,
            metadata: {
              provider: credential.provider,
              connection_name: credential.connection_name
            }
          });

        if (healthError) console.error('Failed to record health:', healthError);

        // Update performance metrics
        await updateDailyMetrics(supabase, credential.id, status === 'healthy', responseTime);

        // Check alert thresholds
        await checkAlerts(supabase, credential, status, responseTime, errorMessage);

        results.push({
          credential_id: credential.id,
          connection_name: credential.connection_name,
          status,
          response_time_ms: responseTime,
          error: errorMessage
        });

      } catch (error) {
        console.error(`Error checking ${credential.connection_name}:`, error);
        
        // Record failed health check
        await supabase
          .from('database_connection_health')
          .insert({
            credential_id: credential.id,
            status: 'down',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });

        results.push({
          credential_id: credential.id,
          connection_name: credential.connection_name,
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('✅ Health monitoring complete');

    return new Response(
      JSON.stringify({
        success: true,
        monitored: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Health monitoring error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Monitoring failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateDailyMetrics(supabase: any, credentialId: string, success: boolean, responseTime: number) {
  const today = new Date().toISOString().split('T')[0];

  // Check if metrics exist for today
  const { data: existing } = await supabase
    .from('database_performance_metrics')
    .select('*')
    .eq('credential_id', credentialId)
    .eq('metric_date', today)
    .single();

  if (existing) {
    // Update existing metrics
    const totalRequests = existing.total_requests + 1;
    const successfulRequests = existing.successful_requests + (success ? 1 : 0);
    const failedRequests = existing.failed_requests + (success ? 0 : 1);
    
    const newAvg = ((existing.avg_response_time_ms * existing.total_requests) + responseTime) / totalRequests;

    await supabase
      .from('database_performance_metrics')
      .update({
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        avg_response_time_ms: Math.round(newAvg),
        min_response_time_ms: Math.min(existing.min_response_time_ms, responseTime),
        max_response_time_ms: Math.max(existing.max_response_time_ms, responseTime),
        uptime_percentage: (successfulRequests / totalRequests) * 100
      })
      .eq('id', existing.id);
  } else {
    // Create new metrics
    await supabase
      .from('database_performance_metrics')
      .insert({
        credential_id: credentialId,
        metric_date: today,
        total_requests: 1,
        successful_requests: success ? 1 : 0,
        failed_requests: success ? 0 : 1,
        avg_response_time_ms: responseTime,
        min_response_time_ms: responseTime,
        max_response_time_ms: responseTime,
        uptime_percentage: success ? 100 : 0
      });
  }
}

async function checkAlerts(supabase: any, credential: any, status: string, responseTime: number, errorMessage: string | null) {
  // Get alert configurations for this credential
  const { data: alerts } = await supabase
    .from('database_alert_config')
    .select('*')
    .eq('credential_id', credential.id)
    .eq('enabled', true);

  for (const alert of alerts || []) {
    let shouldAlert = false;
    let alertMessage = '';

    switch (alert.alert_type) {
      case 'downtime':
        if (status === 'down') {
          shouldAlert = true;
          alertMessage = `Connection "${credential.connection_name}" is DOWN: ${errorMessage}`;
        }
        break;

      case 'slow_response':
        const threshold = alert.threshold.max_response_time_ms || 3000;
        if (responseTime > threshold) {
          shouldAlert = true;
          alertMessage = `Connection "${credential.connection_name}" is slow: ${responseTime}ms (threshold: ${threshold}ms)`;
        }
        break;

      case 'error_rate':
        // Calculate error rate from recent checks
        const { data: recentChecks } = await supabase
          .from('database_connection_health')
          .select('status')
          .eq('credential_id', credential.id)
          .gte('check_timestamp', new Date(Date.now() - 3600000).toISOString())
          .order('check_timestamp', { ascending: false })
          .limit(10);

        if (recentChecks) {
          const errorCount = recentChecks.filter((c: any) => c.status !== 'healthy').length;
          const errorRate = (errorCount / recentChecks.length) * 100;
          const thresholdRate = alert.threshold.error_rate_percentage || 20;

          if (errorRate >= thresholdRate) {
            shouldAlert = true;
            alertMessage = `High error rate for "${credential.connection_name}": ${errorRate.toFixed(1)}% (threshold: ${thresholdRate}%)`;
          }
        }
        break;
    }

    if (shouldAlert) {
      console.log(`🚨 ALERT: ${alertMessage}`);
      
      // Log alert (would send to notification channels in production)
      await supabase
        .from('database_audit_log')
        .insert({
          user_id: credential.user_id,
          credential_id: credential.id,
          action: 'alert_triggered',
          status: 'warning',
          details: {
            alert_type: alert.alert_type,
            message: alertMessage,
            channels: alert.notification_channels
          }
        });
    }
  }
}
