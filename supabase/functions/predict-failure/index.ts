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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { credential_id } = await req.json();

    // Get recent health metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('database_connection_health')
      .select('*')
      .eq('credential_id', credential_id)
      .order('check_timestamp', { ascending: false })
      .limit(100);

    if (metricsError) throw metricsError;

    // Get performance metrics
    const { data: perfMetrics, error: perfError } = await supabase
      .from('database_performance_metrics')
      .select('*')
      .eq('credential_id', credential_id)
      .order('metric_date', { ascending: false })
      .limit(30);

    if (perfError) throw perfError;

    // Analyze trends
    const analysis = analyzeFailurePatterns(metrics, perfMetrics);

    // Use AI for advanced prediction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Analyze these database health patterns and predict potential failures:

Recent Health Metrics: ${JSON.stringify(metrics?.slice(0, 20))}
Performance Trends: ${JSON.stringify(perfMetrics?.slice(0, 10))}
Current Analysis: ${JSON.stringify(analysis)}

Provide:
1. Failure probability (0-100%)
2. Time to failure estimate (hours)
3. Root cause prediction
4. Preventive actions
5. Confidence score

Format as JSON.`
        }]
      })
    });

    const aiData = await aiResponse.json();
    const prediction = JSON.parse(
      aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
    );

    console.log('Failure prediction generated:', prediction);

    return new Response(
      JSON.stringify({
        ...analysis,
        ai_prediction: prediction,
        recommendation: prediction.failure_probability > 70 
          ? 'IMMEDIATE_ACTION_REQUIRED' 
          : prediction.failure_probability > 40 
          ? 'MONITOR_CLOSELY' 
          : 'HEALTHY'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in predict-failure:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function analyzeFailurePatterns(healthMetrics: any[], perfMetrics: any[]) {
  const recentFailures = healthMetrics?.filter(m => m.status !== 'healthy').length || 0;
  const totalChecks = healthMetrics?.length || 1;
  const failureRate = (recentFailures / totalChecks) * 100;

  const responseTimes = healthMetrics
    ?.filter(m => m.response_time_ms)
    .map(m => m.response_time_ms) || [];
  
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const responseTimeTrend = responseTimes.length >= 2
    ? responseTimes[0] - responseTimes[responseTimes.length - 1]
    : 0;

  return {
    failure_rate: failureRate.toFixed(2),
    avg_response_time: avgResponseTime.toFixed(2),
    response_time_trend: responseTimeTrend > 0 ? 'degrading' : 'improving',
    recent_errors: recentFailures,
    health_score: Math.max(0, 100 - failureRate - (avgResponseTime / 100))
  };
}
