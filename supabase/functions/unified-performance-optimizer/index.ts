import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Performance Optimizer
 * Consolidates:
 * - performance-optimizer (manual optimization)
 * - auto-performance-optimizer (automatic optimization)
 * - contextual-auto-optimizer (context-aware optimization)
 */

interface PerformanceRequest {
  action: 'optimize' | 'auto-optimize' | 'analyze' | 'suggest';
  code: string;
  context?: string;
  framework?: 'react' | 'vanilla' | 'vue' | 'angular';
  targetMetrics?: {
    loadTime?: number;
    bundleSize?: number;
    renderTime?: number;
  };
  optimizationLevel?: 'basic' | 'aggressive' | 'balanced';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      code,
      context,
      framework = 'react',
      targetMetrics,
      optimizationLevel = 'balanced'
    } = await req.json() as PerformanceRequest;

    console.log('[unified-performance-optimizer] Action:', action, { framework, optimizationLevel });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'analyze': {
        // Analyze performance characteristics
        console.log('[analyze] Analyzing code performance');

        const analysisPrompt = `Analyze the performance characteristics of this ${framework} code:

\`\`\`typescript
${code}
\`\`\`
${context ? `\n\nContext: ${context}` : ''}

Identify:
1. Performance bottlenecks
2. Expensive operations
3. Unnecessary re-renders (React)
4. Memory leaks
5. Inefficient algorithms
6. Bundle size concerns

Return JSON with:
{
  "issues": [
    {
      "type": "...",
      "severity": "critical|high|medium|low",
      "description": "...",
      "impact": "...",
      "location": "..."
    }
  ],
  "metrics": {
    "estimatedLoadTime": <ms>,
    "estimatedBundleSize": <kb>,
    "complexity": "low|medium|high"
  },
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
                content: `You are a performance optimization expert specializing in ${framework}. Analyze code performance with precision.`
              },
              {
                role: 'user',
                content: analysisPrompt
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
        const analysis = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            analysis,
            framework,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'optimize': {
        // Manual optimization with AI assistance
        console.log('[optimize] Generating optimized code');

        const optimizePrompt = `Optimize this ${framework} code for performance (${optimizationLevel} level):

\`\`\`typescript
${code}
\`\`\`
${context ? `\n\nContext: ${context}` : ''}
${targetMetrics ? `\n\nTarget Metrics: ${JSON.stringify(targetMetrics)}` : ''}

Apply ${optimizationLevel} optimization:
- basic: Safe optimizations only (memoization, key props)
- balanced: Moderate optimizations (lazy loading, code splitting)
- aggressive: Maximum optimization (may affect readability)

For React:
- Use React.memo, useMemo, useCallback appropriately
- Implement lazy loading
- Optimize re-renders
- Code splitting

Return:
{
  "optimizedCode": "...",
  "changes": ["..."],
  "improvements": {
    "bundleSize": "<reduction>",
    "renderPerformance": "<improvement>",
    "memoryUsage": "<reduction>"
  },
  "notes": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro', // Using Pro for code generation
            messages: [
              {
                role: 'system',
                content: `You are an expert performance engineer specializing in ${framework}. Generate optimized, production-ready code.`
              },
              {
                role: 'user',
                content: optimizePrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 4000,
            temperature: 0.4,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const optimization = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...optimization,
            framework,
            optimizationLevel,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auto-optimize': {
        // Automatic optimization with intelligent defaults
        console.log('[auto-optimize] Running automatic optimization');

        // First analyze
        const analyzeResult = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: 'Analyze code and determine optimal optimization strategy.'
              },
              {
                role: 'user',
                content: `Analyze this code and determine: 1) optimization level needed 2) key issues to fix 3) priority order\n\n${code}`
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1500,
            temperature: 0.3,
          }),
        });

        const analyzeData = await analyzeResult.json();
        const strategy = JSON.parse(analyzeData.choices[0].message.content);

        // Then optimize based on strategy
        const optimizeResult = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content: `You are an automatic performance optimizer for ${framework}. Apply smart optimizations.`
              },
              {
                role: 'user',
                content: `Auto-optimize this code following strategy: ${JSON.stringify(strategy)}\n\n\`\`\`typescript\n${code}\n\`\`\``
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 4000,
            temperature: 0.3,
          }),
        });

        const optimizeData = await optimizeResult.json();
        const optimization = JSON.parse(optimizeData.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            strategy,
            ...optimization,
            framework,
            mode: 'automatic',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggest': {
        // Context-aware optimization suggestions
        console.log('[suggest] Generating context-aware suggestions');

        const suggestPrompt = `Provide performance optimization suggestions for this ${framework} code:

\`\`\`typescript
${code}
\`\`\`
${context ? `\n\nContext: ${context}` : ''}

Consider:
- Current framework best practices
- App context and usage patterns
- Quick wins vs long-term improvements
- Trade-offs (performance vs maintainability)

Return prioritized suggestions with:
- What to optimize
- Why it matters
- How to implement
- Expected impact
- Effort required (low/medium/high)`;

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
                content: `You are a contextual performance advisor for ${framework}. Provide smart, actionable suggestions.`
              },
              {
                role: 'user',
                content: suggestPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2500,
            temperature: 0.4,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const suggestions = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            suggestions,
            framework,
            context,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-performance-optimizer] Error:', error);
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
