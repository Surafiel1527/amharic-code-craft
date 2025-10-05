import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errorMessage, projectContext, deploymentProvider = 'vercel' } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎓 Teaching AI to fix deployment error:', errorMessage);

    // Step 1: Check if we've seen this error pattern before
    const { data: knownPatterns } = await supabaseClient
      .from('deployment_error_patterns')
      .select('*')
      .ilike('error_pattern', `%${errorMessage.substring(0, 50)}%`)
      .eq('provider', deploymentProvider)
      .order('success_count', { ascending: false })
      .limit(1);

    if (knownPatterns && knownPatterns.length > 0) {
      console.log('✅ Found known solution for this error');
      return new Response(
        JSON.stringify({
          success: true,
          solution: knownPatterns[0].solution,
          confidence: knownPatterns[0].success_count / (knownPatterns[0].success_count + knownPatterns[0].failure_count || 1),
          isKnown: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to learn and create a solution
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const teachingPrompt = `You are a deployment expert teacher. Analyze this deployment error and create a structured solution.

**Error Message:**
${errorMessage}

**Deployment Provider:** ${deploymentProvider}

**Project Context:**
${JSON.stringify(projectContext, null, 2)}

**Your Task:**
1. Identify the root cause of the error
2. Determine what files need to be created/modified
3. Provide specific configuration changes
4. Create a reusable solution pattern

**Output Format (JSON only):**
{
  "diagnosis": "Clear explanation of what's wrong",
  "rootCause": "Technical reason for the error",
  "solution": {
    "files": [
      {
        "path": "path/to/file",
        "action": "create|modify",
        "content": "exact file content or changes needed",
        "explanation": "why this change is needed"
      }
    ],
    "steps": ["Step 1", "Step 2", ...],
    "verification": "How to verify the fix worked"
  },
  "preventionTips": ["How to avoid this in future"],
  "relatedErrors": ["Other errors this might cause or relate to"]
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
          { role: 'system', content: 'You are a deployment expert. Always respond with valid JSON only.' },
          { role: 'user', content: teachingPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const learningResult = JSON.parse(aiData.choices[0].message.content);

    // Step 3: Store this learning for future use
    await supabaseClient
      .from('deployment_error_patterns')
      .insert({
        provider: deploymentProvider,
        error_pattern: errorMessage,
        error_type: learningResult.rootCause || 'configuration',
        solution: learningResult.solution,
        diagnosis: learningResult.diagnosis,
        prevention_tips: learningResult.preventionTips,
        related_errors: learningResult.relatedErrors,
        success_count: 0,
        failure_count: 0,
        learned_at: new Date().toISOString()
      });

    console.log('✨ New deployment error pattern learned and stored');

    return new Response(
      JSON.stringify({
        success: true,
        solution: learningResult.solution,
        diagnosis: learningResult.diagnosis,
        preventionTips: learningResult.preventionTips,
        isKnown: false,
        message: 'AI learned how to fix this error. Applying solution...'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in deployment-fix-teacher:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
