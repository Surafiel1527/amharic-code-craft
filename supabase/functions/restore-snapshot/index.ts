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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { snapshotId } = await req.json();

    if (!snapshotId) {
      return new Response(
        JSON.stringify({ error: 'snapshotId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Restoring snapshot:', snapshotId, 'for user:', user.id);

    // Get the snapshot
    const { data: snapshot, error: fetchError } = await supabaseClient
      .from('customization_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching snapshot:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!snapshot) {
      return new Response(
        JSON.stringify({ error: 'Snapshot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete all current customizations
    const { error: deleteError } = await supabaseClient
      .from('admin_customizations')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting current customizations:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Restore customizations from snapshot
    const customizationsToRestore = (snapshot.customizations as any[]).map(c => ({
      user_id: user.id,
      prompt: c.prompt,
      customization_type: c.customization_type,
      status: 'applied',
      code_changes: c.code_changes,
      applied_changes: c.applied_changes,
      applied_at: new Date().toISOString()
    }));

    if (customizationsToRestore.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('admin_customizations')
        .insert(customizationsToRestore);

      if (insertError) {
        console.error('Error restoring customizations:', insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Snapshot restored successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in restore-snapshot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});