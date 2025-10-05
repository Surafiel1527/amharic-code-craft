import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertNotification {
  alert_type: string;
  credential_id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      alert_type, 
      credential_id, 
      severity, 
      message, 
      details 
    }: AlertNotification = await req.json();

    // Get credential details
    const { data: credential, error: credError } = await supabase
      .from('database_credentials')
      .select('connection_name, user_id')
      .eq('id', credential_id)
      .single();

    if (credError || !credential) {
      throw new Error('Credential not found');
    }

    // Get user email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
      credential.user_id
    );

    if (userError || !user?.email) {
      throw new Error('User email not found');
    }

    // Get alert configuration
    const { data: alertConfig } = await supabase
      .from('database_alert_config')
      .select('notification_channels')
      .eq('user_id', credential.user_id)
      .eq('alert_type', alert_type)
      .eq('enabled', true)
      .single();

    const channels = alertConfig?.notification_channels || ['email'];

    // Send email notification if enabled
    if (channels.includes('email')) {
      const emailSubject = `[${severity.toUpperCase()}] Database Alert: ${credential.connection_name}`;
      
      const emailBody = `
        <h2>Database Connection Alert</h2>
        <p><strong>Connection:</strong> ${credential.connection_name}</p>
        <p><strong>Alert Type:</strong> ${alert_type}</p>
        <p><strong>Severity:</strong> ${severity}</p>
        <p><strong>Message:</strong> ${message}</p>
        ${details ? `<pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
        <hr>
        <p><small>This is an automated alert from your Database Connection Manager.</small></p>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "Database Alerts <alerts@resend.dev>",
        to: [user.email],
        subject: emailSubject,
        html: emailBody,
      });

      if (emailError) {
        console.error('Email send error:', emailError);
      } else {
        console.log('Alert email sent to:', user.email);
      }
    }

    // Log the notification
    await supabase.from('database_audit_log').insert({
      user_id: credential.user_id,
      credential_id,
      action: 'alert_sent',
      status: 'success',
      details: {
        alert_type,
        severity,
        message,
        channels
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Alert notification sent',
        channels 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending alert notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
