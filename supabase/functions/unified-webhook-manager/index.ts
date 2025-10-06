import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookOperation {
  operation: 'register' | 'unregister' | 'trigger' | 'list' | 'get_logs' | 'update' | 'test' | 'retry';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Webhook Manager request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'register':
        result = await handleRegisterWebhook(payload.params, supabase, requestId);
        break;
      case 'unregister':
        result = await handleUnregisterWebhook(payload.params, supabase, requestId);
        break;
      case 'trigger':
        result = await handleTriggerWebhook(payload.params, supabase, requestId);
        break;
      case 'list':
        result = await handleListWebhooks(payload.params, supabase, requestId);
        break;
      case 'get_logs':
        result = await handleGetWebhookLogs(payload.params, supabase, requestId);
        break;
      case 'update':
        result = await handleUpdateWebhook(payload.params, supabase, requestId);
        break;
      case 'test':
        result = await handleTestWebhook(payload.params, supabase, requestId);
        break;
      case 'retry':
        result = await handleRetryWebhook(payload.params, supabase, requestId);
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

async function handleRegisterWebhook(params: any, supabase: any, requestId: string) {
  const { 
    userId, 
    webhookUrl, 
    eventTypes, 
    name, 
    secret = null, 
    headers = {}, 
    active = true 
  } = params;
  
  if (!userId || !webhookUrl || !eventTypes || !name) {
    throw new Error('userId, webhookUrl, eventTypes, and name are required');
  }

  console.log(`[${requestId}] Registering webhook: ${name}`);

  // Validate URL
  try {
    new URL(webhookUrl);
  } catch {
    throw new Error('Invalid webhook URL');
  }

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: userId,
      webhook_url: webhookUrl,
      event_types: eventTypes,
      name,
      secret,
      headers,
      active,
      last_triggered_at: null,
      success_count: 0,
      failure_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Webhook registered: ${webhook.id}`);
  return {
    webhookId: webhook.id,
    name: webhook.name,
    url: webhook.webhook_url,
    eventTypes: webhook.event_types,
  };
}

async function handleUnregisterWebhook(params: any, supabase: any, requestId: string) {
  const { webhookId, userId } = params;
  
  if (!webhookId || !userId) {
    throw new Error('webhookId and userId are required');
  }

  console.log(`[${requestId}] Unregistering webhook: ${webhookId}`);

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', userId);

  if (error) throw error;

  console.log(`[${requestId}] Webhook unregistered`);
  return { unregistered: true, webhookId };
}

async function handleTriggerWebhook(params: any, supabase: any, requestId: string) {
  const { webhookId, eventType, payload, userId } = params;
  
  if (!webhookId || !eventType || !payload) {
    throw new Error('webhookId, eventType, and payload are required');
  }

  console.log(`[${requestId}] Triggering webhook: ${webhookId} (event: ${eventType})`);

  // Get webhook config
  const { data: webhook, error: webhookError } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();

  if (webhookError) throw webhookError;
  if (!webhook) throw new Error('Webhook not found');
  if (!webhook.active) throw new Error('Webhook is not active');

  // Check if event type is registered
  if (!webhook.event_types.includes(eventType)) {
    console.log(`[${requestId}] Event type ${eventType} not registered for this webhook`);
    return { triggered: false, reason: 'Event type not registered' };
  }

  // Trigger webhook
  const startTime = Date.now();
  let success = false;
  let responseStatus = 0;
  let errorMessage = null;

  try {
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': eventType,
      'X-Webhook-ID': webhookId,
      'X-Request-ID': requestId,
      ...webhook.headers,
    };

    if (webhook.secret) {
      webhookHeaders['X-Webhook-Secret'] = webhook.secret;
    }

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(payload),
    });

    responseStatus = response.status;
    success = response.ok;

    if (!success) {
      errorMessage = await response.text();
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  const duration = Date.now() - startTime;

  // Log webhook execution
  await supabase
    .from('webhook_logs')
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload,
      success,
      response_status: responseStatus,
      error_message: errorMessage,
      duration_ms: duration,
    });

  // Update webhook stats
  await supabase
    .from('webhooks')
    .update({
      last_triggered_at: new Date().toISOString(),
      success_count: success ? webhook.success_count + 1 : webhook.success_count,
      failure_count: !success ? webhook.failure_count + 1 : webhook.failure_count,
    })
    .eq('id', webhookId);

  console.log(`[${requestId}] Webhook triggered: ${success ? 'success' : 'failed'} (${duration}ms)`);
  return {
    triggered: true,
    success,
    responseStatus,
    duration,
    errorMessage,
  };
}

async function handleListWebhooks(params: any, supabase: any, requestId: string) {
  const { userId, active = null } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Listing webhooks for user: ${userId}`);

  let query = supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (active !== null) {
    query = query.eq('active', active);
  }

  const { data: webhooks, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${webhooks?.length || 0} webhooks`);
  return { webhooks: webhooks || [], count: webhooks?.length || 0 };
}

async function handleGetWebhookLogs(params: any, supabase: any, requestId: string) {
  const { webhookId, userId, limit = 50, successOnly = false } = params;
  
  if (!webhookId || !userId) {
    throw new Error('webhookId and userId are required');
  }

  console.log(`[${requestId}] Getting webhook logs: ${webhookId}`);

  // Verify webhook ownership
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('user_id', userId)
    .single();

  if (!webhook) throw new Error('Webhook not found');

  let query = supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (successOnly) {
    query = query.eq('success', true);
  }

  const { data: logs, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${logs?.length || 0} webhook logs`);
  return { logs: logs || [], count: logs?.length || 0 };
}

