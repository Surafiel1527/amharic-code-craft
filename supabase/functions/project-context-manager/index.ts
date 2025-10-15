/**
 * Project Context Manager - Intelligent Workspace Awareness 🧠
 * 
 * Provides dynamic, intelligent project context loading:
 * - Smart file filtering based on request type
 * - Caching for performance
 * - Relevance scoring
 * - Dependency graph analysis
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { UnifiedCodebaseAnalyzer } from '../_shared/unifiedCodebaseAnalyzer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectContext {
  files: Record<string, string>;
  metadata: {
    totalFiles: number;
    filteredFiles: number;
    relevanceScores: Record<string, number>;
    dependencies: string[];
    framework: string;
  };
  cached: boolean;
  loadTime: number;
}

/**
 * Intelligent file filtering based on route type and request content
 */
function filterRelevantFiles(
  allFiles: Record<string, string>,
  route: string,
  request: string
): { files: Record<string, string>; scores: Record<string, number> } {
  const lowerRequest = request.toLowerCase();
  const relevantFiles: Record<string, string> = {};
  const scores: Record<string, number> = {};

  // Extract mentioned components/files from request
  const mentionedPaths = extractMentionedPaths(request);
  
  for (const [path, content] of Object.entries(allFiles)) {
    let score = 0;

    // Route-based filtering
    switch (route) {
      case 'DIRECT_EDIT':
        // For direct edits, only load files mentioned in request
        if (mentionedPaths.some(p => path.includes(p))) {
          score = 100;
        } else if (path.includes('component') || path.includes('page')) {
          score = 20; // Low score for context
        }
        break;

      case 'FEATURE_BUILD':
        // Load relevant architecture files
        if (path.includes('src/')) score += 50;
        if (path.includes('component')) score += 30;
        if (path.includes('hook')) score += 25;
        if (path.includes('util')) score += 20;
        if (path.includes('integration')) score += 40;
        if (path.includes('type')) score += 15;
        break;

      case 'META_CHAT':
        // Minimal context for questions
        if (path.includes('package.json')) score = 80;
        if (path.includes('README')) score = 60;
        if (path.includes('index.css')) score = 40;
        break;

      case 'REFACTOR':
        // Load files in scope of refactoring
        if (mentionedPaths.some(p => path.includes(p))) {
          score = 90;
        } else if (path.includes('src/')) {
          score = 40;
        }
        break;
    }

    // Boost score if file name is mentioned
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    if (lowerRequest.includes(fileName.replace(/\.(tsx?|jsx?)$/, ''))) {
      score += 50;
    }

    // Boost score for keywords in request
    if (lowerRequest.includes('auth') && path.includes('auth')) score += 40;
    if (lowerRequest.includes('database') && path.includes('supabase')) score += 40;
    if (lowerRequest.includes('style') && (path.includes('.css') || path.includes('tailwind'))) score += 40;
    if (lowerRequest.includes('component') && path.includes('component')) score += 30;
    if (lowerRequest.includes('api') && path.includes('integration')) score += 35;

    // Always include critical files
    if (path === 'package.json') score = Math.max(score, 70);
    if (path === 'src/main.tsx' || path === 'src/App.tsx') score = Math.max(score, 60);
    if (path === 'src/index.css' || path === 'tailwind.config.ts') score = Math.max(score, 50);

    // Add file if score is high enough
    if (score > 0) {
      relevantFiles[path] = content;
      scores[path] = score;
    }
  }

  // Sort and limit files based on route
  const maxFiles = route === 'META_CHAT' ? 5 : route === 'DIRECT_EDIT' ? 10 : 50;
  const sortedPaths = Object.keys(scores)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, maxFiles);

  const filteredFiles: Record<string, string> = {};
  const filteredScores: Record<string, number> = {};
  
  for (const path of sortedPaths) {
    filteredFiles[path] = relevantFiles[path];
    filteredScores[path] = scores[path];
  }

  return { files: filteredFiles, scores: filteredScores };
}

/**
 * Extract file paths mentioned in the request
 */
