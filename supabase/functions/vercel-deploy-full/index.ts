import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeploymentRequest {
  projectId: string;
  projectName: string;
  files: Record<string, string>;
  envVariables?: Record<string, string>;
  customDomain?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
    
    if (!vercelToken) {
      throw new Error('VERCEL_API_TOKEN not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { projectId, projectName, files, envVariables, customDomain }: DeploymentRequest = await req.json();

    console.log(`Starting deployment for project: ${projectName}`);

    // Create deployment record
    const { data: deployment, error: deploymentError } = await supabase
      .from('vercel_deployments' as any)
      .insert({
        user_id: user.id,
        project_id: projectId,
        status: 'pending',
        env_variables: envVariables || {},
        custom_domain: customDomain
      } as any)
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment:', deploymentError);
      throw deploymentError;
    }

    console.log('Deployment record created:', deployment.id);

    // Start background deployment process
    deployToVercel(deployment.id, projectName, files, envVariables, customDomain, vercelToken, supabaseUrl, supabaseKey);

    return new Response(
      JSON.stringify({ 
        success: true,
        deploymentId: deployment.id,
        message: 'Deployment started' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202 
      }
    );
  } catch (error) {
    console.error('Deployment error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function deployToVercel(
  deploymentId: string,
  projectName: string,
  files: Record<string, string>,
  envVariables: Record<string, string> | undefined,
  customDomain: string | undefined,
  vercelToken: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Update status to building
    await supabase.rpc('update_deployment_status', {
      p_deployment_id: deploymentId,
      p_status: 'building'
    });

    console.log('Building project...');

    // Step 1: Create or get Vercel project
    const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    let vercelProjectId: string;
    
    // Check if project exists
    const checkProjectResponse = await fetch(
      `https://api.vercel.com/v9/projects/${projectSlug}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkProjectResponse.ok) {
      const existingProject = await checkProjectResponse.json();
      vercelProjectId = existingProject.id;
      console.log('Using existing Vercel project:', vercelProjectId);
    } else {
      // Create new project
      const createProjectResponse = await fetch(
        'https://api.vercel.com/v10/projects',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectSlug,
            framework: 'vite',
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
            installCommand: 'npm ci',
            devCommand: 'npm run dev',
            environmentVariables: Object.entries(envVariables || {}).map(([key, value]) => ({
              key,
              value,
              target: ['production', 'preview', 'development'],
            })),
          }),
        }
      );

      if (!createProjectResponse.ok) {
        const error = await createProjectResponse.text();
        throw new Error(`Failed to create Vercel project: ${error}`);
      }

      const newProject = await createProjectResponse.json();
      vercelProjectId = newProject.id;
      console.log('Created new Vercel project:', vercelProjectId);
    }

    // Update deployment with Vercel project ID
    await supabase
      .from('vercel_deployments' as any)
      .update({ vercel_project_id: vercelProjectId } as any)
      .eq('id', deploymentId);

    // Step 2: Prepare files for deployment
    console.log('Preparing files for deployment...');
    
    const deploymentFiles = Object.entries(files).map(([path, content]) => ({
      file: path,
      data: content,
    }));

    // Step 3: Create deployment
    await supabase.rpc('update_deployment_status', {
      p_deployment_id: deploymentId,
      p_status: 'deploying'
    });

    console.log('Creating Vercel deployment...');

    const deployResponse = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectSlug,
          project: vercelProjectId,
          files: deploymentFiles,
          target: 'production',
        }),
      }
    );

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to create deployment: ${error}`);
    }

    const deploymentData = await deployResponse.json();
    const deploymentUrl = `https://${deploymentData.url}`;

    console.log('Deployment created:', deploymentUrl);

    // Step 4: Configure custom domain if provided
    if (customDomain) {
      console.log('Configuring custom domain:', customDomain);
      
      const domainResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customDomain,
          }),
        }
      );

      if (domainResponse.ok) {
        console.log('Custom domain configured successfully');
      } else {
        const domainError = await domainResponse.text();
        console.error('Failed to configure custom domain:', domainError);
      }
    }

    // Update deployment as ready
    await supabase
      .from('vercel_deployments' as any)
      .update({
        status: 'ready',
        vercel_deployment_id: deploymentData.id,
        deployment_url: deploymentUrl,
        completed_at: new Date().toISOString(),
      } as any)
      .eq('id', deploymentId);

    console.log('Deployment completed successfully');

    // Send success alert
    await supabase.rpc('send_alert', {
      p_alert_type: 'deployment_success',
      p_severity: 'info',
      p_title: 'Deployment Successful',
      p_message: `Project "${projectName}" has been deployed successfully to ${deploymentUrl}`,
      p_metadata: {
        deployment_id: deploymentId,
        deployment_url: deploymentUrl,
      },
    });

  } catch (error) {
    console.error('Deployment failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabase.rpc('update_deployment_status', {
      p_deployment_id: deploymentId,
      p_status: 'error',
      p_error_message: errorMessage,
    });

    // Send error alert
    await supabase.rpc('send_alert', {
      p_alert_type: 'deployment_failed',
      p_severity: 'error',
      p_title: 'Deployment Failed',
      p_message: `Deployment of "${projectName}" failed: ${errorMessage}`,
      p_metadata: {
        deployment_id: deploymentId,
        error: errorMessage,
      },
    });
  }
}
