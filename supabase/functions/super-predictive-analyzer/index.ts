import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { callAIWithFallback } from '../_shared/aiWithFallback.ts';

const SUPER_MODEL = 'google/gemini-2.5-pro';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔮 SUPER Predictive Analyzer activated');
    
    // Gather system health data
    const [jobsData, patternsData, improvementsData] = await Promise.all([
      supabaseClient
        .from('ai_generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      
      supabaseClient
        .from('universal_error_patterns')
        .select('*')
        .order('times_encountered', { ascending: false })
        .limit(50),
      
      supabaseClient
        .from('ai_improvement_logs')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(50)
    ]);

    const jobs = jobsData.data || [];
    const patterns = patternsData.data || [];
    const improvements = improvementsData.data || [];

    // Calculate system metrics
    const totalJobs = jobs.length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const stuckJobs = jobs.filter(j => 
      j.status === 'running' && 
      new Date(j.updated_at).getTime() < Date.now() - 5 * 60 * 1000
    ).length;
    const avgProgress = jobs.reduce((sum, j) => sum + (j.progress || 0), 0) / totalJobs;
    const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

    // Deep analysis with Gemini 2.5 Pro
    const analysisPrompt = `You are SUPER MEGA MIND's Predictive Analytics Engine with advanced reasoning capabilities.

**MISSION:** Analyze system health data and PREDICT potential failures before they happen.

**System Metrics:**
- Total Jobs: ${totalJobs}
- Failed Jobs: ${failedJobs} (${failureRate.toFixed(1)}% failure rate)
- Stuck Jobs: ${stuckJobs}
- Average Progress: ${avgProgress.toFixed(1)}%
- Known Patterns: ${patterns.length}
- Applied Improvements: ${improvements.length}

**Recent Jobs (Last 10):**
${JSON.stringify(jobs.slice(0, 10).map(j => ({
  status: j.status,
  progress: j.progress,
  step: j.current_step,
  error: j.error_message,
  retries: j.retry_count
})), null, 2)}

**Error Patterns:**
${JSON.stringify(patterns.slice(0, 10).map(p => ({
  category: p.error_category,
  subcategory: p.error_subcategory,
  encountered: p.times_encountered,
  successRate: p.success_count / (p.success_count + p.failure_count) || 0,
  confidence: p.confidence_score
})), null, 2)}

**Your Advanced Predictive Analysis:**

1. **Trend Analysis**
   - What patterns are emerging?
   - Are failure rates increasing or decreasing?
   - What correlations exist between failures?

2. **Risk Assessment**
   - What are the highest risk areas?
   - Which systems are most fragile?
   - What are the early warning signs?

3. **Failure Prediction**
   - What failures are likely to occur next?
   - When might they occur?
   - What conditions will trigger them?

4. **Preventive Actions**
   - What should be done RIGHT NOW to prevent failures?
   - What monitoring should be enhanced?
   - What thresholds should be adjusted?

5. **System Optimization**
   - What performance bottlenecks exist?
   - What can be optimized?
   - What architectural changes would help?

**OUTPUT FORMAT (Strict JSON):**
{
  "systemHealth": {
    "overall": 0-100,
    "trend": "improving|stable|degrading",
    "criticalIssues": ["list of critical issues"],
    "riskLevel": "low|medium|high|critical"
  },
  "predictions": [
    {
      "type": "failure|slowdown|stuck|crash",
      "probability": 0.0-1.0,
      "timeframe": "minutes|hours|days",
      "affectedSystems": ["list"],
      "earlyWarnings": ["indicators"],
      "preventiveActions": ["what to do now"]
    }
  ],
  "recommendations": {
    "immediate": [
      {
        "action": "specific action",
        "reason": "why needed",
        "impact": "expected result",
        "urgency": "low|medium|high|critical"
      }
    ],
    "shortTerm": ["actions for next 24h"],
    "longTerm": ["architectural improvements"]
  },
  "optimizations": [
    {
      "area": "system area",
      "current": "current performance",
      "potential": "potential improvement",
      "implementation": "how to implement"
    }
  ],
  "monitoring": {
    "metricsToAdd": ["new metrics"],
    "alertsToCreate": ["new alerts"],
    "thresholdsToAdjust": {"metric": "new value"}
  }
}`;

    const aiResponse = await callAIWithFallback(
      LOVABLE_API_KEY,
      [
        {
          role: 'system',
          content: 'You are SUPER MEGA MIND Predictive Analyzer with advanced reasoning. Use extended thinking for deep analysis. Respond with valid JSON only.'
        },
        { role: 'user', content: analysisPrompt }
      ],
      { 
        preferredModel: SUPER_MODEL,
        temperature: 0.2 
      }
    );

    const analysis = JSON.parse(aiResponse.data.choices[0].message.content);

    // Store predictions
    for (const prediction of analysis.predictions) {
      await supabaseClient
        .from('ai_predictions')
        .insert({
          prediction_type: prediction.type,
          probability: prediction.probability,
          timeframe: prediction.timeframe,
          affected_systems: prediction.affectedSystems,
          early_warnings: prediction.earlyWarnings,
          preventive_actions: prediction.preventiveActions,
          created_at: new Date().toISOString()
        });
    }

    // Store recommendations
    for (const rec of analysis.recommendations.immediate) {
      if (rec.urgency === 'critical' || rec.urgency === 'high') {
        await supabaseClient
          .from('system_recommendations')
          .insert({
            action: rec.action,
            reason: rec.reason,
            impact: rec.impact,
            urgency: rec.urgency,
            status: 'pending',
            created_at: new Date().toISOString()
          });
      }
    }

    console.log('🔮 Predictive analysis complete:', {
      health: analysis.systemHealth.overall,
      predictions: analysis.predictions.length,
      recommendations: analysis.recommendations.immediate.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        modelUsed: SUPER_MODEL,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in super-predictive-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
