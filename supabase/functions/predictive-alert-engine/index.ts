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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔮 Predictive Alert Engine: Analyzing system for pre-failure warnings...');

    // Gather system metrics
    const [jobsData, errorsData, deploymentsData, packagesData, testsData] = await Promise.all([
      supabase.from('ai_generation_jobs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('detected_errors').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('vercel_deployments' as any).select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('package_operations').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('test_runs').select('*').order('created_at', { ascending: false }).limit(30)
    ]);

    // Calculate failure rates and trends
    const metrics = {
      jobs: {
        total: jobsData.data?.length || 0,
        failed: jobsData.data?.filter(j => j.status === 'failed').length || 0,
        stuck: jobsData.data?.filter(j => j.status === 'processing' && 
          new Date(j.created_at) < new Date(Date.now() - 10 * 60 * 1000)).length || 0
      },
      errors: {
        total: errorsData.data?.length || 0,
        critical: errorsData.data?.filter(e => e.severity === 'critical').length || 0,
        highSeverity: errorsData.data?.filter(e => e.severity === 'high').length || 0,
        recurring: errorsData.data?.filter(e => (e.occurrence_count || 0) > 3).length || 0
      },
      deployments: {
        total: deploymentsData.data?.length || 0,
        failed: deploymentsData.data?.filter(d => d.status === 'error').length || 0,
        building: deploymentsData.data?.filter(d => d.status === 'building').length || 0
      },
      packages: {
        total: packagesData.data?.length || 0,
        failed: packagesData.data?.filter(p => p.status === 'failed').length || 0,
        pending: packagesData.data?.filter(p => p.status === 'pending').length || 0
      },
      tests: {
        total: testsData.data?.length || 0,
        failed: testsData.data?.filter(t => t.status === 'failed').length || 0,
        flaky: testsData.data?.filter(t => (t.flaky_count || 0) > 0).length || 0
      }
    };

    // AI prediction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [{
          role: 'user',
          content: `You are a PREDICTIVE FAILURE DETECTION SYSTEM.

Analyze these real-time system metrics and PREDICT failures BEFORE they happen:

System Metrics:
${JSON.stringify(metrics, null, 2)}

Recent Error Patterns:
${JSON.stringify(errorsData.data?.slice(0, 10).map(e => ({ type: e.error_type, severity: e.severity, count: e.occurrence_count })), null, 2)}

PREDICT:
1. What failures are likely to occur in the next 1-24 hours?
2. Confidence level for each prediction (0-100%)
3. Recommended preventive actions
4. Estimated time until failure
5. Root cause analysis

Format as JSON array of predictions with: alert_type, severity, confidence, predicted_failure_time_hours, recommended_actions, root_cause`
        }]
      })
    });

    const aiData = await aiResponse.json();
    const predictions = JSON.parse(
      aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
    );

    // Store predictive alerts
    const alerts = [];
    for (const pred of predictions) {
      if (pred.confidence > 50) {
        const { data: alert } = await supabase
          .from('predictive_alerts')
          .insert({
            alert_type: pred.alert_type,
            severity: pred.severity || 'warning',
            prediction_confidence: pred.confidence,
            predicted_failure_time: pred.predicted_failure_time_hours 
              ? new Date(Date.now() + pred.predicted_failure_time_hours * 60 * 60 * 1000).toISOString()
              : null,
            current_metrics: metrics,
            recommended_actions: pred.recommended_actions || [],
            metadata: { root_cause: pred.root_cause }
          })
          .select()
          .single();

        alerts.push(alert);

        // Create system prediction record
        await supabase
          .from('system_predictions')
          .insert({
            prediction_type: pred.alert_type,
            target_system: pred.target_system || 'general',
            failure_probability: pred.confidence,
            time_to_failure_hours: pred.predicted_failure_time_hours || null,
            root_cause_analysis: { analysis: pred.root_cause },
            preventive_actions: pred.recommended_actions || [],
            confidence_score: pred.confidence,
            prediction_data: metrics,
            predicted_for: pred.predicted_failure_time_hours
              ? new Date(Date.now() + pred.predicted_failure_time_hours * 60 * 60 * 1000).toISOString()
              : new Date().toISOString()
          });
      }
    }

    // Send critical alerts to admins
    const criticalAlerts = alerts.filter((a: any) => a?.severity === 'critical');
    if (criticalAlerts.length > 0) {
      await supabase.rpc('notify_admins', {
        notification_type: 'critical_prediction',
        notification_title: '🔮 Critical Failures Predicted',
        notification_message: `${criticalAlerts.length} critical failure(s) predicted within next 24 hours`,
        notification_data: { alerts: criticalAlerts }
      });
    }

    console.log(`✅ Predictive Alert Engine: Generated ${alerts.length} predictions, ${criticalAlerts.length} critical`);

    return new Response(
      JSON.stringify({
        success: true,
        predictions: alerts,
        metrics,
        critical_count: criticalAlerts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in predictive-alert-engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});