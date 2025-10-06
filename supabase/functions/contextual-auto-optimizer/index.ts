import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🎯 Contextual Auto-Optimizer: Starting contextual analysis...');

    // Step 1: Gather contextual data
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = hourOfDay >= 9 && hourOfDay <= 17 && !isWeekend;

    // Get recent system metrics
    const { data: recentErrors } = await supabase
      .from('detected_errors')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: recentFixes } = await supabase
      .from('auto_fixes')
      .select('*')
      .gte('applied_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('applied_at', { ascending: false });

    const { data: patterns } = await supabase
      .from('universal_error_patterns')
      .select('*')
      .order('confidence_score', { ascending: false });

    // Calculate system load and context
    const errorRate = recentErrors?.length || 0;
    const fixSuccessRate = recentFixes?.filter(f => f.fix_worked).length / (recentFixes?.length || 1);
    const avgConfidence = patterns?.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / (patterns?.length || 1);

    const context = {
      timestamp: now.toISOString(),
      hourOfDay,
      dayOfWeek,
      isBusinessHours,
      isWeekend,
      errorRate,
      fixSuccessRate,
      avgConfidence,
      systemLoad: errorRate > 10 ? 'high' : errorRate > 5 ? 'medium' : 'low',
    };

    console.log('Context:', context);

    // Step 2: Use AI to analyze context and recommend optimizations
    const contextPrompt = `You are a contextual optimization engine. Analyze the system context and recommend optimizations.

CURRENT CONTEXT:
- Time: ${context.timestamp}
- Hour of Day: ${context.hourOfDay} (${context.isBusinessHours ? 'Business Hours' : 'Off Hours'})
- Day: ${context.isWeekend ? 'Weekend' : 'Weekday'}
- System Load: ${context.systemLoad}
- Error Rate (24h): ${context.errorRate} errors
- Fix Success Rate: ${(context.fixSuccessRate * 100).toFixed(1)}%
- Average Pattern Confidence: ${(context.avgConfidence * 100).toFixed(1)}%

RECENT ERRORS (Last 24h):
${recentErrors?.slice(0, 10).map(e => `
  - Type: ${e.error_type}
  - Severity: ${e.severity}
  - Time: ${new Date(e.created_at).toLocaleTimeString()}
  - Status: ${e.status}
`).join('\n') || 'No recent errors'}

OPTIMIZATION TASK:
Based on the context, recommend specific optimizations:

1. Should we be more aggressive or conservative with auto-fixes?
2. What confidence threshold should we use for auto-applying fixes?
3. Should we prioritize certain error types based on the time/context?
4. What monitoring frequency is optimal for this context?
5. Are there any preventive measures we should activate?

Provide your recommendations in JSON format:
{
  "aggressiveness": "conservative|balanced|aggressive",
  "auto_apply_threshold": 0.85,
  "priority_error_types": ["type1", "type2"],
  "monitoring_frequency_minutes": 5,
  "preventive_actions": ["action1", "action2"],
  "reasoning": "Explanation of recommendations",
  "context_specific_optimizations": [
    {
      "optimization": "Description",
      "reason": "Why this is optimal for current context",
      "apply_now": true
    }
  ],
  "confidence": 0.92
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a contextual optimization expert that adapts strategies based on time, load, and system state.' },
          { role: 'user', content: contextPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!recommendations) {
      throw new Error('Failed to parse AI recommendations');
    }

    console.log('Recommendations:', recommendations);

    // Step 3: Apply contextual optimizations
    let optimizationsApplied = 0;
    const appliedOptimizations = [];

    for (const opt of recommendations.context_specific_optimizations || []) {
      if (opt.apply_now) {
        // Store optimization for tracking
        const { error: optError } = await supabase
          .from('contextual_optimizations')
          .insert({
            context: context,
            optimization: opt.optimization,
            reason: opt.reason,
            aggressiveness: recommendations.aggressiveness,
            auto_apply_threshold: recommendations.auto_apply_threshold,
          });

        if (!optError) {
          optimizationsApplied++;
          appliedOptimizations.push(opt.optimization);
        }
      }
    }

    // Step 4: Update system configuration based on context
    // Adjust auto-apply thresholds for patterns based on context
    if (recommendations.auto_apply_threshold !== 0.85) {
      const { error: updateError } = await supabase
        .from('universal_error_patterns')
        .update({ 
          auto_apply: supabase.raw(`confidence_score >= ${recommendations.auto_apply_threshold}`)
        })
        .gte('confidence_score', recommendations.auto_apply_threshold);

      if (!updateError) {
        console.log(`Updated auto-apply threshold to ${recommendations.auto_apply_threshold}`);
      }
    }

    // Step 5: Log the contextual optimization session
    await supabase.from('ai_improvement_logs').insert({
      operation_type: 'contextual_optimization',
      changes_made: {
        context,
        recommendations,
        optimizations_applied: optimizationsApplied,
        applied_optimizations: appliedOptimizations,
      },
      success: true,
    });

    console.log(`✅ Applied ${optimizationsApplied} contextual optimizations`);

    return new Response(
      JSON.stringify({
        success: true,
        context,
        recommendations,
        optimizations_applied: optimizationsApplied,
        applied_optimizations: appliedOptimizations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in contextual-auto-optimizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
