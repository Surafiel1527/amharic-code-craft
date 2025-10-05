import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common built-in Node.js modules that don't need installation
const BUILTIN_MODULES = new Set([
  'fs', 'path', 'http', 'https', 'url', 'crypto', 'stream', 'util', 'events',
  'buffer', 'querystring', 'net', 'os', 'child_process', 'zlib', 'assert',
  'cluster', 'dgram', 'dns', 'domain', 'readline', 'repl', 'tls', 'tty',
  'vm', 'worker_threads'
]);

// Packages that are commonly installed in standard projects
const STANDARD_PACKAGES = new Set([
  'react', 'react-dom', 'typescript', 'vite', 'tailwindcss',
  '@types/react', '@types/react-dom', '@types/node'
]);

interface DetectRequest {
  imports: string[];
  code?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imports, code }: DetectRequest = await req.json();

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

    console.log(`🔍 Detecting dependencies for user ${user.id}, imports: ${imports.join(', ')}`);

    // Filter out built-in modules and standard packages
    const externalPackages = imports.filter(pkg => 
      !BUILTIN_MODULES.has(pkg) && !STANDARD_PACKAGES.has(pkg)
    );

    if (externalPackages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          missing: [],
          message: 'All packages are built-in or already installed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which packages are actually missing
    // In a real implementation, this would check package.json or node_modules
    // For now, we'll assume all external packages are missing (demo mode)
    const missing = externalPackages.map(pkg => ({
      name: pkg,
      detectedIn: 'import statement',
      suggested: true,
      version: 'latest'
    }));

    console.log(`✅ Found ${missing.length} missing packages: ${missing.map(p => p.name).join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        missing,
        total: imports.length,
        external: externalPackages.length,
        builtin: imports.length - externalPackages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Dependency detection error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
