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

    console.log('Running proactive health monitoring...');

    // Calculate error rate
    const { count: errorCount } = await supabase
      .from('detected_errors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .eq('resolved', false);

    const { count: requestCount } = await supabase
      .from('generation_analytics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    const errors = errorCount || 0;
    const requests = requestCount || 1;
    const errorRate = (errors / requests) * 100;

    // Record metric
    await supabase.rpc('record_system_metric', {
      p_metric_type: 'error_rate',
      p_metric_value: errorRate,
      p_metadata: { error_count: errors, request_count: requests }
    });

    const healthStatus = errorRate < 5 ? 'healthy' : errorRate < 10 ? 'degraded' : 'unhealthy';

    return new Response(
      JSON.stringify({
        status: healthStatus,
        metrics: { error_rate: errorRate, error_count: errors, request_count: requests },
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error('Health monitoring error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Monitoring failed' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
