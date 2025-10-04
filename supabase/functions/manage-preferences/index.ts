import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, preferenceType, preferenceValue } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    if (action === 'get') {
      // Get all user preferences
      const { data: prefs } = await supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id);

      const { data: learnings } = await supabaseClient
        .from('conversation_learnings')
        .select('*')
        .eq('user_id', user.id)
        .order('confidence', { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          success: true,
          preferences: prefs || [],
          recentLearnings: learnings || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'set') {
      // Manually set a preference
      if (!preferenceType || !preferenceValue) {
        throw new Error('preferenceType and preferenceValue required');
      }

      const { data: existing } = await supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('preference_type', preferenceType)
        .single();

      if (existing) {
        await supabaseClient
          .from('user_preferences')
          .update({
            preference_value: preferenceValue,
            confidence_score: 100, // Manual = high confidence
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabaseClient
          .from('user_preferences')
          .insert({
            user_id: user.id,
            preference_type: preferenceType,
            preference_value: preferenceValue,
            confidence_score: 100
          });
      }

      console.log('✅ Preference set:', preferenceType);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Preference updated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reset') {
      // Reset preferences
      await supabaseClient
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id);

      await supabaseClient
        .from('conversation_learnings')
        .delete()
        .eq('user_id', user.id);

      console.log('🔄 Preferences reset for user:', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'All preferences reset'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Manage preferences error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
