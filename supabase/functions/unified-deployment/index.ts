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

    const { operation, ...params } = await req.json();

    console.log('Deployment Operation:', operation);

    let result;

    switch (operation) {
      case 'deploy':
        result = await handleDeploy(params, supabase);
        break;
      case 'monitor':
        result = await handleMonitor(params, supabase);
        break;
      case 'build':
        result = await handleBuild(params, supabase);
        break;
      case 'rollback':
        result = await handleRollback(params, supabase);
        break;
      case 'health_check':
        result = await handleHealthCheck(params, supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified-deployment:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleDeploy(params: any, supabase: any) {
  const { projectId, environment, buildConfig } = params;

  console.log('Starting deployment:', { projectId, environment });

  // Create deployment record
  const { data: deployment, error } = await supabase
    .from('vercel_deployments')
    .insert({
      project_id: projectId,
      status: 'building',
      environment: environment || 'production'
    })
    .select()
    .single();

  if (error) throw error;

  return { 
    deploymentId: deployment.id,
    status: 'initiated',
    environment
  };
}

async function handleMonitor(params: any, supabase: any) {
  const { deploymentId } = params;

  const { data: deployment } = await supabase
    .from('vercel_deployments')
    .select('*')
    .eq('id', deploymentId)
    .single();

  const { data: metrics } = await supabase
    .from('deployment_analytics')
    .select('*')
    .eq('deployment_id', deploymentId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    deployment,
    recentMetrics: metrics || []
  };
}

async function handleBuild(params: any, supabase: any) {
  const { projectId, buildConfig } = params;

  console.log('Starting build:', { projectId });

  // Check build cache
  const { data: cacheData } = await supabase
    .from('build_cache')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const buildStartTime = Date.now();

  // Simulate build process
  await new Promise(resolve => setTimeout(resolve, 1000));

  const buildDuration = Date.now() - buildStartTime;

  // Store build result
  await supabase
    .from('build_cache')
    .insert({
      project_id: projectId,
      cache_key: `build_${Date.now()}`,
      cache_data: buildConfig || {},
      build_time_ms: buildDuration
    });

  return {
    buildTime: buildDuration,
    cacheHit: !!cacheData,
    status: 'success'
  };
}

async function handleRollback(params: any, supabase: any) {
  const { fromDeploymentId, toDeploymentId, reason } = params;

  console.log('Rolling back deployment:', { fromDeploymentId, toDeploymentId });

  // Get deployment info
  const { data: fromDeploy } = await supabase
    .from('vercel_deployments')
    .select('*')
    .eq('id', fromDeploymentId)
    .single();

  const { data: toDeploy } = await supabase
    .from('vercel_deployments')
    .select('*')
    .eq('id', toDeploymentId)
    .single();

  if (!fromDeploy || !toDeploy) {
    throw new Error('Deployment not found');
  }

  // Create rollback record
  const { data: rollback, error } = await supabase
    .from('deployment_rollbacks')
    .insert({
      from_deployment_id: fromDeploymentId,
      to_deployment_id: toDeploymentId,
      reason: reason || 'Manual rollback',
      rollback_status: 'completed'
    })
    .select()
    .single();

  if (error) throw error;

  return {
    rollbackId: rollback.id,
    status: 'completed',
    rolledBackTo: toDeploymentId
  };
}

async function handleHealthCheck(params: any, supabase: any) {
  const { deploymentId } = params;

  const { data: deployment } = await supabase
    .from('vercel_deployments')
    .select('*')
    .eq('id', deploymentId)
    .single();

  if (!deployment) {
    throw new Error('Deployment not found');
  }

  // Perform health checks
  const healthStatus = {
    status: deployment.status === 'ready' ? 'healthy' : 'unhealthy',
    uptime: deployment.started_at ? Date.now() - new Date(deployment.started_at).getTime() : 0,
    errorRate: 0,
    responseTime: Math.random() * 100 + 50 // Simulated
  };

  // Record health metric
  await supabase
    .from('deployment_analytics')
    .insert({
      deployment_id: deploymentId,
      metric_type: 'health_check',
      metric_value: healthStatus.status === 'healthy' ? 1 : 0,
      metadata: healthStatus
    });

  return healthStatus;
}
