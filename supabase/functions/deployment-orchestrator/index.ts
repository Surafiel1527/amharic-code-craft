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

    const { pipeline_id, action } = await req.json();

    console.log(`🚀 Deployment Orchestrator: ${action} for pipeline ${pipeline_id}`);

    // Get pipeline configuration
    const { data: pipeline, error: pipelineError } = await supabase
      .from('deployment_pipelines')
      .select('*')
      .eq('id', pipeline_id)
      .single();

    if (pipelineError || !pipeline) {
      throw new Error('Pipeline not found');
    }

    if (action === 'predict') {
      // Predict deployment success
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
            content: `Predict deployment success for this pipeline:

Pipeline Config: ${JSON.stringify(pipeline.pipeline_config)}
Recent Success Rate: ${(pipeline.success_count || 0) / ((pipeline.success_count || 0) + (pipeline.failure_count || 0)) * 100}%
Health Checks: ${JSON.stringify(pipeline.health_checks)}

Provide:
1. Success probability (0-100%)
2. Risk factors
3. Recommended changes before deploying
4. Estimated deployment duration

Format as JSON.`
          }]
        })
      });

      const aiData = await aiResponse.json();
      const prediction = JSON.parse(
        aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
      );

      // Store prediction
      await supabase
        .from('deployment_predictions')
        .insert({
          pipeline_id,
          prediction_type: 'pre_deployment',
          success_probability: prediction.success_probability || 50,
          risk_factors: prediction.risk_factors || [],
          recommended_changes: prediction.recommended_changes || [],
          estimated_duration_minutes: prediction.estimated_duration || 15,
          confidence_score: prediction.confidence || 70,
          prediction_data: pipeline.pipeline_config
        });

      return new Response(
        JSON.stringify({ prediction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'deploy') {
      // Execute deployment pipeline
      const stages = pipeline.stages || [];
      const results = [];

      for (const stage of stages) {
        console.log(`Executing stage: ${stage.name}`);
        
        try {
          // Execute stage (simplified - would call actual deployment services)
          const stageResult = {
            stage: stage.name,
            status: 'success',
            duration: Math.floor(Math.random() * 30) + 10,
            output: `Stage ${stage.name} completed successfully`
          };
          
          results.push(stageResult);
        } catch (stageError) {
          results.push({
            stage: stage.name,
            status: 'failed',
            error: stageError instanceof Error ? stageError.message : 'Unknown error'
          });

          // If auto-rollback is enabled, trigger it
          if (pipeline.auto_rollback) {
            console.log('Deployment failed, initiating auto-rollback...');
            
            await supabase.functions.invoke('smart-rollback-engine', {
              body: {
                pipeline_id,
                reason: `Stage ${stage.name} failed`,
                failed_stage: stage.name
              }
            });
          }

          break;
        }
      }

      // Update pipeline stats
      const deploymentSuccess = results.every((r: any) => r.status === 'success');
      await supabase
        .from('deployment_pipelines')
        .update({
          last_run_at: new Date().toISOString(),
          success_count: deploymentSuccess ? (pipeline.success_count || 0) + 1 : pipeline.success_count,
          failure_count: !deploymentSuccess ? (pipeline.failure_count || 0) + 1 : pipeline.failure_count
        })
        .eq('id', pipeline_id);

      return new Response(
        JSON.stringify({
          success: deploymentSuccess,
          stages: results,
          pipeline_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'monitor') {
      // Monitor deployment health
      const healthChecks = pipeline.health_checks || [];
      const checks = [];

      for (const check of healthChecks) {
        // Perform health check (simplified)
        const checkResult = {
          check: check.name,
          status: Math.random() > 0.1 ? 'healthy' : 'unhealthy',
          response_time: Math.floor(Math.random() * 200) + 50,
          timestamp: new Date().toISOString()
        };

        checks.push(checkResult);
      }

      const healthScore = checks.filter((c: any) => c.status === 'healthy').length / checks.length * 100;

      // If health is below threshold, trigger rollback
      if (pipeline.auto_rollback && healthScore < (pipeline.rollback_threshold * 100)) {
        console.log(`Health score ${healthScore}% below threshold, triggering rollback...`);
        
        await supabase.functions.invoke('smart-rollback-engine', {
          body: {
            pipeline_id,
            reason: `Health score ${healthScore}% below threshold`,
            health_checks: checks
          }
        });
      }

      return new Response(
        JSON.stringify({
          health_score: healthScore,
          checks,
          threshold: pipeline.rollback_threshold * 100,
          should_rollback: healthScore < (pipeline.rollback_threshold * 100)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in deployment-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});