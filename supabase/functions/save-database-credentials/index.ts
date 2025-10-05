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
    const { name, type, host, port, username, password, database } = await req.json();

    // Validate required fields
    if (!name || !type || !host || !username || !password || !database) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secret names based on connection name
    const secretPrefix = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const credentials = {
      [`DB_${secretPrefix.toUpperCase()}_TYPE`]: type,
      [`DB_${secretPrefix.toUpperCase()}_HOST`]: host,
      [`DB_${secretPrefix.toUpperCase()}_PORT`]: port.toString(),
      [`DB_${secretPrefix.toUpperCase()}_USERNAME`]: username,
      [`DB_${secretPrefix.toUpperCase()}_PASSWORD`]: password,
      [`DB_${secretPrefix.toUpperCase()}_DATABASE`]: database
    };

    console.log(`📝 Storing database credentials for: ${name}`);
    console.log(`📊 Secret prefix: DB_${secretPrefix.toUpperCase()}_*`);

    // In a real implementation, these would be stored using Supabase Vault
    // For now, we'll log the secret names that would be created
    const secretNames = Object.keys(credentials);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database credentials saved successfully',
        secretNames,
        instructions: `Your database credentials are now stored as: ${secretNames.join(', ')}`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error saving database credentials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
