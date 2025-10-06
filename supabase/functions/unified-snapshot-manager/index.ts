import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SnapshotOperation {
  operation: 'create' | 'restore' | 'list' | 'delete' | 'get_details' | 'compare' | 'auto_snapshot' | 'get_config';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Snapshot Manager request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: SnapshotOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'create':
        result = await handleCreateSnapshot(payload.params, supabase, requestId);
        break;
      case 'restore':
        result = await handleRestoreSnapshot(payload.params, supabase, requestId);
        break;
      case 'list':
        result = await handleListSnapshots(payload.params, supabase, requestId);
        break;
      case 'delete':
        result = await handleDeleteSnapshot(payload.params, supabase, requestId);
        break;
      case 'get_details':
        result = await handleGetSnapshotDetails(payload.params, supabase, requestId);
        break;
      case 'compare':
        result = await handleCompareSnapshots(payload.params, supabase, requestId);
        break;
      case 'auto_snapshot':
        result = await handleAutoSnapshot(payload.params, supabase, requestId);
        break;
      case 'get_config':
        result = await handleGetConfig(payload.params, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleCreateSnapshot(params: any, supabase: any, requestId: string) {
  const { projectId, userId, description, snapshotType = 'manual', metadata = {} } = params;
  
  if (!projectId || !userId) {
    throw new Error('projectId and userId are required');
  }

  console.log(`[${requestId}] Creating snapshot for project: ${projectId}`);

  // Get project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError) throw projectError;
  if (!project) throw new Error('Project not found');

  // Create snapshot
  const { data: snapshot, error } = await supabase
    .from('project_snapshots')
    .insert({
      project_id: projectId,
      user_id: userId,
      snapshot_name: description || `Snapshot ${new Date().toISOString()}`,
      snapshot_data: {
        project,
        html_code: project.html_code,
        css_code: project.css_code,
        js_code: project.js_code,
      },
      snapshot_type: snapshotType,
      metadata: {
        ...metadata,
        projectName: project.name,
        createdBy: 'unified-snapshot-manager',
      },
    })
    .select()
    .single();

  if (error) throw error;

  // Clean up old snapshots if needed
  const { data: allSnapshots } = await supabase
    .from('project_snapshots')
    .select('id, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (allSnapshots && allSnapshots.length > 50) {
    const toDelete = allSnapshots.slice(50).map((s: any) => s.id);
    await supabase
      .from('project_snapshots')
      .delete()
      .in('id', toDelete);
  }

  console.log(`[${requestId}] Snapshot created: ${snapshot.id}`);
  return {
    snapshotId: snapshot.id,
    snapshotName: snapshot.snapshot_name,
    createdAt: snapshot.created_at,
  };
}

async function handleRestoreSnapshot(params: any, supabase: any, requestId: string) {
  const { snapshotId, userId } = params;
  
  if (!snapshotId || !userId) {
    throw new Error('snapshotId and userId are required');
  }

  console.log(`[${requestId}] Restoring snapshot: ${snapshotId}`);

  // Get snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from('project_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .eq('user_id', userId)
    .single();

  if (snapshotError) throw snapshotError;
  if (!snapshot) throw new Error('Snapshot not found');

  // Restore project
  const snapshotData = snapshot.snapshot_data;
  const { error: restoreError } = await supabase
    .from('projects')
    .update({
      html_code: snapshotData.html_code,
      css_code: snapshotData.css_code,
      js_code: snapshotData.js_code,
    })
    .eq('id', snapshot.project_id)
    .eq('user_id', userId);

  if (restoreError) throw restoreError;

  console.log(`[${requestId}] Snapshot restored successfully`);
  return {
    restored: true,
    snapshotId,
    projectId: snapshot.project_id,
    restoredAt: new Date().toISOString(),
  };
}

async function handleListSnapshots(params: any, supabase: any, requestId: string) {
  const { projectId, userId, limit = 50 } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Listing snapshots`);

  let query = supabase
    .from('project_snapshots')
    .select('id, snapshot_name, snapshot_type, created_at, metadata, project_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: snapshots, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${snapshots?.length || 0} snapshots`);
  return {
    snapshots: snapshots || [],
    count: snapshots?.length || 0,
  };
}

async function handleDeleteSnapshot(params: any, supabase: any, requestId: string) {
  const { snapshotId, userId } = params;
  
  if (!snapshotId || !userId) {
    throw new Error('snapshotId and userId are required');
  }

  console.log(`[${requestId}] Deleting snapshot: ${snapshotId}`);

  const { error } = await supabase
    .from('project_snapshots')
    .delete()
    .eq('id', snapshotId)
    .eq('user_id', userId);

  if (error) throw error;

  console.log(`[${requestId}] Snapshot deleted`);
  return { deleted: true, snapshotId };
}

async function handleGetSnapshotDetails(params: any, supabase: any, requestId: string) {
  const { snapshotId, userId } = params;
  
  if (!snapshotId || !userId) {
    throw new Error('snapshotId and userId are required');
  }

  console.log(`[${requestId}] Getting snapshot details: ${snapshotId}`);

  const { data: snapshot, error } = await supabase
    .from('project_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!snapshot) throw new Error('Snapshot not found');

  console.log(`[${requestId}] Snapshot details retrieved`);
  return { snapshot };
}

async function handleCompareSnapshots(params: any, supabase: any, requestId: string) {
  const { snapshot1Id, snapshot2Id, userId } = params;
  
  if (!snapshot1Id || !snapshot2Id || !userId) {
    throw new Error('snapshot1Id, snapshot2Id, and userId are required');
  }

  console.log(`[${requestId}] Comparing snapshots: ${snapshot1Id} vs ${snapshot2Id}`);

  const { data: snapshots, error } = await supabase
    .from('project_snapshots')
    .select('*')
    .in('id', [snapshot1Id, snapshot2Id])
    .eq('user_id', userId);

  if (error) throw error;
  if (!snapshots || snapshots.length !== 2) {
    throw new Error('One or both snapshots not found');
  }

  const [s1, s2] = snapshots;

  // Simple comparison
  const differences = {
    htmlChanged: s1.snapshot_data.html_code !== s2.snapshot_data.html_code,
    cssChanged: s1.snapshot_data.css_code !== s2.snapshot_data.css_code,
    jsChanged: s1.snapshot_data.js_code !== s2.snapshot_data.js_code,
    timeDifference: new Date(s2.created_at).getTime() - new Date(s1.created_at).getTime(),
  };

  console.log(`[${requestId}] Snapshot comparison complete`);
  return {
    snapshot1: { id: s1.id, name: s1.snapshot_name, createdAt: s1.created_at },
    snapshot2: { id: s2.id, name: s2.snapshot_name, createdAt: s2.created_at },
    differences,
  };
}

async function handleAutoSnapshot(params: any, supabase: any, requestId: string) {
  const { userId, enabled, intervalMinutes = 15, maxSnapshots = 50 } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Configuring auto-snapshot`);

  const { data: config, error } = await supabase
    .from('auto_snapshot_config')
    .upsert({
      user_id: userId,
      enabled: enabled ?? true,
      interval_minutes: intervalMinutes,
      max_snapshots: maxSnapshots,
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Auto-snapshot configured: ${enabled ? 'enabled' : 'disabled'}`);
  return { config };
}

async function handleGetConfig(params: any, supabase: any, requestId: string) {
  const { userId } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Getting auto-snapshot config`);

  const { data: config, error } = await supabase
    .from('auto_snapshot_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  console.log(`[${requestId}] Config retrieved`);
  return {
    config: config || {
      enabled: false,
      interval_minutes: 15,
      max_snapshots: 50,
    },
  };
}
