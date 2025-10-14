/**
 * Intelligent Cache Manager - Phase 2
 * 
 * Smart caching for repeat requests with semantic similarity detection.
 * Features:
 * - Semantic similarity matching (not just exact match)
 * - TTL-based expiration
 * - Hit rate tracking
 * - Auto-invalidation on code changes
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CacheEntry {
  id: string;
  request_hash: string;
  request_text: string;
  route: string;
  result: any;
  context_hash: string;
  created_at: string;
  expires_at: string;
  hit_count: number;
  last_accessed: string;
}

/**
 * Generate cache key from request and context
 */
function generateCacheKey(request: string, context: any): string {
  const normalized = request.toLowerCase().trim();
  const contextStr = JSON.stringify({
    projectId: context.projectId,
    route: context.route
  });
  
  return `${normalized}:${contextStr}`;
}

/**
 * Calculate semantic similarity between two requests
 * Returns 0-1 score (1 = identical)
 */
function calculateSimilarity(req1: string, req2: string): number {
  const words1 = new Set(req1.toLowerCase().split(/\s+/));
  const words2 = new Set(req2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Find cached result with semantic matching
 */
async function findCachedResult(
  request: string,
  context: any,
  supabase: any
): Promise<CacheEntry | null> {
  const cacheKey = generateCacheKey(request, context);
  
  // Try exact match first
  const { data: exactMatch, error } = await supabase
    .from('routing_cache')
    .select('*')
    .eq('request_hash', cacheKey)
    .eq('context_hash', context.projectId || 'default')
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (!error && exactMatch) {
    console.log('🎯 Cache HIT (exact):', request.substring(0, 50));
    
    // Update hit count and last accessed
    await supabase
      .from('routing_cache')
      .update({ 
        hit_count: exactMatch.hit_count + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('id', exactMatch.id);
    
    return exactMatch;
  }
  
  // Try semantic similarity match (threshold: 0.85)
  const { data: similarRequests } = await supabase
    .from('routing_cache')
    .select('*')
    .eq('context_hash', context.projectId || 'default')
    .gt('expires_at', new Date().toISOString())
    .limit(20);
  
  if (similarRequests && similarRequests.length > 0) {
    for (const cached of similarRequests) {
      const similarity = calculateSimilarity(request, cached.request_text);
      if (similarity >= 0.85) {
        console.log(`🎯 Cache HIT (semantic, ${(similarity * 100).toFixed(0)}%):`, request.substring(0, 50));
        
        // Update hit count
        await supabase
          .from('routing_cache')
          .update({ 
            hit_count: cached.hit_count + 1,
            last_accessed: new Date().toISOString()
          })
          .eq('id', cached.id);
        
        return cached;
      }
    }
  }
  
  console.log('❌ Cache MISS:', request.substring(0, 50));
  return null;
}

/**
 * Store result in cache
 */
async function cacheResult(
  request: string,
  context: any,
  route: string,
  result: any,
  supabase: any,
  ttlMinutes: number = 60
): Promise<void> {
  const cacheKey = generateCacheKey(request, context);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  
  await supabase.from('routing_cache').insert({
    request_hash: cacheKey,
    request_text: request,
    route,
    result,
    context_hash: context.projectId || 'default',
    user_id: context.userId,
    expires_at: expiresAt,
    hit_count: 0,
    last_accessed: new Date().toISOString()
  });
  
  console.log('💾 Cached result:', { route, ttl: ttlMinutes });
}

/**
 * Invalidate cache for a project
 */
async function invalidateCache(
  projectId: string,
  supabase: any
): Promise<number> {
  const { count } = await supabase
    .from('routing_cache')
    .delete()
    .eq('context_hash', projectId);
  
  console.log(`🗑️ Invalidated ${count} cache entries for project ${projectId}`);
  return count || 0;
}

/**
 * Get cache statistics
 */
async function getCacheStats(supabase: any, userId?: string): Promise<any> {
  let query = supabase
    .from('routing_cache')
    .select('route, hit_count, created_at, expires_at');
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data } = await query;
  
  if (!data) return { total: 0, hits: 0, routes: {} };
  
  const stats = {
    total: data.length,
    totalHits: data.reduce((sum, entry) => sum + entry.hit_count, 0),
    avgHits: data.length > 0 ? data.reduce((sum, entry) => sum + entry.hit_count, 0) / data.length : 0,
    routes: data.reduce((acc: any, entry) => {
      if (!acc[entry.route]) {
        acc[entry.route] = { count: 0, hits: 0 };
      }
      acc[entry.route].count++;
      acc[entry.route].hits += entry.hit_count;
      return acc;
    }, {})
  };
  
  return stats;
}

/**
 * Clean expired cache entries
 */
async function cleanExpiredCache(supabase: any): Promise<number> {
  const { count } = await supabase
    .from('routing_cache')
    .delete()
    .lt('expires_at', new Date().toISOString());
  
  console.log(`🧹 Cleaned ${count} expired cache entries`);
  return count || 0;
}

/**
 * Main request handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      operation,
      request,
      context = {},
      route,
      result,
      projectId,
      userId,
      ttlMinutes
    } = body;

    // Initialize Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    switch (operation) {
      case 'get':
        const cached = await findCachedResult(request, context, supabase);
        return new Response(
          JSON.stringify({ 
            success: true, 
            cached: cached !== null,
            result: cached?.result || null,
            hitCount: cached?.hit_count || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'set':
        await cacheResult(request, context, route, result, supabase, ttlMinutes);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'invalidate':
        const invalidated = await invalidateCache(projectId, supabase);
        return new Response(
          JSON.stringify({ success: true, invalidated }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'stats':
        const stats = await getCacheStats(supabase, userId);
        return new Response(
          JSON.stringify({ success: true, stats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'clean':
        const cleaned = await cleanExpiredCache(supabase);
        return new Response(
          JSON.stringify({ success: true, cleaned }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('❌ Cache manager error:', error);
    
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