async function handleUpdateWebhook(params: any, supabase: any, requestId: string) {
  const { webhookId, userId, updates } = params;
  
  if (!webhookId || !userId || !updates) {
    throw new Error('webhookId, userId, and updates are required');
  }

  console.log(`[${requestId}] Updating webhook: ${webhookId}`);

  const allowedFields = ['webhook_url', 'event_types', 'name', 'secret', 'headers', 'active'];
  const filteredUpdates: any = {};

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .update(filteredUpdates)
    .eq('id', webhookId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Webhook updated`);
  return { updated: true, webhook };
}

async function handleTestWebhook(params: any, supabase: any, requestId: string) {
  const { webhookId, userId } = params;
  
  if (!webhookId || !userId) {
    throw new Error('webhookId and userId are required');
  }

  console.log(`[${requestId}] Testing webhook: ${webhookId}`);

  const testPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    message: 'This is a test webhook from Mega Mind',
    requestId,
  };

  // Use trigger handler
  const result = await handleTriggerWebhook(
    {
      webhookId,
      eventType: 'test',
      payload: testPayload,
      userId,
    },
    supabase,
    requestId
  );

  console.log(`[${requestId}] Webhook test complete`);
  return result;
}

async function handleRetryWebhook(params: any, supabase: any, requestId: string) {
  const { logId, userId } = params;
  
  if (!logId || !userId) {
    throw new Error('logId and userId are required');
  }

  console.log(`[${requestId}] Retrying webhook from log: ${logId}`);

  // Get log entry
  const { data: log, error: logError } = await supabase
    .from('webhook_logs')
    .select('*, webhooks!inner(user_id, id)')
    .eq('id', logId)
    .single();

  if (logError) throw logError;
  if (!log) throw new Error('Webhook log not found');
  if (log.webhooks.user_id !== userId) throw new Error('Unauthorized');

  // Retry webhook
  const result = await handleTriggerWebhook(
    {
      webhookId: log.webhook_id,
      eventType: log.event_type,
      payload: log.payload,
      userId,
    },
    supabase,
    requestId
  );

  console.log(`[${requestId}] Webhook retry complete`);
  return { retried: true, ...result };
}
