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
    const { userId, projectContext, conversationHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load user patterns and learnings
    const { data: patterns } = await supabase
      .from('cross_project_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .limit(10);

    const { data: learnings } = await supabase
      .from('conversation_learnings')
      .select('*')
      .eq('user_id', userId)
      .order('last_reinforced_at', { ascending: false })
      .limit(10);

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId);

    // Construct proactive analysis prompt
    const proactivePrompt = `You are a proactive AI intelligence system. Analyze the user's patterns and suggest improvements:

USER PATTERNS:
${patterns?.map(p => `- ${p.pattern_name}: Used ${p.usage_count} times, ${p.success_rate}% success`).join('\n') || 'No patterns yet'}

RECENT LEARNINGS:
${learnings?.map(l => `- ${l.pattern_category}: ${l.learned_pattern} (${l.confidence}% confidence)`).join('\n') || 'No learnings yet'}

USER PREFERENCES:
${preferences?.map(p => `- ${p.preference_type}: ${JSON.stringify(p.preference_value)}`).join('\n') || 'No preferences yet'}

CURRENT PROJECT CONTEXT:
${JSON.stringify(projectContext || {}, null, 2)}

RECENT CONVERSATION:
${conversationHistory?.slice(-5).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join('\n') || 'No history'}

Based on this analysis, provide proactive suggestions:
{
  "insights": ["Key insight 1", "Key insight 2"],
  "suggestions": [
    {
      "type": "optimization|feature|best-practice|learning",
      "title": "Suggestion title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "reasoning": "Why this matters"
    }
  ],
  "potential_issues": ["Potential issue to watch for"],
  "learning_opportunities": ["What the AI should learn"],
  "confidence": 0.0-1.0
}`;

    // Call Lovable AI for proactive analysis
    const proactiveResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a proactive intelligence system that identifies patterns and suggests improvements before being asked. Always respond with valid JSON.'
          },
          { role: 'user', content: proactivePrompt }
        ],
        temperature: 0.6,
      }),
    });

    if (!proactiveResponse.ok) {
      const errorText = await proactiveResponse.text();
      console.error('Lovable AI proactive error:', proactiveResponse.status, errorText);
      throw new Error(`Lovable AI proactive analysis failed: ${proactiveResponse.status}`);
    }

    const proactiveData = await proactiveResponse.json();
    const proactiveContent = proactiveData.choices[0].message.content;

    // Parse proactive intelligence
    let intelligence;
    try {
      intelligence = JSON.parse(proactiveContent);
    } catch {
      intelligence = {
        insights: ['Analysis completed'],
        suggestions: [],
        raw_analysis: proactiveContent,
        confidence: 0.6
      };
    }

    // Store proactive insights for learning
    if (intelligence.learning_opportunities?.length > 0) {
      for (const opportunity of intelligence.learning_opportunities) {
        await supabase
          .from('conversation_learnings')
          .insert({
            user_id: userId,
            pattern_category: 'proactive_learning',
            learned_pattern: opportunity,
            confidence: intelligence.confidence * 100 || 60,
            context: { source: 'proactive_intelligence', suggestions: intelligence.suggestions }
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        intelligence,
        timestamp: new Date().toISOString(),
        patterns_analyzed: patterns?.length || 0,
        learnings_analyzed: learnings?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in proactive-intelligence:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
