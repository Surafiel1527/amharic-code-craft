import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  projectId?: string;
  projectName?: string;
  includeDevDependencies?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, projectName = 'my-project', includeDevDependencies = true }: GenerateRequest = await req.json();

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

    console.log(`📝 Generating package.json for user ${user.id}, project: ${projectName}`);

    // Get installed packages
    let query = supabaseClient
      .from('installed_packages')
      .select('*')
      .eq('user_id', user.id);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: packages, error: packagesError } = await query;

    if (packagesError) {
      throw packagesError;
    }

    // Build dependencies object
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};

    for (const pkg of packages || []) {
      const isDevDep = pkg.package_name.includes('@types/') || 
                       pkg.package_name.includes('eslint') ||
                       pkg.package_name === 'typescript' ||
                       pkg.package_name === 'vite';

      if (isDevDep && includeDevDependencies) {
        devDependencies[pkg.package_name] = `^${pkg.version}`;
      } else {
        dependencies[pkg.package_name] = `^${pkg.version}`;
      }
    }

    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
      },
      dependencies: Object.keys(dependencies).length > 0 ? dependencies : {
        'react': '^18.3.1',
        'react-dom': '^18.3.1'
      },
      devDependencies: includeDevDependencies ? (Object.keys(devDependencies).length > 0 ? devDependencies : {
        '@types/react': '^18.3.0',
        '@types/react-dom': '^18.3.0',
        '@vitejs/plugin-react': '^4.3.0',
        'typescript': '^5.3.3',
        'vite': '^5.0.0'
      }) : {}
    };

    console.log(`✅ Generated package.json with ${Object.keys(dependencies).length} dependencies`);

    return new Response(
      JSON.stringify({
        success: true,
        packageJson,
        totalDependencies: Object.keys(dependencies).length,
        totalDevDependencies: Object.keys(devDependencies).length,
        downloadCommand: `npm install`,
        yarnCommand: `yarn install`,
        pnpmCommand: `pnpm install`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Generate package.json error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
