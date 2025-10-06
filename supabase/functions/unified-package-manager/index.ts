import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PackageOperation {
  operation: 'install' | 'uninstall' | 'search' | 'analyze' | 'audit' | 'suggest' | 'auto_detect' | 'generate_package_json';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Package Manager request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: PackageOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'install':
        result = await handleInstall(payload.params, supabase, requestId);
        break;
      case 'uninstall':
        result = await handleUninstall(payload.params, supabase, requestId);
        break;
      case 'search':
        result = await handleSearch(payload.params, requestId);
        break;
      case 'analyze':
        result = await handleAnalyze(payload.params, supabase, requestId);
        break;
      case 'audit':
        result = await handleAudit(payload.params, supabase, requestId);
        break;
      case 'suggest':
        result = await handleSuggest(payload.params, supabase, requestId);
        break;
      case 'auto_detect':
        result = await handleAutoDetect(payload.params, supabase, requestId);
        break;
      case 'generate_package_json':
        result = await handleGeneratePackageJson(payload.params, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleInstall(params: any, supabase: any, requestId: string) {
  const { packageName, version, userId, projectId, autoDetected = false } = params;
  
  if (!packageName || !userId) {
    throw new Error('packageName and userId are required');
  }

  console.log(`[${requestId}] Installing package: ${packageName}@${version || 'latest'}`);

  const npmResponse = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!npmResponse.ok) {
    throw new Error(`Package not found: ${packageName}`);
  }

  const packageData = await npmResponse.json();
  const targetVersion = version || packageData['dist-tags'].latest;

  const { data: installed, error: installError } = await supabase
    .from('installed_packages')
    .upsert({
      user_id: userId,
      project_id: projectId,
      package_name: packageName,
      version: targetVersion,
      auto_detected: autoDetected,
      metadata: {
        description: packageData.description,
        homepage: packageData.homepage,
        repository: packageData.repository,
        license: packageData.license,
      }
    }, {
      onConflict: 'user_id,package_name',
    })
    .select()
    .single();

  if (installError) throw installError;

  await supabase.from('package_install_logs').insert({
    user_id: userId,
    package_name: packageName,
    version: targetVersion,
    action: 'install',
    success: true,
    metadata: { auto_detected: autoDetected }
  });

  console.log(`[${requestId}] Package installed: ${packageName}@${targetVersion}`);
  return { installed, version: targetVersion };
}

async function handleUninstall(params: any, supabase: any, requestId: string) {
  const { packageName, userId } = params;
  
  if (!packageName || !userId) {
    throw new Error('packageName and userId are required');
  }

  console.log(`[${requestId}] Uninstalling package: ${packageName}`);

  const { error: deleteError } = await supabase
    .from('installed_packages')
    .delete()
    .eq('user_id', userId)
    .eq('package_name', packageName);

  if (deleteError) throw deleteError;

  await supabase.from('package_install_logs').insert({
    user_id: userId,
    package_name: packageName,
    action: 'uninstall',
    success: true
  });

  console.log(`[${requestId}] Package uninstalled`);
  return { success: true };
}

async function handleSearch(params: any, requestId: string) {
  const { query, limit = 20 } = params;
  
  if (!query) {
    throw new Error('query is required');
  }

  console.log(`[${requestId}] Searching: ${query}`);

  const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to search npm registry');
  }

  const data = await response.json();
  const results = data.objects.map((obj: any) => ({
    name: obj.package.name,
    version: obj.package.version,
    description: obj.package.description,
    keywords: obj.package.keywords || [],
    score: obj.score.final,
  }));

  console.log(`[${requestId}] Found ${results.length} packages`);
  return { results };
}

async function handleAnalyze(params: any, supabase: any, requestId: string) {
  const { packageName } = params;
  
  if (!packageName) {
    throw new Error('packageName is required');
  }

  console.log(`[${requestId}] Analyzing: ${packageName}`);

  const npmResponse = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!npmResponse.ok) {
    throw new Error(`Package not found: ${packageName}`);
  }

  const packageData = await npmResponse.json();
  const latestVersion = packageData['dist-tags'].latest;
  const versionData = packageData.versions[latestVersion];

  return {
    name: packageName,
    version: latestVersion,
    description: packageData.description,
    license: packageData.license,
    dependencies: versionData.dependencies || {},
    lastPublished: packageData.time[latestVersion],
  };
}

