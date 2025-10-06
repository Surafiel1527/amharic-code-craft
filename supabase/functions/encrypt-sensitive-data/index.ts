import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, operation } = await req.json();

    if (operation === 'encrypt') {
      // Simple XOR encryption (for demo - use proper encryption in production)
      const key = Deno.env.get('ENCRYPTION_KEY') || 'default-key-please-change';
      const encrypted = btoa(
        String.fromCharCode(...Array.from(
          new TextEncoder().encode(data)
        ).map((byte, i) => byte ^ key.charCodeAt(i % key.length)))
      );

      // Audit log
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'data_encrypted',
          resource_type: 'sensitive_data',
          severity: 'info'
        });

      return new Response(
        JSON.stringify({ encrypted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operation === 'decrypt') {
      const key = Deno.env.get('ENCRYPTION_KEY') || 'default-key-please-change';
      const decrypted = new TextDecoder().decode(
        new Uint8Array(
          atob(data).split('').map((char, i) => 
            char.charCodeAt(0) ^ key.charCodeAt(i % key.length)
          )
        )
      );

      // Audit log
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'data_decrypted',
          resource_type: 'sensitive_data',
          severity: 'info'
        });

      return new Response(
        JSON.stringify({ decrypted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Encryption error:', error);
    return new Response(
      JSON.stringify({ error: 'Encryption operation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
