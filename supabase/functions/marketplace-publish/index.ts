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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      pluginId, 
      price, 
      pricingModel, 
      category, 
      tags, 
      screenshots,
      demoUrl,
      supportUrl 
    } = await req.json();

    console.log('Publishing plugin to marketplace:', { pluginId, pricingModel });

    // Verify plugin ownership
    const { data: plugin, error: pluginError } = await supabase
      .from('ai_plugins')
      .select('*')
      .eq('id', pluginId)
      .eq('created_by', user.id)
      .single();

    if (pluginError || !plugin) {
      return new Response(JSON.stringify({ error: 'Plugin not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already listed
    const { data: existing } = await supabase
      .from('marketplace_plugins')
      .select('id')
      .eq('plugin_id', pluginId)
      .single();

    if (existing) {
      // Update existing listing
      const { data: updated, error: updateError } = await supabase
        .from('marketplace_plugins')
        .update({
          price: price || 0,
          pricing_model: pricingModel || 'free',
          category,
          tags: tags || [],
          screenshots: screenshots || [],
          demo_url: demoUrl,
          support_url: supportUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        marketplaceListing: updated
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new marketplace listing
    const { data: listing, error: listingError } = await supabase
      .from('marketplace_plugins')
      .insert({
        plugin_id: pluginId,
        price: price || 0,
        pricing_model: pricingModel || 'free',
        category,
        tags: tags || [],
        screenshots: screenshots || [],
        demo_url: demoUrl,
        support_url: supportUrl,
        approved: false, // Needs admin approval
        featured: false
      })
      .select()
      .single();

    if (listingError) {
      return new Response(JSON.stringify({ error: listingError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      marketplaceListing: listing,
      message: 'Plugin submitted for approval'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in marketplace-publish:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});