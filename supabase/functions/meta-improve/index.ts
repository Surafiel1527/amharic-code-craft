import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Only admins can trigger meta-improvements
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roles?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get recent failures
    const { data: failures } = await supabaseClient
      .from('generation_analytics')
      .select('*')
      .in('status', ['failure', 'error'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (!failures || failures.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No failures found to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current active prompt
    const { data: currentPrompt } = await supabaseClient
      .from('prompt_versions')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!currentPrompt) {
      throw new Error('No active prompt version found');
    }

    // Analyze failures and generate improved prompt
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const failureAnalysis = failures.map(f => ({
      userPrompt: f.user_prompt,
      generatedCode: f.generated_code.substring(0, 500),
      error: f.error_message,
      feedback: f.feedback_type
    }));

    const metaPrompt = `You are a prompt engineer expert. Analyze these AI code generation failures and improve the system prompt.

Current System Prompt (v${currentPrompt.version}):
${currentPrompt.system_prompt}

Recent Failures (last 7 days):
${JSON.stringify(failureAnalysis, null, 2)}

Generate an improved system prompt that:
1. Addresses the common failure patterns
2. Improves code quality and structure
3. Better handles edge cases
4. Maintains existing strengths
5. Uses clear, specific instructions

Return a JSON object with:
{
  "newPrompt": "the improved system prompt",
  "improvements": ["list of specific improvements made"],
  "reasoning": "why these changes will help"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: metaPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;
    
    // Parse the JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const improvement = JSON.parse(jsonMatch[0]);

    // Create new version number
    const versionParts = currentPrompt.version.split('.');
    const newVersion = `v${versionParts[0].slice(1)}.${parseInt(versionParts[1]) + 1}.0`;

    // Store the improvement
    const { data: newPromptVersion, error: promptError } = await supabaseClient
      .from('prompt_versions')
      .insert({
        version: newVersion,
        system_prompt: improvement.newPrompt,
        parent_version: currentPrompt.version,
        improvements_made: improvement.improvements,
        notes: improvement.reasoning,
        is_active: false,
        traffic_percentage: 0
      })
      .select()
      .single();

    if (promptError) throw promptError;

    // Record the improvement
    const { error: improvementError } = await supabaseClient
      .from('ai_improvements')
      .insert({
        improvement_type: 'prompt',
        old_version: currentPrompt.version,
        new_version: newVersion,
        reason: 'Automated analysis of recent failures',
        analysis: {
          failureCount: failures.length,
          timeRange: '7 days',
          improvements: improvement.improvements
        },
        before_metrics: {
          version: currentPrompt.version,
          successRate: currentPrompt.success_rate
        },
        status: 'pending'
      });

    if (improvementError) throw improvementError;

    return new Response(
      JSON.stringify({
        success: true,
        newVersion: newVersion,
        improvements: improvement.improvements,
        reasoning: improvement.reasoning,
        promptId: newPromptVersion.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in meta-improve function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});