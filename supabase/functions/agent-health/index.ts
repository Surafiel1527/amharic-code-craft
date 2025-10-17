/**
 * AGENT HEALTH CHECK ENDPOINT
 * 
 * Provides real-time health metrics for the autonomous agent system:
 * - Error detection status
 * - Healing success rates
 * - Decision-making confidence
 * - System load and performance
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 [AgentHealth] Checking agent health...');
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get time windows
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Error Detection Metrics
    const { data: recentErrors } = await supabase
      .from('detected_errors')
      .select('id, status, severity, error_type')
      .gte('created_at', last24Hours);

    const totalErrors = recentErrors?.length || 0;
    const criticalErrors = recentErrors?.filter(e => e.severity === 'critical').length || 0;
    const resolvedErrors = recentErrors?.filter(e => e.status === 'resolved').length || 0;

    // 2. Auto-Healing Metrics
    const { data: autoFixes } = await supabase
      .from('auto_fixes')
      .select('id, status, created_at')
      .gte('created_at', last24Hours);

    const totalFixes = autoFixes?.length || 0;
    const appliedFixes = autoFixes?.filter(f => f.status === 'applied').length || 0;
    const healingSuccessRate = totalFixes > 0 ? (appliedFixes / totalFixes) * 100 : 0;

    // 3. Decision-Making Metrics
    const { data: decisions } = await supabase
      .from('decision_logs')
      .select('id, confidence_score, requires_user_input')
      .gte('created_at', last24Hours);

    const totalDecisions = decisions?.length || 0;
    const avgConfidence = decisions && decisions.length > 0
      ? decisions.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / decisions.length
      : 0;
    const autonomousDecisions = decisions?.filter(d => !d.requires_user_input).length || 0;

    // 4. User Behavior Tracking
    const { data: behaviorLogs } = await supabase
      .from('user_behavior_analytics')
      .select('id')
      .gte('captured_at', last1Hour);

    const activeSessions = behaviorLogs?.length || 0;

    // 5. Error Patterns Learning
    const { data: patterns } = await supabase
      .from('universal_error_patterns')
      .select('id, confidence_score, success_count, failure_count')
      .gte('confidence_score', 0.7);

    const learnedPatterns = patterns?.length || 0;
    const avgPatternConfidence = patterns && patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length
      : 0;

    // Calculate overall health score (0-100)
    const errorScore = Math.max(0, 100 - (criticalErrors * 20));
    const healingScore = healingSuccessRate;
    const decisionScore = avgConfidence * 100;
    const learningScore = Math.min(100, (learnedPatterns * 5));
    
    const overallHealth = (errorScore + healingScore + decisionScore + learningScore) / 4;

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (overallHealth >= 80) status = 'healthy';
    else if (overallHealth >= 50) status = 'degraded';
    else status = 'unhealthy';

    const health = {
      status,
      overallScore: Math.round(overallHealth),
      timestamp: new Date().toISOString(),
      
      errorDetection: {
        totalErrors24h: totalErrors,
        criticalErrors: criticalErrors,
        resolvedErrors: resolvedErrors,
        resolutionRate: totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 100,
        score: Math.round(errorScore)
      },
      
      autoHealing: {
        totalFixes24h: totalFixes,
        appliedFixes: appliedFixes,
        successRate: Math.round(healingSuccessRate),
        score: Math.round(healingScore)
      },
      
      decisionMaking: {
        totalDecisions24h: totalDecisions,
        avgConfidence: Math.round(avgConfidence * 100),
        autonomousRate: totalDecisions > 0 
          ? Math.round((autonomousDecisions / totalDecisions) * 100) 
          : 0,
        score: Math.round(decisionScore)
      },
      
      contextTracking: {
        activeSessions1h: activeSessions,
        status: activeSessions > 0 ? 'active' : 'idle'
      },
      
      learning: {
        learnedPatterns: learnedPatterns,
        avgPatternConfidence: Math.round(avgPatternConfidence * 100),
        score: Math.round(learningScore)
      }
    };

    console.log('✅ [AgentHealth] Health check complete:', {
      status,
      score: health.overallScore
    });

    return new Response(
      JSON.stringify({
        success: true,
        health,
        recommendations: getRecommendations(health)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ [AgentHealth] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        health: {
          status: 'unhealthy',
          overallScore: 0,
          error: 'Health check failed'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getRecommendations(health: any): string[] {
  const recommendations: string[] = [];

  if (health.errorDetection.criticalErrors > 5) {
    recommendations.push('⚠️ High number of critical errors detected - review error logs');
  }

  if (health.autoHealing.successRate < 70) {
    recommendations.push('🔧 Auto-healing success rate is low - check error patterns');
  }

  if (health.decisionMaking.avgConfidence < 60) {
    recommendations.push('🤔 Decision confidence is low - may need more training data');
  }

  if (health.learning.learnedPatterns < 10) {
    recommendations.push('📚 Limited learned patterns - system needs more usage to improve');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System is operating optimally');
  }

  return recommendations;
}
