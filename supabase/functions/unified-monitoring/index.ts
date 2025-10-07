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

    const { operation, ...params } = await req.json();

    console.log('Monitoring Operation:', operation);

    let result;

    switch (operation) {
      case 'track_metric':
        result = await handleTrackMetric(params, supabase);
        break;
      case 'get_metrics':
        result = await handleGetMetrics(params, supabase);
        break;
      case 'track_error':
        result = await handleTrackError(params, supabase);
        break;
      case 'get_errors':
        result = await handleGetErrors(params, supabase);
        break;
      case 'track_event':
        result = await handleTrackEvent(params, supabase);
        break;
      case 'get_analytics':
        result = await handleGetAnalytics(params, supabase);
        break;
      case 'health_status':
        result = await handleHealthStatus(params, supabase);
        break;
      case 'deployment_health_check':
        result = await handleDeploymentHealthCheck(params, supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified-monitoring:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleTrackMetric(params: any, supabase: any) {
  const { metricType, metricValue, metadata, userId } = params;

  const { data: metric, error } = await supabase
    .from('performance_metrics')
    .insert({
      user_id: userId,
      metric_type: metricType,
      metric_value: metricValue,
      metadata: metadata || {}
    })
    .select()
    .single();

  if (error) throw error;

  return { tracked: true, metricId: metric.id };
}

async function handleGetMetrics(params: any, supabase: any) {
  const { metricType, startDate, endDate, userId } = params;

  let query = supabase
    .from('performance_metrics')
    .select('*')
    .order('created_at', { ascending: false });

  if (metricType) {
    query = query.eq('metric_type', metricType);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: metrics, error } = await query.limit(100);

  if (error) throw error;

  // Calculate aggregations
  const average = metrics.reduce((sum: number, m: any) => sum + (m.metric_value || 0), 0) / (metrics.length || 1);
  const max = Math.max(...metrics.map((m: any) => m.metric_value || 0));
  const min = Math.min(...metrics.map((m: any) => m.metric_value || 0));

  return {
    metrics,
    aggregations: {
      count: metrics.length,
      average,
      max,
      min
    }
  };
}

async function handleTrackError(params: any, supabase: any) {
  const { errorMessage, errorType, severity, context, userId } = params;

  const { data: error, error: insertError } = await supabase
    .from('detected_errors')
    .insert({
      user_id: userId,
      error_type: errorType || 'unknown',
      error_message: errorMessage,
      severity: severity || 'medium',
      context: context || {},
      status: 'new'
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return { tracked: true, errorId: error.id };
}

async function handleGetErrors(params: any, supabase: any) {
  const { severity, status, startDate, userId } = params;

  let query = supabase
    .from('detected_errors')
    .select('*')
    .order('created_at', { ascending: false });

  if (severity) {
    query = query.eq('severity', severity);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  const { data: errors, error } = await query.limit(50);

  if (error) throw error;

  return {
    errors,
    count: errors.length,
    bySeverity: {
      critical: errors.filter((e: any) => e.severity === 'critical').length,
      high: errors.filter((e: any) => e.severity === 'high').length,
      medium: errors.filter((e: any) => e.severity === 'medium').length,
      low: errors.filter((e: any) => e.severity === 'low').length
    }
  };
}

async function handleTrackEvent(params: any, supabase: any) {
  const { eventType, eventData, userId } = params;

  const { data: event, error } = await supabase
    .from('generation_analytics')
    .insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData || {}
    })
    .select()
    .single();

  if (error) throw error;

  return { tracked: true, eventId: event.id };
}

async function handleGetAnalytics(params: any, supabase: any) {
  const { timeRange, groupBy, userId } = params;

  const startDate = new Date();
  startDate.setHours(startDate.getHours() - (timeRange || 24));

  const { data: events, error } = await supabase
    .from('generation_analytics')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group events by type
  const grouped = events.reduce((acc: any, event: any) => {
    const type = event.event_type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(event);
    return acc;
  }, {});

  return {
    totalEvents: events.length,
    timeRange,
    eventsByType: Object.entries(grouped).map(([type, items]: [string, any]) => ({
      type,
      count: items.length
    }))
  };
}

async function handleHealthStatus(params: any, supabase: any) {
  const { checkAll } = params;

  // Check database health
  const dbStart = Date.now();
  const { error: dbError } = await supabase
    .from('performance_metrics')
    .select('count')
    .limit(1);
  const dbTime = Date.now() - dbStart;

  // Get recent error rate
  const { data: recentErrors } = await supabase
    .from('detected_errors')
    .select('count')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());

  return {
    status: dbError ? 'unhealthy' : 'healthy',
    checks: {
      database: {
        status: dbError ? 'down' : 'up',
        responseTime: dbTime
      },
      errorRate: {
        status: (recentErrors?.length || 0) < 10 ? 'normal' : 'elevated',
        count: recentErrors?.length || 0
      }
    },
    timestamp: new Date().toISOString()
  };
}

async function handleDeploymentHealthCheck(params: any, supabase: any) {
  const { deploymentId, checkAll } = params;

  if (checkAll) {
    // Check all active deployments
    const { data: deployments } = await supabase
      .from('vercel_deployments' as any)
      .select('id, deployment_url')
      .eq('status', 'ready')
      .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!deployments || deployments.length === 0) {
      return { message: 'No active deployments', checked: 0 };
    }

    const healthChecks = await Promise.allSettled(
      deployments.map(async (dep: any) => {
        if (!dep.deployment_url) return null;
        const startTime = Date.now();
        try {
          const response = await fetch(dep.deployment_url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          const responseTime = Date.now() - startTime;
          await supabase.from('deployment_health_checks' as any).insert({
            deployment_id: dep.id,
            check_type: 'uptime',
            status: response.ok ? 'healthy' : 'degraded',
            response_time_ms: responseTime
          });
          return { deployment_id: dep.id, healthy: response.ok };
        } catch {
          await supabase.from('deployment_health_checks' as any).insert({
            deployment_id: dep.id,
            check_type: 'uptime',
            status: 'unhealthy',
            response_time_ms: Date.now() - startTime
          });
          return { deployment_id: dep.id, healthy: false };
        }
      })
    );

    return {
      checked: deployments.length,
      results: healthChecks.filter(r => r.status === 'fulfilled' && r.value !== null)
    };
  }

  // Check single deployment
  if (!deploymentId) throw new Error('deploymentId required');

  const { data: deployment } = await supabase
    .from('vercel_deployments' as any)
    .select('deployment_url')
    .eq('id', deploymentId)
    .single();

  if (!deployment?.deployment_url) throw new Error('Deployment not found');

  const startTime = Date.now();
  try {
    const response = await fetch(deployment.deployment_url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    const responseTime = Date.now() - startTime;

    await supabase.from('deployment_health_checks' as any).insert({
      deployment_id: deploymentId,
      check_type: 'uptime',
      status: response.ok ? 'healthy' : 'degraded',
      response_time_ms: responseTime
    });

    return { healthy: response.ok, responseTime };
  } catch (error) {
    await supabase.from('deployment_health_checks' as any).insert({
      deployment_id: deploymentId,
      check_type: 'uptime',
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime
    });
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
