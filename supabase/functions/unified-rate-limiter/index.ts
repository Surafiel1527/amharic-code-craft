import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitOperation {
  operation: 'check_limit' | 'record_request' | 'get_usage' | 'set_limits' | 'reset_limit' | 'get_config' | 'update_config' | 'get_blocked_ips';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Rate Limiter request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: RateLimitOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'check_limit':
        result = await handleCheckLimit(payload.params, supabase, requestId);
        break;
      case 'record_request':
        result = await handleRecordRequest(payload.params, supabase, requestId);
        break;
      case 'get_usage':
        result = await handleGetUsage(payload.params, supabase, requestId);
        break;
      case 'set_limits':
        result = await handleSetLimits(payload.params, supabase, requestId);
        break;
      case 'reset_limit':
        result = await handleResetLimit(payload.params, supabase, requestId);
        break;
      case 'get_config':
        result = await handleGetConfig(payload.params, supabase, requestId);
        break;
      case 'update_config':
        result = await handleUpdateConfig(payload.params, supabase, requestId);
        break;
      case 'get_blocked_ips':
        result = await handleGetBlockedIPs(payload.params, supabase, requestId);
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

async function handleCheckLimit(params: any, supabase: any, requestId: string) {
  const { identifier, resourceType, windowMinutes = 60 } = params;
  
  if (!identifier || !resourceType) {
    throw new Error('identifier and resourceType are required');
  }

  console.log(`[${requestId}] Checking rate limit: ${identifier} (${resourceType})`);

  // Get rate limit config
  const { data: config } = await supabase
    .from('rate_limit_configs')
    .select('*')
    .eq('resource_type', resourceType)
    .maybeSingle();

  const maxRequests = config?.max_requests || 100;
  const windowMs = (config?.window_minutes || windowMinutes) * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  // Count recent requests
  const { data: requests, error } = await supabase
    .from('rate_limit_requests')
    .select('id')
    .eq('identifier', identifier)
    .eq('resource_type', resourceType)
    .gte('created_at', cutoff);

  if (error) throw error;

  const currentCount = requests?.length || 0;
  const allowed = currentCount < maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount);

  console.log(`[${requestId}] Rate limit check: ${currentCount}/${maxRequests} (${allowed ? 'allowed' : 'blocked'})`);
  
  return {
    allowed,
    currentCount,
    maxRequests,
    remaining,
    resetAt: new Date(Date.now() + windowMs).toISOString(),
  };
}

