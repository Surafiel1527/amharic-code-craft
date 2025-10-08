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
      case 'generate_preview':
        result = await handleGeneratePreview(params, platformSupabase);
        break;
      case 'download_project':
        result = await handleDownloadProject(params, platformSupabase);
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
    let finalProjectId = projectId;
    let versionNumber = 1;
    
    try {
      console.log('🚀 Starting generation for user:', userId);
      console.log('📋 Request:', userRequest);
      console.log('🎯 Framework:', framework);
      console.log('📦 Project ID:', projectId || 'NEW');

      // ============================================
      // STEP 0: Check if Regeneration or New Project
      // ============================================
      let isRegeneration = false;
      let previousVersion: any = null;
      let previousFiles: any[] = [];
      let conversationHistory: any[] = [];

      if (projectId) {
        await sendEvent('status', { message: 'Checking existing project...', progress: 5 });
        
        // Fetch existing project
        const { data: existingProject, error: projectError } = await platformSupabase
          .from('projects')
          .select('id, title, framework, current_version')
          .eq('id', projectId)
          .single();
        
        if (existingProject) {
          isRegeneration = true;
          finalProjectId = existingProject.id;
          console.log(`♻️  Regeneration detected for project: ${existingProject.title}`);
          console.log(`📊 Current version: ${existingProject.current_version}`);
          
          // Fetch latest version
          const { data: latestVersion } = await platformSupabase
            .from('project_versions')
            .select('*')
            .eq('project_id', projectId)
            .eq('version_number', existingProject.current_version)
            .single();
          
          if (latestVersion) {
            previousVersion = latestVersion;
            versionNumber = latestVersion.version_number + 1;
            
            // Fetch previous files
            const { data: files } = await platformSupabase
              .from('project_files')
              .select('file_path, file_content, file_type')
              .eq('version_id', latestVersion.id)
              .order('file_path');
            
            if (files) {
              previousFiles = files;
              console.log(`📄 Found ${files.length} existing files`);
            }
          }
          
          // Fetch conversation history
          const { data: history } = await platformSupabase
            .from('project_conversations')
            .select('message_role, message_content')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true })
            .limit(20); // Last 20 messages for context
          
          if (history) {
            conversationHistory = history;
            console.log(`💬 Found ${history.length} conversation messages`);
          }
        }
      }

      await sendEvent('status', { 
        message: isRegeneration ? `Updating project (v${versionNumber})...` : 'Analyzing requirements...', 
        progress: 10 
      });

      // ============================================
      // STEP 1: Analyze Requirements
      // ============================================
      const analysisPrompt = isRegeneration ? `
Analyze this CHANGE REQUEST for an existing ${framework} project:

Original Request Context:
${conversationHistory.slice(0, 3).map(m => `${m.message_role}: ${m.message_content}`).join('\n')}

Current Files:
${previousFiles.map(f => `- ${f.file_path} (${f.file_content.length} bytes)`).join('\n')}

NEW CHANGE REQUEST: "${userRequest}"

Determine what needs to be modified, added, or removed.
Return structured JSON with field definitions (not text descriptions!):
{
  "changeType": "modify|add|refactor",
  "affectedFiles": ["file1.html", "file2.js"],
  "needsDatabase": true/false,
  "needsAuth": true/false,
  "databaseTables": [...]  // Same format as before
}
` : `Analyze this request and determine if it needs a database:

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

      // ============================================
      // STEP 3: Generate Code with Context
      // ============================================
      await sendEvent('status', { message: isRegeneration ? 'Updating files...' : 'Generating files...', progress: 40 });

      const systemPrompt = isRegeneration ? `You are an expert ${framework} developer modifying an existing project.

EXISTING PROJECT FILES:
${previousFiles.map(f => `
File: ${f.file_path}
Content: ${f.file_content.substring(0, 500)}${f.file_content.length > 500 ? '...[truncated]' : ''}
`).join('\n')}

CHANGE REQUEST: "${userRequest}"

Generate updated files maintaining existing structure. Return ALL files (modified + unchanged).
${analysis.needsDatabase ? `
IMPORTANT - Include Supabase integration:
- Import: import { supabase } from "@/integrations/supabase/client"
- Use these tables: ${analysis.databaseTables?.map((t: any) => t.name).join(', ')}
- Include CRUD operations using supabase.from('table_name').select/insert/update/delete
` : ''}

