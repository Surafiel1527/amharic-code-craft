import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { events } = await req.json();

    if (!events || !Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Invalid events array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store events in generation_analytics table
    const analyticsData = events.map((event: any) => ({
      event_type: event.type || 'unknown',
      user_id: event.userId,
      project_id: event.projectId,
      conversation_id: event.conversationId,
      metadata: {
        duration: event.duration,
        status: event.status,
        ...event.data
      },
      success_rate: event.success ? 100 : 0,
      created_at: new Date(event.timestamp).toISOString()
    }));

    const { error: insertError } = await supabase
      .from('generation_analytics')
      .insert(analyticsData);

    if (insertError) {
      console.error('Error inserting analytics:', insertError);
      throw insertError;
    }

    console.log(`✅ Stored ${events.length} analytics events`);

    return new Response(
      JSON.stringify({ success: true, count: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analytics aggregator error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
