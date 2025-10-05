import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@14.21.0';

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

    const { pluginId, marketplaceListingId } = await req.json();

    console.log('Processing plugin purchase:', { pluginId, user: user.id });

    // Get marketplace listing
    const { data: listing, error: listingError } = await supabase
      .from('marketplace_plugins')
      .select(`
        *,
        plugin:ai_plugins(*)
      `)
      .eq('id', marketplaceListingId)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'Plugin not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    // Create or get Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
    }

    // Calculate amounts (platform takes 30%)
    const amountTotal = Math.round(listing.price * 100); // Convert to cents
    const platformFee = Math.round(amountTotal * 0.30);
    const creatorAmount = amountTotal - platformFee;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountTotal,
      currency: 'usd',
      customer: customerId,
      metadata: {
        plugin_id: pluginId,
        buyer_id: user.id,
        seller_id: listing.plugin.created_by,
        marketplace_listing_id: marketplaceListingId
      },
      description: `Purchase: ${listing.plugin.plugin_name}`
    });

    // Store transaction
    await supabase
      .from('payment_transactions')
      .insert({
        stripe_payment_id: paymentIntent.id,
        stripe_customer_id: customerId,
        buyer_id: user.id,
        seller_id: listing.plugin.created_by,
        plugin_id: pluginId,
        amount_total: amountTotal,
        amount_creator: creatorAmount,
        amount_platform: platformFee,
        payment_status: 'pending'
      });

    return new Response(JSON.stringify({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-plugin-purchase:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});