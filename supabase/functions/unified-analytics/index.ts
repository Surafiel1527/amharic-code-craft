import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsOperation {
  operation: 'track_event' | 'track_metric' | 'get_metrics' | 'get_user_stats' | 'get_trends' | 'aggregate_data' | 'export_analytics' | 'get_dashboard_data';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Analytics request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: AnalyticsOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'track_event':
        result = await handleTrackEvent(payload.params, supabase, requestId);
        break;
      case 'track_metric':
        result = await handleTrackMetric(payload.params, supabase, requestId);
        break;
      case 'get_metrics':
        result = await handleGetMetrics(payload.params, supabase, requestId);
        break;
      case 'get_user_stats':
        result = await handleGetUserStats(payload.params, supabase, requestId);
        break;
      case 'get_trends':
        result = await handleGetTrends(payload.params, supabase, requestId);
        break;
      case 'aggregate_data':
        result = await handleAggregateData(payload.params, supabase, requestId);
        break;
      case 'export_analytics':
        result = await handleExportAnalytics(payload.params, supabase, requestId);
        break;
      case 'get_dashboard_data':
        result = await handleGetDashboardData(payload.params, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleTrackEvent(params: any, supabase: any, requestId: string) {
  const { userId, eventType, eventName, properties = {}, metadata = {} } = params;
  
  if (!eventType || !eventName) {
    throw new Error('eventType and eventName are required');
  }

  console.log(`[${requestId}] Tracking event: ${eventName} (${eventType})`);

  const { data: event, error } = await supabase
    .from('generation_analytics')
    .insert({
      user_id: userId || null,
      event_type: eventType,
      event_name: eventName,
      properties,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Event tracked: ${event.id}`);
  return { eventId: event.id, tracked: true };
}

async function handleTrackMetric(params: any, supabase: any, requestId: string) {
  const { metricType, metricValue, userId, projectId, metadata = {} } = params;
  
  if (!metricType || metricValue === undefined) {
    throw new Error('metricType and metricValue are required');
  }

  console.log(`[${requestId}] Tracking metric: ${metricType} = ${metricValue}`);

  const { data: metric, error } = await supabase
    .from('performance_metrics')
    .insert({
      user_id: userId || null,
      project_id: projectId || null,
      metric_type: metricType,
      metric_value: metricValue,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Metric tracked: ${metric.id}`);
  return { metricId: metric.id, tracked: true };
}

async function handleGetMetrics(params: any, supabase: any, requestId: string) {
  const { userId, projectId, metricType, timeRange = '24h', limit = 100 } = params;
  
  console.log(`[${requestId}] Fetching metrics`);

  const hours = parseInt(timeRange) || 24;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('performance_metrics')
    .select('*')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) query = query.eq('user_id', userId);
  if (projectId) query = query.eq('project_id', projectId);
  if (metricType) query = query.eq('metric_type', metricType);

  const { data: metrics, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${metrics.length} metrics`);
  return { metrics, count: metrics.length };
}

async function handleGetUserStats(params: any, supabase: any, requestId: string) {
  const { userId, timeRange = '7d' } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Fetching user stats for: ${userId}`);

  const days = parseInt(timeRange) || 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get event counts
  const { data: events } = await supabase
    .from('generation_analytics')
    .select('event_type, event_name')
    .eq('user_id', userId)
    .gte('created_at', cutoff);

  // Get metric averages
  const { data: metrics } = await supabase
    .from('performance_metrics')
    .select('metric_type, metric_value')
    .eq('user_id', userId)
    .gte('created_at', cutoff);

  const stats = {
    totalEvents: events?.length || 0,
    eventsByType: {},
    metricAverages: {},
    timeRange,
  };

  // Aggregate events
  events?.forEach((event: any) => {
    const key = event.event_type;
    if (!stats.eventsByType[key]) {
      stats.eventsByType[key] = 0;
    }
    stats.eventsByType[key]++;
  });

  // Aggregate metrics
  const metricGroups: Record<string, number[]> = {};
  metrics?.forEach((metric: any) => {
    if (!metricGroups[metric.metric_type]) {
      metricGroups[metric.metric_type] = [];
    }
    metricGroups[metric.metric_type].push(metric.metric_value);
  });

  Object.entries(metricGroups).forEach(([type, values]) => {
    stats.metricAverages[type] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  console.log(`[${requestId}] User stats compiled`);
  return stats;
}

async function handleGetTrends(params: any, supabase: any, requestId: string) {
  const { metricType, timeRange = '30d', granularity = 'daily' } = params;
  
  if (!metricType) throw new Error('metricType is required');

  console.log(`[${requestId}] Analyzing trends for: ${metricType}`);

  const days = parseInt(timeRange) || 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: metrics, error } = await supabase
    .from('performance_metrics')
    .select('metric_value, created_at')
    .eq('metric_type', metricType)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const trends: any[] = [];
  const groupedData: Record<string, number[]> = {};

  metrics.forEach((metric: any) => {
    const date = new Date(metric.created_at);
    let key: string;
    
    if (granularity === 'hourly') {
      key = date.toISOString().slice(0, 13);
    } else {
      key = date.toISOString().slice(0, 10);
    }

    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(metric.metric_value);
  });

  Object.entries(groupedData).forEach(([timestamp, values]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    trends.push({
      timestamp,
      average: Math.round(avg * 100) / 100,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    });
  });

  console.log(`[${requestId}] Trend analysis complete: ${trends.length} data points`);
  return { metricType, trends, dataPoints: trends.length };
}

async function handleAggregateData(params: any, supabase: any, requestId: string) {
  const { aggregationType, metricType, groupBy = 'user', timeRange = '7d' } = params;
  
  console.log(`[${requestId}] Aggregating data by: ${groupBy}`);

  const days = parseInt(timeRange) || 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('performance_metrics')
    .select('user_id, project_id, metric_type, metric_value')
    .gte('created_at', cutoff);

  if (metricType) {
    query = query.eq('metric_type', metricType);
  }

  const { data: metrics, error } = await query;
  if (error) throw error;

  const aggregated: Record<string, any> = {};

  metrics.forEach((metric: any) => {
    const key = groupBy === 'user' ? metric.user_id : 
                groupBy === 'project' ? metric.project_id : 
                metric.metric_type;

    if (!key) return;

    if (!aggregated[key]) {
      aggregated[key] = {
        id: key,
        values: [],
        count: 0,
      };
    }

    aggregated[key].values.push(metric.metric_value);
    aggregated[key].count++;
  });

  const results = Object.values(aggregated).map((group: any) => ({
    id: group.id,
    count: group.count,
    sum: group.values.reduce((a: number, b: number) => a + b, 0),
    average: group.values.reduce((a: number, b: number) => a + b, 0) / group.count,
    min: Math.min(...group.values),
    max: Math.max(...group.values),
  }));

  console.log(`[${requestId}] Aggregated ${results.length} groups`);
  return { aggregationType, groupBy, results, totalGroups: results.length };
}

async function handleExportAnalytics(params: any, supabase: any, requestId: string) {
  const { userId, format = 'json', timeRange = '30d' } = params;
  
  console.log(`[${requestId}] Exporting analytics (${format})`);

  const days = parseInt(timeRange) || 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get all events
  let eventsQuery = supabase
    .from('generation_analytics')
    .select('*')
    .gte('created_at', cutoff);

  if (userId) eventsQuery = eventsQuery.eq('user_id', userId);

  const { data: events } = await eventsQuery;

  // Get all metrics
  let metricsQuery = supabase
    .from('performance_metrics')
    .select('*')
    .gte('created_at', cutoff);

  if (userId) metricsQuery = metricsQuery.eq('user_id', userId);

  const { data: metrics } = await metricsQuery;

  const exportData = {
    exportedAt: new Date().toISOString(),
    timeRange,
    events: events || [],
    metrics: metrics || [],
    summary: {
      totalEvents: events?.length || 0,
      totalMetrics: metrics?.length || 0,
    },
  };

  console.log(`[${requestId}] Export complete: ${exportData.summary.totalEvents} events, ${exportData.summary.totalMetrics} metrics`);
  return exportData;
}

async function handleGetDashboardData(params: any, supabase: any, requestId: string) {
  const { userId, projectId } = params;
  
  console.log(`[${requestId}] Fetching dashboard data`);

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Recent events
  let recentEventsQuery = supabase
    .from('generation_analytics')
    .select('*')
    .gte('created_at', last24h)
    .order('created_at', { ascending: false })
    .limit(10);

  if (userId) recentEventsQuery = recentEventsQuery.eq('user_id', userId);

  const { data: recentEvents } = await recentEventsQuery;

  // Performance metrics
  let metricsQuery = supabase
    .from('performance_metrics')
    .select('metric_type, metric_value')
    .gte('created_at', last7d);

  if (userId) metricsQuery = metricsQuery.eq('user_id', userId);
  if (projectId) metricsQuery = metricsQuery.eq('project_id', projectId);

  const { data: metrics } = await metricsQuery;

  // Aggregate metrics
  const metricSummary: Record<string, any> = {};
  metrics?.forEach((metric: any) => {
    if (!metricSummary[metric.metric_type]) {
      metricSummary[metric.metric_type] = {
        values: [],
        count: 0,
      };
    }
    metricSummary[metric.metric_type].values.push(metric.metric_value);
    metricSummary[metric.metric_type].count++;
  });

  const performanceMetrics = Object.entries(metricSummary).map(([type, data]: [string, any]) => ({
    type,
    average: data.values.reduce((a: number, b: number) => a + b, 0) / data.count,
    count: data.count,
  }));

  console.log(`[${requestId}] Dashboard data compiled`);
  return {
    recentEvents: recentEvents || [],
    performanceMetrics,
    summary: {
      eventsLast24h: recentEvents?.length || 0,
      metricsLast7d: metrics?.length || 0,
    },
  };
}
