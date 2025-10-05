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
    const { userRequest, conversationHistory, currentContext, reasoningType = 'deep' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Load user's professional knowledge and preferences for context
    let userContext = '';
    if (userId) {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId);
      
      if (prefs && prefs.length > 0) {
        userContext = `User Preferences:\n${prefs.map(p => 
          `- ${p.preference_type}: ${JSON.stringify(p.preference_value)}`
        ).join('\n')}`;
      }
    }

    // Construct reasoning prompt based on type
    const reasoningPrompts = {
      deep: `You are an advanced AI reasoning system. Break down this request into logical steps:

1. UNDERSTAND: What is the user really asking for? What's the core problem?
2. ANALYZE: What are the key components and dependencies?
3. PLAN: What's the best approach? Consider alternatives.
4. REASON: Think through edge cases and potential issues.
5. DECIDE: What's the optimal solution and why?

${userContext ? `\n${userContext}\n` : ''}

User Request: ${userRequest}

Current Context: ${JSON.stringify(currentContext || {})}

Provide your reasoning in this format:
{
  "understanding": "Clear statement of the problem",
  "analysis": ["Key point 1", "Key point 2", ...],
  "approach": "Chosen approach with rationale",
  "considerations": ["Edge case 1", "Consideration 2", ...],
  "solution": "Detailed solution description",
  "confidence": 0.0-1.0
}`,
      
      quick: `Analyze this request and provide:
1. Intent: What does the user want?
2. Best approach: How to solve it?
3. Key considerations: What matters most?

User Request: ${userRequest}
${userContext}

Respond in JSON format with: intent, approach, considerations, confidence`,

      creative: `Think creatively about this request. Consider:
- Innovative solutions
- Multiple perspectives
- Optimal user experience
- Future implications

User Request: ${userRequest}
${userContext}

Provide creative reasoning in JSON format.`
    };

    // Call Lovable AI for reasoning
    const reasoningResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are an advanced reasoning system. Always respond with valid JSON containing your analysis.'
          },
          {
            role: 'user',
            content: reasoningPrompts[reasoningType as keyof typeof reasoningPrompts] || reasoningPrompts.deep
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!reasoningResponse.ok) {
      const errorText = await reasoningResponse.text();
      console.error('Lovable AI reasoning error:', reasoningResponse.status, errorText);
      throw new Error(`Lovable AI reasoning failed: ${reasoningResponse.status}`);
    }

    const reasoningData = await reasoningResponse.json();
    const reasoningContent = reasoningData.choices[0].message.content;

    // Try to parse JSON, handle if it's not valid JSON
    let reasoning;
    try {
      reasoning = JSON.parse(reasoningContent);
    } catch {
      // If not valid JSON, structure it
      reasoning = {
        understanding: reasoningContent.substring(0, 500),
        raw_response: reasoningContent,
        confidence: 0.7
      };
    }

    // Store reasoning for learning
    if (userId) {
      await supabase
        .from('conversation_learnings')
        .insert({
          user_id: userId,
          pattern_category: 'reasoning',
          learned_pattern: `Advanced reasoning for: ${userRequest.substring(0, 100)}`,
          confidence: reasoning.confidence || 0.7,
          context: { reasoning, request: userRequest }
        });
    }

    return new Response(
      JSON.stringify({ 
        reasoning,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in advanced-reasoning:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
