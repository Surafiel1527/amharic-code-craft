import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📋 Fetching security audit logs');

    // Mock audit logs - in production, query from audit table
    const logs = [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: 'Credential Added',
        resource: 'Production Database',
        status: 'success',
        details: 'New PostgreSQL connection credentials saved'
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        action: 'Connection Test',
        resource: 'Development Database',
        status: 'success',
        details: 'Health check passed - Response time: 45ms'
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        action: 'Sensitive Data Detected',
        resource: 'Chat Interface',
        status: 'warning',
        details: 'API key detected in user message - Warning displayed'
      },
      {
        id: 'log-4',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        action: 'Connection Test',
        resource: 'Staging Database',
        status: 'failure',
        details: 'Connection timeout - Database unreachable'
      },
      {
        id: 'log-5',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        action: 'Credential Deleted',
        resource: 'Old Test Database',
        status: 'success',
        details: 'Credentials and associated secrets removed'
      }
    ];

    return new Response(
      JSON.stringify({ logs }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
