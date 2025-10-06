import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupOperation {
  operation: 'create_backup' | 'restore_backup' | 'list_backups' | 'delete_backup' | 'schedule_backup' | 'get_backup_info' | 'verify_backup' | 'export_backup';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Backup Manager request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: BackupOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'create_backup':
        result = await handleCreateBackup(payload.params, supabase, requestId);
        break;
      case 'restore_backup':
        result = await handleRestoreBackup(payload.params, supabase, requestId);
        break;
      case 'list_backups':
        result = await handleListBackups(payload.params, supabase, requestId);
        break;
      case 'delete_backup':
        result = await handleDeleteBackup(payload.params, supabase, requestId);
        break;
      case 'schedule_backup':
        result = await handleScheduleBackup(payload.params, supabase, requestId);
        break;
      case 'get_backup_info':
        result = await handleGetBackupInfo(payload.params, supabase, requestId);
        break;
      case 'verify_backup':
        result = await handleVerifyBackup(payload.params, supabase, requestId);
        break;
      case 'export_backup':
        result = await handleExportBackup(payload.params, supabase, requestId);
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

async function handleCreateBackup(params: any, supabase: any, requestId: string) {
  const { userId, backupType = 'full', description, metadata = {} } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Creating ${backupType} backup for user: ${userId}`);

  const startTime = Date.now();

  // Collect data for backup
  const backupData: any = {
    created_at: new Date().toISOString(),
    backup_type: backupType,
    user_id: userId,
  };

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);

  backupData.projects = projects || [];

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId);

  backupData.conversations = conversations || [];

  // Get snapshots
  const { data: snapshots } = await supabase
    .from('project_snapshots')
    .select('*')
    .eq('user_id', userId);

  backupData.snapshots = snapshots || [];

  const duration = Date.now() - startTime;
  const backupSize = JSON.stringify(backupData).length;

  // Store backup metadata
  const { data: backup, error } = await supabase
    .from('backups')
    .insert({
      user_id: userId,
      backup_type: backupType,
      backup_size: backupSize,
      description: description || `${backupType} backup`,
      backup_data: backupData,
      status: 'completed',
      duration_ms: duration,
      metadata: {
        ...metadata,
        projects_count: projects?.length || 0,
        conversations_count: conversations?.length || 0,
        snapshots_count: snapshots?.length || 0,
      },
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Backup created: ${backup.id} (${backupSize} bytes, ${duration}ms)`);
  return {
    backupId: backup.id,
    backupSize,
    duration,
    itemsCounts: {
      projects: projects?.length || 0,
      conversations: conversations?.length || 0,
      snapshots: snapshots?.length || 0,
    },
  };
}

async function handleRestoreBackup(params: any, supabase: any, requestId: string) {
  const { backupId, userId, restoreOptions = {} } = params;
  
  if (!backupId || !userId) {
    throw new Error('backupId and userId are required');
  }

  console.log(`[${requestId}] Restoring backup: ${backupId}`);

  // Get backup
  const { data: backup, error: backupError } = await supabase
    .from('backups')
    .select('*')
    .eq('id', backupId)
    .eq('user_id', userId)
    .single();

  if (backupError) throw backupError;
  if (!backup) throw new Error('Backup not found');

  const startTime = Date.now();
  const restored: any = {
    projects: 0,
    conversations: 0,
    snapshots: 0,
  };

  const backupData = backup.backup_data;

  // Restore projects (if requested)
  if (restoreOptions.restoreProjects !== false && backupData.projects) {
    for (const project of backupData.projects) {
      const { id: _, created_at: __, updated_at: ___, ...projectData } = project;
      await supabase.from('projects').insert({ ...projectData, user_id: userId });
      restored.projects++;
    }
  }

  // Restore conversations (if requested)
  if (restoreOptions.restoreConversations !== false && backupData.conversations) {
    for (const conversation of backupData.conversations) {
      const { id: _, created_at: __, updated_at: ___, ...convData } = conversation;
      await supabase.from('conversations').insert({ ...convData, user_id: userId });
      restored.conversations++;
    }
  }

  // Restore snapshots (if requested)
  if (restoreOptions.restoreSnapshots !== false && backupData.snapshots) {
    for (const snapshot of backupData.snapshots) {
      const { id: _, created_at: __, ...snapData } = snapshot;
      await supabase.from('project_snapshots').insert({ ...snapData, user_id: userId });
      restored.snapshots++;
    }
  }

  const duration = Date.now() - startTime;

  console.log(`[${requestId}] Backup restored: ${JSON.stringify(restored)} (${duration}ms)`);
  return {
    restored: true,
    backupId,
    itemsRestored: restored,
    duration,
  };
}

