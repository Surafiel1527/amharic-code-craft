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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { deploymentId } = await req.json();

    // Get Vercel access token
    const { data: connection, error: connectionError } = await supabase
      .from('vercel_connections')
      .select('access_token, team_id')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Vercel not connected');
    }

    // Get deployment from database
    const { data: deployment } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .eq('user_id', user.id)
      .single();

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Get build logs from Vercel
    const vercelApiUrl = connection.team_id
      ? `https://api.vercel.com/v2/deployments/${deployment.vercel_deployment_id}/events?teamId=${connection.team_id}`
      : `https://api.vercel.com/v2/deployments/${deployment.vercel_deployment_id}/events`;

    const vercelResponse = await fetch(vercelApiUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
      },
    });

    if (!vercelResponse.ok) {
      throw new Error('Failed to fetch logs from Vercel');
    }

    const logsData = await vercelResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        logs: logsData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Logs fetch error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});