function extractMentionedPaths(request: string): string[] {
  const paths: string[] = [];
  
  // Match common file patterns
  const filePatterns = [
    /src\/[\w\/\-\.]+\.(tsx?|jsx?|css)/gi,
    /[\w\-]+\.(tsx?|jsx?|css)/gi,
    /[\w\-]+(?=\s+component|file|page)/gi
  ];

  for (const pattern of filePatterns) {
    const matches = request.match(pattern);
    if (matches) {
      paths.push(...matches);
    }
  }

  return paths;
}

/**
 * Extract dependencies from package.json
 */
function extractDependencies(files: Record<string, string>): string[] {
  const packageJson = files['package.json'];
  if (!packageJson) return [];

  try {
    const pkg = JSON.parse(packageJson);
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];
  } catch {
    return [];
  }
}

/**
 * Detect framework from files
 */
function detectFramework(files: Record<string, string>): string {
  const packageJson = files['package.json'];
  if (!packageJson) return 'react';

  try {
    const pkg = JSON.parse(packageJson);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps['next']) return 'next';
    if (deps['vue']) return 'vue';
    if (deps['@angular/core']) return 'angular';
    if (deps['react']) return 'react';
    
    return 'react';
  } catch {
    return 'react';
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { projectId, route, request, userId } = await req.json();

    console.log('🧠 [CONTEXT MANAGER] Loading project context:', {
      projectId,
      route,
      requestPreview: request.substring(0, 80) + '...'
    });

    if (!projectId) {
      return new Response(JSON.stringify({
        success: true,
        context: {
          files: {},
          metadata: {
            totalFiles: 0,
            filteredFiles: 0,
            relevanceScores: {},
            dependencies: [],
            framework: 'react'
          },
          cached: false,
          loadTime: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check cache first
    const cacheKey = `${projectId}:${route}:${request.substring(0, 100)}`;
    const { data: cachedContext } = await supabase
      .from('context_cache')
      .select('context_data, created_at')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedContext) {
      console.log('⚡ [CACHE HIT] Returning cached context');
      
      return new Response(JSON.stringify({
        success: true,
        context: {
          ...cachedContext.context_data,
          cached: true,
          loadTime: Date.now() - startTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📂 [LOADING] Fetching project files from database...');

    // Load all project files using VirtualFileSystem approach
    const { data: projectFiles } = await supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', projectId);

    if (!projectFiles || projectFiles.length === 0) {
      console.log('⚠️ [WARNING] No files found for project');
      return new Response(JSON.stringify({
        success: true,
        context: {
          files: {},
          metadata: {
            totalFiles: 0,
            filteredFiles: 0,
            relevanceScores: {},
            dependencies: [],
            framework: 'react'
          },
          cached: false,
          loadTime: Date.now() - startTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert to Record<path, content>
    const allFiles: Record<string, string> = {};
    for (const file of projectFiles) {
      allFiles[file.path] = file.content;
    }

    console.log(`📊 [LOADED] ${Object.keys(allFiles).length} total files`);

    // Intelligent filtering
    const { files: relevantFiles, scores } = filterRelevantFiles(allFiles, route, request);
    
    console.log(`🎯 [FILTERED] ${Object.keys(relevantFiles).length} relevant files for ${route}`);

    // Extract metadata
    const dependencies = extractDependencies(allFiles);
    const framework = detectFramework(allFiles);

    const context: ProjectContext = {
      files: relevantFiles,
      metadata: {
        totalFiles: Object.keys(allFiles).length,
        filteredFiles: Object.keys(relevantFiles).length,
        relevanceScores: scores,
        dependencies,
        framework
      },
      cached: false,
      loadTime: Date.now() - startTime
    };

    // Cache the result (15 minute TTL)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await supabase.from('context_cache').insert({
      cache_key: cacheKey,
      project_id: projectId,
      user_id: userId,
      route,
      context_data: context,
      expires_at: expiresAt.toISOString()
    });

    console.log(`✅ [COMPLETE] Context loaded in ${context.loadTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ [ERROR] Context loading failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Context loading failed',
      context: {
        files: {},
        metadata: {
          totalFiles: 0,
          filteredFiles: 0,
          relevanceScores: {},
          dependencies: [],
          framework: 'react'
        },
        cached: false,
        loadTime: Date.now() - startTime
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
