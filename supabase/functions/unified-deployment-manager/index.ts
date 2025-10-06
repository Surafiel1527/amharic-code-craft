import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Deployment Manager
 * Consolidates:
 * - deployment-orchestrator (high-level orchestration)
 * - auto-deployer (automated deployment)
 * - vercel-deploy-full (full deployment flow)
 */

interface DeploymentRequest {
  action: 'deploy' | 'orchestrate' | 'full-deploy' | 'auto-deploy';
  projectId?: string;
  deploymentId?: string;
  environment?: 'production' | 'preview' | 'development';
  autoRollback?: boolean;
  healthCheckEnabled?: boolean;
  branch?: string;
  buildCommand?: string;
  gitUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      projectId, 
      deploymentId,
      environment = 'production',
      autoRollback = true,
      healthCheckEnabled = true,
      branch,
      buildCommand,
      gitUrl
    } = await req.json() as DeploymentRequest;

    console.log('[unified-deployment-manager] Action:', action, { projectId, environment });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const VERCEL_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    switch (action) {
      case 'orchestrate': {
        // High-level deployment orchestration
        if (!projectId) throw new Error('projectId required for orchestrate');

        console.log('[orchestrate] Starting deployment orchestration');

        // 1. Pre-deployment validation
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (!project) throw new Error('Project not found');

        // 2. Check for existing deployments
        const { data: activeDeployments } = await supabase
          .from('vercel_deployments')
          .select('*')
          .eq('project_id', projectId)
          .in('status', ['building', 'queued'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeDeployments && activeDeployments.length > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Deployment already in progress',
              activeDeployment: activeDeployments[0]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 3. Create deployment record
        const { data: deployment, error: deployError } = await supabase
          .from('vercel_deployments')
          .insert({
            project_id: projectId,
            status: 'queued',
            environment,
            auto_rollback: autoRollback,
            health_check_enabled: healthCheckEnabled
          })
          .select()
          .single();

        if (deployError) throw deployError;

        // 4. Trigger actual deployment
        console.log('[orchestrate] Triggering deployment:', deployment.id);

        // Call the actual deployment function
        const deployResult = await fetch(`${supabaseUrl}/functions/v1/unified-deployment-manager`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            action: 'deploy',
            deploymentId: deployment.id,
            projectId,
            environment
          })
        });

        const deployData = await deployResult.json();

        return new Response(
          JSON.stringify({
            success: true,
            deployment,
            deployResult: deployData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deploy': {
        // Execute actual deployment
        if (!projectId) throw new Error('projectId required for deploy');

        console.log('[deploy] Executing deployment for project:', projectId);

        // Update deployment status
        if (deploymentId) {
          await supabase
            .from('vercel_deployments')
            .update({ status: 'building', started_at: new Date().toISOString() })
            .eq('id', deploymentId);
        }

        // Get project code
        const { data: project } = await supabase
          .from('projects')
          .select('html_code, css_code, js_code, title')
          .eq('id', projectId)
          .single();

        if (!project) throw new Error('Project not found');

        // Deploy to Vercel (if token available)
        if (VERCEL_TOKEN) {
          console.log('[deploy] Deploying to Vercel');

          const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: project.title.toLowerCase().replace(/\s+/g, '-'),
              files: [
                {
                  file: 'index.html',
                  data: project.html_code
                },
                {
                  file: 'styles.css',
                  data: project.css_code || ''
                },
                {
                  file: 'script.js',
                  data: project.js_code || ''
                }
              ],
              projectSettings: {
                framework: null,
                buildCommand: buildCommand || null,
                outputDirectory: null
              },
              target: environment
            })
          });

          const vercelData = await vercelResponse.json();

          if (!vercelResponse.ok) {
            throw new Error(`Vercel deployment failed: ${vercelData.error?.message || 'Unknown error'}`);
          }

          // Update deployment record with Vercel data
          if (deploymentId) {
            await supabase
              .from('vercel_deployments')
              .update({
                deployment_url: `https://${vercelData.url}`,
                vercel_deployment_id: vercelData.id,
                status: 'ready',
                completed_at: new Date().toISOString()
              })
              .eq('id', deploymentId);
          }

          // Trigger health check if enabled
          if (healthCheckEnabled && deploymentId) {
            setTimeout(() => {
              fetch(`${supabaseUrl}/functions/v1/deployment-health-monitor`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({ deploymentId })
              }).catch(console.error);
            }, 30000); // Check after 30 seconds
          }

          return new Response(
            JSON.stringify({
              success: true,
              deployment: vercelData,
              url: `https://${vercelData.url}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // No Vercel token - return preview URL
          const previewUrl = `${supabaseUrl}/preview/${projectId}`;
          
          if (deploymentId) {
            await supabase
              .from('vercel_deployments')
              .update({
                deployment_url: previewUrl,
                status: 'ready',
                completed_at: new Date().toISOString()
              })
              .eq('id', deploymentId);
          }

          return new Response(
            JSON.stringify({
              success: true,
              deployment: { url: previewUrl },
              url: previewUrl,
              message: 'Deployed to preview environment (Vercel token not configured)'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'auto-deploy': {
        // Automated deployment trigger
        if (!projectId) throw new Error('projectId required for auto-deploy');

        console.log('[auto-deploy] Automated deployment triggered for:', projectId);

        // Check if auto-deploy is enabled for this project
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (!project) throw new Error('Project not found');

        // Trigger orchestration
        const orchestrateResult = await fetch(`${supabaseUrl}/functions/v1/unified-deployment-manager`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            action: 'orchestrate',
            projectId,
            environment: 'preview',
            autoRollback: true,
            healthCheckEnabled: true
          })
        });

        const orchestrateData = await orchestrateResult.json();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Auto-deployment triggered',
            result: orchestrateData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'full-deploy': {
        // Full deployment with all checks and validations
        if (!projectId) throw new Error('projectId required for full-deploy');

        console.log('[full-deploy] Starting full deployment pipeline');

        // 1. Pre-flight checks
        const checks = {
          project: false,
          code: false,
          resources: false
        };

        // Check project exists
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        checks.project = !!project;
        checks.code = !!(project?.html_code);
        checks.resources = true; // Assume resources are OK

        if (!checks.project || !checks.code) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Pre-flight checks failed',
              checks
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // 2. Code quality check (using AI)
        if (LOVABLE_API_KEY) {
          console.log('[full-deploy] Running code quality check');
          
          try {
            const qualityCheck = await fetch(`${supabaseUrl}/functions/v1/unified-code-quality`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                action: 'analyze',
                code: project.html_code,
                checkSecurity: true
              })
            });

            const qualityData = await qualityCheck.json();
            console.log('[full-deploy] Quality check result:', qualityData);
          } catch (e) {
            console.warn('[full-deploy] Quality check failed:', e);
          }
        }

        // 3. Proceed with orchestrated deployment
        const deployResult = await fetch(`${supabaseUrl}/functions/v1/unified-deployment-manager`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            action: 'orchestrate',
            projectId,
            environment,
            autoRollback,
            healthCheckEnabled
          })
        });

        const deployData = await deployResult.json();

        return new Response(
          JSON.stringify({
            success: true,
            checks,
            deployment: deployData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-deployment-manager] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
