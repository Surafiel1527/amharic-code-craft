import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  action: 'generate' | 'run' | 'coverage';
  code?: string;
  testCode?: string;
  filePath?: string;
  testType?: 'unit' | 'integration' | 'e2e';
  framework?: 'vitest' | 'jest';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, testCode, filePath, testType, framework } = await req.json() as TestRequest;
    console.log('[unified-test-manager] Request:', { action, hasCode: !!code, testType, framework });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'generate': {
        // Generate tests for code
        if (!code) {
          throw new Error('code required for test generation');
        }

        const testPrompt = `Generate comprehensive ${testType || 'unit'} tests for the following code using ${framework || 'vitest'}:

\`\`\`typescript
${code}
\`\`\`

Requirements:
- Use ${framework || 'vitest'} and React Testing Library
- Cover all major functionality
- Include edge cases and error scenarios
- Use descriptive test names
- Follow testing best practices
- Include proper setup and teardown
${filePath ? `- File path: ${filePath}` : ''}`;

        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
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
                content: 'You are an expert in test-driven development. Generate comprehensive, maintainable tests.'
              },
              {
                role: 'user',
                content: testPrompt
              }
            ],
            max_tokens: 3000,
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedTests = data.choices[0].message.content;

        return new Response(
          JSON.stringify({
            success: true,
            tests: generatedTests,
            testType,
            framework: framework || 'vitest',
            filePath: filePath ? filePath.replace(/\.tsx?$/, '.test.tsx') : undefined
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'run': {
        // Analyze test results and provide insights
        if (!testCode) {
          throw new Error('testCode required for test analysis');
        }

        const analysisPrompt = `Analyze these test results and provide insights:

\`\`\`typescript
${testCode}
\`\`\`

Provide:
1. Test coverage summary
2. Passing/failing tests breakdown
3. Suggestions for improvement
4. Missing test scenarios`;

        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
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
                content: 'You are a test analysis expert. Provide actionable insights on test quality and coverage.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            max_tokens: 2000,
            temperature: 0.6,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const analysis = data.choices[0].message.content;

        return new Response(
          JSON.stringify({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'coverage': {
        // Generate coverage report analysis
        if (!code) {
          throw new Error('code required for coverage analysis');
        }

        const coveragePrompt = `Analyze this code and identify areas that need test coverage:

\`\`\`typescript
${code}
\`\`\`

Identify:
1. Uncovered functions/methods
2. Edge cases that need testing
3. Error paths that need coverage
4. Integration points to test
5. Priority order for adding tests`;

        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
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
                content: 'You are a code coverage expert. Identify gaps in test coverage and prioritize what needs testing.'
              },
              {
                role: 'user',
                content: coveragePrompt
              }
            ],
            max_tokens: 2500,
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const coverageReport = data.choices[0].message.content;

        return new Response(
          JSON.stringify({
            success: true,
            coverageReport,
            recommendations: data.choices[0].message.content.split('\n').filter((line: string) => line.includes('Priority') || line.includes('TODO'))
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-test-manager] Error:', error);
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
