/**
 * Unified Dependency Analyzer - Phase 1 Consolidation
 * 
 * Replaces 3 separate functions:
 * - ai-dependency-resolver
 * - smart-dependency-detector
 * - ai-package-suggester
 * 
 * Features:
 * - Dependency tree analysis
 * - Missing dependency detection
 * - Version conflict resolution
 * - Package suggestions
 * - Security vulnerability scanning
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzerRequest {
  action: 'detect' | 'resolve' | 'suggest' | 'scan';
  imports?: string[];
  code?: string;
  packageJson?: any;
  projectId?: string;
  userId?: string;
  installedPackages?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const {
      action,
      imports,
      code,
      packageJson,
      projectId,
      userId,
      installedPackages
    }: AnalyzerRequest = await req.json();

    console.log(`[Dependency Analyzer] Action: ${action}`);

    switch (action) {
      case 'detect':
        return await detectMissing(supabase, {
          imports,
          code,
          installedPackages,
          projectId
        });

      case 'resolve':
        return await resolveConflicts(supabase, geminiApiKey, {
          packageJson,
          projectId
        });

      case 'suggest':
        return await suggestPackages(supabase, geminiApiKey, {
          code,
          projectId,
          userId
        });

      case 'scan':
        return await scanVulnerabilities(supabase, {
          installedPackages,
          projectId
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[Dependency Analyzer] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Detect missing dependencies from imports
 */
async function detectMissing(supabase: any, params: any) {
  const { imports, code, installedPackages = [], projectId } = params;

  console.log('[Analyzer] Detecting missing dependencies...');

  let detectedImports = imports || [];

  // If code provided, extract imports
  if (code && !imports) {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    const found = new Set<string>();
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1];
      if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        const pkgName = pkg.startsWith('@') 
          ? pkg.split('/').slice(0, 2).join('/') 
          : pkg.split('/')[0];
        found.add(pkgName);
      }
    }

    while ((match = requireRegex.exec(code)) !== null) {
      const pkg = match[1];
      if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        const pkgName = pkg.startsWith('@') 
          ? pkg.split('/').slice(0, 2).join('/') 
          : pkg.split('/')[0];
        found.add(pkgName);
      }
    }

    detectedImports = Array.from(found);
  }

  // Common built-in Node.js modules (not packages)
  const builtins = ['fs', 'path', 'http', 'https', 'url', 'util', 'crypto', 'stream', 'events'];
  
  // Filter out installed and built-in packages
  const missing = detectedImports.filter(pkg => 
    !installedPackages.includes(pkg) && !builtins.includes(pkg)
  );

  // Get package info from NPM
  const packagesInfo = await Promise.all(
    missing.map(async (pkg) => {
      try {
        const response = await fetch(`https://registry.npmjs.org/${pkg}`);
        if (response.ok) {
          const data = await response.json();
          return {
            name: pkg,
            version: data['dist-tags']?.latest || 'latest',
            description: data.description || '',
            detectedIn: code ? 'code' : 'imports',
            suggested: true
          };
        }
      } catch (error) {
        console.log(`Could not fetch info for ${pkg}`);
      }
      return {
        name: pkg,
        version: 'latest',
        description: '',
        detectedIn: code ? 'code' : 'imports',
        suggested: false
      };
    })
  );

  // Log detection
  if (projectId && missing.length > 0) {
    await supabase
      .from('package_install_logs')
      .insert(
        missing.map(pkg => ({
          project_id: projectId,
          package_name: pkg,
          action: 'detected',
          status: 'pending'
        }))
      );
  }

  return new Response(
    JSON.stringify({
      success: true,
      detected: detectedImports.length,
      missing: packagesInfo,
      installed: installedPackages.length
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Resolve version conflicts
 */
async function resolveConflicts(supabase: any, geminiApiKey: string, params: any) {
  const { packageJson, projectId } = params;

  console.log('[Analyzer] Resolving version conflicts...');

  if (!packageJson?.dependencies) {
    return new Response(
      JSON.stringify({
        success: true,
        conflicts: [],
        resolutions: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Use AI to analyze potential conflicts
  const analysisPrompt = `Analyze these package dependencies for version conflicts:

${JSON.stringify(packageJson.dependencies, null, 2)}

${packageJson.devDependencies ? `Dev Dependencies:\n${JSON.stringify(packageJson.devDependencies, null, 2)}` : ''}

Identify:
1. Version conflicts
2. Deprecated packages
3. Incompatible peer dependencies
4. Recommended versions

Return as JSON:
{
  "conflicts": [{"package": "...", "issue": "...", "current": "...", "recommended": "..."}],
  "warnings": ["..."],
  "suggestions": ["..."]
}`;

  const aiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: analysisPrompt }]
        }]
      })
    }
  );

  const aiData = await aiResponse.json();
  const analysisText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let analysis;
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { conflicts: [], warnings: [], suggestions: [] };
  } catch {
    analysis = { conflicts: [], warnings: [], suggestions: [] };
  }

  return new Response(
    JSON.stringify({
      success: true,
      conflicts: analysis.conflicts || [],
      warnings: analysis.warnings || [],
      suggestions: analysis.suggestions || []
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Suggest packages based on code analysis
 */
async function suggestPackages(supabase: any, geminiApiKey: string, params: any) {
  const { code, projectId, userId } = params;

  console.log('[Analyzer] Suggesting packages...');

  if (!code) {
    return new Response(
      JSON.stringify({
        success: true,
        suggestions: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Use AI to suggest helpful packages
  const suggestionPrompt = `Analyze this code and suggest useful npm packages:

\`\`\`
${code.substring(0, 2000)}
\`\`\`

Suggest packages that would:
1. Improve code quality
2. Add missing functionality
3. Replace custom implementations
4. Enhance developer experience

Return as JSON array:
[
  {
    "package": "package-name",
    "reason": "why it's useful",
    "priority": "high|medium|low",
    "category": "utility|ui|testing|etc"
  }
]`;

  const aiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: suggestionPrompt }]
        }]
      })
    }
  );

  const aiData = await aiResponse.json();
  const suggestionsText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  let suggestions;
  try {
    const jsonMatch = suggestionsText.match(/\[[\s\S]*\]/);
    suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    suggestions = [];
  }

  return new Response(
    JSON.stringify({
      success: true,
      suggestions: suggestions.slice(0, 10) // Limit to top 10
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Scan for security vulnerabilities
 */
async function scanVulnerabilities(supabase: any, params: any) {
  const { installedPackages = [], projectId } = params;

  console.log('[Analyzer] Scanning for vulnerabilities...');

  // Note: Full vulnerability scanning would require integration with npm audit API
  // This is a simplified version
  const vulnerabilities: any[] = [];

  // Check each package (in production, use npm audit or Snyk API)
  for (const pkg of installedPackages.slice(0, 20)) { // Limit for performance
    try {
      const response = await fetch(`https://registry.npmjs.org/${pkg}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if package is deprecated
        if (data.deprecated) {
          vulnerabilities.push({
            package: pkg,
            severity: 'warning',
            issue: 'deprecated',
            message: data.deprecated,
            recommendation: 'Consider migrating to an alternative package'
          });
        }
      }
    } catch (error) {
      console.log(`Could not check ${pkg}`);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      scanned: Math.min(installedPackages.length, 20),
      vulnerabilities,
      total: installedPackages.length
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}