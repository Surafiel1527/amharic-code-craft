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
    const { generatedCode, error, context } = await req.json();

    if (!generatedCode || !error) {
      throw new Error('Generated code and error are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Check if we've seen this error pattern before
    const { data: knownPattern } = await supabaseClient
      .from('error_patterns')
      .select('*')
      .eq('error_type', error.type || 'unknown')
      .eq('resolution_status', 'solved')
      .order('auto_fix_success_rate', { ascending: false })
      .limit(1)
      .maybeSingle();

    let fixedCode;

    if (knownPattern && knownPattern.solution) {
      // Use known solution
      console.log('Using known solution for error:', error.type);
      
      // Apply the known fix
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

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
              content: `You are a code fixing assistant. Apply this known solution to fix the code:\n${knownPattern.solution}`
            },
            {
              role: 'user',
              content: `Fix this code:\n\n${generatedCode}\n\nError: ${JSON.stringify(error)}`
            }
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      fixedCode = data.choices[0].message.content;

      // Update success rate for this pattern
      await supabaseClient
        .from('error_patterns')
        .update({
          frequency: (knownPattern.frequency || 0) + 1,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', knownPattern.id);

    } else {
      // New error - AI analyzes and fixes
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      // First, analyze the error
      const analysisPrompt = `Analyze this code error and provide a fix.

Code:
${generatedCode}

Error:
${JSON.stringify(error, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Provide:
1. Root cause of the error
2. Fixed code
3. Explanation of what was wrong
4. Pattern to avoid in future

Return JSON:
{
  "rootCause": "explanation",
  "fixedCode": "corrected code",
  "explanation": "what changed",
  "pattern": "general pattern to avoid this",
  "errorType": "classification of error"
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
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      fixedCode = analysis.fixedCode;

      // Store this as a new pattern
      await supabaseClient
        .from('error_patterns')
        .insert({
          error_type: analysis.errorType || 'unknown',
          error_pattern: analysis.pattern,
          frequency: 1,
          common_user_prompts: [context?.userPrompt || ''],
          solution: analysis.explanation,
          fix_applied: true,
          resolution_status: 'monitoring'
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        fixedCode,
        usedKnownPattern: !!knownPattern
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in self-heal function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});