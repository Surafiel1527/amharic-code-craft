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

    const { errorType, errorMessage, stackTrace, severity, metadata } = await req.json();

    // Store in detected_errors table
    const { data: errorData, error: insertError } = await supabase
      .from('detected_errors')
      .insert({
        error_type: errorType || 'unknown',
        error_message: errorMessage,
        stack_trace: stackTrace,
        severity: severity || 'medium',
        context: metadata || {},
        frequency: 1
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting error report:', insertError);
      throw insertError;
    }

    console.log(`🚨 Error reported: ${errorType} - ${errorMessage}`);

    // Check if we have a known pattern for this error
    const { data: patterns } = await supabase
      .from('universal_error_patterns')
      .select('*')
      .ilike('error_signature', `%${errorType}%`)
      .limit(1);

    return new Response(
      JSON.stringify({ 
        success: true, 
        errorId: errorData.id,
        hasKnownFix: patterns && patterns.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error reporting error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
