import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Documentation sources for different providers
const DOC_SOURCES = {
  vercel: {
    errorReference: 'https://vercel.com/docs/errors',
    deploymentGuide: 'https://vercel.com/docs/deployments/overview',
    troubleshooting: 'https://vercel.com/docs/deployments/troubleshoot-a-build'
  },
  firebase: {
    errorCodes: 'https://firebase.google.com/docs/reference/js/error-codes',
    deploymentGuide: 'https://firebase.google.com/docs/hosting/quickstart',
    troubleshooting: 'https://firebase.google.com/docs/hosting/troubleshooting'
  },
  npm: {
    errorCodes: 'https://docs.npmjs.com/cli/v10/using-npm/errors',
    packageGuide: 'https://docs.npmjs.com/cli/v10/commands/npm-install'
  },
  vite: {
    troubleshooting: 'https://vitejs.dev/guide/troubleshooting',
    configGuide: 'https://vitejs.dev/config/'
  },
  react: {
    errorDecoder: 'https://react.dev/errors',
    troubleshooting: 'https://react.dev/learn/troubleshooting'
  }
};

async function fetchDocumentation(provider: string, errorCode?: string): Promise<any> {
  console.log(`📚 Fetching documentation for ${provider}${errorCode ? ` (error: ${errorCode})` : ''}`);
  
  const sources = DOC_SOURCES[provider as keyof typeof DOC_SOURCES];
  if (!sources) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // For now, return structured documentation info
  // In a full implementation, you'd actually fetch and parse the docs
  return {
    provider,
    errorCode,
    sources,
    summary: `Documentation for ${provider} errors and troubleshooting`,
    fetchedAt: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, errorCode, docType } = await req.json();

    if (!provider) {
      throw new Error('Provider is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check cache first
    const cacheKey = `${provider}-${docType || 'general'}-${errorCode || 'all'}`;
    const { data: cached } = await supabaseClient
      .from('documentation_cache')
      .select('*')
      .eq('provider', provider)
      .eq('doc_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log('✅ Cache hit for documentation');
      
      // Update access stats
      await supabaseClient
        .from('documentation_cache')
        .update({
          access_count: cached.access_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', cached.id);

      return new Response(
        JSON.stringify({
          success: true,
          documentation: cached.content,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh documentation
    const documentation = await fetchDocumentation(provider, errorCode);

    // Store in cache
    await supabaseClient
      .from('documentation_cache')
      .upsert({
        provider,
        doc_type: docType || 'general',
        doc_key: cacheKey,
        content: documentation,
        raw_content: JSON.stringify(documentation),
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }, {
        onConflict: 'provider,doc_type,doc_key'
      });

    return new Response(
      JSON.stringify({
        success: true,
        documentation,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching documentation:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