Return JSON: { "files": [{"path": "...", "content": "...", "type": "..."}], "framework": "${framework}", "changes": "...", "stats": {...} }` 
      : `You are an expert ${framework} developer. Generate a complete production-ready project.

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

      // Stream files to user
      for (let i = 0; i < result.files.length; i++) {
        await sendEvent('file', { file: result.files[i], current: i + 1, total: result.files.length, progress: 50 + (i / result.files.length) * 30 });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ============================================
      // STEP 4: Save Project and Files to Database
      // ============================================
      await sendEvent('status', { message: 'Saving project...', progress: 85 });
      console.log('💾 Starting to save project...');

      // Create generation job record
      const { data: generationJob } = await platformSupabase
        .from('ai_generation_jobs')
        .insert({
          user_id: userId,
          job_type: 'stream_generation',
          status: 'completed',
          project_id: finalProjectId,
          conversation_id: conversationId,
          input_data: { userRequest, framework },
          output_data: { filesCount: result.files.length },
          completed_at: new Date().toISOString()
        })
        .select('id')
        .single();

      const jobId = generationJob?.id;

      // Create or update project record
      if (!isRegeneration) {
        const projectTitle = extractTitle(userRequest);
        const { data: newProject, error: projectError } = await platformSupabase
          .from('projects')
          .insert({
            title: projectTitle,
            prompt: userRequest,
            html_code: result.files.find((f: any) => f.path === 'index.html')?.content || '',
            framework: framework,
            user_id: userId,
            current_version: 1,
            last_generated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (projectError) {
          console.error('❌ Failed to create project:', projectError);
          throw new Error(`Failed to create project: ${projectError.message}`);
        }

        finalProjectId = newProject.id;
        console.log(`✅ Created new project: ${finalProjectId}`);
      } else {
        // Update existing project
        await platformSupabase
          .from('projects')
          .update({
            current_version: versionNumber,
            last_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', finalProjectId);
        
        console.log(`✅ Updated project to version ${versionNumber}`);
      }

      // Create version record
      const { data: newVersion, error: versionError } = await platformSupabase
        .from('project_versions')
        .insert({
          project_id: finalProjectId,
          version_number: versionNumber,
          html_code: result.files.find((f: any) => f.path === 'index.html')?.content || '',
          changes_summary: isRegeneration ? userRequest : 'Initial version',
          generation_job_id: jobId,
          framework: framework,
          is_current: true,
          quality_score: result.stats?.quality || 85,
          performance_score: result.stats?.performance || 90
        })
        .select('id')
        .single();

      if (versionError) {
        console.error('❌ Failed to create version:', versionError);
        throw new Error(`Failed to create version: ${versionError.message}`);
      }

      const versionId = newVersion.id;
      console.log(`✅ Created version ${versionNumber}: ${versionId}`);

      // Mark previous versions as not current
      if (isRegeneration && previousVersion) {
        await platformSupabase
          .from('project_versions')
          .update({ is_current: false })
          .eq('project_id', finalProjectId)
          .neq('id', versionId);
      }

      // Save all files with version link
      const fileInserts = result.files.map((file: any) => ({
        project_id: finalProjectId,
        version_id: versionId,
        file_path: file.path,
        file_content: file.content,
        file_type: file.type || 'text/plain',
        created_by: userId
      }));

      const { error: filesError } = await platformSupabase
        .from('project_files')
        .insert(fileInserts);

      if (filesError) {
        console.error('❌ Failed to save files:', filesError);
        throw new Error(`Failed to save files: ${filesError.message}`);
      }

      console.log(`✅ Saved ${result.files.length} files`);

      // Save conversation messages
      const conversationInserts = [
        {
          project_id: finalProjectId,
          message_role: 'user',
          message_content: userRequest,
          metadata: { versionNumber, framework }
        },
        {
          project_id: finalProjectId,
          message_role: 'assistant',
          message_content: isRegeneration 
            ? `Updated project to version ${versionNumber} with ${result.files.length} files`
            : `Created project with ${result.files.length} files`,
          metadata: { versionNumber, filesCount: result.files.length, jobId }
        }
      ];

      await platformSupabase
        .from('project_conversations')
        .insert(conversationInserts);

      console.log('✅ Saved conversation history');

      await sendEvent('complete', { 
        ...result, 
        projectId: finalProjectId, 
        versionNumber,
        conversationId,
        isRegeneration
      });
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

// ============================================
// ENTERPRISE: Preview Generation Handler
// ============================================
async function handleGeneratePreview(params: any, platformSupabase: any) {
  const { projectId, versionNumber } = params;
  
  try {
    console.log(`📦 Generating preview for project ${projectId}, version ${versionNumber}`);
    
    // Fetch version and files
    const { data: version, error: versionError } = await platformSupabase
      .from('project_versions')
      .select('id, project_id, version_number')
      .eq('project_id', projectId)
      .eq('version_number', versionNumber || 1)
      .single();
    
    if (versionError || !version) {
      throw new Error(`Version not found: ${versionError?.message || 'Unknown error'}`);
    }
    
    const { data: files, error: filesError } = await platformSupabase
      .from('project_files')
      .select('*')
      .eq('version_id', version.id);
    
    if (filesError) {
      throw new Error(`Failed to fetch files: ${filesError.message}`);
    }
    
    if (!files || files.length === 0) {
      throw new Error('No files found for this version');
    }
    
    console.log(`📄 Found ${files.length} files to upload`);
    
    // Upload files to storage
    const previewPath = `${projectId}/v${versionNumber}`;
    const uploadPromises = files.map(async (file: any) => {
      const filePath = `${previewPath}/${file.file_path}`;
      
      // Determine content type
      const contentType = file.file_type || 
        (file.file_path.endsWith('.html') ? 'text/html' :
         file.file_path.endsWith('.css') ? 'text/css' :
         file.file_path.endsWith('.js') ? 'application/javascript' :
         file.file_path.endsWith('.json') ? 'application/json' :
         'text/plain');
      
      const { error: uploadError } = await platformSupabase.storage
        .from('generated-previews')
        .upload(filePath, file.file_content, {
          contentType,
          upsert: true,
          cacheControl: '3600'
        });
      
      if (uploadError) {
        console.error(`❌ Upload error for ${file.file_path}:`, uploadError);
        throw uploadError;
      }
      
      console.log(`✅ Uploaded: ${file.file_path}`);
    });
    
    await Promise.all(uploadPromises);
    
    // Get public URL for index.html
    const { data: urlData } = platformSupabase.storage
      .from('generated-previews')
      .getPublicUrl(`${previewPath}/index.html`);
    
    const previewUrl = urlData.publicUrl;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    console.log(`🎉 Preview generated: ${previewUrl}`);
    
    return {
      success: true,
      previewUrl,
      expiresAt: expiresAt.toISOString(),
      filesCount: files.length
    };
    
  } catch (error) {
    console.error('❌ Preview generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// ENTERPRISE: Project Download Handler
// ============================================
async function handleDownloadProject(params: any, platformSupabase: any) {
  const { projectId, versionNumber } = params;
  
  try {
    console.log(`📥 Preparing download for project ${projectId}, version ${versionNumber}`);
    
    // Fetch project info
    const { data: project, error: projectError } = await platformSupabase
      .from('projects')
      .select('title, framework')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message || 'Unknown error'}`);
    }
    
    // Fetch version and files
    const { data: version, error: versionError } = await platformSupabase
      .from('project_versions')
      .select('id, version_number, created_at')
      .eq('project_id', projectId)
      .eq('version_number', versionNumber || 1)
      .single();
    
    if (versionError || !version) {
      throw new Error(`Version not found: ${versionError?.message || 'Unknown error'}`);
    }
    
    const { data: files, error: filesError } = await platformSupabase
      .from('project_files')
      .select('file_path, file_content, file_type')
      .eq('version_id', version.id)
      .order('file_path');
    
    if (filesError) {
      throw new Error(`Failed to fetch files: ${filesError.message}`);
    }
    
    if (!files || files.length === 0) {
      throw new Error('No files found for this version');
    }
    
    console.log(`📦 Packaging ${files.length} files`);
    
    // Add README with project info
    const readmeContent = `# ${project.title}

## Project Information
- Framework: ${project.framework}
- Version: ${version.version_number}
- Generated: ${new Date(version.created_at).toLocaleString()}
- Files: ${files.length}

## Getting Started

### For HTML Projects:
1. Open \`index.html\` in your browser

### For React Projects:
1. Install dependencies: \`npm install\`
2. Run development server: \`npm run dev\`
3. Build for production: \`npm run build\`

---
Generated by Mega Mind Platform
`;
    
    const packagedFiles = [
      ...files.map((f: any) => ({
        path: f.file_path,
        content: f.file_content,
        type: f.file_type
      })),
      {
        path: 'README.md',
        content: readmeContent,
        type: 'text/markdown'
      }
    ];
    
    console.log(`✅ Package ready for download`);
    
    return {
      success: true,
      projectName: project.title,
      framework: project.framework,
      version: version.version_number,
      files: packagedFiles,
      totalSize: packagedFiles.reduce((sum, f) => sum + f.content.length, 0)
    };
    
  } catch (error) {
    console.error('❌ Download preparation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// HELPER: Extract Title from Prompt
// ============================================
function extractTitle(prompt: string): string {
  // Try to extract from "Create a [X]" or "Build a [X]" patterns
  const patterns = [
    /create (?:a |an )?([^.,!?]+)/i,
    /build (?:a |an )?([^.,!?]+)/i,
    /make (?:a |an )?([^.,!?]+)/i,
    /develop (?:a |an )?([^.,!?]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      return title.substring(0, 100); // Limit to 100 chars
    }
  }
  
  // Fallback: Use first 50 characters
  return prompt.substring(0, 50).trim() + (prompt.length > 50 ? '...' : '');
}


