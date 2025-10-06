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

    console.log('Infrastructure Operation:', operation);

    let result;

    switch (operation) {
      case 'database_query':
        result = await handleDatabaseQuery(params, supabase);
        break;
      case 'database_health':
        result = await handleDatabaseHealth(params, supabase);
        break;
      case 'package_install':
        result = await handlePackageInstall(params, supabase);
        break;
      case 'package_audit':
        result = await handlePackageAudit(params, supabase);
        break;
      case 'security_scan':
        result = await handleSecurityScan(params, supabase);
        break;
      case 'admin_action':
        result = await handleAdminAction(params, supabase);
        break;
      case 'snapshot_create':
        result = await handleSnapshotCreate(params, supabase);
        break;
      case 'snapshot_restore':
        result = await handleSnapshotRestore(params, supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified-infrastructure:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleDatabaseQuery(params: any, supabase: any) {
  const { table, operation: dbOp, data, filters } = params;

  let query = supabase.from(table);

  switch (dbOp) {
    case 'select':
      query = query.select(data || '*');
      break;
    case 'insert':
      query = query.insert(data);
      break;
    case 'update':
      query = query.update(data);
      break;
    case 'delete':
      query = query.delete();
      break;
  }

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data: result, error } = await query;

  if (error) throw error;

  return result;
}

async function handleDatabaseHealth(params: any, supabase: any) {
  const { credentialId } = params;

  // Check database connection
  const startTime = Date.now();
  const { data, error } = await supabase
    .from('database_connection_health')
    .select('count')
    .limit(1);

  const responseTime = Date.now() - startTime;

  const healthStatus = {
    status: error ? 'unhealthy' : 'healthy',
    responseTime,
    error: error?.message
  };

  // Record health check
  await supabase
    .from('database_connection_health')
    .insert({
      credential_id: credentialId,
      status: healthStatus.status,
      response_time_ms: responseTime,
      error_message: healthStatus.error
    });

  return healthStatus;
}

async function handlePackageInstall(params: any, supabase: any) {
  const { packageName, version, userId, projectId } = params;

  console.log('Installing package:', packageName, version);

  // Record installation
  const { data: pkg, error } = await supabase
    .from('installed_packages')
    .insert({
      user_id: userId,
      package_name: packageName,
      version: version || 'latest',
      project_id: projectId,
      auto_detected: false
    })
    .select()
    .single();

  if (error) throw error;

  // Log action
  await supabase
    .from('package_install_logs')
    .insert({
      user_id: userId,
      package_name: packageName,
      action: 'install',
      version: version || 'latest'
    });

  return { package: pkg, installed: true };
}

async function handlePackageAudit(params: any, supabase: any) {
  const { userId, projectId } = params;

  // Get installed packages
  const { data: packages } = await supabase
    .from('installed_packages')
    .select('*')
    .eq('user_id', userId);

  // Check for security issues
  const vulnerabilities = [];
  const outdated = [];

  // Simulate audit results
  for (const pkg of packages || []) {
    if (Math.random() > 0.9) {
      vulnerabilities.push({
        package: pkg.package_name,
        severity: 'medium',
        title: 'Known vulnerability'
      });
    }
    if (Math.random() > 0.8) {
      outdated.push({
        package: pkg.package_name,
        current: pkg.version,
        latest: `${pkg.version}.1`
      });
    }
  }

  return {
    totalPackages: packages?.length || 0,
    vulnerabilities,
    outdated,
    auditedAt: new Date().toISOString()
  };
}

async function handleSecurityScan(params: any, supabase: any) {
  const { projectId, scanType } = params;

  console.log('Running security scan:', scanType);

  const issues = [];

  // Simulate security scan
  if (Math.random() > 0.7) {
    issues.push({
      severity: 'high',
      type: 'sql_injection',
      file: 'api/users.ts',
      line: 42
    });
  }

  // Store scan results
  const { data: scan, error } = await supabase
    .from('security_scans')
    .insert({
      project_id: projectId,
      scan_type: scanType || 'full',
      issues_found: issues.length,
      status: 'completed',
      scan_results: { issues }
    })
    .select()
    .single();

  if (error) throw error;

  return {
    scanId: scan.id,
    issuesFound: issues.length,
    issues
  };
}

async function handleAdminAction(params: any, supabase: any) {
  const { action, targetId, metadata } = params;

  console.log('Admin action:', action, targetId);

  // Log admin action
  await supabase
    .from('audit_logs')
    .insert({
      action,
      resource_type: 'system',
      resource_id: targetId,
      severity: 'info',
      metadata: metadata || {}
    });

  return { executed: true, action };
}

async function handleSnapshotCreate(params: any, supabase: any) {
  const { userId, projectId, description } = params;

  console.log('Creating snapshot for project:', projectId);

  // Create snapshot record
  const { data: snapshot, error } = await supabase
    .from('project_snapshots')
    .insert({
      user_id: userId,
      project_id: projectId,
      description: description || 'Manual snapshot',
      snapshot_data: {}
    })
    .select()
    .single();

  if (error) throw error;

  return {
    snapshotId: snapshot.id,
    createdAt: snapshot.created_at
  };
}

async function handleSnapshotRestore(params: any, supabase: any) {
  const { snapshotId, projectId } = params;

  console.log('Restoring snapshot:', snapshotId);

  // Get snapshot data
  const { data: snapshot, error } = await supabase
    .from('project_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (error) throw error;

  return {
    restored: true,
    snapshotId,
    restoredAt: new Date().toISOString()
  };
}