async function handleAudit(params: any, supabase: any, requestId: string) {
  const { userId, projectId } = params;
  
  if (!userId) {
    throw new Error('userId is required');
  }

  console.log(`[${requestId}] Auditing packages`);

  const { data: packages, error } = await supabase
    .from('installed_packages')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) throw error;

  const outdated: any[] = [];

  for (const pkg of packages || []) {
    try {
      const npmResponse = await fetch(`https://registry.npmjs.org/${pkg.package_name}`);
      if (npmResponse.ok) {
        const packageData = await npmResponse.json();
        const latestVersion = packageData['dist-tags'].latest;
        
        if (latestVersion !== pkg.version) {
          outdated.push({
            name: pkg.package_name,
            current: pkg.version,
            latest: latestVersion
          });
        }
      }
    } catch (err) {
      console.error(`[${requestId}] Error checking ${pkg.package_name}:`, err);
    }
  }

  console.log(`[${requestId}] Audit complete: ${outdated.length} outdated`);
  return { outdated, totalPackages: packages?.length || 0 };
}

async function handleSuggest(params: any, supabase: any, requestId: string) {
  const { useCase, userId, projectId } = params;
  
  if (!useCase || !userId) {
    throw new Error('useCase and userId are required');
  }

  console.log(`[${requestId}] Suggesting packages for: ${useCase}`);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const prompt = `Suggest 3-5 npm packages for: "${useCase}". Return JSON array with: name, reason, popularity_score, security_score, maintenance_score, overall_score (0-100 each).`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!aiResponse.ok) {
    throw new Error('Failed to get AI suggestions');
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices[0].message.content;
  const suggestions = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  for (const suggestion of suggestions) {
    await supabase.from('ai_package_suggestions').insert({
      user_id: userId,
      project_id: projectId,
      use_case: useCase,
      suggested_package: suggestion.name,
      reason: suggestion.reason,
      popularity_score: suggestion.popularity_score,
      security_score: suggestion.security_score,
      maintenance_score: suggestion.maintenance_score,
      overall_score: suggestion.overall_score,
    });
  }

  console.log(`[${requestId}] Generated ${suggestions.length} suggestions`);
  return { suggestions };
}

async function handleAutoDetect(params: any, supabase: any, requestId: string) {
  const { code, userId } = params;
  
  if (!code || !userId) {
    throw new Error('code and userId are required');
  }

  console.log(`[${requestId}] Auto-detecting dependencies`);

  const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
  const imports = new Set<string>();
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && 
        !['fs', 'path', 'http', 'https', 'crypto', 'os', 'stream', 'util', 'events'].includes(importPath)) {
      const packageName = importPath.startsWith('@') 
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];
      imports.add(packageName);
    }
  }

  const detected = Array.from(imports);
  console.log(`[${requestId}] Detected ${detected.length} dependencies`);

  return { detected, count: detected.length };
}

async function handleGeneratePackageJson(params: any, supabase: any, requestId: string) {
  const { userId, projectId, projectName = 'my-project' } = params;
  
  if (!userId) {
    throw new Error('userId is required');
  }

  console.log(`[${requestId}] Generating package.json`);

  const { data: packages, error } = await supabase
    .from('installed_packages')
    .select('package_name, version')
    .eq('user_id', userId)
    .eq('project_id', projectId || null);

  if (error) throw error;

  const dependencies: Record<string, string> = {};
  packages?.forEach((pkg: any) => {
    dependencies[pkg.package_name] = `^${pkg.version}`;
  });

  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies,
  };

  console.log(`[${requestId}] Generated package.json with ${Object.keys(dependencies).length} dependencies`);
  return { packageJson, dependenciesCount: Object.keys(dependencies).length };
}
