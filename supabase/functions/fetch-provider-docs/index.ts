import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROVIDER_DOCS = {
  postgresql: {
    officialDocs: 'https://www.postgresql.org/docs/current/runtime-config-connection.html',
    connectionGuide: 'https://www.postgresql.org/docs/current/libpq-connect.html',
    commonIssues: [
      { issue: 'Connection refused', solution: 'Check if PostgreSQL is running and firewall allows connections on port 5432' },
      { issue: 'Authentication failed', solution: 'Verify username/password and check pg_hba.conf for access rules' },
      { issue: 'SSL error', solution: 'Enable SSL in postgresql.conf or disable SSL requirement in connection string' }
    ],
    defaultPort: 5432,
    requiredParams: ['host', 'port', 'database', 'username', 'password']
  },
  mysql: {
    officialDocs: 'https://dev.mysql.com/doc/refman/8.0/en/connecting.html',
    connectionGuide: 'https://dev.mysql.com/doc/refman/8.0/en/connection-options.html',
    commonIssues: [
      { issue: 'Access denied', solution: 'Grant proper permissions: GRANT ALL PRIVILEGES ON database.* TO user@host' },
      { issue: 'Too many connections', solution: 'Increase max_connections in my.cnf or use connection pooling' },
      { issue: 'SSL error', solution: 'Configure SSL certificates or use ssl-mode=DISABLED for development' }
    ],
    defaultPort: 3306,
    requiredParams: ['host', 'port', 'database', 'username', 'password']
  },
  mongodb: {
    officialDocs: 'https://www.mongodb.com/docs/manual/reference/connection-string/',
    connectionGuide: 'https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/',
    commonIssues: [
      { issue: 'Authentication failed', solution: 'Use correct authSource: mongodb://user:pass@host/db?authSource=admin' },
      { issue: 'Network timeout', solution: 'Check firewall rules, increase connectTimeoutMS, or use MongoDB Atlas' },
      { issue: 'DNS issues', solution: 'Use mongodb+srv:// for SRV records or specify hosts directly' }
    ],
    defaultPort: 27017,
    requiredParams: ['connectionString']
  },
  firebase: {
    officialDocs: 'https://firebase.google.com/docs/admin/setup',
    connectionGuide: 'https://firebase.google.com/docs/reference/admin/node/firebase-admin',
    commonIssues: [
      { issue: 'Permission denied', solution: 'Check Firebase Security Rules and ensure service account has proper permissions' },
      { issue: 'Invalid credentials', solution: 'Download new service account key from Firebase Console' },
      { issue: 'API not enabled', solution: 'Enable required APIs in Google Cloud Console for your project' }
    ],
    requiredParams: ['projectId', 'apiKey', 'serviceAccount']
  },
  supabase: {
    officialDocs: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
    connectionGuide: 'https://supabase.com/docs/guides/api',
    commonIssues: [
      { issue: 'Invalid API key', solution: 'Use anon key for client-side, service_role key for server-side operations' },
      { issue: 'RLS blocking access', solution: 'Check Row Level Security policies or use service_role key to bypass' },
      { issue: 'Connection pool exhausted', solution: 'Enable connection pooling or use Supabase Pooler' }
    ],
    defaultPort: 5432,
    requiredParams: ['projectUrl', 'anonKey']
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider } = await req.json();

    console.log(`📚 Fetching documentation for ${provider}...`);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cachedDocs } = await supabase
      .from('database_provider_docs')
      .select('*')
      .eq('provider', provider)
      .gt('cache_expires_at', new Date().toISOString())
      .single();

    if (cachedDocs) {
      console.log('✅ Returning cached documentation');
      return new Response(
        JSON.stringify({
          success: true,
          documentation: cachedDocs.documentation,
          cached: true
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get static documentation
    const docs = PROVIDER_DOCS[provider as keyof typeof PROVIDER_DOCS];
    
    if (!docs) {
      return new Response(
        JSON.stringify({ error: 'Provider not supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to enhance documentation with latest info
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'user', 
            content: `Provide the latest connection requirements and common troubleshooting tips for ${provider} database. Include any recent version-specific changes. Keep it concise and actionable.` 
          }
        ],
      }),
    });

    let aiEnhancements = '';
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      aiEnhancements = aiData.choices[0].message.content;
    }

    const enhancedDocs = {
      ...docs,
      aiEnhancements,
      lastUpdated: new Date().toISOString()
    };

    // Cache the documentation
    await supabase
      .from('database_provider_docs')
      .upsert({
        provider,
        documentation: enhancedDocs,
        fetched_at: new Date().toISOString(),
        cache_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('✅ Documentation fetched and cached');

    return new Response(
      JSON.stringify({
        success: true,
        documentation: enhancedDocs,
        cached: false
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error fetching documentation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch documentation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
