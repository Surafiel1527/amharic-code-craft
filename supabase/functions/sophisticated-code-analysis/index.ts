import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  code: string;
  language: string;
  filePath?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, filePath }: AnalysisRequest = await req.json();

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

    console.log(`🔍 Analyzing code for user ${user.id}`);

    // Generate code hash for caching
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache first
    const { data: cachedAnalysis } = await supabaseClient
      .from('code_analysis_cache')
      .select('*')
      .eq('code_hash', codeHash)
      .gt('cache_expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedAnalysis) {
      console.log('✅ Returning cached analysis');
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          analysis: cachedAnalysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform sophisticated analysis using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const analysisPrompt = `You are an expert code analyzer. Analyze this ${language} code thoroughly.

**Code to Analyze:**
\`\`\`${language}
${code}
\`\`\`

**Perform these analyses:**
1. **ESLint-style Analysis**: Find syntax errors, unused variables, missing returns, etc.
2. **TypeScript Diagnostics**: Check type safety, inference issues, any type usage
3. **Bundle Size Estimation**: Estimate final bundle size in KB
4. **Complexity Score**: Rate code complexity (0-100, lower is better)
5. **Performance Metrics**: Identify performance bottlenecks, unnecessary re-renders, memory leaks

**Output Format (JSON only):**
{
  "eslintResults": [
    {
      "line": 10,
      "column": 5,
      "severity": "error",
      "message": "Unexpected token",
      "rule": "syntax-error"
    }
  ],
  "typescriptDiagnostics": [
    {
      "line": 15,
      "message": "Type 'string' is not assignable to type 'number'",
      "severity": "error"
    }
  ],
  "bundleSizeKb": 45.2,
  "complexityScore": 35,
  "performanceMetrics": {
    "unnecessaryRerenders": 2,
    "memoryLeaks": 0,
    "largeComponents": 1,
    "nestedLoops": 1
  }
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a code analysis expert. Always respond with valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    // Cache the results
    const { error: cacheError } = await supabaseClient
      .from('code_analysis_cache')
      .upsert({
        code_hash: codeHash,
        language,
        eslint_results: analysis.eslintResults || [],
        typescript_diagnostics: analysis.typescriptDiagnostics || [],
        bundle_size_kb: analysis.bundleSizeKb || 0,
        complexity_score: analysis.complexityScore || 0,
        performance_metrics: analysis.performanceMetrics || {},
        analyzed_at: new Date().toISOString(),
        cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'code_hash' });

    if (cacheError) {
      console.error('Failed to cache analysis:', cacheError);
    }

    console.log('✅ Analysis complete');

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        analysis: {
          code_hash: codeHash,
          ...analysis
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
