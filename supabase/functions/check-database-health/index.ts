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
    const { credentialId } = await req.json();

    console.log(`🔍 Checking health for credential: ${credentialId}`);

    // Simulate health check delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock health check result - in production, would actually test connection
    const isHealthy = Math.random() > 0.2; // 80% success rate for demo

    if (isHealthy) {
      return new Response(
        JSON.stringify({
          success: true,
          credential: {
            id: credentialId,
            name: 'Database Connection',
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 20,
            checkedAt: new Date().toISOString()
          }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Connection timeout - unable to reach database server'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Health check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
