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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { interval = 5 } = await req.json(); // Default 5 minutes

    // Create cron job for health monitoring
    const cronSQL = `
      SELECT cron.schedule(
        'database-health-monitoring',
        '${interval} minutes',
        $$
        SELECT net.http_post(
          url:='${Deno.env.get('SUPABASE_URL')}/functions/v1/proactive-health-monitor',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}"}'::jsonb,
          body:='{"automated": true}'::jsonb
        ) as request_id;
        $$
      );
    `;

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: cronSQL });

    if (error) {
      console.error('Error setting up cron:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to setup monitoring',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Monitoring cron job created successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Health monitoring scheduled every ${interval} minutes`,
        cron_name: 'database-health-monitoring'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in setup-monitoring-cron:', error);
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
