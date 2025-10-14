/**
 * User Preference Learner - Phase 2
 * 
 * Learns user's preferred routes and adjusts routing decisions over time.
 * Features:
 * - Route preference tracking
 * - Success rate by route per user
 * - Adaptive confidence scoring
 * - Personalized routing recommendations
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserPreference {
  userId: string;
  route: string;
  successCount: number;
  totalCount: number;
  successRate: number;
  avgDuration: number;
  lastUsed: string;
}

/**
 * Get user's routing preferences
 */
async function getUserPreferences(
  userId: string,
  supabase: any
): Promise<UserPreference[]> {
  const { data: metrics } = await supabase
    .from('routing_metrics')
    .select('route, success, actual_duration_ms, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (!metrics || metrics.length === 0) {
    return [];
  }
  
  // Aggregate by route
  const routeMap: Record<string, any> = {};
  
  for (const metric of metrics) {
    if (!routeMap[metric.route]) {
      routeMap[metric.route] = {
        successCount: 0,
        totalCount: 0,
        durations: [],
        lastUsed: metric.created_at
      };
    }
    
    const routeData = routeMap[metric.route];
    routeData.totalCount++;
    if (metric.success) routeData.successCount++;
    routeData.durations.push(metric.actual_duration_ms);
    
    if (new Date(metric.created_at) > new Date(routeData.lastUsed)) {
      routeData.lastUsed = metric.created_at;
    }
  }
  
  // Calculate preferences
  return Object.entries(routeMap).map(([route, data]: [string, any]) => ({
    userId,
    route,
    successCount: data.successCount,
    totalCount: data.totalCount,
    successRate: (data.successCount / data.totalCount) * 100,
    avgDuration: data.durations.reduce((a: number, b: number) => a + b, 0) / data.durations.length,
    lastUsed: data.lastUsed
  }));
}

/**
 * Adjust routing decision based on user preferences
 */
function adjustRoutingWithPreferences(
  originalRoute: string,
  originalConfidence: number,
  preferences: UserPreference[]
): { route: string; confidence: number; reasoning: string } {
  const routePref = preferences.find(p => p.route === originalRoute);
  
  if (!routePref || routePref.totalCount < 5) {
    // Not enough data, use original decision
    return {
      route: originalRoute,
      confidence: originalConfidence,
      reasoning: 'Insufficient user preference data'
    };
  }
  
  // Adjust confidence based on user's success rate with this route
  const successRateBoost = (routePref.successRate - 50) / 100; // -0.5 to +0.5
  const adjustedConfidence = Math.max(0, Math.min(1, originalConfidence + successRateBoost * 0.2));
  
  // Consider switching routes if original route has low success rate
  if (routePref.successRate < 60) {
    // Find user's best performing route
    const bestRoute = preferences.reduce((best, curr) => 
      curr.successRate > best.successRate ? curr : best
    );
    
    if (bestRoute.successRate > 80 && bestRoute.totalCount >= 5) {
      return {
        route: bestRoute.route,
        confidence: 0.75,
        reasoning: `Switched to ${bestRoute.route} based on user's ${bestRoute.successRate.toFixed(1)}% success rate`
      };
    }
  }
  
  return {
    route: originalRoute,
    confidence: adjustedConfidence,
    reasoning: `Adjusted confidence based on ${routePref.successRate.toFixed(1)}% success rate over ${routePref.totalCount} uses`
  };
}

/**
 * Record routing feedback
 */
async function recordFeedback(
  userId: string,
  route: string,
  success: boolean,
  duration: number,
  supabase: any
): Promise<void> {
  await supabase.from('routing_metrics').insert({
    user_id: userId,
    route,
    success,
    actual_duration_ms: duration,
    created_at: new Date().toISOString()
  });
}

/**
 * Get user's routing recommendations
 */
async function getRecommendations(
  userId: string,
  supabase: any
): Promise<any[]> {
  const preferences = await getUserPreferences(userId, supabase);
  
  if (preferences.length === 0) {
    return [{
      type: 'info',
      message: 'Start using different routes to build personalized recommendations'
    }];
  }
  
  const recommendations: any[] = [];
  
  // Find underperforming routes
  const underperforming = preferences.filter(p => 
    p.successRate < 70 && p.totalCount >= 5
  );
  
  for (const route of underperforming) {
    recommendations.push({
      type: 'warning',
      route: route.route,
      message: `${route.route} has ${route.successRate.toFixed(1)}% success rate. Consider using alternative routes.`,
      stats: {
        successRate: route.successRate,
        totalUses: route.totalCount
      }
    });
  }
  
  // Find best performing route
  const bestRoute = preferences.reduce((best, curr) => 
    curr.successRate > best.successRate ? curr : best
  );
  
  if (bestRoute.successRate > 85 && bestRoute.totalCount >= 5) {
    recommendations.push({
      type: 'success',
      route: bestRoute.route,
      message: `${bestRoute.route} works best for you (${bestRoute.successRate.toFixed(1)}% success rate)`,
      stats: {
        successRate: bestRoute.successRate,
        avgDuration: bestRoute.avgDuration,
        totalUses: bestRoute.totalCount
      }
    });
  }
  
  return recommendations;
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
      userId,
      route,
      originalConfidence,
      success,
      duration
    } = body;

    if (!userId) {
      throw new Error('userId is required');
    }

    // Initialize Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    switch (operation) {
      case 'get-preferences':
        const preferences = await getUserPreferences(userId, supabase);
        return new Response(
          JSON.stringify({ success: true, preferences }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'adjust-routing':
        const prefs = await getUserPreferences(userId, supabase);
        const adjusted = adjustRoutingWithPreferences(route, originalConfidence, prefs);
        return new Response(
          JSON.stringify({ success: true, adjusted }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'record-feedback':
        await recordFeedback(userId, route, success, duration, supabase);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'get-recommendations':
        const recommendations = await getRecommendations(userId, supabase);
        return new Response(
          JSON.stringify({ success: true, recommendations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('❌ User preference learner error:', error);
    
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
