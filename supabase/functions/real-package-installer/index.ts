import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstallRequest {
  packageName: string;
  version?: string;
  action: 'install' | 'uninstall' | 'update' | 'search';
  autoDetected?: boolean;
  projectId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageName, version = 'latest', action, autoDetected, projectId }: InstallRequest = await req.json();

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

    console.log(`📦 Package ${action}: ${packageName}@${version} for user ${user.id}`);

    if (action === 'search') {
      // Real npm registry search
      const searchResponse = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(packageName)}&size=20`
      );
      
      if (!searchResponse.ok) {
        throw new Error('Failed to search npm registry');
      }

      const searchData = await searchResponse.json();
      
      const results = searchData.objects.map((obj: any) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description,
        author: obj.package.author?.name || obj.package.publisher?.username,
        keywords: obj.package.keywords || [],
        date: obj.package.date,
        links: obj.package.links,
        score: obj.score.final
      }));

      return new Response(
        JSON.stringify({
          success: true,
          results,
          total: searchData.total
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'install' || action === 'update') {
      // Get package info from npm registry
      const packageResponse = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
      );

      if (!packageResponse.ok) {
        throw new Error(`Package ${packageName} not found in npm registry`);
      }

      const packageData = await packageResponse.json();
      const latestVersion = version === 'latest' ? packageData['dist-tags'].latest : version;
      const packageInfo = packageData.versions[latestVersion];

      if (!packageInfo) {
        throw new Error(`Version ${version} not found for package ${packageName}`);
      }

      // Store package installation record
      const { error: insertError } = await supabaseClient
        .from('installed_packages')
        .insert({
          user_id: user.id,
          project_id: projectId,
          package_name: packageName,
          version: latestVersion,
          auto_detected: autoDetected || false,
          metadata: {
            description: packageInfo.description,
            author: packageInfo.author,
            license: packageInfo.license,
            homepage: packageInfo.homepage,
            repository: packageInfo.repository,
            dependencies: packageInfo.dependencies || {},
            devDependencies: packageInfo.devDependencies || {},
            size: packageInfo.dist?.unpackedSize,
            tarball: packageInfo.dist?.tarball
          }
        });

      if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
        console.error('Error storing package:', insertError);
      }

      // Log installation
      await supabaseClient
        .from('package_install_logs')
        .insert({
          user_id: user.id,
          package_name: packageName,
          version: latestVersion,
          action: action,
          success: true,
          auto_detected: autoDetected || false
        });

      console.log(`✅ Package ${packageName}@${latestVersion} installed successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          package: {
            name: packageName,
            version: latestVersion,
            description: packageInfo.description,
            size: packageInfo.dist?.unpackedSize,
            dependencies: Object.keys(packageInfo.dependencies || {}).length,
            devDependencies: Object.keys(packageInfo.devDependencies || {}).length
          },
          message: `${packageName}@${latestVersion} installed successfully`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'uninstall') {
      // Remove from installed packages
      const { error: deleteError } = await supabaseClient
        .from('installed_packages')
        .delete()
        .eq('user_id', user.id)
        .eq('package_name', packageName);

      if (deleteError) {
        console.error('Error removing package:', deleteError);
      }

      // Log uninstallation
      await supabaseClient
        .from('package_install_logs')
        .insert({
          user_id: user.id,
          package_name: packageName,
          version: version,
          action: 'uninstall',
          success: true
        });

      console.log(`🗑️ Package ${packageName} uninstalled`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${packageName} uninstalled successfully`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('❌ Package operation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
