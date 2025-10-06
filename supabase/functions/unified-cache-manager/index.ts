import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CacheOperation {
  operation: 'get' | 'set' | 'delete' | 'clear' | 'get_stats' | 'invalidate_pattern' | 'warm_cache' | 'get_keys';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Cache Manager request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: CacheOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'get':
        result = await handleGetCache(payload.params, supabase, requestId);
        break;
      case 'set':
        result = await handleSetCache(payload.params, supabase, requestId);
        break;
      case 'delete':
        result = await handleDeleteCache(payload.params, supabase, requestId);
        break;
      case 'clear':
        result = await handleClearCache(payload.params, supabase, requestId);
        break;
      case 'get_stats':
        result = await handleGetCacheStats(payload.params, supabase, requestId);
        break;
      case 'invalidate_pattern':
        result = await handleInvalidatePattern(payload.params, supabase, requestId);
        break;
      case 'warm_cache':
        result = await handleWarmCache(payload.params, supabase, requestId);
        break;
      case 'get_keys':
        result = await handleGetKeys(payload.params, supabase, requestId);
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

async function handleGetCache(params: any, supabase: any, requestId: string) {
  const { key, userId } = params;
  
  if (!key) throw new Error('key is required');

  console.log(`[${requestId}] Getting cache for key: ${key}`);

  const { data: cached, error } = await supabase
    .from('performance_cache')
    .select('*')
    .eq('cache_key', key)
    .eq('user_id', userId || null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;

  if (cached) {
    // Update hit count
    await supabase
      .from('performance_cache')
      .update({ 
        hit_count: cached.hit_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', cached.id);

    console.log(`[${requestId}] Cache hit for key: ${key}`);
    return { hit: true, value: cached.cached_value, metadata: cached.metadata };
  }

  console.log(`[${requestId}] Cache miss for key: ${key}`);
  return { hit: false, value: null };
}

async function handleSetCache(params: any, supabase: any, requestId: string) {
  const { key, value, ttl = 3600, userId, metadata = {} } = params;
  
  if (!key || value === undefined) {
    throw new Error('key and value are required');
  }

  console.log(`[${requestId}] Setting cache for key: ${key} (TTL: ${ttl}s)`);

  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { data: cached, error } = await supabase
    .from('performance_cache')
    .upsert({
      cache_key: key,
      user_id: userId || null,
      cached_value: value,
      expires_at: expiresAt,
      metadata,
      hit_count: 0,
      last_accessed_at: new Date().toISOString()
    }, {
      onConflict: 'cache_key,user_id'
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Cache set successfully for key: ${key}`);
  return { success: true, expiresAt, cacheId: cached.id };
}

async function handleDeleteCache(params: any, supabase: any, requestId: string) {
  const { key, userId } = params;
  
  if (!key) throw new Error('key is required');

  console.log(`[${requestId}] Deleting cache for key: ${key}`);

  const { error } = await supabase
    .from('performance_cache')
    .delete()
    .eq('cache_key', key)
    .eq('user_id', userId || null);

  if (error) throw error;

  console.log(`[${requestId}] Cache deleted for key: ${key}`);
  return { success: true };
}

async function handleClearCache(params: any, supabase: any, requestId: string) {
  const { userId, scope = 'user' } = params;
  
  console.log(`[${requestId}] Clearing cache (scope: ${scope})`);

  let query = supabase.from('performance_cache').delete();

  if (scope === 'user' && userId) {
    query = query.eq('user_id', userId);
  } else if (scope === 'expired') {
    query = query.lt('expires_at', new Date().toISOString());
  }
  // scope 'all' deletes everything (admin only)

  const { error, count } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Cache cleared (scope: ${scope})`);
  return { success: true, deletedCount: count || 0 };
}

async function handleGetCacheStats(params: any, supabase: any, requestId: string) {
  const { userId } = params;
  
  console.log(`[${requestId}] Getting cache statistics`);

  let query = supabase
    .from('performance_cache')
    .select('hit_count, created_at, expires_at');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: cacheEntries, error } = await query;
  if (error) throw error;

  const now = Date.now();
  const stats = {
    totalEntries: cacheEntries.length,
    activeEntries: cacheEntries.filter((e: any) => new Date(e.expires_at).getTime() > now).length,
    expiredEntries: cacheEntries.filter((e: any) => new Date(e.expires_at).getTime() <= now).length,
    totalHits: cacheEntries.reduce((sum: number, e: any) => sum + (e.hit_count || 0), 0),
    averageHits: cacheEntries.length > 0 
      ? cacheEntries.reduce((sum: number, e: any) => sum + (e.hit_count || 0), 0) / cacheEntries.length 
      : 0,
  };

  console.log(`[${requestId}] Cache stats retrieved: ${stats.totalEntries} entries`);
  return stats;
}

async function handleInvalidatePattern(params: any, supabase: any, requestId: string) {
  const { pattern, userId } = params;
  
  if (!pattern) throw new Error('pattern is required');

  console.log(`[${requestId}] Invalidating cache entries matching pattern: ${pattern}`);

  let query = supabase
    .from('performance_cache')
    .delete()
    .like('cache_key', `%${pattern}%`);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error, count } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Invalidated ${count || 0} cache entries`);
  return { success: true, invalidatedCount: count || 0 };
}

async function handleWarmCache(params: any, supabase: any, requestId: string) {
  const { keys, userId } = params;
  
  if (!keys || !Array.isArray(keys)) {
    throw new Error('keys array is required');
  }

  console.log(`[${requestId}] Warming cache for ${keys.length} keys`);

  const warmResults = await Promise.allSettled(
    keys.map(async (keyConfig: any) => {
      const { key, value, ttl = 3600, metadata = {} } = keyConfig;
      
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      
      return await supabase
        .from('performance_cache')
        .upsert({
          cache_key: key,
          user_id: userId || null,
          cached_value: value,
          expires_at: expiresAt,
          metadata,
          hit_count: 0,
          last_accessed_at: new Date().toISOString()
        }, {
          onConflict: 'cache_key,user_id'
        });
    })
  );

  const successful = warmResults.filter(r => r.status === 'fulfilled').length;
  const failed = warmResults.filter(r => r.status === 'rejected').length;

  console.log(`[${requestId}] Cache warmed: ${successful} successful, ${failed} failed`);
  return { success: true, warmed: successful, failed };
}

async function handleGetKeys(params: any, supabase: any, requestId: string) {
  const { userId, limit = 100, activeOnly = true } = params;
  
  console.log(`[${requestId}] Getting cache keys`);

  let query = supabase
    .from('performance_cache')
    .select('cache_key, created_at, expires_at, hit_count')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (activeOnly) {
    query = query.gt('expires_at', new Date().toISOString());
  }

  const { data: keys, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${keys.length} cache keys`);
  return { keys, count: keys.length };
}
