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

    console.log('🔍 Starting performance optimization analysis...');

    // Get recent performance metrics
    const { data: metrics } = await supabase
      .from('production_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1000);

    // Analyze performance
    const analysis = {
      slow_queries: [] as any[],
      high_memory_usage: [] as any[],
      cache_misses: [] as any[],
      recommendations: [] as string[]
    };

    // Group metrics by type
    const metricsByType = metrics?.reduce((acc, m) => {
      if (!acc[m.metric_type]) acc[m.metric_type] = [];
      acc[m.metric_type].push(m);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Analyze response times
    const responseTimes = metricsByType['api_response_time'] || [];
    const avgResponseTime = responseTimes.reduce((sum: number, m: any) => sum + Number(m.metric_value), 0) / (responseTimes.length || 1);
    
    if (avgResponseTime > 200) {
      analysis.recommendations.push('API response time is above 200ms threshold. Consider caching or query optimization.');
      
      // Create optimization suggestion
      await supabase.from('optimization_suggestions').insert({
        suggestion_type: 'response_time',
        severity: avgResponseTime > 500 ? 'high' : 'medium',
        description: `Average API response time is ${Math.round(avgResponseTime)}ms`,
        suggested_fix: 'Implement caching layer and optimize database queries',
        metadata: { avg_response_time: avgResponseTime }
      });
    }

    // Analyze memory usage
    const memoryUsage = metricsByType['memory_usage'] || [];
    const avgMemory = memoryUsage.reduce((sum: number, m: any) => sum + Number(m.metric_value), 0) / (memoryUsage.length || 1);
    
    if (avgMemory > 80) {
      analysis.recommendations.push('Memory usage is high. Consider implementing connection pooling.');
      
      await supabase.from('optimization_suggestions').insert({
        suggestion_type: 'memory',
        severity: 'high',
        description: `Average memory usage is ${Math.round(avgMemory)}%`,
        suggested_fix: 'Implement connection pooling and optimize data structures',
        metadata: { avg_memory: avgMemory }
      });
    }

    // Analyze cache performance
    const { data: cacheStats } = await supabase
      .from('performance_cache')
      .select('hit_count, cache_key')
      .gt('hit_count', 0);

    const totalCacheHits = cacheStats?.reduce((sum: number, c: any) => sum + c.hit_count, 0) || 0;
    const cacheHitRate = totalCacheHits / (responseTimes.length || 1);
    
    if (cacheHitRate < 0.8) {
      analysis.recommendations.push(`Cache hit rate is ${(cacheHitRate * 100).toFixed(1)}%. Improve caching strategy.`);
      
      await supabase.from('optimization_suggestions').insert({
        suggestion_type: 'cache',
        severity: 'medium',
        description: `Cache hit rate is only ${(cacheHitRate * 100).toFixed(1)}%`,
        suggested_fix: 'Review caching strategy and increase TTL for frequently accessed data',
        metadata: { cache_hit_rate: cacheHitRate }
      });
    }

    // Clean up expired cache
    await supabase.rpc('cleanup_expired_cache');

    console.log('✅ Performance optimization complete');
    console.log('📊 Recommendations:', analysis.recommendations.length);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      metrics: {
        avg_response_time: avgResponseTime,
        avg_memory: avgMemory,
        cache_hit_rate: cacheHitRate
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in performance-optimizer:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
