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
    const { conversationId, messages, userRequest, generatedResponse } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    console.log('🧠 Learning from conversation for user:', user.id);

    // Analyze conversation using AI to extract patterns
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const analysisPrompt = `Analyze this conversation and extract user preferences, coding style, and patterns:

User Request: ${userRequest}
Generated Response: ${generatedResponse?.substring(0, 500)}

Extract:
1. Programming language preferences (e.g., TypeScript, Python)
2. Framework preferences (e.g., React, Vue)
3. Coding style (e.g., functional, OOP, concise, verbose)
4. Architecture preferences (e.g., modular, monolithic)
5. Communication style (e.g., formal, casual, technical)

Return JSON with structure:
{
  "language": "preferred language or null",
  "framework": "preferred framework or null",
  "codingStyle": ["style1", "style2"],
  "architecture": "preference or null",
  "communicationStyle": "style or null",
  "complexity": "beginner|intermediate|advanced"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing conversations to extract user preferences. Always respond with valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI analysis failed:', await aiResponse.text());
      throw new Error('Failed to analyze conversation');
    }

    const aiData = await aiResponse.json();
    let preferences;
    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      preferences = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      preferences = {};
    }

    console.log('📊 Extracted preferences:', preferences);

    // Update or create user preferences
    const preferenceTypes = ['language', 'framework', 'style', 'complexity'];
    const updates = [];

    for (const prefType of preferenceTypes) {
      let value = null;
      
      if (prefType === 'language' && preferences.language) {
        value = { preferred: preferences.language };
      } else if (prefType === 'framework' && preferences.framework) {
        value = { preferred: preferences.framework };
      } else if (prefType === 'style' && preferences.codingStyle) {
        value = { styles: preferences.codingStyle, architecture: preferences.architecture };
      } else if (prefType === 'complexity' && preferences.complexity) {
        value = { level: preferences.complexity };
      }

      if (value) {
        // Check if preference exists
        const { data: existing } = await supabaseClient
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .eq('preference_type', prefType)
          .single();

        if (existing) {
          // Update and increase confidence
          await supabaseClient
            .from('user_preferences')
            .update({
              preference_value: value,
              confidence_score: Math.min(100, (existing.confidence_score || 50) + 10),
              learned_from_interactions: (existing.learned_from_interactions || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Insert new preference
          await supabaseClient
            .from('user_preferences')
            .insert({
              user_id: user.id,
              preference_type: prefType,
              preference_value: value,
              confidence_score: 60,
              learned_from_interactions: 1
            });
        }
        updates.push(prefType);
      }
    }

    // Store conversation learnings
    const learnings = [];
    
    if (preferences.codingStyle?.length > 0) {
      learnings.push({
        user_id: user.id,
        conversation_id: conversationId,
        learned_pattern: `Prefers ${preferences.codingStyle.join(', ')} coding style`,
        pattern_category: 'coding_style',
        confidence: 70,
        context: { styles: preferences.codingStyle }
      });
    }

    if (preferences.communicationStyle) {
      learnings.push({
        user_id: user.id,
        conversation_id: conversationId,
        learned_pattern: `Prefers ${preferences.communicationStyle} communication`,
        pattern_category: 'communication_style',
        confidence: 65,
        context: { style: preferences.communicationStyle }
      });
    }

    if (learnings.length > 0) {
      await supabaseClient.from('conversation_learnings').insert(learnings);
    }

    console.log('✅ Learning complete:', updates);

    return new Response(
      JSON.stringify({
        success: true,
        preferencesUpdated: updates,
        learningsStored: learnings.length,
        extractedPreferences: preferences
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Learning error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
