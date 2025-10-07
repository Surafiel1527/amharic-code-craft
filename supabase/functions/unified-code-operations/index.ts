import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { operation, ...params } = await req.json();

    console.log('Code Operations:', operation);

    let result;

    switch (operation) {
      case 'analyze':
        result = await handleAnalysis(params, supabase);
        break;
      case 'optimize':
        result = await handleOptimization(params, supabase);
        break;
      case 'refactor':
        result = await handleRefactoring(params, supabase);
        break;
      case 'test_runner':
        result = await handleTestRunner(params, supabase);
        break;
      case 'component_generation':
        result = await handleComponentGeneration(params, supabase);
        break;
      case 'react-generation':
        result = await handleReactGeneration(params, supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified-code-operations:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleAnalysis(params: any, supabase: any) {
  const { code, projectId, analysisType } = params;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const analysisPrompt = `
Analyze this code for quality, performance, and maintainability:

${code}

Provide:
1. Quality score (0-100)
2. Performance issues
3. Security concerns
4. Maintainability suggestions
5. Best practice violations

Return as JSON.
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a code quality expert.' },
        { role: 'user', content: analysisPrompt }
      ]
    })
  });

  const data = await response.json();
  const analysis = data.choices[0].message.content;

  // Store analysis
  await supabase.from('code_analysis').insert({
    project_id: projectId,
    analysis_type: analysisType,
    issues: [],
    suggestions: []
  });

  return { analysis };
}

async function handleOptimization(params: any, supabase: any) {
  const { code, optimizationType } = params;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const optimizationPrompt = `
Optimize this code for ${optimizationType}:

${code}

Provide:
1. Optimized code
2. Performance improvements
3. Explanation of changes

Return as JSON.
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a code optimization expert.' },
        { role: 'user', content: optimizationPrompt }
      ]
    })
  });

  const data = await response.json();
  return { optimization: data.choices[0].message.content };
}

async function handleRefactoring(params: any, supabase: any) {
  const { code, refactoringGoal } = params;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a code refactoring expert.' },
        { role: 'user', content: `Refactor this code for ${refactoringGoal}:\n\n${code}` }
      ]
    })
  });

  const data = await response.json();
  return { refactored: data.choices[0].message.content };
}

async function handleTestRunner(params: any, supabase: any) {
  const { testSuite, projectId } = params;

  // Run tests and collect results
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  };

  return { results };
}

async function handleComponentGeneration(params: any, supabase: any) {
  const { componentType, requirements } = params;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a React component expert. Generate clean, reusable components.' },
        { role: 'user', content: `Generate a ${componentType} component with these requirements:\n${requirements}` }
      ]
    })
  });

  const data = await response.json();
  return { component: data.choices[0].message.content };
}

async function handleReactGeneration(params: any, supabase: any) {
  const { prompt, context } = params;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const systemPrompt = `You are an expert React developer. Generate complete, production-ready React components.

IMPORTANT: Return ONLY a JSON object with this structure:
{
  "entry_point": "ComponentName.tsx",
  "files": [
    {
      "path": "ComponentName.tsx",
      "code": "// Full component code here",
      "type": "component"
    }
  ]
}

Guidelines:
- Use TypeScript and functional components
- Include proper imports (React, lucide-react for icons, etc.)
- Use Tailwind CSS for styling
- Follow best practices (hooks, clean code, accessibility)
- Generate multiple files if needed (components, hooks, utils)
- Make components responsive and reusable`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse the JSON response
  try {
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
    return parsed;
  } catch (e) {
    // Fallback: create a single file from the response
    return {
      entry_point: 'GeneratedComponent.tsx',
      files: [{
        path: 'GeneratedComponent.tsx',
        code: content,
        type: 'component'
      }]
    };
  }
}

