import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestGenerationRequest {
  sourceCode: string;
  language: string;
  testFramework: 'vitest' | 'jest' | 'playwright';
  testType: 'unit' | 'integration' | 'e2e';
  componentName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sourceCode, 
      language, 
      testFramework, 
      testType,
      componentName 
    }: TestGenerationRequest = await req.json();

    if (!sourceCode) {
      throw new Error('Source code is required');
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

    console.log(`🧪 Generating ${testType} tests for user ${user.id}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const testPrompt = generateTestPrompt(sourceCode, language, testFramework, testType, componentName);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a test generation expert. Generate comprehensive, runnable tests.' },
          { role: 'user', content: testPrompt }
        ]
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const testCode = aiData.choices[0].message.content;

    // Store generated test
    const { data: generatedTest, error: insertError } = await supabaseClient
      .from('generated_tests')
      .insert({
        user_id: user.id,
        source_code: sourceCode,
        test_code: testCode,
        test_framework: testFramework,
        test_type: testType,
        execution_status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store test:', insertError);
    }

    console.log('✅ Test generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        testId: generatedTest?.id,
        testCode,
        testFramework,
        testType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Test generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateTestPrompt(
  code: string, 
  language: string, 
  framework: string, 
  testType: string,
  componentName?: string
): string {
  const frameworkSetup = {
    vitest: "import { describe, it, expect, vi } from 'vitest';\nimport { render, screen, fireEvent } from '@testing-library/react';",
    jest: "import { describe, it, expect, jest } from '@jest/globals';\nimport { render, screen, fireEvent } from '@testing-library/react';",
    playwright: "import { test, expect } from '@playwright/test';"
  };

  if (testType === 'e2e') {
    return `Generate Playwright end-to-end tests for this component.

**Source Code:**
\`\`\`${language}
${code}
\`\`\`

Generate comprehensive E2E tests that:
1. Test user workflows from start to finish
2. Test navigation and routing
3. Test form submissions
4. Test error states
5. Test responsive behavior

Use Playwright syntax. Include setup and teardown.`;
  }

  return `Generate ${testType} tests using ${framework} for this ${language} code.

**Source Code:**
\`\`\`${language}
${code}
\`\`\`

${componentName ? `**Component Name:** ${componentName}` : ''}

Generate comprehensive tests that:
1. ${frameworkSetup[framework as keyof typeof frameworkSetup]}
2. Test rendering and initial state
3. Test all user interactions (clicks, inputs, etc.)
4. Test all props and their effects
5. Test error boundaries and edge cases
6. Test async operations with proper mocking
7. Include setup/teardown and cleanup

**Requirements:**
- Use ${framework} syntax
- Import statements at the top
- Descriptive test names
- Proper assertions
- Mock external dependencies
- Test accessibility
- Aim for >80% coverage

Return ONLY the complete test code, ready to run.`;
}
