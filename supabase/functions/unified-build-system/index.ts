import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Build System
 * Consolidates:
 * - build-quality-gate (quality checks before build)
 * - physical-build-blocker (prevent bad builds)
 * - smart-build-optimizer (build optimization)
 */

interface BuildRequest {
  action: 'quality-check' | 'optimize' | 'validate' | 'analyze';
  projectId?: string;
  buildConfig?: Record<string, any>;
  code?: Record<string, string>; // filename -> code content
  checkCriteria?: {
    minTestCoverage?: number;
    maxBundleSize?: number;
    maxErrors?: number;
    requiredChecks?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      action,
      projectId,
      buildConfig,
      code,
      checkCriteria = {
        minTestCoverage: 70,
        maxBundleSize: 5000, // KB
        maxErrors: 0,
        requiredChecks: ['lint', 'type-check', 'security']
      }
    } = await req.json() as BuildRequest;

    console.log('[unified-build-system] Action:', action, { projectId });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'quality-check': {
        console.log('[quality-check] Running quality gate checks');

        const qualityPrompt = `Perform quality gate checks on this codebase:

${JSON.stringify(code, null, 2)}

Criteria:
- Min test coverage: ${checkCriteria.minTestCoverage}%
- Max bundle size: ${checkCriteria.maxBundleSize}KB
- Max errors: ${checkCriteria.maxErrors}
- Required checks: ${checkCriteria.requiredChecks?.join(', ')}

Return JSON:
{
  "passed": true/false,
  "checks": [
    {
      "name": "...",
      "status": "pass|fail|warning",
      "message": "...",
      "details": "..."
    }
  ],
  "metrics": {
    "testCoverage": <percentage>,
    "estimatedBundleSize": <KB>,
    "errorCount": <number>,
    "warningCount": <number>
  },
  "blockers": ["..."],
  "recommendations": ["..."],
  "buildAllowed": true/false
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a build quality gate system. Enforce quality standards before builds.'
              },
              {
                role: 'user',
                content: qualityPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const qualityResults = JSON.parse(data.choices[0].message.content);

        // Log quality check result
        if (projectId) {
          await supabase.from('build_quality_logs').insert({
            project_id: projectId,
            user_id: user.id,
            passed: qualityResults.buildAllowed,
            metrics: qualityResults.metrics,
            blockers: qualityResults.blockers
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            ...qualityResults,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'optimize': {
        console.log('[optimize] Optimizing build configuration');

        const optimizePrompt = `Optimize this build configuration:

${JSON.stringify(buildConfig, null, 2)}

Focus on:
- Bundle size reduction
- Build time optimization
- Tree shaking configuration
- Code splitting strategy
- Asset optimization
- Caching strategy

Return JSON:
{
  "optimizedConfig": {...},
  "improvements": [
    {
      "area": "...",
      "change": "...",
      "expectedImprovement": "...",
      "impact": "high|medium|low"
    }
  ],
  "estimatedGains": {
    "bundleSizeReduction": "<percentage>",
    "buildTimeImprovement": "<percentage>",
    "runtimePerformance": "<improvement>"
  },
  "warnings": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a build optimization expert. Improve build configurations for maximum efficiency.'
              },
              {
                role: 'user',
                content: optimizePrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const optimizations = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...optimizations,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate': {
        console.log('[validate] Validating build readiness');

        const validatePrompt = `Validate if this project is ready for build:

Code: ${JSON.stringify(code, null, 2)}
Config: ${JSON.stringify(buildConfig, null, 2)}

Check:
- All dependencies installed
- No syntax errors
- Environment variables set
- Build scripts configured
- Output directory configured
- No circular dependencies

Return JSON:
{
  "isReady": true/false,
  "validations": [
    {
      "check": "...",
      "passed": true/false,
      "message": "..."
    }
  ],
  "blockers": ["..."],
  "warnings": ["..."],
  "estimatedBuildTime": "<minutes>"
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a build validation system. Ensure projects are ready for production builds.'
              },
              {
                role: 'user',
                content: validatePrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2500,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const validation = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...validation,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'analyze': {
        console.log('[analyze] Analyzing build potential');

        const analyzePrompt = `Analyze build characteristics and potential issues:

${JSON.stringify(code, null, 2)}

Provide:
- Estimated bundle size
- Build complexity
- Optimization opportunities
- Potential build failures
- Performance predictions

Return JSON:
{
  "analysis": {
    "complexity": "low|medium|high",
    "estimatedBundleSize": <KB>,
    "buildTime": "<minutes>",
    "optimizationPotential": "<percentage>"
  },
  "risks": [
    {
      "type": "...",
      "severity": "high|medium|low",
      "description": "...",
      "mitigation": "..."
    }
  ],
  "opportunities": ["..."],
  "recommendations": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a build analyzer. Predict build outcomes and identify improvements.'
              },
              {
                role: 'user',
                content: analyzePrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2500,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...analysis,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-build-system] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
