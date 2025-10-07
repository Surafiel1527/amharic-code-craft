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

    const body = await req.json();
    const { action } = body;

    console.log(`[Vercel Integration] Action: ${action}, User: ${user.id}`);

    // Route to appropriate handler based on action
    switch (action) {
      case 'connect':
        return await handleConnect(body, user, supabase);
      case 'deploy':
        return await handleDeploy(body, user, supabase);
      case 'status':
        return await handleStatus(body, user, supabase);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[Vercel Integration] Error:', error);
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

// Handler: Connect Vercel account
async function handleConnect(body: any, user: any, supabase: any) {
  const { accessToken } = body;

  if (!accessToken) {
    throw new Error('Access token is required');
  }

  console.log('[Vercel Integration] Verifying access token with Vercel API');

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
      console.log(`[Vercel Integration] Found team: ${teamName}`);
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

  console.log('[Vercel Integration] Connection successful');

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
}

// Handler: Deploy to Vercel
async function handleDeploy(body: any, user: any, supabase: any) {
  const { projectId, projectName, files, environmentVariables } = body;

  console.log(`[Vercel Integration] Deploying project: ${projectName}`);

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

  console.log('[Vercel Integration] Sending deployment to Vercel');

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
    console.error('[Vercel Integration] Failed to store deployment:', deploymentError);
  }

  // Update last used timestamp
  await supabase
    .from('vercel_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', user.id);

  console.log(`[Vercel Integration] Deployment created: ${deployment.id}`);

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
}

// Handler: Check deployment status
async function handleStatus(body: any, user: any, supabase: any) {
  const { deploymentId } = body;

  console.log(`[Vercel Integration] Checking status for deployment: ${deploymentId}`);

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

  // Get status from Vercel
  const vercelApiUrl = connection.team_id
    ? `https://api.vercel.com/v13/deployments/${deployment.vercel_deployment_id}?teamId=${connection.team_id}`
    : `https://api.vercel.com/v13/deployments/${deployment.vercel_deployment_id}`;

  const vercelResponse = await fetch(vercelApiUrl, {
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
    },
  });

  if (!vercelResponse.ok) {
    throw new Error('Failed to fetch deployment status from Vercel');
  }

  const vercelDeployment = await vercelResponse.json();

  // Update deployment status in database
  const updateData: any = {
    status: vercelDeployment.readyState,
  };

  if (vercelDeployment.readyState === 'READY') {
    updateData.ready_at = new Date().toISOString();
    updateData.build_duration = vercelDeployment.buildingAt
      ? Math.floor((Date.now() - vercelDeployment.buildingAt) / 1000)
      : null;
  }

  if (vercelDeployment.readyState === 'ERROR') {
    updateData.error_message = vercelDeployment.errorMessage || 'Deployment failed';
  }

  await supabase
    .from('deployments')
    .update(updateData)
    .eq('id', deploymentId);

  console.log(`[Vercel Integration] Status: ${vercelDeployment.readyState}`);

  return new Response(
    JSON.stringify({
      success: true,
      status: vercelDeployment.readyState,
      url: `https://${vercelDeployment.url}`,
      readyAt: vercelDeployment.ready,
      error: vercelDeployment.errorMessage,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
