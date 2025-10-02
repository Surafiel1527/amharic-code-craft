import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, projectId, currentPackages = [] } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a dependency management expert. Analyze the code and current dependencies.

Current packages: ${JSON.stringify(currentPackages)}

Provide recommendations for:
1. Missing packages that should be added
2. Unused packages that can be removed
3. Security vulnerabilities
4. Version conflicts
5. Better alternatives

Return a JSON object:
{
  "suggestedAdditions": [{"name": "package", "reason": "why", "priority": "high|medium|low"}],
  "suggestedRemovals": [{"name": "package", "reason": "why"}],
  "securityIssues": [{"package": "name", "severity": "critical|high|medium|low", "issue": "description"}],
  "versionConflicts": [{"packages": ["a", "b"], "issue": "description"}],
  "auditScore": 0-100
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Audit dependencies for this code:\n\n${code}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      suggestedAdditions: [],
      suggestedRemovals: [],
      securityIssues: [],
      versionConflicts: [],
      auditScore: 85
    };

    // Save to database
    const { data: audit, error: dbError } = await supabaseClient
      .from('dependency_audits')
      .insert({
        user_id: user.id,
        project_id: projectId,
        current_dependencies: currentPackages,
        suggested_additions: parsed.suggestedAdditions,
        suggested_removals: parsed.suggestedRemovals,
        security_issues: parsed.securityIssues,
        version_conflicts: parsed.versionConflicts,
        audit_score: parsed.auditScore
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ audit, ...parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in audit-dependencies:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});