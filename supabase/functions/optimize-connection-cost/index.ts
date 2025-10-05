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

    // Get credential and performance data
    const { data: credential, error: credError } = await supabase
      .from('database_credentials')
      .select('*')
      .eq('id', credential_id)
      .single();

    if (credError) throw credError;

    const { data: perfMetrics } = await supabase
      .from('database_performance_metrics')
      .select('*')
      .eq('credential_id', credential_id)
      .order('metric_date', { ascending: false })
      .limit(30);

    const { data: healthMetrics } = await supabase
      .from('database_connection_health')
      .select('*')
      .eq('credential_id', credential_id)
      .order('check_timestamp', { ascending: false })
      .limit(100);

    // Analyze usage patterns
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
          content: `Analyze this database connection configuration and suggest cost optimizations:

Provider: ${credential.provider}
Configuration: ${JSON.stringify(credential.credentials)}
Performance Metrics: ${JSON.stringify(perfMetrics)}
Health History: ${JSON.stringify(healthMetrics?.slice(0, 20))}

Provide cost optimization suggestions:
1. Connection pooling recommendations
2. Query optimization tips
3. Instance sizing suggestions
4. Caching strategies
5. Estimated cost savings (%)

Focus on ${credential.provider}-specific optimizations. Format as JSON with sections: pooling, queries, sizing, caching, savings_estimate.`
        }]
      })
    });

    const aiData = await aiResponse.json();
    const optimization = JSON.parse(
      aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
    );

    // Calculate current estimated costs
    const currentCost = estimateCosts(credential.provider, perfMetrics);

    console.log('Cost optimization analysis completed');

    return new Response(
      JSON.stringify({
        current_cost_estimate: currentCost,
        optimizations: optimization,
        implementation_priority: prioritizeOptimizations(optimization),
        roi_timeline: '3-6 months'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in optimize-connection-cost:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function estimateCosts(provider: string, metrics: any[]) {
  const totalRequests = metrics?.reduce((sum, m) => sum + (m.total_requests || 0), 0) || 0;
  
  // Simplified cost estimation (provider-specific pricing would be more accurate)
  const costPerRequest = {
    'postgresql': 0.0001,
    'mysql': 0.0001,
    'mongodb': 0.00015,
    'firebase': 0.0002,
    'supabase': 0.00008
  };

  const rate = costPerRequest[provider as keyof typeof costPerRequest] || 0.0001;
  return (totalRequests * rate).toFixed(2);
}

function prioritizeOptimizations(optimizations: any) {
  const priorities = [];
  
  if (optimizations.savings_estimate > 30) {
    priorities.push({ action: 'Implement connection pooling', impact: 'HIGH', effort: 'MEDIUM' });
  }
  
  if (optimizations.pooling) {
    priorities.push({ action: 'Optimize query patterns', impact: 'MEDIUM', effort: 'HIGH' });
  }
  
  if (optimizations.caching) {
    priorities.push({ action: 'Add caching layer', impact: 'HIGH', effort: 'LOW' });
  }
  
  return priorities;
}