async function handleListBackups(params: any, supabase: any, requestId: string) {
  const { userId, limit = 50, backupType = null } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Listing backups for user: ${userId}`);

  let query = supabase
    .from('backups')
    .select('id, backup_type, backup_size, description, status, created_at, duration_ms, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (backupType) {
    query = query.eq('backup_type', backupType);
  }

  const { data: backups, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${backups?.length || 0} backups`);
  return { backups: backups || [], count: backups?.length || 0 };
}

async function handleDeleteBackup(params: any, supabase: any, requestId: string) {
  const { backupId, userId } = params;
  
  if (!backupId || !userId) {
    throw new Error('backupId and userId are required');
  }

  console.log(`[${requestId}] Deleting backup: ${backupId}`);

  const { error } = await supabase
    .from('backups')
    .delete()
    .eq('id', backupId)
    .eq('user_id', userId);

  if (error) throw error;

  console.log(`[${requestId}] Backup deleted`);
  return { deleted: true, backupId };
}

async function handleScheduleBackup(params: any, supabase: any, requestId: string) {
  const { userId, schedule, backupType = 'full', enabled = true } = params;
  
  if (!userId || !schedule) {
    throw new Error('userId and schedule are required');
  }

  console.log(`[${requestId}] Scheduling backup: ${schedule}`);

  const { data: config, error } = await supabase
    .from('backup_schedules')
    .upsert({
      user_id: userId,
      schedule,
      backup_type: backupType,
      enabled,
      next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default: 24h from now
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Backup scheduled`);
  return { scheduled: true, config };
}

async function handleGetBackupInfo(params: any, supabase: any, requestId: string) {
  const { backupId, userId } = params;
  
  if (!backupId || !userId) {
    throw new Error('backupId and userId are required');
  }

  console.log(`[${requestId}] Getting backup info: ${backupId}`);

  const { data: backup, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', backupId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!backup) throw new Error('Backup not found');

  // Don't send full backup data, just metadata
  const { backup_data: _, ...backupInfo } = backup;

  console.log(`[${requestId}] Backup info retrieved`);
  return { backup: backupInfo };
}

async function handleVerifyBackup(params: any, supabase: any, requestId: string) {
  const { backupId, userId } = params;
  
  if (!backupId || !userId) {
    throw new Error('backupId and userId are required');
  }

  console.log(`[${requestId}] Verifying backup: ${backupId}`);

  const { data: backup, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', backupId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!backup) throw new Error('Backup not found');

  // Verify backup integrity
  const issues: string[] = [];
  
  if (!backup.backup_data) {
    issues.push('Missing backup data');
  }

  if (backup.status !== 'completed') {
    issues.push('Backup not completed');
  }

  if (backup.backup_size === 0) {
    issues.push('Backup is empty');
  }

  const valid = issues.length === 0;

  console.log(`[${requestId}] Backup verification: ${valid ? 'valid' : 'invalid'}`);
  return {
    backupId,
    valid,
    issues: valid ? [] : issues,
    metadata: backup.metadata,
  };
}

async function handleExportBackup(params: any, supabase: any, requestId: string) {
  const { backupId, userId, format = 'json' } = params;
  
  if (!backupId || !userId) {
    throw new Error('backupId and userId are required');
  }

  console.log(`[${requestId}] Exporting backup: ${backupId} (${format})`);

  const { data: backup, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', backupId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!backup) throw new Error('Backup not found');

  const exportData = {
    exportedAt: new Date().toISOString(),
    backupId: backup.id,
    backupType: backup.backup_type,
    createdAt: backup.created_at,
    data: backup.backup_data,
  };

  console.log(`[${requestId}] Backup exported`);
  return {
    format,
    exportData,
    size: JSON.stringify(exportData).length,
  };
}
