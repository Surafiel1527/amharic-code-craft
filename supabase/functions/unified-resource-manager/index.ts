import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResourceOperation {
  operation: 'allocate' | 'deallocate' | 'get_usage' | 'get_quota' | 'set_quota' | 'get_pool_status' | 'optimize_allocation' | 'get_recommendations';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Resource Manager request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ResourceOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'allocate':
        result = await handleAllocateResource(payload.params, supabase, requestId);
        break;
      case 'deallocate':
        result = await handleDeallocateResource(payload.params, supabase, requestId);
        break;
      case 'get_usage':
        result = await handleGetUsage(payload.params, supabase, requestId);
        break;
      case 'get_quota':
        result = await handleGetQuota(payload.params, supabase, requestId);
        break;
      case 'set_quota':
        result = await handleSetQuota(payload.params, supabase, requestId);
        break;
      case 'get_pool_status':
        result = await handleGetPoolStatus(payload.params, supabase, requestId);
        break;
      case 'optimize_allocation':
        result = await handleOptimizeAllocation(payload.params, supabase, requestId);
        break;
      case 'get_recommendations':
        result = await handleGetRecommendations(payload.params, supabase, requestId);
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

async function handleAllocateResource(params: any, supabase: any, requestId: string) {
  const { userId, resourceType, amount, metadata = {} } = params;
  
  if (!userId || !resourceType || !amount) {
    throw new Error('userId, resourceType, and amount are required');
  }

  console.log(`[${requestId}] Allocating ${amount} ${resourceType} for user: ${userId}`);

  // Check quota
  const { data: quota } = await supabase
    .from('resource_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .maybeSingle();

  // Check current usage
  const { data: usage } = await supabase
    .from('resource_allocations')
    .select('allocated_amount')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('status', 'active');

  const currentUsage = usage?.reduce((sum, u) => sum + (u.allocated_amount || 0), 0) || 0;
  const quotaLimit = quota?.quota_limit || 1000;

  if (currentUsage + amount > quotaLimit) {
    throw new Error(`Quota exceeded: current=${currentUsage}, requested=${amount}, limit=${quotaLimit}`);
  }

  // Allocate resource
  const { data: allocation, error } = await supabase
    .from('resource_allocations')
    .insert({
      user_id: userId,
      resource_type: resourceType,
      allocated_amount: amount,
      status: 'active',
      metadata,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Resource allocated: ${allocation.id}`);
  return { 
    allocationId: allocation.id, 
    allocated: amount,
    remaining: quotaLimit - (currentUsage + amount),
    ...allocation 
  };
}

async function handleDeallocateResource(params: any, supabase: any, requestId: string) {
  const { allocationId, userId } = params;
  
  if (!allocationId || !userId) {
    throw new Error('allocationId and userId are required');
  }

  console.log(`[${requestId}] Deallocating resource: ${allocationId}`);

  const { error } = await supabase
    .from('resource_allocations')
    .update({ 
      status: 'released',
      released_at: new Date().toISOString()
    })
    .eq('id', allocationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;

  console.log(`[${requestId}] Resource deallocated`);
  return { success: true, allocationId };
}

async function handleGetUsage(params: any, supabase: any, requestId: string) {
  const { userId, resourceType, timeRange = '24h' } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Getting resource usage for user: ${userId}`);

  const hours = parseInt(timeRange) || 24;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('resource_allocations')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoff);

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data: allocations, error } = await query;
  if (error) throw error;

  const usageByType: Record<string, any> = {};
  
  allocations.forEach((alloc: any) => {
    if (!usageByType[alloc.resource_type]) {
      usageByType[alloc.resource_type] = {
        resourceType: alloc.resource_type,
        totalAllocated: 0,
        activeAllocations: 0,
        releasedAllocations: 0,
      };
    }
    
    usageByType[alloc.resource_type].totalAllocated += alloc.allocated_amount || 0;
    
    if (alloc.status === 'active') {
      usageByType[alloc.resource_type].activeAllocations += 1;
    } else {
      usageByType[alloc.resource_type].releasedAllocations += 1;
    }
  });

  console.log(`[${requestId}] Retrieved usage for ${Object.keys(usageByType).length} resource types`);
  return { 
    usage: Object.values(usageByType),
    timeRange,
    totalAllocations: allocations.length
  };
}

async function handleGetQuota(params: any, supabase: any, requestId: string) {
  const { userId, resourceType } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Getting quota for user: ${userId}`);

  let query = supabase
    .from('resource_quotas')
    .select('*')
    .eq('user_id', userId);

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data: quotas, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${quotas.length} quota entries`);
  return { quotas };
}

