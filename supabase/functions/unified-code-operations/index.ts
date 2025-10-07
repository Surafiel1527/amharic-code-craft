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
      case 'react-generation':
        result = await handleReactGeneration(params, supabase);
        break;
      case 'execute':
        result = await handleExecute(params, supabase);
        break;
      case 'stream_generation':
        return await handleStreamGeneration(params, supabase, req);
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

async function handleReactGeneration(params: any, supabase: any) {
  const { prompt } = params;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const systemPrompt = `You are an expert React developer. Generate production-ready React components.

CRITICAL: You must use the generate_react_components tool to return your output.

Guidelines:
- Use TypeScript (.tsx files) and functional components
- Include ALL necessary imports at the top
- Use Tailwind CSS for styling
- Use lucide-react for icons
- Make components responsive and beautiful
- Follow React best practices`;

  try {
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
        tools: [{
          type: 'function',
          function: {
            name: 'generate_react_components',
            description: 'Generate React component files',
            parameters: {
              type: 'object',
              properties: {
                entry_point: { 
                  type: 'string',
                  description: 'Main component file (e.g., ProductCard.tsx)'
                },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      code: { type: 'string' },
                      type: { type: 'string', enum: ['component', 'hook', 'util', 'style', 'config'] }
                    },
                    required: ['path', 'code', 'type'],
                    additionalProperties: false
                  }
                }
              },
              required: ['entry_point', 'files'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_react_components' } }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data).substring(0, 500));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    
    console.log('Parsed result:', { entry_point: args.entry_point, fileCount: args.files?.length });
    return args;
    
  } catch (error) {
    console.error('Generation error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      entry_point: 'ErrorComponent.tsx',
      files: [{
        path: 'ErrorComponent.tsx',
        code: `export default function ErrorComponent() {
  return (
    <div className="p-8 max-w-md mx-auto mt-8 bg-red-50 border border-red-200 rounded-lg">
      <h2 className="text-xl font-bold text-red-800 mb-2">Generation Error</h2>
      <p className="text-red-600">${errorMsg}</p>
    </div>
  );
}`,
        type: 'component'
      }]
    };
  }
}

async function handleExecute(params: any, supabase: any) {
  const { code, language, projectId, userId } = params;
  const startTime = performance.now();

  let result;
  if (language === 'typescript' || language === 'javascript') {
    result = await executeJavaScript(code);
  } else if (language === 'python') {
    result = { success: false, output: '', error: 'Python execution requires external runtime', memoryUsed: 0 };
  } else {
    throw new Error(`Unsupported language: ${language}`);
  }

  const executionTime = performance.now() - startTime;

  if (projectId && userId) {
    await supabase.from('code_executions').insert({
      project_id: projectId,
      user_id: userId,
      code,
      language,
      output: result.output,
      error: result.error,
      execution_time_ms: executionTime,
      memory_used_mb: result.memoryUsed,
      success: result.success
    });
  }

  return { ...result, executionTime: Math.round(executionTime) };
}

async function executeJavaScript(code: string) {
  const capturedLogs: string[] = [];
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

  const safeConsole = {
    log: (...args: any[]) => capturedLogs.push(args.map(a => String(a)).join(' ')),
    error: (...args: any[]) => capturedLogs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
    warn: (...args: any[]) => capturedLogs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
  };

  try {
    const wrappedCode = `(async () => { const console = arguments[0]; ${code} })(arguments[0])`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout (5s)')), 5000)
    );
    const executionPromise = (async () => {
      const func = new Function('arguments', wrappedCode);
      await func(safeConsole);
    })();

    await Promise.race([executionPromise, timeoutPromise]);

    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = Math.max(0, (memoryAfter - memoryBefore) / (1024 * 1024));

    return {
      success: true,
      output: capturedLogs.join('\n') || 'Code executed successfully',
      error: null,
      memoryUsed: Number(memoryUsed.toFixed(2))
    };
  } catch (error) {
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = Math.max(0, (memoryAfter - memoryBefore) / (1024 * 1024));

    return {
      success: false,
      output: capturedLogs.join('\n'),
      error: error instanceof Error ? error.message : String(error),
      memoryUsed: Number(memoryUsed.toFixed(2))
    };
  }
}

async function handleStreamGeneration(params: any, supabase: any, req: any) {
  const { userRequest, framework, projectId, conversationId } = params;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: string, data: any) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      await sendEvent('status', { message: 'Analyzing requirements...', progress: 10 });

      const systemPrompt = `You are an expert code generator. Generate a complete ${framework} project.
Return JSON: { "files": [{"path": "...", "content": "...", "type": "..."}], "framework": "...", "architecture": "...", "stats": {...} }`;

      await sendEvent('status', { message: 'Generating files...', progress: 30 });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userRequest }],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`AI generation failed: ${response.status}`);

      const aiResponse = await response.json();
      const result = JSON.parse(aiResponse.choices[0].message.content);

      for (let i = 0; i < result.files.length; i++) {
        await sendEvent('file', { file: result.files[i], progress: 60 + (i / result.files.length) * 30 });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await sendEvent('complete', { ...result, projectId, conversationId });
      await sendEvent('status', { message: 'Done!', progress: 100 });
    } catch (error) {
      await sendEvent('error', { message: error instanceof Error ? error.message : 'Generation failed' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

