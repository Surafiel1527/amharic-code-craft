import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errorMessage, provider, credentials, credentialId } = await req.json();

    console.log(`🔍 Analyzing ${provider} connection error...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch provider documentation from cache
    const { data: providerDocs } = await supabase
      .from('database_provider_docs')
      .select('documentation')
      .eq('provider', provider)
      .single();

    // Fetch similar successful patterns
    const { data: successPatterns } = await supabase
      .from('database_connection_patterns')
      .select('*')
      .eq('provider', provider)
      .order('success_count', { ascending: false })
      .limit(3);

    // Prepare AI prompt
    const aiPrompt = `You are a database connection expert. Analyze this ${provider} connection error and provide actionable fixes.

Error Message: ${errorMessage}

Provider: ${provider}
Credentials (sanitized): ${JSON.stringify({
  host: credentials.host,
  port: credentials.port,
  database: credentials.database,
  hasPassword: !!credentials.password
})}

${providerDocs ? `Provider Documentation: ${JSON.stringify(providerDocs.documentation).slice(0, 2000)}` : ''}

${successPatterns?.length ? `Successful Connection Patterns:
${successPatterns.map(p => `- ${p.notes || 'Standard config'}: ${JSON.stringify(p.configuration)}`).join('\n')}` : ''}

Provide:
1. Root cause analysis
2. Specific fixes (with exact configuration changes)
3. Security recommendations
4. Alternative approaches if primary fix fails

Format response as JSON:
{
  "rootCause": "explanation",
  "suggestedFixes": [
    {
      "title": "Fix name",
      "description": "What to do",
      "changes": { "key": "newValue" },
      "priority": "high|medium|low"
    }
  ],
  "securityNotes": ["note1", "note2"],
  "additionalResources": ["link1", "link2"]
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a database connection expert. Always respond with valid JSON.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(aiContent);
    } catch {
      // If not valid JSON, create structured response
      analysis = {
        rootCause: aiContent,
        suggestedFixes: [],
        securityNotes: [],
        additionalResources: []
      };
    }

    // Store error and analysis
    const { data: errorRecord, error: insertError } = await supabase
      .from('database_connection_errors')
      .insert({
        user_id: user.id,
        credential_id: credentialId,
        provider,
        error_message: errorMessage,
        error_context: { credentials: { host: credentials.host, port: credentials.port } },
        ai_analysis: analysis,
        suggested_fixes: analysis.suggestedFixes || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing analysis:', insertError);
    }

    console.log('✅ Analysis complete');

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        errorId: errorRecord?.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error analyzing database error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
