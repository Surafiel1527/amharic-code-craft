import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PackageInfo {
  name: string;
  version: string;
  cdnUrl: string;
  importStatement: string;
  installMethod: 'cdn' | 'npm';
  estimatedSize: string;
}

interface InstallationResult {
  success: boolean;
  packages: PackageInfo[];
  totalPackages: number;
  installationTime: number;
  code: string;
  errors?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, dependencies, projectType = 'react' } = await req.json();

    if (!code && !dependencies) {
      throw new Error('Either code or dependencies must be provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const startTime = Date.now();
    const installedPackages: PackageInfo[] = [];
    const errors: string[] = [];

    // Detect dependencies from code if not provided
    let detectedDeps = dependencies || [];
    if (code && (!dependencies || dependencies.length === 0)) {
      detectedDeps = detectDependenciesFromCode(code);
    }

    // Install each package via CDN
    for (const dep of detectedDeps) {
      try {
        const pkgInfo = await installPackageViaCDN(dep, projectType);
        installedPackages.push(pkgInfo);
      } catch (error: any) {
        errors.push(`Failed to install ${dep}: ${error?.message || 'Unknown error'}`);
        console.error(`Package installation error for ${dep}:`, error);
      }
    }

    // Transform code to use CDN imports
    let transformedCode = code;
    if (code) {
      transformedCode = transformCodeWithCDNImports(code, installedPackages);
    }

    const installationTime = Date.now() - startTime;

    // Log to database
    if (user) {
      await supabaseClient.from('package_installations').insert({
        user_id: user.id,
        packages: installedPackages,
        installation_time_ms: installationTime,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : null,
      });
    }

    const result: InstallationResult = {
      success: errors.length === 0,
      packages: installedPackages,
      totalPackages: installedPackages.length,
      installationTime,
      code: transformedCode,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Intelligent package installer error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        packages: [],
        totalPackages: 0,
        installationTime: 0,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function detectDependenciesFromCode(code: string): string[] {
  const dependencies = new Set<string>();
  
  // Detect ES6 imports: import X from 'package'
  const importRegex = /import\s+(?:(?:\w+|\{[^}]+\})\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const packageName = match[1];
    if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
      // Extract base package name (remove subpaths)
      const baseName = packageName.split('/')[0];
      if (baseName.startsWith('@')) {
        // Scoped package
        dependencies.add(packageName.split('/').slice(0, 2).join('/'));
      } else {
        dependencies.add(baseName);
      }
    }
  }

  // Detect require statements: require('package')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(code)) !== null) {
    const packageName = match[1];
    if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
      const baseName = packageName.split('/')[0];
      if (baseName.startsWith('@')) {
        dependencies.add(packageName.split('/').slice(0, 2).join('/'));
      } else {
        dependencies.add(baseName);
      }
    }
  }

  return Array.from(dependencies);
}

async function installPackageViaCDN(
  packageName: string, 
  projectType: string
): Promise<PackageInfo> {
  // Use esm.sh for modern ESM packages (best for React/modern JS)
  const cdnUrl = `https://esm.sh/${packageName}`;
  
  // Try to fetch package info from CDN
  try {
    const response = await fetch(cdnUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}`);
    }

    const version = response.headers.get('x-esm-version') || 'latest';
    const contentLength = response.headers.get('content-length');
    const estimatedSize = contentLength 
      ? formatBytes(parseInt(contentLength))
      : 'unknown';

    const importStatement = `import ${toPascalCase(packageName)} from '${cdnUrl}';`;

    return {
      name: packageName,
      version,
      cdnUrl,
      importStatement,
      installMethod: 'cdn',
      estimatedSize,
    };
  } catch (error) {
    // Fallback to unpkg
    const unpkgUrl = `https://unpkg.com/${packageName}`;
    return {
      name: packageName,
      version: 'latest',
      cdnUrl: unpkgUrl,
      importStatement: `import ${toPascalCase(packageName)} from '${unpkgUrl}';`,
      installMethod: 'cdn',
      estimatedSize: 'unknown',
    };
  }
}

function transformCodeWithCDNImports(code: string, packages: PackageInfo[]): string {
  let transformedCode = code;

  // Replace npm import statements with CDN imports
  for (const pkg of packages) {
    const packageName = pkg.name;
    
    // Replace various import patterns
    const patterns = [
      // import X from 'package'
      new RegExp(`import\\s+(\\w+)\\s+from\\s+['"]${escapeRegex(packageName)}['"]`, 'g'),
      // import { X } from 'package'
      new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${escapeRegex(packageName)}['"]`, 'g'),
      // import * as X from 'package'
      new RegExp(`import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s+['"]${escapeRegex(packageName)}['"]`, 'g'),
    ];

    for (const pattern of patterns) {
      transformedCode = transformedCode.replace(pattern, (match) => {
        return match.replace(`'${packageName}'`, `'${pkg.cdnUrl}'`)
                    .replace(`"${packageName}"`, `"${pkg.cdnUrl}"`);
      });
    }
  }

  return transformedCode;
}

function toPascalCase(str: string): string {
  // Convert package-name to PackageName
  return str
    .split(/[-_/]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
