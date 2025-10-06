import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    
    // Simple health check that echoes back data
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Platform edge functions are operational',
      echo: data || 'No data provided',
      environment: 'production',
      deno_version: Deno.version.deno,
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});