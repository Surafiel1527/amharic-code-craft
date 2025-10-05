import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode = 'suggestions' } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('Generating proactive intelligence for user:', user.id);

    // Get user's recent activity
    const { data: patterns } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false })
      .limit(10);

    const { data: projects } = await supabase
      .from('python_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Generate proactive suggestions
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a proactive AI assistant. Based on user patterns and activity, suggest:
1. Next best actions
2. Optimization opportunities
3. Potential issues to avoid
4. Learning resources
5. Advanced features they might benefit from
Return JSON array of suggestions with: title, description, priority (high/medium/low), action_type, estimated_impact.`
          },
          {
            role: 'user',
            content: `User patterns: ${JSON.stringify(patterns?.slice(0, 5))}\nRecent projects: ${JSON.stringify(projects?.map(p => ({ type: p.project_type, status: 'completed' })))}\nMode: ${mode}`
          }
        ],
      }),
    });

    const data = await response.json();
    const suggestionsText = data.choices[0].message.content;
    
    let suggestions;
    try {
      const jsonMatch = suggestionsText.match(/```json\n([\s\S]*?)\n```/) || suggestionsText.match(/\[[\s\S]*\]/);
      suggestions = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : suggestionsText);
    } catch {
      suggestions = [
        {
          title: 'Explore Advanced Features',
          description: suggestionsText,
          priority: 'medium',
          action_type: 'exploration',
          estimated_impact: 'medium'
        }
      ];
    }

    // Store proactive insights
    const { data: insight } = await supabase
      .from('proactive_insights')
      .insert({
        user_id: user.id,
        insight_type: mode,
        suggestions,
        based_on: {
          patterns_count: patterns?.length || 0,
          projects_count: projects?.length || 0
        }
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        suggestions,
        insight_id: insight?.id,
        generated_at: new Date().toISOString(),
        user_activity_summary: {
          active_patterns: patterns?.length || 0,
          recent_projects: projects?.length || 0,
          top_pattern: patterns?.[0]?.pattern_name || 'No patterns yet'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in proactive-intelligence:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