async function handleRecordRequest(params: any, supabase: any, requestId: string) {
  const { identifier, resourceType, metadata = {} } = params;
  
  if (!identifier || !resourceType) {
    throw new Error('identifier and resourceType are required');
  }

  console.log(`[${requestId}] Recording request: ${identifier} (${resourceType})`);

  // Check if allowed first
  const limitCheck = await handleCheckLimit({ identifier, resourceType }, supabase, requestId);

  if (!limitCheck.allowed) {
    console.log(`[${requestId}] Request blocked: rate limit exceeded`);
    return {
      recorded: false,
      blocked: true,
      reason: 'Rate limit exceeded',
      retryAfter: limitCheck.resetAt,
    };
  }

  // Record request
  const { data: request, error } = await supabase
    .from('rate_limit_requests')
    .insert({
      identifier,
      resource_type: resourceType,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Request recorded: ${request.id}`);
  return {
    recorded: true,
    blocked: false,
    requestId: request.id,
    remaining: limitCheck.remaining - 1,
  };
}

async function handleGetUsage(params: any, supabase: any, requestId: string) {
  const { identifier, resourceType = null, timeRange = '24h' } = params;
  
  if (!identifier) throw new Error('identifier is required');

  console.log(`[${requestId}] Getting usage for: ${identifier}`);

  const hours = parseInt(timeRange) || 24;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('rate_limit_requests')
    .select('resource_type, created_at')
    .eq('identifier', identifier)
    .gte('created_at', cutoff);

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data: requests, error } = await query;
  if (error) throw error;

  // Group by resource type
  const usage: Record<string, number> = {};
  requests?.forEach((req: any) => {
    if (!usage[req.resource_type]) {
      usage[req.resource_type] = 0;
    }
    usage[req.resource_type]++;
  });

  console.log(`[${requestId}] Usage retrieved: ${requests?.length || 0} requests`);
  return {
    identifier,
    timeRange,
    totalRequests: requests?.length || 0,
    byResourceType: usage,
  };
}

async function handleSetLimits(params: any, supabase: any, requestId: string) {
  const { resourceType, maxRequests, windowMinutes = 60, enabled = true } = params;
  
  if (!resourceType || !maxRequests) {
    throw new Error('resourceType and maxRequests are required');
  }

  console.log(`[${requestId}] Setting rate limit: ${resourceType} = ${maxRequests}/${windowMinutes}min`);

  const { data: config, error } = await supabase
    .from('rate_limit_configs')
    .upsert({
      resource_type: resourceType,
      max_requests: maxRequests,
      window_minutes: windowMinutes,
      enabled,
    }, {
      onConflict: 'resource_type'
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Rate limit configured`);
  return { config };
}

async function handleResetLimit(params: any, supabase: any, requestId: string) {
  const { identifier, resourceType } = params;
  
  if (!identifier || !resourceType) {
    throw new Error('identifier and resourceType are required');
  }

  console.log(`[${requestId}] Resetting rate limit: ${identifier} (${resourceType})`);

  const { error } = await supabase
    .from('rate_limit_requests')
    .delete()
    .eq('identifier', identifier)
    .eq('resource_type', resourceType);

  if (error) throw error;

  console.log(`[${requestId}] Rate limit reset`);
  return { reset: true, identifier, resourceType };
}

async function handleGetConfig(params: any, supabase: any, requestId: string) {
  const { resourceType = null } = params;
  
  console.log(`[${requestId}] Getting rate limit config`);

  let query = supabase
    .from('rate_limit_configs')
    .select('*')
    .order('resource_type');

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data: configs, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${configs?.length || 0} configs`);
  return { configs: configs || [] };
}

async function handleUpdateConfig(params: any, supabase: any, requestId: string) {
  const { resourceType, updates } = params;
  
  if (!resourceType || !updates) {
    throw new Error('resourceType and updates are required');
  }

  console.log(`[${requestId}] Updating rate limit config: ${resourceType}`);

  const allowedFields = ['max_requests', 'window_minutes', 'enabled'];
  const filteredUpdates: any = {};

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  const { data: config, error } = await supabase
    .from('rate_limit_configs')
    .update(filteredUpdates)
    .eq('resource_type', resourceType)
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Config updated`);
  return { updated: true, config };
}

async function handleGetBlockedIPs(params: any, supabase: any, requestId: string) {
  const { limit = 50 } = params;
  
  console.log(`[${requestId}] Getting blocked IPs`);

  // Get IPs that exceeded limits recently
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: requests, error } = await supabase
    .from('rate_limit_requests')
    .select('identifier, resource_type')
    .gte('created_at', last24h);

  if (error) throw error;

  // Count requests per identifier
  const counts: Record<string, any> = {};
  requests?.forEach((req: any) => {
    if (!counts[req.identifier]) {
      counts[req.identifier] = {
        identifier: req.identifier,
        totalRequests: 0,
        resourceTypes: new Set(),
      };
    }
    counts[req.identifier].totalRequests++;
    counts[req.identifier].resourceTypes.add(req.resource_type);
  });

  // Find identifiers that might be blocked
  const blocked = Object.values(counts)
    .filter((c: any) => c.totalRequests > 1000) // Threshold for suspicious activity
    .slice(0, limit)
    .map((c: any) => ({
      identifier: c.identifier,
      totalRequests: c.totalRequests,
      resourceTypes: Array.from(c.resourceTypes),
    }));

  console.log(`[${requestId}] Found ${blocked.length} potentially blocked identifiers`);
  return { blocked, count: blocked.length };
}
