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
    const { mode = 'check' } = await req.json(); // check | auto-update
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get installed packages
    const { data: installed } = await supabaseClient
      .from('installed_packages')
      .select('*')
      .eq('user_id', user.id);

    const updates = [];

    for (const pkg of installed || []) {
      // Check npm for latest version
      const npmResponse = await fetch(`https://registry.npmjs.org/${pkg.package_name}`);
      if (!npmResponse.ok) continue;

      const npmData = await npmResponse.json();
      const latestVersion = npmData['dist-tags']?.latest;

      if (latestVersion && latestVersion !== pkg.version) {
        const updateType = determineUpdateType(pkg.version, latestVersion);
        
        // Use AI to analyze if update is safe
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
              content: `Analyze updating ${pkg.package_name} from ${pkg.version} to ${latestVersion}.
Is this a breaking change? Should it auto-update?
Return JSON: { "breaking": boolean, "autoUpdateSafe": boolean, "reasoning": string }`
            }]
          })
        });

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content || '{}';
        const analysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

        updates.push({
          package_name: pkg.package_name,
          current_version: pkg.version,
          latest_version: latestVersion,
          update_type: updateType,
          breaking_changes: analysis.breaking || false,
          auto_update_approved: analysis.autoUpdateSafe && updateType === 'patch',
          user_id: user.id
        });

        // Save update info
        await supabaseClient.from('package_updates').insert(updates[updates.length - 1]);

        // Auto-update if safe and mode is auto
        if (mode === 'auto-update' && updates[updates.length - 1].auto_update_approved) {
          await supabaseClient
            .from('installed_packages')
            .update({ version: latestVersion })
            .eq('package_name', pkg.package_name)
            .eq('user_id', user.id);

          await supabaseClient.from('package_install_logs').insert({
            package_name: pkg.package_name,
            version: latestVersion,
            action: 'update',
            user_id: user.id,
            success: true,
            metadata: { from: pkg.version, auto: true }
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        updatesFound: updates.length,
        autoUpdated: updates.filter(u => u.auto_update_approved).length,
        updates: updates
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

function determineUpdateType(current: string, latest: string): string {
  const [cMajor, cMinor] = current.split('.').map(Number);
  const [lMajor, lMinor] = latest.split('.').map(Number);
  
  if (lMajor > cMajor) return 'major';
  if (lMinor > cMinor) return 'minor';
  return 'patch';
}