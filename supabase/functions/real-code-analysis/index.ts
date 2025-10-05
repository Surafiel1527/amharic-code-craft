import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RealAnalysisRequest {
  code: string;
  language: string;
  filePath?: string;
  runESLint?: boolean;
  runTypeScript?: boolean;
  checkBundle?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      code, 
      language, 
      filePath = 'temp.tsx',
      runESLint = true,
      runTypeScript = true,
      checkBundle = true
    }: RealAnalysisRequest = await req.json();

    if (!code) {
      throw new Error('Code is required');
    }

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

    console.log(`🔍 Running real analysis for user ${user.id}`);

    const results: any = {
      eslintResults: [],
      typescriptDiagnostics: [],
      bundleSizeKb: 0,
      complexityScore: 0,
      performanceMetrics: {}
    };

    // Create temporary directory for analysis
    const tempDir = await Deno.makeTempDir();
    const tempFile = `${tempDir}/${filePath}`;
    
    try {
      // Write code to temp file
      await Deno.writeTextFile(tempFile, code);

      // Run ESLint if requested
      if (runESLint && (language === 'javascript' || language === 'typescript')) {
        console.log('Running ESLint analysis...');
        results.eslintResults = await runESLintAnalysis(tempFile, code);
      }

      // Run TypeScript compiler if requested
      if (runTypeScript && language === 'typescript') {
        console.log('Running TypeScript diagnostics...');
        results.typescriptDiagnostics = await runTypeScriptAnalysis(tempFile);
      }

      // Calculate complexity
      console.log('Calculating complexity...');
      results.complexityScore = calculateComplexity(code);

      // Estimate bundle size
      if (checkBundle) {
        console.log('Estimating bundle size...');
        results.bundleSizeKb = estimateBundleSize(code);
      }

      // Performance metrics
      results.performanceMetrics = analyzePerformance(code);

      // Generate code hash for caching
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Cache results
      await supabaseClient
        .from('code_analysis_cache')
        .upsert({
          code_hash: codeHash,
          language,
          eslint_results: results.eslintResults,
          typescript_diagnostics: results.typescriptDiagnostics,
          bundle_size_kb: results.bundleSizeKb,
          complexity_score: results.complexityScore,
          performance_metrics: results.performanceMetrics,
          analyzed_at: new Date().toISOString(),
          cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'code_hash' });

      // Store validation results
      const overallScore = calculateOverallScore(results);
      const status = overallScore >= 80 ? 'pass' : overallScore >= 60 ? 'warning' : 'fail';

      await supabaseClient
        .from('validation_results')
        .insert({
          user_id: user.id,
          code_hash: codeHash,
          language,
          validation_type: 'comprehensive',
          status,
          score: overallScore,
          issues: [...results.eslintResults, ...results.typescriptDiagnostics]
        });

      console.log('✅ Real analysis complete');

      return new Response(
        JSON.stringify({
          success: true,
          analysis: results,
          overallScore,
          status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } finally {
      // Cleanup temp files
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (e) {
        console.error('Failed to cleanup temp files:', e);
      }
    }

  } catch (error) {
    console.error('❌ Real analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function runESLintAnalysis(filePath: string, code: string): Promise<any[]> {
  const issues: any[] = [];

  // Basic syntax check
  try {
    new Function(code);
  } catch (error: any) {
    const match = error.message.match(/line (\d+)/i);
    issues.push({
      line: match ? parseInt(match[1]) : 1,
      column: 0,
      severity: 'error',
      message: error.message,
      rule: 'syntax-error'
    });
  }

  // Check for common issues
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Unused variables
    if (line.match(/^\s*(const|let|var)\s+\w+\s*=/)) {
      const varName = line.match(/^\s*(?:const|let|var)\s+(\w+)/)?.[1];
      if (varName && !code.includes(varName, code.indexOf(line) + line.length)) {
        issues.push({
          line: lineNum,
          column: line.indexOf(varName),
          severity: 'warning',
          message: `'${varName}' is assigned a value but never used`,
          rule: 'no-unused-vars'
        });
      }
    }

    // console.log in production
    if (line.includes('console.log') || line.includes('console.error')) {
      issues.push({
        line: lineNum,
        column: line.indexOf('console'),
        severity: 'warning',
        message: 'Unexpected console statement',
        rule: 'no-console'
      });
    }

    // debugger statements
    if (line.includes('debugger')) {
      issues.push({
        line: lineNum,
        column: line.indexOf('debugger'),
        severity: 'error',
        message: 'Unexpected debugger statement',
        rule: 'no-debugger'
      });
    }

    // eval usage
    if (line.includes('eval(')) {
      issues.push({
        line: lineNum,
        column: line.indexOf('eval'),
        severity: 'error',
        message: 'eval can be harmful',
        rule: 'no-eval'
      });
    }
  });

  return issues;
}

async function runTypeScriptAnalysis(filePath: string): Promise<any[]> {
  const diagnostics: any[] = [];
  const code = await Deno.readTextFile(filePath);

  // Check for 'any' type usage
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    if (line.match(/:\s*any\b/)) {
      diagnostics.push({
        line: index + 1,
        message: "Type 'any' reduces type safety",
        severity: 'warning',
        code: 'TS2571'
      });
    }

    // Check for missing return types
    if (line.match(/function\s+\w+\([^)]*\)\s*{/) && !line.includes(':')) {
      diagnostics.push({
        line: index + 1,
        message: 'Function lacks return type annotation',
        severity: 'warning',
        code: 'TS7010'
      });
    }

    // Check for non-null assertions
    if (line.includes('!.') || line.includes('!;')) {
      diagnostics.push({
        line: index + 1,
        message: 'Forbidden non-null assertion',
        severity: 'error',
        code: 'TS2322'
      });
    }
  });

  return diagnostics;
}

