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

    const { name, description } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Snapshot name is required' }),
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

    console.log('Saving snapshot for user:', user.id);

    // Get all active customizations for this user
    const { data: customizations, error: fetchError } = await supabaseClient
      .from('admin_customizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'applied')
      .order('applied_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching customizations:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${customizations?.length || 0} customizations to snapshot`);

    // Save snapshot
    const { data: snapshot, error: saveError } = await supabaseClient
      .from('customization_snapshots')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        customizations: customizations || []
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving snapshot:', saveError);
      return new Response(
        JSON.stringify({ error: saveError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Snapshot saved successfully:', snapshot.id);

    return new Response(
      JSON.stringify({ success: true, snapshot }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in save-snapshot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});