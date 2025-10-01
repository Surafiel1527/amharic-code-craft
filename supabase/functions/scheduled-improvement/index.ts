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
    console.log('Starting scheduled improvement task...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if we should run improvement (based on recent data)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentGenerations, error: genError } = await supabaseClient
      .from('generation_analytics')
      .select('status')
      .gte('created_at', oneWeekAgo);

    if (genError) throw genError;

    if (!recentGenerations || recentGenerations.length < 50) {
      console.log('Not enough data for improvement (need 50+ generations)');
      return new Response(
        JSON.stringify({ message: 'Insufficient data for improvement', generationsCount: recentGenerations?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate current success rate
    const successful = recentGenerations.filter(g => g.status === 'success').length;
    const successRate = (successful / recentGenerations.length * 100).toFixed(1);
    
    console.log(`Success rate: ${successRate}% (${successful}/${recentGenerations.length})`);

    // Only improve if success rate is below 90%
    if (parseFloat(successRate) >= 90) {
      console.log('Success rate is good (>90%), skipping improvement');
      return new Response(
        JSON.stringify({ message: 'System performing well', successRate }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger meta-improvement
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get recent failures
    const { data: failures } = await supabaseClient
      .from('generation_analytics')
      .select('*')
      .in('status', ['failure', 'error'])
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!failures || failures.length === 0) {
      console.log('No failures to analyze');
      return new Response(
        JSON.stringify({ message: 'No failures to analyze' }),
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

    const failureAnalysis = failures.map(f => ({
      userPrompt: f.user_prompt,
      error: f.error_message,
      generatedCode: f.generated_code ? f.generated_code.substring(0, 300) : 'N/A'
    }));

    const metaPrompt = `You are a prompt engineer. Analyze these failures and improve the system prompt.

Current Prompt (${currentPrompt.version}):
${currentPrompt.system_prompt}

Recent Failures:
${JSON.stringify(failureAnalysis, null, 2)}

Current Success Rate: ${successRate}%

Generate an improved prompt that:
1. Addresses these failure patterns
2. Maintains existing strengths
3. Improves reliability
4. Uses specific, clear instructions

Return JSON:
{
  "newPrompt": "improved system prompt",
  "improvements": ["specific improvements"],
  "reasoning": "why these help"
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
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const improvement = JSON.parse(jsonMatch[0]);

    // Create new version
    const versionParts = currentPrompt.version.split('.');
    const newVersion = `v${versionParts[0].slice(1)}.${parseInt(versionParts[1]) + 1}.0`;

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

    // Record improvement
    await supabaseClient
      .from('ai_improvements')
      .insert({
        improvement_type: 'prompt',
        old_version: currentPrompt.version,
        new_version: newVersion,
        reason: 'Scheduled automatic improvement',
        analysis: {
          failureCount: failures.length,
          successRate: parseFloat(successRate),
          improvements: improvement.improvements
        },
        before_metrics: {
          version: currentPrompt.version,
          successRate: parseFloat(successRate)
        },
        status: 'pending'
      });

    console.log(`Created new prompt version: ${newVersion}`);

    // Notify admins about scheduled improvement
    await supabaseClient.rpc('notify_admins', {
      notification_type: 'improvement',
      notification_title: '⏰ Scheduled AI Improvement',
      notification_message: `Weekly improvement completed. New version ${newVersion} created. Success rate was ${successRate}%.`,
      notification_data: {
        oldVersion: currentPrompt.version,
        newVersion: newVersion,
        successRate: parseFloat(successRate),
        improvementCount: improvement.improvements.length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        newVersion,
        improvements: improvement.improvements,
        currentSuccessRate: successRate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled-improvement:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});