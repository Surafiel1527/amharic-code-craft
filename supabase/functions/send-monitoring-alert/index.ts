import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { alert_type, severity, title, message, metadata }: AlertRequest = await req.json();

    console.log(`Sending alert: ${title} (${severity})`);

    // Call database function to create alert
    const { data: alertId, error: alertError } = await supabase.rpc('send_alert', {
      p_alert_type: alert_type,
      p_severity: severity,
      p_title: title,
      p_message: message,
      p_metadata: metadata || {}
    });

    if (alertError) {
      throw alertError;
    }

    // Get admin emails
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const adminEmails = users.users
        .filter(u => admins.some(a => a.user_id === u.id))
        .map(u => u.email)
        .filter(Boolean);

      // Send email notification via Resend if configured
      if (resendApiKey && adminEmails.length > 0 && severity in ['error', 'critical']) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'alerts@yourdomain.com',
              to: adminEmails,
              subject: `[${severity.toUpperCase()}] ${title}`,
              html: `
                <h2>${title}</h2>
                <p><strong>Severity:</strong> ${severity}</p>
                <p><strong>Type:</strong> ${alert_type}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <hr>
                <p><small>Timestamp: ${new Date().toISOString()}</small></p>
                ${metadata ? `<pre>${JSON.stringify(metadata, null, 2)}</pre>` : ''}
              `
            })
          });

          if (!emailResponse.ok) {
            console.error('Failed to send email:', await emailResponse.text());
          } else {
            console.log(`Email sent to ${adminEmails.length} admin(s)`);
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }
      }
    }

    // Record system metric
    await supabase.rpc('record_system_metric', {
      p_metric_type: 'alert_sent',
      p_metric_value: 1,
      p_metadata: {
        alert_id: alertId,
        severity,
        alert_type
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        alert_id: alertId,
        message: 'Alert sent successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Alert sending error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
