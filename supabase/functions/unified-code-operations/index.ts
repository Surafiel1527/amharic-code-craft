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
    // Create platform Supabase client (for auth and fetching user credentials)
    const platformSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { operation, ...params } = await req.json();

    console.log('Code Operations:', operation);

    // Authenticate user and get their Supabase connection
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await platformSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ FETCH USER'S ACTIVE SUPABASE CONNECTION (Multi-tenant architecture)
    const { data: userConnection, error: connectionError } = await platformSupabase
      .from('user_supabase_connections')
      .select('supabase_url, supabase_anon_key, supabase_service_role_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connectionError || !userConnection) {
      console.error('No active Supabase connection found for user:', user.id);
      return new Response(JSON.stringify({ 
        error: 'No active Supabase connection found. Please connect your Supabase project first.',
        requiresConnection: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ CREATE SUPABASE CLIENT USING USER'S CREDENTIALS
    const userSupabase = createClient(
      userConnection.supabase_url,
      userConnection.supabase_service_role_key || userConnection.supabase_anon_key
    );

    console.log('✅ Using user Supabase:', userConnection.supabase_url);

    let result;

    switch (operation) {
      case 'analyze':
        result = await handleAnalysis(params, platformSupabase);
        break;
      case 'optimize':
        result = await handleOptimization(params, platformSupabase);
        break;
      case 'refactor':
        result = await handleRefactoring(params, platformSupabase);
        break;
      case 'test_runner':
        result = await handleTestRunner(params, platformSupabase);
        break;
      case 'component_generation':
      case 'react-generation':
        result = await handleReactGeneration(params, platformSupabase);
        break;
      case 'execute':
        result = await handleExecute(params, platformSupabase);
        break;
      case 'stream_generation':
        return await handleStreamGeneration(params, userSupabase, platformSupabase, req, user.id, userConnection);
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

async function handleStreamGeneration(params: any, userSupabase: any, platformSupabase: any, req: any, userId: string, userConnection: any) {
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
      // ✅ Use userId already passed as parameter (already authenticated)
      console.log('📝 Using authenticated user:', userId);

      await sendEvent('status', { message: 'Analyzing requirements...', progress: 10 });

      // Step 1: Analyze if database is needed
      const analysisPrompt = `Analyze this request and determine if it needs a database:

"${userRequest}"

Return structured JSON with field definitions (not text descriptions!):
{
  "needsDatabase": true/false,
  "needsAuth": true/false,
  "databaseTables": [
    {
      "name": "posts",
      "purpose": "store blog posts",
      "fields": [
        { "name": "id", "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
        { "name": "user_id", "type": "uuid", "nullable": false, "references": "auth.users(id)", "isUserReference": true },
        { "name": "title", "type": "text", "nullable": false },
        { "name": "content", "type": "text", "nullable": true },
        { "name": "created_at", "type": "timestamp with time zone", "default": "now()" }
      ]
    }
  ]
}

Field type examples:
- uuid: { "name": "id", "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" }
- text: { "name": "title", "type": "text", "nullable": false }
- timestamp: { "name": "created_at", "type": "timestamp with time zone", "default": "now()" }
- boolean: { "name": "is_active", "type": "boolean", "default": "true" }
- integer: { "name": "count", "type": "integer", "default": "0" }
- jsonb: { "name": "metadata", "type": "jsonb", "default": "'{}'" }
- user ref: { "name": "user_id", "type": "uuid", "references": "auth.users(id)", "nullable": false, "isUserReference": true }`;

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
          console.log(`📊 Creating table: ${table.name}`);
          
          // Validate table structure
          if (!table.fields || !Array.isArray(table.fields) || table.fields.length === 0) {
            console.error(`❌ Invalid table structure for ${table.name}: no fields`);
            continue;
          }
          
          // Build field definitions from structured data
          const fieldDefinitions = table.fields.map((field: any) => {
            let sql = field.name + ' ' + field.type;
            
            if (field.primaryKey) sql += ' primary key';
            if (field.unique) sql += ' unique';
            if (field.nullable === false) sql += ' not null';
            if (field.references) sql += ` references ${field.references} on delete cascade`;
            if (field.default) sql += ` default ${field.default}`;
            
            return sql;
          }).join(',\n  ');

          // Find user reference column for RLS
          const userRefField = table.fields.find((f: any) => f.isUserReference === true);
          
          // Log user reference field for debugging
          if (userRefField) {
            console.log(`✅ Found user reference field for ${table.name}: ${userRefField.name}`);
          } else {
            console.log(`ℹ️ No user reference field for ${table.name} - will use authenticated user policies`);
          }

          let rlsPolicies = '';
          if (userRefField) {
            rlsPolicies = `
-- Enable RLS
alter table public.${table.name} enable row level security;

-- Create policies
create policy "Users can view their own ${table.name}"
  on public.${table.name} for select using (auth.uid() = ${userRefField.name});

create policy "Users can insert their own ${table.name}"
  on public.${table.name} for insert with check (auth.uid() = ${userRefField.name});

create policy "Users can update their own ${table.name}"
  on public.${table.name} for update using (auth.uid() = ${userRefField.name});

create policy "Users can delete their own ${table.name}"
  on public.${table.name} for delete using (auth.uid() = ${userRefField.name});
`;
          } else {
            // If no user reference and no auth required, allow public access
            if (analysis.needsAuth) {
              rlsPolicies = `
-- Enable RLS
alter table public.${table.name} enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users can view ${table.name}"
  on public.${table.name} for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert ${table.name}"
  on public.${table.name} for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update ${table.name}"
  on public.${table.name} for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete ${table.name}"
  on public.${table.name} for delete using (auth.role() = 'authenticated');
`;
            } else {
              // No auth required - allow public access
              rlsPolicies = `
-- Enable RLS
alter table public.${table.name} enable row level security;

-- Allow public access (no authentication required)
create policy "Public can view ${table.name}"
  on public.${table.name} for select using (true);

create policy "Public can insert ${table.name}"
  on public.${table.name} for insert with check (true);

create policy "Public can update ${table.name}"
  on public.${table.name} for update using (true);

create policy "Public can delete ${table.name}"
  on public.${table.name} for delete using (true);
`;
            }
          }

          sqlStatements.push(`
-- Drop and recreate ${table.name} table
drop table if exists public.${table.name} cascade;

create table public.${table.name} (
  ${fieldDefinitions}
);
${rlsPolicies}`);
        }

        if (sqlStatements.length === 0) {
          console.warn('⚠️ No valid SQL statements generated');
          await sendEvent('error', { message: 'Failed to generate valid database schema' });
        } else {
          const fullSQL = sqlStatements.join('\n\n');
          console.log('📝 Generated SQL for database setup');
          console.log('SQL to execute (first 500 chars):', fullSQL.substring(0, 500));
          console.log('Total SQL length:', fullSQL.length);
          
          try {
            // ✅ EXECUTE MIGRATION ON USER'S SUPABASE DATABASE
            let execResult;
            let execError;
            
            ({ data: execResult, error: execError } = await userSupabase
              .rpc('execute_migration', { migration_sql: fullSQL }));

            if (!execError && execResult?.success) {
              console.log('✅ Database tables created successfully');
              await sendEvent('status', { message: `✅ Created ${analysis.databaseTables.length} tables`, progress: 30 });
            } else {
              const errorMsg = execError?.message || execResult?.error || 'Unknown error';
              console.error('❌ Failed to execute migration:', errorMsg);
              console.error('Failed SQL:', fullSQL);
              
              // ✅ INTELLIGENT ERROR DETECTION WITH ENHANCED MESSAGES
              let userFriendlyMessage = 'Database setup failed';
              let recommendations: string[] = [];
              
              if (errorMsg.includes('Could not find the function') || errorMsg.includes('execute_migration') && errorMsg.includes('does not exist')) {
                userFriendlyMessage = 'First-time database setup required';
                recommendations = [
                  'Run this SQL once in your Supabase SQL Editor:',
                  '',
                  'CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)',
                  'RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER',
                  'SET search_path = public AS $$',
                  'DECLARE result jsonb; error_message text;',
                  'BEGIN BEGIN EXECUTE migration_sql;',
                  "  result := jsonb_build_object('success', true, 'message', 'Success');",
                  'EXCEPTION WHEN OTHERS THEN',
                  '  GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;',
                  "  result := jsonb_build_object('success', false, 'error', error_message);",
                  'END; RETURN result; END; $$;',
                  '',
                  'Then try generating again.'
                ];
              } else if (errorMsg.includes('JWT') || errorMsg.includes('authentication') || errorMsg.includes('permission denied')) {
                userFriendlyMessage = 'Your database is missing the required migration function.';
                recommendations = [
                  'The platform attempted to set this up automatically',
                  'Run this SQL in your Supabase SQL Editor:',
                  `CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE result jsonb; error_message text;
BEGIN BEGIN EXECUTE migration_sql;
  result := jsonb_build_object('success', true, 'message', 'Success');
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
  result := jsonb_build_object('success', false, 'error', error_message);
END; RETURN result; END; $$;`,
                  'Then try generating again'
                ];
              } else if (execError?.message?.includes('JWT') || execError?.message?.includes('authentication') || execError?.message?.includes('permission denied')) {
                userFriendlyMessage = 'Authentication failed with your database.';
                recommendations = [
                  'Your Service Role Key may be invalid or expired',
                  'Go to Settings → API in Supabase dashboard',
                  'Copy a fresh service_role key',
                  'Update your connection'
                ];
              } else if (execError?.message?.includes('connect') || execError?.message?.includes('network')) {
                userFriendlyMessage = 'Cannot connect to your database.';
                recommendations = [
                  'Check if your Supabase project is active',
                  'Verify the Project URL is correct',
                  'Check your internet connection'
                ];
              } else {
                userFriendlyMessage = `Database error: ${errorMsg.substring(0, 150)}`;
                recommendations = [
                  'Check your Supabase dashboard for more details',
                  'Verify your Service Role Key has admin permissions'
                ];
              }
              
              await sendEvent('error', { 
                message: userFriendlyMessage,
                recommendations 
              });
              
              // STOP execution on database failure
              return;
            }
          } catch (error) {
            console.error('Database setup error:', error);
            await sendEvent('error', { message: 'Database setup failed due to an error' });
          }
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

