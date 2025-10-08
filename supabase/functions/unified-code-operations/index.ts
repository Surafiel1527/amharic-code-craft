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
  const { userRequest, framework, projectId, conversationId } = params.params;
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
      // Get user from auth header
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      await sendEvent('status', { message: 'Analyzing requirements...', progress: 10 });

      // Step 1: Analyze if database is needed
      const analysisPrompt = `Analyze this request and determine if it needs a database:

"${userRequest}"

Respond with JSON:
{
  "needsDatabase": true/false,
  "needsAuth": true/false,
  "databaseTables": [
    {
      "name": "table_name",
      "purpose": "what it stores",
      "fields": ["id", "user_id", "created_at", "field1", "field2"]
    }
  ]
}`;

      const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You analyze web app requirements. Respond with JSON only." },
            { role: "user", content: analysisPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!analysisResponse.ok) throw new Error(`Analysis failed: ${analysisResponse.status}`);
      
      const analysisData = await analysisResponse.json();
      const analysis = JSON.parse(analysisData.choices[0].message.content);
      console.log('📊 Analysis:', analysis);

      // Step 2: Create database tables if needed
      if (analysis.needsDatabase && analysis.databaseTables?.length > 0 && userId) {
        await sendEvent('status', { message: `Setting up ${analysis.databaseTables.length} database tables...`, progress: 20 });

        const sqlStatements: string[] = [];
        
        for (const table of analysis.databaseTables) {
          const fields = table.fields || ['id', 'created_at'];
          const fieldDefinitions = fields.map((field: string) => {
            // Extract just the field name (before any parentheses or spaces)
            const fieldName = field.split('(')[0].split(' ')[0].trim();
            
            if (fieldName === 'id') return 'id uuid primary key default gen_random_uuid()';
            if (fieldName === 'user_id' || fieldName === 'author_id') return `${fieldName} uuid references auth.users(id) on delete cascade not null`;
            if (fieldName === 'created_at') return 'created_at timestamp with time zone default now()';
            if (fieldName === 'updated_at') return 'updated_at timestamp with time zone default now()';
            if (fieldName.includes('email')) return `${fieldName} text unique not null`;
            if (fieldName.includes('username')) return `${fieldName} text unique not null`;
            if (fieldName.includes('slug')) return `${fieldName} text unique not null`;
            if (fieldName.includes('password')) return `${fieldName} text not null`;
            if (fieldName.includes('name') || fieldName.includes('title')) return `${fieldName} text not null`;
            if (fieldName.includes('content') || fieldName.includes('body') || fieldName.includes('description')) return `${fieldName} text`;
            if (fieldName.includes('status')) return `${fieldName} text default 'draft'`;
            if (fieldName.includes('count') || fieldName.includes('price') || fieldName.includes('quantity')) return `${fieldName} numeric default 0`;
            if (fieldName.includes('is_') || fieldName.includes('has_')) return `${fieldName} boolean default false`;
            if (fieldName.includes('_id') && fieldName !== 'id') return `${fieldName} uuid`;
            if (fieldName.includes('_at')) return `${fieldName} timestamp with time zone`;
            if (fieldName.includes('_json')) return `${fieldName} jsonb default '{}'`;
            if (fieldName.includes('_html')) return `${fieldName} text`;
            if (fieldName.includes('url')) return `${fieldName} text`;
            return `${fieldName} text`;
          }).join(',\n  ');

          sqlStatements.push(`
-- Create ${table.name} table
create table if not exists public.${table.name} (
  ${fieldDefinitions}
);

-- Enable RLS
alter table public.${table.name} enable row level security;

-- Create policies
create policy "Users can view their own ${table.name}"
  on public.${table.name} for select using (auth.uid() = user_id);

create policy "Users can insert their own ${table.name}"
  on public.${table.name} for insert with check (auth.uid() = user_id);

create policy "Users can update their own ${table.name}"
  on public.${table.name} for update using (auth.uid() = user_id);

create policy "Users can delete their own ${table.name}"
  on public.${table.name} for delete using (auth.uid() = user_id);
`);
        }

        const fullSQL = sqlStatements.join('\n\n');
        
        try {
          const { data: execResult, error: execError } = await supabase
            .rpc('execute_migration', { migration_sql: fullSQL });

          if (!execError && execResult?.success) {
            console.log('✅ Database tables created successfully');
            await sendEvent('status', { message: `✅ Created ${analysis.databaseTables.length} tables`, progress: 30 });
          } else {
            console.error('Database setup failed:', execError || execResult?.error);
          }
        } catch (error) {
          console.error('Database setup error:', error);
        }
      }

      // Step 3: Generate code
      await sendEvent('status', { message: 'Generating files...', progress: 40 });

      const systemPrompt = `You are an expert ${framework} developer. Generate a complete production-ready project.

${analysis.needsDatabase ? `
IMPORTANT - Include Supabase integration:
- Import: import { supabase } from "@/integrations/supabase/client"
- Use these tables: ${analysis.databaseTables?.map((t: any) => t.name).join(', ')}
- Include CRUD operations using supabase.from('table_name').select/insert/update/delete
` : ''}

Return JSON: { "files": [{"path": "...", "content": "...", "type": "..."}], "framework": "${framework}", "architecture": "...", "stats": {...} }`;

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
        await sendEvent('file', { file: result.files[i], current: i + 1, total: result.files.length, progress: 50 + (i / result.files.length) * 40 });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await sendEvent('complete', { ...result, projectId, conversationId });
      await sendEvent('status', { message: 'Done!', progress: 100 });
    } catch (error) {
      console.error('Stream generation error:', error);
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

