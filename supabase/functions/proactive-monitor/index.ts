import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Proactive Monitor - Detects potential issues before they become errors
 * Runs periodically to analyze system health and predict problems
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Proactive Monitor: Starting system health check...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const issues: any[] = [];
    const recommendations: any[] = [];

    // Check 1: Detect error patterns and trends
    const { data: recentErrors } = await supabaseClient
      .from('detected_errors')
      .select('error_type, severity, created_at')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (recentErrors && recentErrors.length > 0) {
      // Analyze error frequency
      const errorCounts: Record<string, number> = {};
      recentErrors.forEach(e => {
        errorCounts[e.error_type] = (errorCounts[e.error_type] || 0) + 1;
      });

      // Flag frequent errors
      Object.entries(errorCounts).forEach(([type, count]) => {
        if (count > 5) {
          issues.push({
            type: 'frequent_error',
            severity: 'medium',
            message: `Error type "${type}" occurred ${count} times in 24h`,
            recommendation: 'This pattern suggests a systemic issue that needs investigation'
          });
        }
      });

      // Check for increasing error rate
      const last6h = recentErrors.filter(e => 
        new Date(e.created_at).getTime() > Date.now() - 21600000
      ).length;
      const previous6h = recentErrors.filter(e => {
        const time = new Date(e.created_at).getTime();
        return time <= Date.now() - 21600000 && time > Date.now() - 43200000;
      }).length;

      if (last6h > previous6h * 1.5) {
        issues.push({
          type: 'increasing_errors',
          severity: 'high',
          message: `Error rate increased by ${((last6h / previous6h - 1) * 100).toFixed(0)}% in last 6 hours`,
          recommendation: 'System stability declining - investigate recent changes'
        });
      }
    }

    // Check 2: Database health
    const { data: dbHealth } = await supabaseClient
      .from('generation_analytics')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(50);

    if (dbHealth && dbHealth.length > 10) {
      const failureRate = dbHealth.filter((a: any) => a.status === 'error').length / dbHealth.length;
      
      if (failureRate > 0.2) {
        issues.push({
          type: 'high_failure_rate',
          severity: 'critical',
          message: `Operation failure rate at ${(failureRate * 100).toFixed(1)}%`,
          recommendation: 'Check database connections, RLS policies, and edge function health'
        });
      } else if (failureRate > 0.1) {
        issues.push({
          type: 'elevated_failure_rate',
          severity: 'medium',
          message: `Operation failure rate elevated at ${(failureRate * 100).toFixed(1)}%`,
          recommendation: 'Monitor closely and review recent error patterns'
        });
      }
    }

    // Check 3: Unresolved high-severity errors
    const { data: unresolvedErrors } = await supabaseClient
      .from('detected_errors')
      .select('id, error_type, severity, created_at')
      .in('severity', ['high', 'critical'])
      .in('status', ['detected', 'analyzing', 'failed'])
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (unresolvedErrors && unresolvedErrors.length > 0) {
      issues.push({
        type: 'unresolved_errors',
        severity: 'high',
        message: `${unresolvedErrors.length} high/critical errors remain unresolved`,
        recommendation: 'Review admin dashboard and manually intervene if auto-fix failed',
        errorIds: unresolvedErrors.map(e => e.id)
      });
    }

    // Check 4: Failed auto-fixes
    const { data: failedFixes } = await supabaseClient
      .from('auto_fixes')
      .select('id, error_id, fix_type, created_at')
      .eq('status', 'rolled_back')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());

    if (failedFixes && failedFixes.length > 3) {
      issues.push({
        type: 'auto_fix_failures',
        severity: 'medium',
        message: `${failedFixes.length} auto-fixes failed and were rolled back`,
        recommendation: 'AI may need better training data for these error types',
        affectedErrors: failedFixes.map(f => f.error_id)
      });
    }

    // Check 5: Stale conversations (user experience metric)
    const { data: staleConversations } = await supabaseClient
      .from('conversations')
      .select('id, updated_at')
      .lt('updated_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(10);

    if (staleConversations && staleConversations.length > 5) {
      recommendations.push({
        type: 'engagement',
        message: 'Multiple inactive user sessions detected',
        action: 'Consider re-engagement emails or cleanup of abandoned conversations'
      });
    }

    // Check 6: AI Performance Analysis
    if (issues.length > 0) {
      console.log('🤖 Asking AI for root cause analysis...');
      
      const aiPrompt = `You are a system reliability engineer analyzing a production application.

DETECTED ISSUES:
${JSON.stringify(issues, null, 2)}

SYSTEM CONTEXT:
- React + TypeScript frontend
- Supabase backend with PostgreSQL
- Self-healing AI system active
- Real-time error monitoring enabled

TASK:
Analyze these issues and provide:
1. Root cause hypothesis for each issue
2. Priority order (which to fix first)
3. Potential cascading effects
4. Preventive measures

Return JSON ONLY in this format:
{
  "analysis": "overall system health assessment",
  "rootCauses": [{"issue": "issue_type", "cause": "explanation", "priority": 1}],
  "cascadingRisks": ["risk1", "risk2"],
  "preventiveMeasures": ["measure1", "measure2"]
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: aiPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const analysis = JSON.parse(aiData.choices[0].message.content);
        recommendations.push({
          type: 'ai_analysis',
          ...analysis
        });
      }
    }

    // Store monitoring results
    const monitoringResult = {
      timestamp: new Date().toISOString(),
      issues_detected: issues.length,
      issues,
      recommendations,
      overall_health: issues.length === 0 ? 'healthy' : 
                      issues.some((i: any) => i.severity === 'critical') ? 'critical' :
                      issues.some((i: any) => i.severity === 'high') ? 'degraded' : 'fair'
    };

    await supabaseClient
      .from('system_health')
      .insert({
        metric_type: 'proactive_scan',
        metric_value: issues.length,
        metadata: monitoringResult
      });

    // Notify admins if critical issues detected
    const criticalIssues = issues.filter((i: any) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      await supabaseClient.rpc('notify_admins', {
        notification_type: 'warning',
        notification_title: '🚨 Critical Issues Detected by Proactive Monitor',
        notification_message: `${criticalIssues.length} critical issue(s) require immediate attention`,
        notification_data: { issues: criticalIssues }
      });
    }

    console.log(`✅ Proactive Monitor: Completed. Found ${issues.length} issues, ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...monitoringResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in proactive monitor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});