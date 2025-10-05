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

    const { accessToken } = await req.json();

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // Verify token with Vercel API
    const vercelUserResponse = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!vercelUserResponse.ok) {
      throw new Error('Invalid Vercel access token');
    }

    const vercelUser = await vercelUserResponse.json();

    // Get team info if available
    const teamsResponse = await fetch('https://api.vercel.com/v2/teams', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let teamId = null;
    let teamName = null;

    if (teamsResponse.ok) {
      const teamsData = await teamsResponse.json();
      if (teamsData.teams && teamsData.teams.length > 0) {
        // Use first team by default
        teamId = teamsData.teams[0].id;
        teamName = teamsData.teams[0].name;
      }
    }

    // Store or update connection
    const { data: connection, error: connectionError } = await supabase
      .from('vercel_connections')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        team_id: teamId,
        team_name: teamName,
        user_email: vercelUser.user.email,
        connected_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (connectionError) {
      throw new Error(`Failed to store connection: ${connectionError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          email: vercelUser.user.email,
          teamName: teamName,
          connectedAt: connection.connected_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});