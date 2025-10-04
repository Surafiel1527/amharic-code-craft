import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { action = 'analyze', timeWindow = 7, improvementId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    console.log('🧪 Meta-improvement action:', action);

    if (action === 'analyze') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeWindow);

      const { data: analytics } = await supabaseClient
        .from('generation_analytics')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: modelPerf } = await supabaseClient
        .from('model_performance')
        .select('*')
        .gte('created_at', cutoffDate.toISOString());

      const { data: patterns } = await supabaseClient
        .from('cross_project_patterns')
        .select('*')
        .order('success_rate', { ascending: false })
        .limit(20);

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      const successRate = analytics && analytics.length > 0
        ? (analytics.filter(a => a.status === 'success').length / analytics.length) * 100
        : 0;

      const analysisPrompt = `You are a meta-learning AI system. Analyze this data and propose improvements:

ANALYTICS: Total=${analytics?.length || 0}, Success=${successRate.toFixed(1)}%
MODEL PERFORMANCE: ${JSON.stringify(modelPerf?.slice(0, 5))}
TOP PATTERNS: ${JSON.stringify(patterns?.slice(0, 3))}

Return JSON:
{
  "improvements": [
    {"type": "prompt|workflow|pattern", "current": "", "proposed": "", "reason": "", "expectedImpact": "10"}
  ]
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: 'Expert meta-learning system. Return only valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
        }),
      });

      if (!aiResponse.ok) throw new Error('AI analysis failed');

      const aiData = await aiResponse.json();
      let improvements;
      try {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        improvements = jsonMatch ? JSON.parse(jsonMatch[0]) : { improvements: [] };
      } catch (e) {
        improvements = { improvements: [] };
      }

      const stored = [];
      for (const improvement of improvements.improvements || []) {
        const { data: inserted } = await supabaseClient
          .from('system_improvements')
          .insert({
            improvement_type: improvement.type,
            before_state: improvement.current,
            after_state: improvement.proposed,
            reason: improvement.reason,
            success_metric: parseFloat(improvement.expectedImpact) || null,
            status: 'proposed',
            created_by: user.id
          })
          .select()
          .single();
        
        if (inserted) stored.push(inserted);
      }

      return new Response(
        JSON.stringify({
          success: true,
          improvementsProposed: stored.length,
          improvements: stored
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'apply') {
      if (!improvementId) throw new Error('improvementId required');
      
      const { data: improvement } = await supabaseClient
        .from('system_improvements')
        .select('*')
        .eq('id', improvementId)
        .single();

      if (!improvement) throw new Error('Improvement not found');

      await supabaseClient
        .from('system_improvements')
        .update({
          status: 'active',
          applied_at: new Date().toISOString()
        })
        .eq('id', improvementId);

      return new Response(
        JSON.stringify({ success: true, improvement }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Meta-improve error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
