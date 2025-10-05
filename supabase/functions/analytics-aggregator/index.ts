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

    console.log('📊 Aggregating analytics data...');

    // Calculate user engagement metrics
    const { data: users, count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    const { data: activeUsers } = await supabase
      .from('conversations')
      .select('user_id')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const activeUserCount = new Set(activeUsers?.map(u => u.user_id)).size;

    // Calculate project metrics
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact' });

    const { count: publicProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('is_public', true);

    // Calculate revenue metrics
    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

    // Calculate plugin metrics
    const { count: totalPlugins } = await supabase
      .from('ai_plugins')
      .select('*', { count: 'exact' });

    const { count: publishedPlugins } = await supabase
      .from('ai_plugins')
      .select('*', { count: 'exact' })
      .eq('is_public', true);

    // Calculate AI usage metrics
    const { data: aiRequests } = await supabase
      .from('generation_analytics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalAIRequests = aiRequests?.length || 0;
    const avgResponseTime = aiRequests?.reduce((sum: number, r: any) => sum + (r.performance_score || 0), 0) / (totalAIRequests || 1);

    // Calculate error metrics
    const { count: totalErrors } = await supabase
      .from('detected_errors')
      .select('*', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const errorRate = (totalErrors || 0) / (totalAIRequests || 1) * 100;

    // Calculate conversion funnel
    const { count: signups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { count: activatedUsers } = await supabase
      .from('conversations')
      .select('user_id', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const activationRate = ((activatedUsers || 0) / (signups || 1)) * 100;

    const analytics = {
      user_metrics: {
        total_users: totalUsers || 0,
        active_users_7d: activeUserCount,
        engagement_rate: (activeUserCount / (totalUsers || 1)) * 100
      },
      project_metrics: {
        total_projects: totalProjects || 0,
        public_projects: publicProjects || 0,
        private_projects: (totalProjects || 0) - (publicProjects || 0)
      },
      revenue_metrics: {
        total_revenue: totalRevenue,
        avg_revenue_per_user: totalRevenue / (totalUsers || 1)
      },
      plugin_metrics: {
        total_plugins: totalPlugins || 0,
        published_plugins: publishedPlugins || 0,
        pending_approval: (totalPlugins || 0) - (publishedPlugins || 0)
      },
      ai_metrics: {
        total_requests_30d: totalAIRequests,
        avg_response_time: avgResponseTime,
        error_rate: errorRate
      },
      conversion_metrics: {
        signups_30d: signups || 0,
        activation_rate: activationRate,
        conversion_funnel: {
          signup: signups || 0,
          first_project: activatedUsers || 0,
          first_payment: payments?.length || 0
        }
      }
    };

    console.log('✅ Analytics aggregation complete');

    return new Response(JSON.stringify({
      success: true,
      analytics,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analytics-aggregator:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
