import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      patternId, 
      accepted, 
      feedbackText, 
      context,
      modelName,
      taskType,
      success,
      qualityScore,
      executionTime,
      costEstimate
    } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    if (action === 'pattern_feedback') {
      // Record pattern feedback
      await supabaseClient
        .from('pattern_feedback')
        .insert({
          pattern_id: patternId,
          user_id: user.id,
          accepted,
          feedback_text: feedbackText,
          context
        });

      // Update pattern success rate
      const { data: feedbacks } = await supabaseClient
        .from('pattern_feedback')
        .select('accepted')
        .eq('pattern_id', patternId);

      if (feedbacks && feedbacks.length > 0) {
        const acceptedCount = feedbacks.filter(f => f.accepted).length;
        const newSuccessRate = (acceptedCount / feedbacks.length) * 100;
        const newConfidence = Math.min(95, 50 + (feedbacks.length * 5) + (newSuccessRate * 0.3));

        await supabaseClient
          .from('cross_project_patterns')
          .update({
            success_rate: newSuccessRate,
            confidence_score: newConfidence,
            usage_count: feedbacks.length
          })
          .eq('id', patternId);

        console.log(`Updated pattern ${patternId}: ${newSuccessRate}% success, ${newConfidence} confidence`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Feedback recorded and pattern updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'model_performance') {
      // Record model performance
      await supabaseClient
        .from('model_performance')
        .insert({
          model_name: modelName,
          task_type: taskType,
          success,
          execution_time_ms: executionTime,
          quality_score: qualityScore,
          cost_estimate: costEstimate,
          user_id: user.id
        });

      // Analyze trends
      const { data: recentPerformance } = await supabaseClient
        .from('model_performance')
        .select('success, quality_score')
        .eq('model_name', modelName)
        .eq('task_type', taskType)
        .order('created_at', { ascending: false })
        .limit(20);

      let analysis = null;
      if (recentPerformance && recentPerformance.length >= 10) {
        const successRate = recentPerformance.filter(p => p.success).length / recentPerformance.length;
        const avgQuality = recentPerformance
          .filter(p => p.quality_score)
          .reduce((sum, p) => sum + (p.quality_score || 0), 0) / recentPerformance.length;

        analysis = {
          modelName,
          taskType,
          successRate: successRate * 100,
          averageQuality: avgQuality,
          sampleSize: recentPerformance.length,
          recommendation: successRate < 0.7 ? 'consider_alternative' : 'performing_well'
        };

        console.log(`Model analysis for ${modelName} on ${taskType}:`, analysis);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Performance recorded',
          analysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_insights') {
      // Get comprehensive feedback insights
      const { data: patternFeedbacks } = await supabaseClient
        .from('pattern_feedback')
        .select(`
          *,
          cross_project_patterns (
            pattern_name,
            pattern_type,
            success_rate,
            confidence_score
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: modelPerformances } = await supabaseClient
        .from('model_performance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Aggregate insights
      const insights = {
        totalFeedbacks: patternFeedbacks?.length || 0,
        acceptanceRate: patternFeedbacks 
          ? (patternFeedbacks.filter(f => f.accepted).length / patternFeedbacks.length) * 100 
          : 0,
        modelPerformance: modelPerformances?.reduce((acc: any, perf) => {
          const key = `${perf.model_name}_${perf.task_type}`;
          if (!acc[key]) {
            acc[key] = { successes: 0, total: 0, avgQuality: 0 };
          }
          acc[key].total++;
          if (perf.success) acc[key].successes++;
          if (perf.quality_score) {
            acc[key].avgQuality = (acc[key].avgQuality * (acc[key].total - 1) + perf.quality_score) / acc[key].total;
          }
          return acc;
        }, {}),
        topPatterns: patternFeedbacks
          ?.filter(f => f.accepted)
          .slice(0, 10)
          .map(f => f.cross_project_patterns)
      };

      return new Response(
        JSON.stringify({ success: true, insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Feedback processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});