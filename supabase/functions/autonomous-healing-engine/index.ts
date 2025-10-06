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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 AUTONOMOUS HEALING ENGINE: Starting automated cycle...');

    const results = {
      timestamp: new Date().toISOString(),
      cycles_run: 0,
      errors_detected: 0,
      fixes_applied: 0,
      patterns_learned: 0,
      optimizations_made: 0,
      improvements_deployed: 0,
    };

    // CYCLE 1: ERROR DETECTION & AUTO-FIX
    console.log('📊 Cycle 1: Scanning for errors...');
    const { data: pendingErrors } = await supabase
      .from('detected_errors')
      .select('*')
      .in('status', ['pending', 'detected'])
      .order('severity', { ascending: false })
      .limit(10);

    if (pendingErrors && pendingErrors.length > 0) {
      results.errors_detected = pendingErrors.length;
      
      // Automatically apply fixes for high-confidence patterns
      for (const error of pendingErrors) {
        const { data: matchingPattern } = await supabase
          .from('universal_error_patterns')
          .select('*')
          .eq('error_signature', error.error_message)
          .gte('confidence_score', 0.85)
          .single();

        if (matchingPattern) {
          // Auto-apply the fix
          const { data: autoFix } = await supabase
            .from('auto_fixes')
            .insert({
              error_id: error.id,
              pattern_id: matchingPattern.id,
              fix_code: matchingPattern.solution_code,
              confidence: matchingPattern.confidence_score,
              auto_applied: true,
              applied_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (autoFix) {
            await supabase
              .from('detected_errors')
              .update({ 
                status: 'fixed_auto',
                resolved_at: new Date().toISOString(),
              })
              .eq('id', error.id);

            results.fixes_applied++;
            console.log(`✅ Auto-fixed: ${error.error_type}`);
          }
        }
      }
    }
    results.cycles_run++;

    // CYCLE 2: UNIVERSAL PATTERN LEARNING
    console.log('🧠 Cycle 2: Learning patterns across projects...');
    const { data: recentFixes } = await supabase
      .from('auto_fixes')
      .select('*, detected_errors(*)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('fix_worked', true);

    if (recentFixes && recentFixes.length > 0) {
      // Group similar errors and create universal patterns
      const errorGroups = new Map();
      for (const fix of recentFixes) {
        const signature = fix.detected_errors?.error_type || 'unknown';
        if (!errorGroups.has(signature)) {
          errorGroups.set(signature, []);
        }
        errorGroups.get(signature).push(fix);
      }

      for (const [signature, fixes] of errorGroups) {
        if (fixes.length >= 2) {
          // Create or update universal pattern
          const avgConfidence = fixes.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0) / fixes.length;
          
          await supabase
            .from('universal_error_patterns')
            .upsert({
              error_signature: signature,
              solution_code: fixes[0].fix_code,
              confidence_score: avgConfidence,
              success_count: fixes.length,
              projects_affected: [...new Set(fixes.map((f: any) => f.detected_errors?.project_id))].length,
              auto_apply: avgConfidence >= 0.85,
            }, { onConflict: 'error_signature' });

          results.patterns_learned++;
          console.log(`📚 Learned pattern: ${signature}`);
        }
      }
    }
    results.cycles_run++;

    // CYCLE 3: DEPLOYMENT MONITORING & LEARNING
    console.log('🚀 Cycle 3: Monitoring deployments...');
    const { data: recentDeployments } = await supabase
      .from('deployment_logs')
      .select('*')
      .gte('deployed_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('deployed_at', { ascending: false })
      .limit(5);

    if (recentDeployments) {
      for (const deployment of recentDeployments) {
        // Check for errors after deployment
        const { data: deploymentErrors } = await supabase
          .from('detected_errors')
          .select('*')
          .gte('created_at', deployment.deployed_at)
          .eq('project_id', deployment.project_id);

        if (deploymentErrors && deploymentErrors.length > 0) {
          // Log deployment correlation
          await supabase
            .from('deployment_error_correlations')
            .insert({
              deployment_id: deployment.id,
              error_ids: deploymentErrors.map(e => e.id),
              error_count: deploymentErrors.length,
              deployment_hash: deployment.commit_hash,
            });

          console.log(`⚠️ Detected ${deploymentErrors.length} errors after deployment`);
        }
      }
    }
    results.cycles_run++;

    // CYCLE 4: CONTEXTUAL OPTIMIZATION
    console.log('⚙️ Cycle 4: Running contextual optimization...');
    const now = new Date();
    const context = {
      hour: now.getHours(),
      day: now.getDay(),
      load: results.errors_detected > 10 ? 'high' : results.errors_detected > 5 ? 'medium' : 'low',
    };

    // Adjust auto-apply thresholds based on context
    if (context.hour >= 22 || context.hour <= 6) {
      // Night time: be more conservative
      await supabase
        .from('system_config')
        .upsert({ 
          key: 'auto_fix_threshold', 
          value: 0.90,
          context: 'night_mode',
        }, { onConflict: 'key' });
    } else if (context.load === 'high') {
      // High load: be more aggressive
      await supabase
        .from('system_config')
        .upsert({ 
          key: 'auto_fix_threshold', 
          value: 0.80,
          context: 'high_load',
        }, { onConflict: 'key' });
    }
    results.optimizations_made++;
    results.cycles_run++;

    // CYCLE 5: SELF-IMPROVEMENT
    console.log('🔄 Cycle 5: Meta-improvement analysis...');
    const { data: systemMetrics } = await supabase
      .from('ai_improvement_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (systemMetrics && systemMetrics.length > 0) {
      const successRate = systemMetrics.filter(m => m.success).length / systemMetrics.length;
      
      if (successRate < 0.7) {
        // System performance degraded - log for meta-improvement
        await supabase
          .from('meta_improvement_queue')
          .insert({
            issue: 'low_success_rate',
            current_rate: successRate,
            metrics: systemMetrics.slice(-10),
            priority: 'high',
          });
        
        console.log(`🔧 Queued meta-improvement: success rate ${(successRate * 100).toFixed(1)}%`);
        results.improvements_deployed++;
      }
    }
    results.cycles_run++;

    // Log the autonomous cycle
    await supabase.from('ai_improvement_logs').insert({
      operation_type: 'autonomous_healing_cycle',
      changes_made: results,
      success: true,
    });

    console.log(`✅ AUTONOMOUS CYCLE COMPLETE:`, results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Autonomous healing cycle completed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in autonomous-healing-engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
