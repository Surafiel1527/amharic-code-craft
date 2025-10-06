import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Code Quality Analyzer
 * Consolidates:
 * - code-quality-analyzer (general analysis)
 * - analyze-code (basic analysis)
 * - sophisticated-code-analysis (deep analysis)
 */

interface CodeQualityRequest {
  action: 'analyze' | 'deep-analyze' | 'score' | 'suggestions';
  code: string;
  filePath?: string;
  language?: string;
  checkComplexity?: boolean;
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  checkMaintainability?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      code,
      filePath,
      language = 'typescript',
      checkComplexity = true,
      checkSecurity = true,
      checkPerformance = true,
      checkMaintainability = true
    } = await req.json() as CodeQualityRequest;

    console.log('[unified-code-quality] Action:', action, { language, filePath });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'analyze': {
        // General code analysis
        console.log('[analyze] Running general code analysis');

        const analysisPrompt = `Analyze this ${language} code and provide a comprehensive quality report:

\`\`\`${language}
${code}
\`\`\`

Provide analysis in these areas:
${checkComplexity ? '- Code complexity and cyclomatic complexity' : ''}
${checkSecurity ? '- Security vulnerabilities and best practices' : ''}
${checkPerformance ? '- Performance issues and optimization opportunities' : ''}
${checkMaintainability ? '- Maintainability and readability issues' : ''}

Return a JSON object with:
{
  "overallScore": <0-100>,
  "issues": [{ "severity": "high|medium|low", "type": "...", "message": "...", "line": <number> }],
  "suggestions": ["..."],
  "metrics": {
    "complexity": <number>,
    "maintainability": <0-100>,
    "security": <0-100>
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
                content: 'You are an expert code quality analyzer. Provide detailed, actionable feedback on code quality.'
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

      case 'deep-analyze': {
        // Sophisticated deep code analysis
        console.log('[deep-analyze] Running deep code analysis');

        const deepPrompt = `Perform a DEEP, sophisticated analysis of this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide an expert-level analysis covering:

1. **Architecture & Design Patterns**
   - Design pattern usage (correct/incorrect)
   - Architectural concerns
   - SOLID principles adherence
   - Coupling and cohesion

2. **Security Analysis**
   - Injection vulnerabilities
   - Authentication/authorization issues
   - Data exposure risks
   - Cryptography issues

3. **Performance Deep Dive**
   - Algorithmic complexity (Big O)
   - Memory usage patterns
   - Potential bottlenecks
   - Database query optimization (if applicable)

4. **Code Smells & Anti-patterns**
   - Long methods/classes
   - God objects
   - Feature envy
   - Duplicate code

5. **Testing & Testability**
   - Test coverage gaps
   - Hard-to-test code
   - Mock/stub opportunities

Return detailed JSON with findings and recommendations.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro', // Using Pro for deep analysis
            messages: [
              {
                role: 'system',
                content: 'You are a senior software architect and security expert. Provide deep, expert-level code analysis.'
              },
              {
                role: 'user',
                content: deepPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 5000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const deepAnalysis = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            deepAnalysis,
            analysisType: 'sophisticated',
            filePath,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'score': {
        // Quick quality score
        console.log('[score] Calculating code quality score');

        // Basic metrics calculation
        const lines = code.split('\n');
        const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
        const commentLines = lines.filter(l => l.trim().startsWith('//')).length;
        const blankLines = lines.filter(l => !l.trim()).length;
        
        // Simple complexity heuristics
        const complexityIndicators = {
          functions: (code.match(/function\s+\w+/g) || []).length,
          conditionals: (code.match(/if\s*\(|switch\s*\(/g) || []).length,
          loops: (code.match(/for\s*\(|while\s*\(/g) || []).length,
          classes: (code.match(/class\s+\w+/g) || []).length
        };

        // Calculate basic score
        const commentRatio = codeLines > 0 ? (commentLines / codeLines) * 100 : 0;
        const avgComplexity = codeLines > 0 
          ? (complexityIndicators.conditionals + complexityIndicators.loops) / Math.max(complexityIndicators.functions, 1)
          : 0;

        let score = 100;
        
        // Deduct for poor commenting
        if (commentRatio < 10) score -= 15;
        else if (commentRatio < 20) score -= 5;

        // Deduct for high complexity
        if (avgComplexity > 10) score -= 20;
        else if (avgComplexity > 5) score -= 10;

        // Deduct for very long functions (heuristic: >100 lines without function def)
        if (codeLines > 100 && complexityIndicators.functions < 2) score -= 15;

        score = Math.max(0, Math.min(100, score));

        return new Response(
          JSON.stringify({
            success: true,
            score,
            metrics: {
              totalLines: lines.length,
              codeLines,
              commentLines,
              blankLines,
              commentRatio: commentRatio.toFixed(1) + '%',
              complexity: complexityIndicators,
              avgComplexity: avgComplexity.toFixed(2)
            },
            grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
            filePath,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggestions': {
        // Get actionable improvement suggestions
        console.log('[suggestions] Generating improvement suggestions');

        const suggestionsPrompt = `Review this ${language} code and provide 5-10 specific, actionable improvement suggestions:

\`\`\`${language}
${code}
\`\`\`

For each suggestion, provide:
- Priority (high/medium/low)
- Category (security/performance/maintainability/style)
- Specific action to take
- Expected impact

Return JSON array of suggestions.`;

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
                content: 'You are a code review expert. Provide specific, actionable suggestions.'
              },
              {
                role: 'user',
                content: suggestionsPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2000,
            temperature: 0.4,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            suggestions: result.suggestions || result,
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
    console.error('[unified-code-quality] Error:', error);
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