function calculateComplexity(code: string): number {
  let complexity = 1;

  // Cyclomatic complexity
  const controlFlow = code.match(/\b(if|else|for|while|switch|case|catch|\?|&&|\|\|)\b/g);
  complexity += controlFlow ? controlFlow.length : 0;

  // Function depth
  const functions = code.match(/function\s+\w+|=>\s*{/g);
  complexity += functions ? functions.length * 2 : 0;

  // Nested loops
  const loops = code.match(/for\s*\(|while\s*\(/g);
  if (loops && loops.length > 1) {
    complexity += loops.length * 3;
  }

  return Math.min(complexity, 100);
}

function estimateBundleSize(code: string): number {
  const bytes = new TextEncoder().encode(code).length;
  const kb = bytes / 1024;
  
  // Add overhead for imports
  const imports = code.match(/import\s+.*?from\s+['"].*?['"]/g);
  const importOverhead = imports ? imports.length * 5 : 0;

  return Math.round((kb + importOverhead) * 10) / 10;
}

function analyzePerformance(code: string): any {
  return {
    unnecessaryRerenders: (code.match(/useState|useEffect/g) || []).length > 10 ? 1 : 0,
    memoryLeaks: code.includes('addEventListener') && !code.includes('removeEventListener') ? 1 : 0,
    largeComponents: code.split('\n').length > 200 ? 1 : 0,
    nestedLoops: (code.match(/for.*for|while.*while/g) || []).length
  };
}

function calculateOverallScore(results: any): number {
  let score = 100;

  // Deduct for errors
  const errors = results.eslintResults.filter((r: any) => r.severity === 'error').length;
  score -= errors * 10;

  // Deduct for warnings
  const warnings = results.eslintResults.filter((r: any) => r.severity === 'warning').length;
  score -= warnings * 5;

  // Deduct for TS diagnostics
  score -= results.typescriptDiagnostics.filter((d: any) => d.severity === 'error').length * 10;
  score -= results.typescriptDiagnostics.filter((d: any) => d.severity === 'warning').length * 3;

  // Deduct for complexity
  if (results.complexityScore > 50) {
    score -= (results.complexityScore - 50) / 2;
  }

  // Deduct for performance issues
  const perfIssues = Object.values(results.performanceMetrics).reduce((a: number, b: any) => {
    return a + (typeof b === 'number' ? b : 0);
  }, 0);
  score -= perfIssues * 5;

  return Math.max(0, Math.round(score));
}
