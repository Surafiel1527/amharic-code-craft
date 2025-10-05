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

    const { projectId, projectName, files, environmentVariables } = await req.json();

    // Get Vercel access token
    const { data: connection, error: connectionError } = await supabase
      .from('vercel_connections')
      .select('access_token, team_id')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Vercel not connected. Please connect your Vercel account first.');
    }

    // Prepare deployment request
    const deploymentData: any = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      files: files || [],
      projectSettings: {
        framework: 'vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
      },
    };

    // Add environment variables if provided
    if (environmentVariables && environmentVariables.length > 0) {
      deploymentData.env = {};
      environmentVariables.forEach((env: any) => {
        deploymentData.env[env.key] = env.value;
      });
    }

    // Add team ID if user is part of a team
    const vercelApiUrl = connection.team_id
      ? `https://api.vercel.com/v13/deployments?teamId=${connection.team_id}`
      : 'https://api.vercel.com/v13/deployments';

    // Deploy to Vercel
    const vercelResponse = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentData),
    });

    if (!vercelResponse.ok) {
      const errorData = await vercelResponse.json();
      throw new Error(`Vercel deployment failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const deployment = await vercelResponse.json();

    // Store deployment in database
    const { data: deploymentRecord, error: deploymentError } = await supabase
      .from('deployments')
      .insert({
        user_id: user.id,
        project_id: projectId,
        vercel_deployment_id: deployment.id,
        vercel_project_id: deployment.projectId || deployment.id,
        vercel_url: deployment.url,
        status: deployment.readyState || 'QUEUED',
        environment: 'production',
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Failed to store deployment:', deploymentError);
    }

    // Update last used timestamp
    await supabase
      .from('vercel_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        deployment: {
          id: deployment.id,
          url: `https://${deployment.url}`,
          status: deployment.readyState || 'QUEUED',
          deploymentRecord,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Deployment error:', error);
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