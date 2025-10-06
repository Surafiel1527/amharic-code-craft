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
    const { dependencies } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Detect conflicts
    const conflicts = [];
    const depEntries = Object.entries(dependencies);

    for (let i = 0; i < depEntries.length; i++) {
      for (let j = i + 1; j < depEntries.length; j++) {
        const [pkg1, ver1] = depEntries[i];
        const [pkg2, ver2] = depEntries[j];

        // Check peer dependencies
        const npm1 = await fetch(`https://registry.npmjs.org/${pkg1}/${ver1}`);
        if (!npm1.ok) continue;
        const data1 = await npm1.json();

        const npm2 = await fetch(`https://registry.npmjs.org/${pkg2}/${ver2}`);
        if (!npm2.ok) continue;
        const data2 = await npm2.json();

        // Check for peer dependency conflicts
        const peers1 = data1.peerDependencies || {};
        const peers2 = data2.peerDependencies || {};

        if (peers1[pkg2] && peers1[pkg2] !== ver2) {
          conflicts.push({
            package_name: pkg1,
            version_requested: ver1,
            conflicting_with: `${pkg2}@${ver2}`,
            conflict_reason: `${pkg1} requires ${pkg2}@${peers1[pkg2]}`,
            user_id: user.id
          });
        }

        if (peers2[pkg1] && peers2[pkg1] !== ver1) {
          conflicts.push({
            package_name: pkg2,
            version_requested: ver2,
            conflicting_with: `${pkg1}@${ver1}`,
            conflict_reason: `${pkg2} requires ${pkg1}@${peers2[pkg1]}`,
            user_id: user.id
          });
        }
      }
    }

    // Use AI to resolve conflicts
    if (conflicts.length > 0) {
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
            content: `Resolve these dependency conflicts:
${JSON.stringify(conflicts, null, 2)}

For each conflict, suggest the best resolution.
Return JSON array: [{ "conflictIndex": number, "resolution": string, "confidence": number }]`
          }]
        })
      });

      const aiResult = await aiResponse.json();
      const content = aiResult.choices?.[0]?.message?.content || '[]';
      const resolutions = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      // Update conflicts with AI suggestions
      for (let i = 0; i < conflicts.length; i++) {
        const resolution = resolutions[i] || { resolution: 'Manual review needed', confidence: 0.5 };
        conflicts[i].resolution_suggestion = resolution.resolution;
        conflicts[i].ai_confidence = resolution.confidence;

        // Save conflict to DB
        await supabaseClient.from('dependency_conflicts').insert(conflicts[i]);
      }
    }

    return new Response(
      JSON.stringify({
        conflictsFound: conflicts.length,
        conflicts: conflicts,
        canProceed: conflicts.length === 0 || conflicts.every(c => c.ai_confidence > 0.7)
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