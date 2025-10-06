import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Refactoring Engine
 * Consolidates:
 * - intelligent-refactor (AI-powered refactoring suggestions)
 * - suggest-refactoring (code improvement recommendations)
 * - refactor-code (automated refactoring execution)
 */

interface RefactorRequest {
  action: 'suggest' | 'analyze' | 'refactor' | 'preview';
  code: string;
  filePath?: string;
  language?: string;
  refactoringType?: 'performance' | 'readability' | 'patterns' | 'security' | 'all';
  applyChanges?: boolean;
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
      code,
      filePath = 'unknown.ts',
      language = 'typescript',
      refactoringType = 'all',
      applyChanges = false
    } = await req.json() as RefactorRequest;

    console.log('[unified-refactoring-engine] Action:', action, { filePath, refactoringType });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'analyze': {
        // Analyze code quality and identify refactoring opportunities
        console.log('[analyze] Analyzing code structure');

        const analysisPrompt = `Analyze this ${language} code from ${filePath}:

\`\`\`${language}
${code}
\`\`\`

Identify refactoring opportunities:
1. Code smells and anti-patterns
2. Performance bottlenecks
3. Readability issues
4. Security vulnerabilities
5. Maintainability concerns
6. Best practice violations

Return JSON:
{
  "codeQuality": {
    "score": <0-100>,
    "maintainability": "low|medium|high",
    "complexity": "low|medium|high"
  },
  "issues": [
    {
      "type": "performance|readability|security|patterns",
      "severity": "critical|high|medium|low",
      "description": "...",
      "location": "line X-Y",
      "suggestion": "..."
    }
  ],
  "metrics": {
    "linesOfCode": <number>,
    "cyclomaticComplexity": <number>,
    "duplicatedCode": <percentage>
  }
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
                content: `You are an expert code analyzer specializing in ${language}. Provide detailed refactoring analysis.`
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
            filePath,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggest': {
        // Generate intelligent refactoring suggestions
        console.log('[suggest] Generating refactoring suggestions');

        const focusArea = refactoringType === 'all' 
          ? 'all aspects (performance, readability, patterns, security)'
          : refactoringType;

        const suggestPrompt = `Provide refactoring suggestions for this ${language} code, focusing on ${focusArea}:

\`\`\`${language}
${code}
\`\`\`

File: ${filePath}

Generate prioritized suggestions:
- Quick wins (easy, high impact)
- Medium-term improvements
- Long-term architectural changes

Return JSON:
{
  "suggestions": [
    {
      "id": "...",
      "title": "...",
      "priority": "critical|high|medium|low",
      "category": "performance|readability|security|patterns",
      "description": "...",
      "before": "... code snippet ...",
      "after": "... refactored code ...",
      "impact": "...",
      "effort": "low|medium|high",
      "benefits": ["..."]
    }
  ],
  "estimatedImprovement": {
    "performance": "<percentage>",
    "maintainability": "<percentage>",
    "security": "<improvement description>"
  }
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
                content: `You are a refactoring expert for ${language}. Provide actionable, safe refactoring suggestions.`
              },
              {
                role: 'user',
                content: suggestPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3500,
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
            ...suggestions,
            filePath,
            refactoringType,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refactor': {
        // Execute automated refactoring
        console.log('[refactor] Executing refactoring');

        const refactorPrompt = `Refactor this ${language} code focusing on ${refactoringType}:

\`\`\`${language}
${code}
\`\`\`

File: ${filePath}

Apply these refactorings:
${refactoringType === 'all' || refactoringType === 'performance' ? '- Optimize performance (memoization, lazy loading, efficient algorithms)' : ''}
${refactoringType === 'all' || refactoringType === 'readability' ? '- Improve readability (clear naming, extract functions, reduce complexity)' : ''}
${refactoringType === 'all' || refactoringType === 'patterns' ? '- Apply design patterns (DRY, SOLID, proper abstractions)' : ''}
${refactoringType === 'all' || refactoringType === 'security' ? '- Fix security issues (input validation, XSS prevention, secure APIs)' : ''}

CRITICAL: Maintain exact same functionality. Do not break existing behavior.

Return JSON:
{
  "refactoredCode": "...",
  "changes": [
    {
      "type": "...",
      "description": "...",
      "linesAffected": [...]
    }
  ],
  "improvements": {
    "performanceGain": "...",
    "codeReduction": "...",
    "complexityReduction": "..."
  },
  "testingRecommendations": ["..."],
  "warnings": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro', // Use Pro for code generation
            messages: [
              {
                role: 'system',
                content: `You are an expert ${language} refactoring engine. Generate safe, production-ready refactored code.`
              },
              {
                role: 'user',
                content: refactorPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 4500,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const refactoring = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...refactoring,
            filePath,
            refactoringType,
            applied: applyChanges,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'preview': {
        // Preview refactoring changes before applying
        console.log('[preview] Generating refactoring preview');

        const previewPrompt = `Generate a side-by-side preview of refactoring changes for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Focus: ${refactoringType}

Return JSON with:
{
  "preview": {
    "original": "...",
    "refactored": "...",
    "diff": "... unified diff format ..."
  },
  "summary": {
    "totalChanges": <number>,
    "linesAdded": <number>,
    "linesRemoved": <number>,
    "linesModified": <number>
  },
  "highlights": [
    {
      "change": "...",
      "benefit": "...",
      "risk": "low|medium|high"
    }
  ],
  "safetyScore": <0-100>
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
                content: 'You are a code diff expert. Generate clear, safe refactoring previews.'
              },
              {
                role: 'user',
                content: previewPrompt
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
        const preview = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...preview,
            filePath,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-refactoring-engine] Error:', error);
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
