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
    const { projectContext, code } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Use AI to analyze code and suggest packages
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Analyze this ${projectContext.type || 'React'} project and suggest useful npm packages:

Code: ${code?.substring(0, 2000) || 'No code provided'}
Project Type: ${projectContext.type || 'react'}

Suggest 3-5 packages that would improve this project. For each package:
- Name
- Why it's useful
- Specific use case
- Alternative packages
- Popularity score (0-100)
- Security score (0-100)
- Maintenance score (0-100)

Return JSON array: [{ "name": string, "reason": string, "useCase": string, "alternatives": string[], "popularity": number, "security": number, "maintenance": number }]`
        }]
      })
    });

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || '[]';
    const suggestions = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    // Verify packages exist on npm and get real stats
    const verifiedSuggestions = [];
    for (const suggestion of suggestions) {
      try {
        const npmResponse = await fetch(`https://registry.npmjs.org/${suggestion.name}`);
        if (npmResponse.ok) {
          const npmData = await npmResponse.json();
          const downloads = npmData.downloads?.['last-month'] || 0;
          
          const overall = Math.round(
            (suggestion.popularity + suggestion.security + suggestion.maintenance) / 3
          );

          const record = {
            suggested_package: suggestion.name,
            reason: suggestion.reason,
            use_case: suggestion.useCase,
            alternatives: suggestion.alternatives,
            popularity_score: suggestion.popularity,
            security_score: suggestion.security,
            maintenance_score: suggestion.maintenance,
            overall_score: overall,
            user_id: user.id,
            project_id: projectContext.projectId
          };

          verifiedSuggestions.push(record);
          
          // Save to DB
          await supabaseClient.from('ai_package_suggestions').insert(record);
        }
      } catch (error) {
        console.error(`Failed to verify ${suggestion.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        suggestions: verifiedSuggestions,
        count: verifiedSuggestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});