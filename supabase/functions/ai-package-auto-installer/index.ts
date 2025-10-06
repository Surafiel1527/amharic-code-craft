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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { packages, projectId, triggeredBy = 'ai_auto' } = await req.json();

    console.log('[Auto-Installer] Processing packages:', packages);

    const results = [];
    for (const pkg of packages) {
      const operationId = crypto.randomUUID();
      
      // Create operation record
      await supabaseClient.from('package_operations').insert({
        id: operationId,
        user_id: user.id,
        project_id: projectId,
        operation_type: 'install',
        package_name: pkg.name,
        to_version: pkg.version || 'latest',
        status: 'in_progress',
        triggered_by: triggeredBy,
        started_at: new Date().toISOString()
      });

      try {
        // Call the real package installer
        const installResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/real-package-installer`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.get('Authorization')!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            packageName: pkg.name,
            version: pkg.version,
            projectId
          })
        });

        if (!installResult.ok) {
          throw new Error(`Installation failed: ${await installResult.text()}`);
        }

        const installData = await installResult.json();

        // Update operation as completed
        await supabaseClient.from('package_operations').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          changes_made: installData
        }).eq('id', operationId);

        results.push({
          package: pkg.name,
          status: 'success',
          version: pkg.version || 'latest',
          operationId
        });

        console.log(`[Auto-Installer] ✓ Installed ${pkg.name}@${pkg.version || 'latest'}`);

      } catch (error) {
        console.error(`[Auto-Installer] ✗ Failed to install ${pkg.name}:`, error);
        
        await supabaseClient.from('package_operations').update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        }).eq('id', operationId);

        results.push({
          package: pkg.name,
          status: 'failed',
          error: error.message,
          operationId
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total: packages.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Auto-Installer] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});