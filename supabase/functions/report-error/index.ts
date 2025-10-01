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
    const {
      errorType,
      errorMessage,
      stackTrace,
      source,
      functionName,
      filePath,
      lineNumber,
      context,
      severity = 'medium'
    } = await req.json();

    console.log('Error reported:', { errorType, source, severity });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if similar error exists recently
    const { data: recentErrors } = await supabaseClient
      .from('detected_errors')
      .select('*')
      .eq('error_type', errorType)
      .eq('source', source)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(1);

    // If similar error was just reported, update frequency instead of creating new
    if (recentErrors && recentErrors.length > 0) {
      const recentError = recentErrors[0];
      
      // Update fix attempts
      await supabaseClient
        .from('detected_errors')
        .update({ 
          fix_attempts: recentError.fix_attempts + 1,
          status: 'detected'
        })
        .eq('id', recentError.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          errorId: recentError.id,
          message: 'Similar error already tracked'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new error
    const { data: errorData, error: insertError } = await supabaseClient
      .from('detected_errors')
      .insert({
        error_type: errorType,
        error_message: errorMessage,
        stack_trace: stackTrace,
        error_context: context || {},
        source: source,
        function_name: functionName,
        file_path: filePath,
        line_number: lineNumber,
        severity: severity,
        status: 'detected'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Trigger auto-fix if enabled and severity is high enough
    if (severity === 'high' || severity === 'critical') {
      console.log('Triggering auto-fix for critical error:', errorData.id);
      
      // Call auto-fix function in background (don't await)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-fix-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ errorId: errorData.id }),
      }).catch(err => console.error('Failed to trigger auto-fix:', err));
    }

    // Notify admins about critical errors
    if (severity === 'critical') {
      await supabaseClient.rpc('notify_admins', {
        notification_type: 'error',
        notification_title: '🚨 Critical Error Detected',
        notification_message: `${errorType}: ${errorMessage.substring(0, 100)}`,
        notification_data: {
          errorId: errorData.id,
          source,
          severity
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        errorId: errorData.id,
        autoFixTriggered: severity === 'high' || severity === 'critical'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in report-error function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
