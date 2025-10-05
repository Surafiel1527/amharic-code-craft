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
    // Mock data - in production, this would query stored credentials
    const credentials = [
      {
        id: 'cred-1',
        name: 'Production Database',
        type: 'postgresql',
        host: 'prod-db.example.com',
        port: 5432,
        database: 'app_production',
        username: 'prod_user',
        status: 'active',
        lastChecked: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'cred-2',
        name: 'Development Database',
        type: 'mysql',
        host: 'dev-db.example.com',
        port: 3306,
        database: 'app_development',
        username: 'dev_user',
        status: 'active',
        lastChecked: new Date(Date.now() - 7200000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
      }
    ];

    console.log(`📋 Listing ${credentials.length} stored database credentials`);

    return new Response(
      JSON.stringify({ credentials }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error listing database credentials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
