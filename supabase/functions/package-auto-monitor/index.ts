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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[Auto-Monitor] Starting continuous package monitoring...');

    // Get all active monitors that need checking
    const { data: monitors, error: monitorsError } = await supabaseClient
      .from('package_monitors')
      .select('*')
      .eq('is_active', true)
      .lte('next_check_at', new Date().toISOString());

    if (monitorsError) throw monitorsError;

    console.log(`[Auto-Monitor] Found ${monitors?.length || 0} monitors to check`);

    const results = [];

    for (const monitor of monitors || []) {
      console.log(`[Auto-Monitor] Checking ${monitor.monitor_type} for user ${monitor.user_id}`);
      
      try {
        let findings = [];

        // Run the appropriate check based on monitor type
        switch (monitor.monitor_type) {
          case 'security':
            findings = await runSecurityScan(supabaseClient, monitor);
            break;
          case 'updates':
            findings = await runUpdateCheck(supabaseClient, monitor);
            break;
          case 'conflicts':
            findings = await runConflictCheck(supabaseClient, monitor);
            break;
          case 'deprecations':
            findings = await runDeprecationCheck(supabaseClient, monitor);
            break;
        }

        // Update monitor
        await supabaseClient.from('package_monitors').update({
          last_check_at: new Date().toISOString(),
          findings_count: findings.length
        }).eq('id', monitor.id);

        // Auto-fix if enabled and findings exist
        if (monitor.auto_fix_enabled && findings.length > 0) {
          await applyAutoFixes(supabaseClient, monitor, findings);
        }

        results.push({
          monitorId: monitor.id,
          monitorType: monitor.monitor_type,
          findingsCount: findings.length,
          autoFixed: monitor.auto_fix_enabled
        });

      } catch (error) {
        console.error(`[Auto-Monitor] Error checking ${monitor.monitor_type}:`, error);
        results.push({
          monitorId: monitor.id,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      monitorsChecked: monitors?.length || 0,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Auto-Monitor] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function runSecurityScan(supabase: any, monitor: any) {
  console.log('[Auto-Monitor] Running security scan...');
  
  const { data: scans } = await supabase
    .from('package_security_scans')
    .select('*')
    .eq('user_id', monitor.user_id)
    .eq('project_id', monitor.project_id)
    .in('severity', ['high', 'critical'])
    .eq('patched', false)
    .order('created_at', { ascending: false })
    .limit(50);

  return scans || [];
}

async function runUpdateCheck(supabase: any, monitor: any) {
  console.log('[Auto-Monitor] Running update check...');
  
  const { data: updates } = await supabase
    .from('package_updates')
    .select('*')
    .eq('user_id', monitor.user_id)
    .eq('project_id', monitor.project_id)
    .eq('update_applied', false)
    .gte('safety_score', 80)
    .order('created_at', { ascending: false })
    .limit(50);

  return updates || [];
}

async function runConflictCheck(supabase: any, monitor: any) {
  console.log('[Auto-Monitor] Running conflict check...');
  
  const { data: conflicts } = await supabase
    .from('dependency_conflicts')
    .select('*')
    .eq('user_id', monitor.user_id)
    .eq('project_id', monitor.project_id)
    .eq('resolved', false)
    .order('severity_score', { ascending: false })
    .limit(50);

  return conflicts || [];
}

async function runDeprecationCheck(supabase: any, monitor: any) {
  console.log('[Auto-Monitor] Running deprecation check...');
  
  // This would check for deprecated packages
  // For now, return empty array
  return [];
}

async function applyAutoFixes(supabase: any, monitor: any, findings: any[]) {
  console.log(`[Auto-Monitor] Applying auto-fixes for ${findings.length} findings...`);
  
  for (const finding of findings.slice(0, 10)) { // Limit to 10 auto-fixes per run
    try {
      if (monitor.monitor_type === 'security' && finding.fix_available) {
        // Auto-update vulnerable package
        await supabase.from('package_operations').insert({
          user_id: monitor.user_id,
          project_id: monitor.project_id,
          operation_type: 'update',
          package_name: finding.package_name,
          from_version: finding.vulnerable_version,
          to_version: finding.patched_version,
          status: 'pending',
          triggered_by: 'security_scan'
        });
      } else if (monitor.monitor_type === 'updates') {
        // Auto-apply safe updates
        await supabase.from('package_operations').insert({
          user_id: monitor.user_id,
          project_id: monitor.project_id,
          operation_type: 'update',
          package_name: finding.package_name,
          from_version: finding.current_version,
          to_version: finding.latest_version,
          status: 'pending',
          triggered_by: 'ai_auto'
        });
      } else if (monitor.monitor_type === 'conflicts') {
        // Auto-resolve conflicts
        await supabase.from('package_operations').insert({
          user_id: monitor.user_id,
          project_id: monitor.project_id,
          operation_type: 'resolve_conflict',
          package_name: finding.package_a,
          status: 'pending',
          triggered_by: 'dependency_resolver'
        });
      }
      
      console.log(`[Auto-Monitor] ✓ Queued auto-fix for ${finding.package_name}`);
    } catch (error) {
      console.error(`[Auto-Monitor] ✗ Failed to queue auto-fix:`, error);
    }
  }
}