async function handleSetQuota(params: any, supabase: any, requestId: string) {
  const { userId, resourceType, quotaLimit, metadata = {} } = params;
  
  if (!userId || !resourceType || quotaLimit === undefined) {
    throw new Error('userId, resourceType, and quotaLimit are required');
  }

  console.log(`[${requestId}] Setting quota for user ${userId}: ${resourceType}=${quotaLimit}`);

  const { data: quota, error } = await supabase
    .from('resource_quotas')
    .upsert({
      user_id: userId,
      resource_type: resourceType,
      quota_limit: quotaLimit,
      metadata,
    }, {
      onConflict: 'user_id,resource_type'
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Quota set successfully`);
  return { quota };
}

async function handleGetPoolStatus(params: any, supabase: any, requestId: string) {
  const { resourceType } = params;
  
  console.log(`[${requestId}] Getting pool status`);

  let query = supabase
    .from('resource_allocations')
    .select('resource_type, allocated_amount, status');

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data: allocations, error } = await query;
  if (error) throw error;

  const poolStatus: Record<string, any> = {};
  
  allocations.forEach((alloc: any) => {
    if (!poolStatus[alloc.resource_type]) {
      poolStatus[alloc.resource_type] = {
        resourceType: alloc.resource_type,
        totalAllocated: 0,
        activeCount: 0,
        releasedCount: 0,
      };
    }
    
    if (alloc.status === 'active') {
      poolStatus[alloc.resource_type].totalAllocated += alloc.allocated_amount || 0;
      poolStatus[alloc.resource_type].activeCount += 1;
    } else {
      poolStatus[alloc.resource_type].releasedCount += 1;
    }
  });

  console.log(`[${requestId}] Pool status retrieved for ${Object.keys(poolStatus).length} types`);
  return { pools: Object.values(poolStatus) };
}

async function handleOptimizeAllocation(params: any, supabase: any, requestId: string) {
  const { userId } = params;
  
  console.log(`[${requestId}] Optimizing resource allocation`);

  // Get all active allocations
  const { data: allocations, error } = await supabase
    .from('resource_allocations')
    .select('*')
    .eq('user_id', userId || null)
    .eq('status', 'active');

  if (error) throw error;

  const optimizations: any[] = [];
  const now = Date.now();

  // Find idle allocations (older than 1 hour)
  allocations.forEach((alloc: any) => {
    const ageMs = now - new Date(alloc.created_at).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    
    if (ageHours > 1 && !alloc.released_at) {
      optimizations.push({
        allocationId: alloc.id,
        resourceType: alloc.resource_type,
        recommendation: 'release_idle',
        reason: `Allocation idle for ${ageHours.toFixed(1)} hours`,
        potentialSavings: alloc.allocated_amount,
      });
    }
  });

  console.log(`[${requestId}] Found ${optimizations.length} optimization opportunities`);
  return { optimizations, totalAllocations: allocations.length };
}

async function handleGetRecommendations(params: any, supabase: any, requestId: string) {
  const { userId } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Generating resource recommendations for user: ${userId}`);

  // Analyze usage patterns
  const { data: allocations } = await supabase
    .from('resource_allocations')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const recommendations: any[] = [];

  if (allocations && allocations.length > 0) {
    const usageByType: Record<string, number[]> = {};
    
    allocations.forEach((alloc: any) => {
      if (!usageByType[alloc.resource_type]) {
        usageByType[alloc.resource_type] = [];
      }
      usageByType[alloc.resource_type].push(alloc.allocated_amount || 0);
    });

    Object.entries(usageByType).forEach(([type, amounts]) => {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const max = Math.max(...amounts);
      
      if (max > avg * 2) {
        recommendations.push({
          resourceType: type,
          type: 'quota_adjustment',
          recommendation: `Consider increasing quota for ${type}`,
          reason: `Peak usage (${max}) is ${(max / avg).toFixed(1)}x average (${avg.toFixed(1)})`,
          suggestedQuota: Math.ceil(max * 1.2),
        });
      }
    });
  }

  console.log(`[${requestId}] Generated ${recommendations.length} recommendations`);
  return { recommendations, analysisCount: allocations?.length || 0 };
}
