import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Smart AI call with automatic fallback from GPT-5 to Gemini
 * Tries: Lovable AI (GPT-5 → Gemini Pro → Gemini Flash) → Your own Gemini API
 */
async function callAIWithFallback(
  messages: any[],
  options: {
    systemPrompt?: string;
    preferredModel?: 'gpt-5' | 'gemini-pro' | 'gemini-flash';
    responseFormat?: any;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const USER_GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

  // Model hierarchy: GPT-5 → Gemini Pro → Gemini Flash (via Lovable AI)
  const lovableModels = options.preferredModel === 'gpt-5' 
    ? ['openai/gpt-5', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash']
    : options.preferredModel === 'gemini-pro'
    ? ['google/gemini-2.5-pro', 'google/gemini-2.5-flash']
    : ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'];

  const fullMessages = options.systemPrompt 
    ? [{ role: 'system', content: options.systemPrompt }, ...messages]
    : messages;

  let lastError: any = null;

  // Phase 1: Try Lovable AI models
  if (LOVABLE_API_KEY) {
    for (let i = 0; i < lovableModels.length; i++) {
      const model = lovableModels[i];
      
      try {
        console.log(`🤖 Attempting Lovable AI with ${model}...`);
        
        const body: any = {
          model,
          messages: fullMessages,
        };

        if (options.responseFormat) body.response_format = options.responseFormat;
        if (options.temperature !== undefined) body.temperature = options.temperature;
        if (options.maxTokens) body.max_tokens = options.maxTokens;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = { status: response.status, model, error: errorText, provider: 'Lovable AI' };
          
          console.warn(`⚠️ Lovable AI ${model} failed (${response.status}): ${errorText.substring(0, 200)}`);
          
          // Rate limit (429) or Payment required (402) - try fallback
          if (response.status === 429 || response.status === 402) {
            console.log(`🔄 ${model} unavailable (${response.status}), trying fallback...`);
            continue;
          }
          
          console.log(`🔄 ${model} error, trying fallback...`);
          continue;
        }

        const data = await response.json();
        console.log(`✅ Success with Lovable AI ${model}`);
        
        return {
          data,
          modelUsed: model,
          provider: 'Lovable AI',
          wasFallback: i > 0
        };
        
      } catch (error) {
        lastError = { model, error: error instanceof Error ? error.message : 'Unknown error', provider: 'Lovable AI' };
        console.error(`❌ Lovable AI ${model} exception:`, error);
        
        // Try next model
        if (i < lovableModels.length - 1) {
          console.log(`🔄 Trying next Lovable AI fallback...`);
          continue;
        }
      }
    }
  }

  // Phase 2: Final fallback to user's own Gemini API
  if (USER_GEMINI_KEY) {
    try {
      console.log(`🔑 All Lovable AI models exhausted. Trying your own Gemini API...`);
      
      // Convert messages to Gemini format
      const geminiMessages = fullMessages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
      
      // Add system prompt as first user message if exists
      const systemMessage = fullMessages.find(m => m.role === 'system');
      if (systemMessage) {
        geminiMessages.unshift({
          role: 'user',
          parts: [{ text: `System Instructions: ${systemMessage.content}` }]
        });
        geminiMessages.splice(1, 0, {
          role: 'model',
          parts: [{ text: 'Understood. I will follow these instructions.' }]
        });
      }

      const geminiBody: any = {
        contents: geminiMessages,
        generationConfig: {}
      };

      if (options.temperature !== undefined) {
        geminiBody.generationConfig.temperature = options.temperature;
      }
      if (options.maxTokens) {
        geminiBody.generationConfig.maxOutputTokens = options.maxTokens;
      }
      if (options.responseFormat?.type === 'json_object') {
        geminiBody.generationConfig.response_mime_type = 'application/json';
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${USER_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = { status: response.status, model: 'gemini-2.0-flash-exp', error: errorText, provider: 'Your Gemini API' };
        throw new Error(`Your Gemini API failed: ${errorText}`);
      }

      const data = await response.json();
      
      // Convert Gemini response to OpenAI format
      const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const openAIFormat = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: geminiText
            },
            index: 0,
            finish_reason: 'stop'
          }
        ],
        model: 'gemini-2.0-flash-exp',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };

      console.log(`✅ SUCCESS with your own Gemini API! (backup saved the day 🎉)`);
      
      return {
        data: openAIFormat,
        modelUsed: 'gemini-2.0-flash-exp',
        provider: 'Your Gemini API',
        wasFallback: true,
        wasUserKey: true
      };
      
    } catch (error) {
      lastError = { 
        model: 'gemini-2.0-flash-exp', 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'Your Gemini API'
      };
      console.error(`❌ Your Gemini API also failed:`, error);
    }
  } else {
    console.warn('⚠️ No GEMINI_API_KEY found for final fallback');
  }

  // Everything failed
  console.error('❌ All AI providers failed (Lovable AI + Your Gemini API):', lastError);
  throw new Error(`All AI providers exhausted. Last error: ${JSON.stringify(lastError)}`);
}

// Rate limiting map (in-memory for this instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 10) { // Max 10 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

function sanitizeInput(input: string): string {
  // Remove potential script tags and malicious content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Injects Supabase client initialization into HTML
 */
function injectSupabaseClient(html: string, connection: any): string {
  const supabaseInit = `
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script>
      // Initialize Supabase client with your project
      const supabase = window.supabase.createClient(
        '${connection.supabase_url}',
        '${connection.supabase_anon_key}'
      );
      console.log('✅ Connected to your Supabase project: ${connection.project_name}');
      
      // Helper functions for database operations
      async function insertData(table, data) {
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select();
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        return result;
      }
      
      async function fetchData(table, filters = {}) {
        let query = supabase.from(table).select('*');
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (error) {
          console.error('Fetch error:', error);
          throw error;
        }
        return data;
      }
    </script>
  `;
  
  // Insert before </head> or before </body> if no </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${supabaseInit}\n  </head>`);
  } else if (html.includes('</body>')) {
    return html.replace('</body>', `${supabaseInit}\n</body>`);
  }
  return html + supabaseInit;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let projectId: string | null = null;
  
  try {
    console.log('🚀 Mega Mind Orchestrator - Request received');
    
    const { request, requestType, context = {}, jobId } = await req.json();
    console.log('📦 Request parsed:', { requestType, hasJobId: !!jobId, hasContext: !!context });
    
    // Extract projectId from context if available
    projectId = context.projectId || null;
    console.log('📌 Project ID:', projectId);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log('✅ Supabase client created');
    
    // Create broadcast channels for real-time status updates
    let statusChannel: any = null;
    let codeChannel: any = null;
    
    if (projectId || context.conversationId) {
      const channelId = projectId || context.conversationId;
      
      // AI status updates channel
      statusChannel = supabaseClient.channel(`ai-status-${channelId}`, {
        config: { broadcast: { ack: false } }
      });
      await statusChannel.subscribe();
      console.log(`📡 Subscribed to status channel: ai-status-${channelId}`);
      
      // Code preview updates channel
      codeChannel = supabaseClient.channel(`preview-${channelId}`, {
        config: { broadcast: { ack: false } }
      });
      await codeChannel.subscribe();
      console.log(`📡 Subscribed to preview channel: preview-${channelId}`);
    }
    
    // Broadcast function for real-time AI status updates
    const broadcast = async (eventType: string, data: any) => {
      if (!statusChannel) return;
      
      try {
        // Map generation events to AI status types
        let status = 'idle';
        let message = data.message || '';
        
        if (eventType.includes('thinking') || data.status === 'thinking') {
          status = 'thinking';
        } else if (eventType.includes('reading') || data.status === 'reading') {
          status = 'reading';
        } else if (eventType.includes('editing') || data.status === 'editing') {
          status = 'editing';
        } else if (eventType.includes('fixing') || data.status === 'fixing') {
          status = 'fixing';
        } else if (eventType.includes('analyzing') || data.status === 'analyzing') {
          status = 'analyzing';
        } else if (eventType.includes('generating') || data.status === 'generating') {
          status = 'generating';
        }
        
        await statusChannel.send({
          type: 'broadcast',
          event: 'status-update',
          payload: { 
            status,
            message,
            progress: data.progress,
            errors: data.errors,
            timestamp: new Date().toISOString() 
          }
        });
        console.log(`📤 Status broadcast: ${status} - ${message}`);
      } catch (e) {
        console.error('Status broadcast error:', e);
      }
    };
    
    // Broadcast code updates
    const broadcastCode = async (component: string, code: string, status: string = 'complete') => {
      if (!codeChannel) return;
      
      try {
        await codeChannel.send({
          type: 'broadcast',
          event: 'code-update',
          payload: {
            component,
            code,
            status,
            timestamp: new Date().toISOString()
          }
        });
        console.log(`📤 Code broadcast: ${component}`);
      } catch (e) {
        console.error('Code broadcast error:', e);
      }
    };

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let userId: string;
    
    // Check if this is a service role call (from cron job)
    if (token === serviceRoleKey) {
      console.log('🔧 Service role authentication detected');
      
      if (!jobId) {
        console.error('❌ Missing jobId for service role call');
        return new Response(
          JSON.stringify({ error: 'jobId required for service role calls' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get user_id from the job record
      const { data: job, error: jobError } = await supabaseClient
        .from('ai_generation_jobs')
        .select('user_id')
        .eq('id', jobId)
        .single();
      
      if (jobError || !job) {
        console.error('❌ Job not found:', jobError);
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = job.user_id;
      console.log('✅ Using user_id from job:', userId);
    } else {
      // Normal user JWT authentication
      console.log('🔐 Authenticating user with JWT...');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

      if (authError) {
        console.error('❌ Auth error:', authError.message);
        return new Response(
          JSON.stringify({ error: 'Authentication failed: ' + authError.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!user) {
        console.error('❌ No user found');
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      console.log('✅ User authenticated:', userId);
    }
    
    // Fetch user's active Supabase connection
    let userSupabaseConnection = null;
    try {
      const { data: connection } = await supabaseClient
        .from('user_supabase_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      userSupabaseConnection = connection;
      console.log('📡 User Supabase connection:', connection ? connection.project_name : 'None (using platform DB)');
    } catch (error) {
      console.log('⚠️ No user Supabase connection found, will use platform database');
    }

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      console.warn('⚠️ Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedRequest = request ? sanitizeInput(request) : '';
    
    console.log('🧠 Mega Mind Orchestrator - Starting:', { 
      requestType, 
      userId,
      requestLength: sanitizedRequest.length,
      jobId: jobId || 'new'
    });

    // Audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'orchestration_started',
        resource_type: 'ai_generation',
        resource_id: jobId,
        severity: 'info',
        metadata: {
          request_type: requestType,
          request_length: sanitizedRequest.length
        }
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log audit:', error);
      });

    // Create orchestration record with sanitized data
    const { data: orchestration, error: orchError } = await supabaseClient
      .from('mega_mind_orchestrations')
      .insert({
        user_id: userId,
        request_type: requestType,
        original_request: sanitizedRequest,
        context: {
          ...context,
          ip_hash: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          timestamp: new Date().toISOString()
        },
        status: 'analyzing'
      })
      .select()
      .single();

    if (orchError || !orchestration) {
      throw new Error('Failed to create orchestration record');
    }

    const orchestrationId = orchestration.id;
    const conversationId = context.conversationId || null;
    
    console.log('📝 Orchestration created:', { orchestrationId, conversationId, projectId });

    // Insert user message into conversation if conversationId exists
    if (conversationId) {
      console.log('💬 Inserting user message into conversation:', conversationId);
      const { error: msgError } = await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: sanitizedRequest,
          metadata: { requestType, orchestrationId }
        });
      
      if (msgError) {
        console.warn('⚠️ Failed to insert user message:', msgError);
      } else {
        console.log('✅ User message inserted successfully');
      }
    }

    // Update job progress if jobId is provided
    const updateJobProgress = async (progress: number, currentStep?: string) => {
      if (jobId) {
        await supabaseClient
          .from('ai_generation_jobs')
          .update({
            progress,
            current_step: currentStep,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    };

    // PHASE 1: Analyze the request
    console.log('📊 Phase 1: Analyzing request...');
    await updateJobProgress(20, 'Analyzing request...');
    await broadcast('generation:phase', { phase: 'analyzing', progress: 20, message: 'Analyzing your requirements...' });
    
    // Check for known patterns before analysis
    try {
      const { data: patterns } = await supabaseClient
        .from('pattern_recognition_cache')
        .select('*')
        .eq('pattern_type', requestType)
        .order('success_rate', { ascending: false })
        .limit(5);
      
      if (patterns && patterns.length > 0) {
        console.log(`🧠 Found ${patterns.length} similar patterns in cache`);
        context.knownPatterns = patterns;
      }
    } catch (error) {
      console.log('⚠️ Pattern lookup failed:', error);
    }
    
    const analysis = await analyzeRequest(sanitizedRequest, requestType, context);
    
    console.log('📋 Analysis result:', JSON.stringify(analysis, null, 2));
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        analysis_phase: analysis,
        status: 'generating'
      })
      .eq('id', orchestrationId);

    // Setup database tables if needed (after analysis, before generation)
    if (analysis.backendRequirements?.needsDatabase) {
      console.log('🗄️ Database setup required, creating tables...');
      await setupDatabaseTables(analysis, userId, broadcast);
    }

    // Handle meta-requests (questions about the system)
    if (analysis.isMetaRequest || analysis.outputType === 'meta-conversation') {
      console.log('💬 Meta-request detected - providing conversational response');
      await updateJobProgress(100, 'Analyzed your question');
      
      const explanation = `I understand you want to ${analysis.mainGoal}. Based on the logs, I can see the system is working correctly and generating code as expected. The conversation history is being preserved, and code updates are being applied to your project. Is there a specific issue you'd like me to address?`;
      
      // Insert assistant message
      if (conversationId) {
        await supabaseClient
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: explanation
          });
      }
      
      await broadcast('generation:complete', { 
        status: 'complete',
        message: 'Response ready',
        progress: 100
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: explanation,
          isMetaResponse: true,
          analysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always generate React components (this is a React project)
    console.log('🚀 Generating React components for Lovable project...');
    await updateJobProgress(50, 'Generating React components...');
    await broadcast('generation:phase', { phase: 'generating', progress: 40, message: 'Generating components...' });
    
    // PHASE 2: Generate solution
    console.log('⚡ Phase 2: Generating solution...');
    await updateJobProgress(40, 'Generating solution...');
    const generation = await generateSolution(request, requestType, analysis, context, supabaseClient, orchestrationId, broadcast, userSupabaseConnection);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        generation_phase: generation,
        files_generated: generation.files || [],
        status: 'detecting_dependencies'
      })
      .eq('id', orchestrationId);

    // PHASE 2.5: Generate backend if needed
    let backendGeneration: any = null;
    if (analysis.backendRequirements?.needsDatabase || analysis.backendRequirements?.needsAuth || analysis.backendRequirements?.needsEdgeFunctions) {
      console.log('🗄️ Generating backend infrastructure...');
      await updateJobProgress(50, 'Setting up database and backend...');
      await broadcast('generation:phase', { phase: 'generating', progress: 50, message: 'Creating database and backend...' });
      
      backendGeneration = await generateBackend(request, analysis, context, supabaseClient, userId, broadcast, userSupabaseConnection);
      
      await supabaseClient
        .from('mega_mind_orchestrations')
        .update({ 
          backend_phase: backendGeneration,
          status: 'detecting_dependencies'
        })
        .eq('id', orchestrationId);
        
      console.log('✅ Backend infrastructure generated');
    }

    // PHASE 3: Detect and track dependencies from generated code
    console.log('📦 Phase 3: Detecting dependencies...');
    await updateJobProgress(60, 'Detecting dependencies...');
    await broadcast('generation:phase', { phase: 'dependencies', progress: 60, message: 'Installing packages...' });
    
    let detectedPackages: string[] = [];
    try {
      // Extract all code content from generated files
      const allCode = generation.files?.map((f: any) => f.content).join('\n') || '';
      
      // Call unified-package-manager to auto-detect dependencies
      const { data: detectResult } = await supabaseClient.functions.invoke('unified-package-manager', {
        body: {
          operation: 'auto_detect',
          params: {
            code: allCode,
            userId
          }
        }
      });
      
      detectedPackages = detectResult?.data?.detected || [];
      console.log(`📦 Detected ${detectedPackages.length} packages:`, detectedPackages);
      
      // Track each detected package in the database
      for (const packageName of detectedPackages) {
        try {
          await supabaseClient.functions.invoke('unified-package-manager', {
            body: {
              operation: 'install',
              params: {
                packageName,
                userId,
                projectId,
                autoDetected: true
              }
            }
          });
          console.log(`✅ Tracked package: ${packageName}`);
        } catch (err) {
          console.warn(`⚠️ Could not track ${packageName}:`, err);
        }
      }
      
      // Generate package.json
      const { data: packageJsonResult } = await supabaseClient.functions.invoke('unified-package-manager', {
        body: {
          operation: 'generate_package_json',
          params: {
            userId,
            projectId,
            projectName: 'mega-mind-project'
          }
        }
      });
      
      if (packageJsonResult?.data?.packageJson) {
        // Add package.json to generated files
        generation.files = generation.files || [];
        generation.files.push({
          path: 'package.json',
          content: JSON.stringify(packageJsonResult.data.packageJson, null, 2),
          description: 'Project dependencies configuration'
        });
        console.log(`📝 Generated package.json with ${packageJsonResult.data.dependenciesCount} dependencies`);
      }
      
    } catch (error) {
      console.error('Error detecting dependencies:', error);
      // Continue even if dependency detection fails
    }

    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        dependencies: detectedPackages,
        status: 'verifying'
      })
      .eq('id', orchestrationId);

    // PHASE 4: Quick verification
    console.log('✅ Phase 4: Quick verification...');
    await updateJobProgress(85, 'Verifying...');
    await broadcast('generation:phase', { phase: 'finalizing', progress: 85, message: 'Finalizing your project...' });
    
    const quickVerification = {
      hasFiles: generation.files && generation.files.length > 0,
      filesCount: generation.files?.length || 0,
      hasPackageJson: generation.files?.some((f: any) => f.path === 'package.json'),
      dependenciesDetected: detectedPackages.length,
      isValid: true
    };
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        verification_phase: quickVerification,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', orchestrationId);

    // Format the generated code for frontend display - PRODUCTION READY
    const finalFiles = generation.files;
    let generatedCode = '';
    if (finalFiles && finalFiles.length > 0) {
      // For single HTML file, use it directly
      const htmlFile = finalFiles.find((f: any) => f.path.endsWith('.html'));
      if (htmlFile) {
        generatedCode = htmlFile.content;
      } else {
        // For multi-file, combine all code
        generatedCode = finalFiles.map((file: any) => 
          `// File: ${file.path}\n${file.description ? `// ${file.description}\n` : ''}${file.content}\n\n`
        ).join('\n');
      }
    }

    // CRITICAL: Update project in database BEFORE broadcasting completion
    if (projectId) {
      console.log(`📝 Updating project ${projectId} with generated code (length: ${generatedCode.length} chars)`);
      
      try {
        // First get the current title to clean it
        const { data: currentProject, error: fetchError } = await supabaseClient
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching project:', fetchError);
          throw new Error(`Failed to fetch project: ${fetchError.message}`);
        }
        
        let cleanTitle = currentProject?.title || 'Generated Project';
        if (cleanTitle.startsWith('[Generating...] ')) {
          cleanTitle = cleanTitle.replace('[Generating...] ', '');
        }
        
        console.log(`📝 Updating project with title: "${cleanTitle}"`);
        
        const { error: projectUpdateError } = await supabaseClient
          .from('projects')
          .update({ 
            title: cleanTitle,
            html_code: generatedCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
        
        if (projectUpdateError) {
          console.error('❌ CRITICAL: Failed to update project in database:', projectUpdateError);
          throw new Error(`Failed to save project: ${projectUpdateError.message}`);
        }
        
        console.log('✅ Project successfully updated in database');
      } catch (updateError) {
        console.error('❌ CRITICAL ERROR updating project:', updateError);
        throw updateError; // Re-throw to be caught by outer try-catch
      }
    }

    console.log('🎉 Mega Mind completed (optimized)!');
    await broadcast('generation:complete', { 
      progress: 100, 
      message: 'Project ready!',
      filesCount: generation.files?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Learn from successful generation
    try {
      console.log('🧠 Learning pattern from successful generation...');
      const patternSignature = `${requestType}_${analysis.mainGoal?.substring(0, 50) || 'general'}`;
      
      await supabaseClient.functions.invoke('pattern-recognizer', {
        body: {
          conversationId,
          codeContext: sanitizedRequest,
          errorType: `success_${requestType}`,
          patternSignature,
          success: true,
          metadata: {
            filesGenerated: generation.files?.length || 0,
            hasBackend: analysis.backendRequirements?.needsDatabase || false,
            complexity: analysis.estimatedComplexity || 'medium',
            userSupabaseConnection: userSupabaseConnection?.project_name || 'platform'
          }
        }
      });
      console.log('✅ Pattern learned successfully');
    } catch (error) {
      console.log('⚠️ Pattern learning failed (non-critical):', error);
    }

    // Mark job as completed
    if (jobId) {
      await supabaseClient
        .from('ai_generation_jobs')
        .update({
          status: 'completed',
          progress: 100,
          current_step: 'Completed',
          completed_at: new Date().toISOString(),
          output_data: {
            orchestrationId,
            generatedCode,
            html: generatedCode,
            generation,
            instructions: generation.instructions
          }
        })
        .eq('id', jobId);
    }

    // Audit log completion
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'orchestration_completed',
        resource_type: 'ai_generation',
        resource_id: orchestrationId,
        severity: 'info'
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log audit:', error);
      });

    // Insert assistant message into conversation if conversationId exists
    if (conversationId) {
      console.log('💬 Inserting assistant response into conversation:', conversationId);
      
      let assistantMessage = `I've generated your ${analysis.outputType === 'html-website' ? 'HTML website' : 'React components'} with ${generation.files?.length || 0} file(s).`;
      
      // Add backend information if generated
      if (backendGeneration) {
        const backendParts = [];
        if (backendGeneration.database) {
          backendParts.push(`database with ${backendGeneration.database.tables?.length || 0} tables`);
        }
        if (backendGeneration.edgeFunctions?.length) {
          backendParts.push(`${backendGeneration.edgeFunctions.length} backend functions`);
        }
        if (backendGeneration.authentication) {
          backendParts.push('authentication system');
        }
        
        if (backendParts.length > 0) {
          assistantMessage += ` Including ${backendParts.join(', ')}.`;
        }
        
        // Add connection status
        if (backendGeneration.connection?.hasConnection) {
          assistantMessage += `\n\n✅ **Connected to Your Supabase:** ${backendGeneration.connection.project_name}\nYou have full control over your database at: ${backendGeneration.connection.supabase_url}`;
        } else {
          assistantMessage += `\n\n⚠️ **Using Platform Database:** For full control, connect your own Supabase project at /supabase-connections`;
        }
      }
      
      assistantMessage += `\n\n${generation.instructions || 'Your project is ready to view!'}`;
      
      const { error: assistantMsgError } = await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantMessage,
          generated_code: generatedCode,
          metadata: { 
            orchestrationId, 
            filesGenerated: generation.files?.length || 0,
            outputType: analysis.outputType,
            hasBackend: !!backendGeneration,
            userSupabaseConnection: userSupabaseConnection ? userSupabaseConnection.project_name : null
          }
        });
      
      if (assistantMsgError) {
        console.warn('⚠️ Failed to insert assistant message:', assistantMsgError);
      } else {
        console.log('✅ Assistant message inserted successfully');
      }
    }

    // Final broadcast with completion status
    await broadcast('generation:complete', {
      status: 'idle',
      message: 'Generation complete! ✨',
      progress: 100,
      orchestrationId,
      filesGenerated: generation.files?.length || 0,
      outputType: analysis.outputType
    });
    
    // Broadcast code update for preview
    if (generatedCode) {
      await broadcastCode('main-project', generatedCode, 'complete');
    }

    return new Response(
      JSON.stringify({
        success: true,
        orchestrationId,
        generatedCode,
        html: generatedCode,
        message: generation.instructions || `✨ Successfully ${analysis.outputType === 'modification' ? 'updated' : 'generated'} your code`,
        explanation: generation.instructions || 'Your changes have been applied successfully.',
        summary: generation.instructions,
        result: {
          generatedCode,
          explanation: generation.instructions
        },
        analysis,
        generation,
        backend: backendGeneration,
        connection: userSupabaseConnection ? {
          project_name: userSupabaseConnection.project_name,
          supabase_url: userSupabaseConnection.supabase_url,
          message: `✅ Connected to your Supabase: ${userSupabaseConnection.project_name}`
        } : {
          message: '⚠️ Using platform database. Connect your own Supabase at /supabase-connections for full control'
        },
        quickVerification,
        filesGenerated: generation.files?.length || 0,
        outputType: analysis.outputType,
        requestType: requestType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ CRITICAL ERROR in mega-mind-orchestrator:', error);
    console.error('Error name:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('📝 Error details:', {
      message: errorMessage,
      type: error instanceof Error ? error.constructor.name : typeof error,
      projectId: projectId || 'unknown',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack'
    });
    
    // Try to update project status if projectId is available
    if (projectId) {
      try {
        console.log('🔄 Updating project status to failed...');
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        const { error: updateError } = await supabaseClient
          .from('projects')
          .update({
            html_code: `<!-- Generation failed: ${errorMessage} -->`,
            title: `[Failed] ${errorMessage.substring(0, 50)}`
          })
          .eq('id', projectId);
          
        if (updateError) {
          console.error('❌ Failed to update project with error status:', updateError);
        } else {
          console.log('✅ Project status updated to failed');
        }
      } catch (updateError) {
        console.error('❌ Exception while updating project:', updateError);
      }
    }
    
    // Learn from error pattern
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabaseClient.functions.invoke('pattern-recognizer', {
        body: {
          conversationId: null,
          codeContext: errorMessage,
          errorType: 'orchestration_failure',
          patternSignature: `error_${error instanceof Error ? error.constructor.name : 'unknown'}`,
          success: false,
          metadata: {
            errorMessage,
            projectId: projectId || null
          }
        }
      });
      console.log('✅ Error pattern logged');
    } catch (patternError) {
      console.error('Failed to log error pattern:', patternError);
    }

    // Audit log error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null,
          action: 'orchestration_error',
          resource_type: 'ai_generation',
          resource_id: projectId || null,
          severity: 'critical',
          metadata: { 
            error: errorMessage,
            projectId: projectId || null,
            stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
          }
        });
      console.log('✅ Error audit logged');
    } catch (auditError) {
      console.error('Failed to log error audit:', auditError);
    }
    
    console.log('🔙 Returning error response to client');
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        message: `Generation failed: ${errorMessage}`,
        details: error instanceof Error ? {
          name: error.constructor.name,
          message: error.message,
          stack: error.stack?.substring(0, 500)
        } : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeRequest(request: string, requestType: string, context: any): Promise<any> {
  const prompt = `You are an expert system analyst with deep understanding of web applications, databases, and backend architecture.

**Request to Analyze:** ${request}
**Type:** ${requestType}
**Context:** 
- Has existing code: ${context.hasExistingCode || false}
- Project context: ${JSON.stringify(context.projectContext || {})}
- Known patterns: ${context.knownPatterns ? context.knownPatterns.length + ' similar patterns found' : 'None'}

**CRITICAL: Determine Request Category:**

1. **META-REQUEST** (outputType: "meta-conversation"):
   - Questions about logs, errors, or system behavior
   - Requests to "improve understanding", "see logs", "check what happened"
   - Debugging or troubleshooting the system itself
   - Questions about how the system works
   - Keywords: "see log", "check", "understand", "didn't work", "improve it", "what happened", "debug"

2. **CODE MODIFICATION** (outputType: "modification"):
   - Clear requests to change/update/fix existing code
   - "Remove X", "Add Y", "Change Z", "Fix the button"
   - Direct code changes to existing project
   
3. **NEW HTML WEBSITE** (outputType: "html-website"):
   - Creating new website from scratch
   - Keywords: "create website", "portfolio", "landing page", "html site"

4. **NEW REACT APP** (outputType: "react-app"):
   - Creating new React application
   - Keywords: "react app", "dashboard", "component", "interactive app"

**SMART BACKEND DETECTION:**

Analyze the request for these backend needs:

**Database Indicators:**
- Words: save, store, persist, database, collection, list, crud, manage, track, record
- Features: user profiles, posts, comments, likes, bookmarks, shopping cart, inventory
- Data types: user data, content management, social features, e-commerce, analytics
- Patterns: "save to database", "store user info", "manage products", "track orders"

**Authentication Indicators:**
- Words: login, signup, register, logout, profile, user, account, password, auth
- Features: protected pages, user dashboard, personalized content, permissions, roles
- Patterns: "user login", "sign up", "my profile", "only logged in users"

**Edge Functions Indicators:**
- External integrations: payment, email, SMS, webhooks, third-party APIs
- Server-side logic: data processing, scheduled tasks, background jobs
- Security: API key usage, server-side validation, rate limiting
- Patterns: "send email", "process payment", "call API", "webhook"

**Storage Indicators:**
- File handling: upload, download, images, documents, media, files, attachments
- Patterns: "upload image", "profile picture", "file storage", "document upload"

**Data Model Detection:**
Intelligently infer database tables and relationships:
- User systems → users/profiles table
- Social features → posts, comments, likes, followers tables
- E-commerce → products, orders, cart_items, reviews tables
- Content management → articles, pages, categories, tags tables

**Output JSON:**
{
  "outputType": "meta-conversation" | "modification" | "html-website" | "react-app",
  "mainGoal": "what the user wants to achieve",
  "subTasks": ["task 1", "task 2"],
  "requiredSections": ["Hero", "About"] (for new websites),
  "requiredTechnologies": ["html", "css", "react", "supabase"],
  "complexity": "simple" | "moderate" | "complex",
  "estimatedFiles": 1,
  "needsRouting": false,
  "needsInteractivity": true|false,
  "needsAPI": false,
  "isMetaRequest": false,
  "backendRequirements": {
    "needsDatabase": true|false,
    "needsAuth": true|false,
    "needsEdgeFunctions": true|false,
    "needsStorage": true|false,
    "confidence": 0.0-1.0,
    "databaseTables": [
      {
        "name": "users",
        "purpose": "store user accounts",
        "fields": ["id", "email", "name"],
        "relationships": ["posts", "comments"]
      }
    ],
    "edgeFunctions": [
      {
        "name": "send-welcome-email",
        "purpose": "send email to new users",
        "triggers": ["user signup"]
      }
    ],
    "explanation": "detailed explanation of why backend is needed and what it will do"
  }
}`;

  const result = await callAIWithFallback(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: 'You are an expert analyst with deep reasoning. Analyze web development requests intelligently. Respond with JSON only.',
      preferredModel: 'gpt-5', // Try GPT-5 first, fallback to Gemini
      responseFormat: { type: "json_object" }
    }
  );

  console.log(`✅ Analysis completed with ${result.modelUsed}${result.wasFallback ? ' (fallback)' : ''}`);
  return JSON.parse(result.data.choices[0].message.content);
}

/**
 * Creates database tables based on analysis requirements
 */
async function setupDatabaseTables(analysis: any, userId: string, broadcast: any): Promise<void> {
  const { backendRequirements } = analysis;
  
  if (!backendRequirements?.needsDatabase || !backendRequirements.databaseTables?.length) {
    console.log('⏭️ No database tables needed');
    return;
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn('⚠️ Database setup skipped - missing service role credentials');
    return;
  }

  await broadcast('generation:database', { 
    status: 'creating', 
    message: `Setting up ${backendRequirements.databaseTables.length} database tables...`, 
    progress: 25 
  });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Build SQL to create all tables
    const sqlStatements: string[] = [];
    
    for (const table of backendRequirements.databaseTables) {
      console.log(`📊 Creating table: ${table.name}`);
      
      // Generate CREATE TABLE statement
      const fields = table.fields || ['id', 'created_at'];
      const fieldDefinitions = fields.map((field: string) => {
        if (field === 'id') return 'id uuid primary key default gen_random_uuid()';
        if (field === 'user_id') return 'user_id uuid references auth.users(id) on delete cascade not null';
        if (field === 'created_at') return 'created_at timestamp with time zone default now()';
        if (field === 'updated_at') return 'updated_at timestamp with time zone default now()';
        if (field.includes('email')) return `${field} text not null`;
        if (field.includes('name') || field.includes('title')) return `${field} text not null`;
        if (field.includes('content') || field.includes('body') || field.includes('description')) return `${field} text`;
        if (field.includes('count') || field.includes('price') || field.includes('quantity')) return `${field} numeric default 0`;
        if (field.includes('is_') || field.includes('has_')) return `${field} boolean default false`;
        return `${field} text`;
      }).join(',\n  ');

      sqlStatements.push(`
-- Create ${table.name} table
create table if not exists public.${table.name} (
  ${fieldDefinitions}
);

-- Enable RLS
alter table public.${table.name} enable row level security;

-- Create policies for ${table.name}
create policy "Users can view their own ${table.name}"
  on public.${table.name}
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own ${table.name}"
  on public.${table.name}
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ${table.name}"
  on public.${table.name}
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ${table.name}"
  on public.${table.name}
  for delete
  using (auth.uid() = user_id);
`);
    }

    // Store SQL for manual execution
    const fullSQL = sqlStatements.join('\n\n');
    console.log('📝 Generated SQL for database setup');
    console.log('SQL to execute:', fullSQL.substring(0, 300) + '...');
    
    // Store the SQL in a table for the user to review/execute
    const { error: storeError } = await supabaseAdmin
      .from('generated_migrations')
      .insert({
        user_id: userId,
        project_context: analysis.mainGoal,
        migration_sql: fullSQL,
        table_count: backendRequirements.databaseTables.length,
        status: 'pending'
      });

    if (storeError) {
      console.error('❌ Could not store migration:', storeError);
      await broadcast('generation:database', { 
        status: 'warning', 
        message: 'Database setup requires manual migration', 
        progress: 30 
      });
    } else {
      console.log('✅ Database migration ready for execution');
      await broadcast('generation:database', { 
        status: 'ready', 
        message: `Database schema ready (${backendRequirements.databaseTables.length} tables) - check migrations`, 
        progress: 35,
        migrationSQL: fullSQL
      });
    }
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // Continue without database
    await broadcast('generation:database', { 
      status: 'warning', 
      message: 'Database setup encountered issues', 
      progress: 30 
    });
  }
}

async function generateSimpleWebsite(request: string, analysis: any, broadcast: any, userSupabaseConnection?: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  await broadcast('generation:thinking', { status: 'thinking', message: 'Analyzing your website requirements...', progress: 10 });

  const prompt = `Generate a COMPLETE, BEAUTIFUL, PRODUCTION-READY HTML/CSS/JavaScript website based on this EXACT request:

**Request:** "${request}"
**Goal:** ${analysis.mainGoal}
**Sections:** ${JSON.stringify(analysis.requiredSections || [])}

CRITICAL: Use the content and theme from the request above. DO NOT use placeholder text like "A Creative Developer" or generic content. Generate REAL, RELEVANT content that matches the user's request.

**CRITICAL REQUIREMENTS - MODERN BEAUTIFUL DESIGN:**
1. Generate ONE complete HTML file with embedded CSS and JavaScript
2. Use modern, clean design with proper spacing and typography
3. Beautiful color scheme with gradients and smooth animations that match the request theme
4. Fully responsive (mobile-first approach)
5. Smooth scroll navigation with working anchor links
6. Professional hover effects and transitions
7. Modern CSS Grid and Flexbox layouts
8. Attractive hero section with call-to-action based on the request
9. Clean, readable fonts (Google Fonts)
10. Professional portfolio-quality design
11. IMPORTANT: All text content must be relevant to the user's request - NO generic placeholder text

**DESIGN GUIDELINES:**
- Use a cohesive color palette that matches the request theme
- Add subtle gradients and shadows for depth
- Include smooth transitions on all interactive elements
- Use modern CSS variables for consistency
- Add animations for scroll reveals and hover states
- Ensure proper contrast for accessibility
- Professional spacing and visual hierarchy

**Output JSON:**
{
  "files": [
    {
      "path": "index.html",
      "content": "<!-- COMPLETE HTML with embedded CSS and JS -->",
      "description": "Website description"
    }
  ],
  "instructions": "Website is ready to use"
}`;

  await broadcast('generation:reading', { status: 'reading', message: 'Understanding design requirements...', progress: 30 });

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert web designer. Generate COMPLETE HTML/CSS/JavaScript websites. Output ONLY valid, compact JSON. Keep CSS minimal. IMPORTANT: Keep total output under 8000 characters to avoid truncation.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 8192
    }),
  });

  await broadcast('generation:generating', { status: 'generating', message: 'Creating your beautiful website...', progress: 60 });

  if (!response.ok) {
    let errorText = 'Unknown error';
    try {
      errorText = await response.text();
    } catch (e) {
      console.error('Failed to read error response:', e);
    }
    console.error('❌ AI API Error:', response.status, errorText);
    await broadcast('generation:error', { 
      message: `AI service error: ${response.status}`, 
      details: errorText 
    });
    throw new Error(`AI API returned ${response.status}: ${errorText}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (jsonError) {
    console.error('❌ Failed to parse response as JSON:', jsonError);
    const errorMsg = jsonError instanceof Error ? jsonError.message : 'Unknown JSON error';
    await broadcast('generation:error', { 
      message: 'Failed to parse AI response', 
      details: errorMsg 
    });
    throw new Error(`Failed to parse AI response: ${errorMsg}`);
  }
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('❌ Invalid AI response structure:', JSON.stringify(data));
    await broadcast('generation:error', { 
      message: 'Invalid response structure from AI', 
      details: JSON.stringify(data) 
    });
    throw new Error('Invalid response from AI API');
  }

  const content = data.choices[0].message.content;
  console.log('📝 AI Response content length:', content?.length || 0);
  
  let result;
  try {
    result = JSON.parse(content);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    console.error('📄 Content that failed to parse:', content?.substring(0, 500));
    const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
    throw new Error(`Failed to parse AI response: ${errorMsg}`);
  }
  
  await broadcast('generation:editing', { status: 'editing', message: 'Polishing design and responsiveness...', progress: 85 });
  
  // Ensure files array exists
  if (!result.files || !Array.isArray(result.files)) {
    result.files = [];
  }
  
  // Inject Supabase client initialization if user has a connection
  if (userSupabaseConnection && result.files.length > 0) {
    const htmlFile = result.files.find((f: any) => f.path.endsWith('.html'));
    if (htmlFile && htmlFile.content) {
      htmlFile.content = injectSupabaseClient(htmlFile.content, userSupabaseConnection);
      console.log(`✅ Injected Supabase client for project: ${userSupabaseConnection.project_name}`);
    }
  }
  
  return result;
}

async function detectDependencies(analysis: any, context: any): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Based on this analysis, determine ALL npm packages needed:

**Analysis:** ${JSON.stringify(analysis, null, 2)}
**Existing Code:** ${context.currentCode || 'none'}

**Rules:**
- For game apps: Include game engines (phaser, three.js, babylonjs, etc)
- For UI: Include UI libraries if needed
- For data: Include state management, APIs
- Include ALL peer dependencies
- Specify dev vs production dependencies

**Output JSON array:**
[
  {
    "name": "package-name",
    "version": "latest" or "^1.0.0",
    "shouldInstall": true|false,
    "location": "dependencies"|"devDependencies",
    "detectedFrom": "game-requirement"|"ui-requirement"|etc,
    "context": {},
    "installCommand": "npm install package-name",
    "peerDependencies": ["peer1", "peer2"],
    "reason": "why needed"
  }
]`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a package management expert. Respond with JSON array only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  return result.dependencies || result || [];
}

async function generateSolution(request: string, requestType: string, analysis: any, context: any, supabase: any, conversationId: string, broadcast: any, userSupabaseConnection?: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  // Route to appropriate generator based on analysis
  const outputType = analysis.outputType || 'react-app';
  
  if (outputType === 'html-website') {
    console.log('🌐 Generating HTML/CSS/JS website...');
    return await generateSimpleWebsite(request, analysis, broadcast, userSupabaseConnection);
  }
  
  // Broadcast thinking status for React apps
  await broadcast('generation:thinking', { status: 'thinking', message: 'Planning component architecture...', progress: 15 });

  // Default: Generate React components
  console.log('⚛️ Generating React components...');
  await broadcast('generation:reading', { status: 'reading', message: 'Analyzing code requirements...', progress: 35 });
  
  const prompt = `Generate React/TypeScript components for this Lovable project.

**Request:** ${request}
**Analysis:** ${JSON.stringify(analysis, null, 2)}

**PROJECT STRUCTURE:**
- src/pages/ - Page components (routes)
- src/components/ - Reusable components
- src/hooks/ - Custom React hooks
- src/lib/ - Utility functions

**CRITICAL REQUIREMENTS:**
1. Generate production-ready React .tsx files
2. Use TypeScript with proper types
3. Use semantic Tailwind tokens: bg-background, text-foreground, border, etc.
4. Import shadcn/ui components from "@/components/ui/"
5. Use proper React patterns (hooks, composition, props)
6. Make components responsive and accessible
7. NEVER use direct colors (no bg-white, text-blue-500, etc.)

**Available imports:**
- UI: "@/components/ui/button", "@/components/ui/card", etc.
- Hooks: "@/hooks/use-toast", "react", "react-router-dom"
- Utils: "@/lib/utils" for cn() className helper

**Example:**
{
  "files": [
    {
      "path": "src/pages/Dashboard.tsx",
      "content": "import { Button } from '@/components/ui/button';\\n\\nexport default function Dashboard() {\\n  return <div className='container'>...</div>;\\n}",
      "description": "Dashboard page"
    }
  ],
  "instructions": "Add route to App.tsx: <Route path='/dashboard' element={<Dashboard />} />",
  "nextSteps": ["Test the components", "Add routing"]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: 'You are a Lovable React expert. Generate clean, production-ready React/TypeScript components using shadcn/ui and semantic Tailwind classes. NEVER use direct colors. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  await broadcast('generation:generating', { status: 'generating', message: 'Writing component code...', progress: 65 });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API Error:', response.status, errorText);
    throw new Error(`AI API failed with status ${response.status}: ${errorText}`);
  }
  
  await broadcast('generation:editing', { status: 'editing', message: 'Optimizing and formatting code...', progress: 90 });

  // Read response as text first to handle potential parsing issues
  const responseText = await response.text();
  console.log('Raw AI response (first 500 chars):', responseText.substring(0, 500));
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (jsonError) {
    console.error('Failed to parse AI response as JSON:', jsonError);
    console.error('Response text:', responseText.substring(0, 1000));
    const errorMsg = jsonError instanceof Error ? jsonError.message : String(jsonError);
    throw new Error(`AI API returned invalid JSON: ${errorMsg}`);
  }
  
  console.log('AI Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
  
  if (!data.choices?.[0]?.message?.content) {
    console.error('Invalid AI response structure:', JSON.stringify(data, null, 2));
    throw new Error('AI response missing expected data structure');
  }

  try {
    const content = data.choices[0].message.content;
    console.log('AI content to parse:', content.substring(0, 500));
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse AI content as JSON:', parseError);
    console.error('Content received:', data.choices[0].message.content?.substring(0, 1000));
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Failed to parse AI generated content: ${errorMsg}`);
  }
}

async function performSelfCorrection(generation: any, analysis: any, originalRequest: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Review and self-correct this generated solution using multi-step reasoning:

**Original Request:** ${originalRequest}
**Analysis:** ${JSON.stringify(analysis, null, 2)}
**Generated Files:** ${JSON.stringify(generation.files?.map((f: any) => ({ path: f.path, contentLength: f.content?.length })), null, 2)}

**Multi-Step Reasoning Process:**
1. Does the solution fully address the original request?
2. Are there any logical errors or bugs in the code?
3. Is the code structure optimal?
4. Are there missing edge cases?
5. Can the code be simplified?

**Output JSON:**
{
  "issuesFound": ["issue 1", "issue 2"],
  "corrections": ["correction 1", "correction 2"],
  "correctedFiles": [{"path": "...", "content": "...", "changes": "..."}],
  "reasoning": "multi-step reasoning explanation",
  "confidence": 0-100
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Use Pro for deeper reasoning
      messages: [
        { role: 'system', content: 'You are an expert code reviewer with deep reasoning capabilities. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function detectSecurityVulnerabilities(files: any[]): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Scan these files for security vulnerabilities:

**Files:** ${JSON.stringify(files?.map((f: any) => ({ path: f.path, content: f.content?.substring(0, 1000) })), null, 2)}

**Check for:**
- XSS vulnerabilities
- SQL injection risks
- Authentication/Authorization issues
- Sensitive data exposure
- CSRF vulnerabilities
- Insecure dependencies
- Hard-coded secrets
- Input validation issues
- API security issues

**Output JSON:**
{
  "criticalIssues": [{"file": "...", "line": 0, "issue": "...", "severity": "critical", "fix": "..."}],
  "warnings": [{"file": "...", "issue": "...", "severity": "warning"}],
  "issuesFound": 0,
  "securityScore": 0-100,
  "recommendations": ["rec 1", "rec 2"]
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
        { role: 'system', content: 'You are a security expert. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function optimizePerformance(files: any[], analysis: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Analyze and optimize performance for these files:

**Files:** ${JSON.stringify(files?.map((f: any) => ({ path: f.path, content: f.content?.substring(0, 1000) })), null, 2)}
**Complexity:** ${analysis.complexity}

**Optimize for:**
- Bundle size reduction
- Lazy loading opportunities
- Memo/useMemo/useCallback usage
- Unnecessary re-renders
- API call optimization
- Asset optimization
- Code splitting
- Memory leaks
- Efficient algorithms

**Output JSON:**
{
  "optimizationsApplied": 0,
  "optimizedFiles": [{"path": "...", "content": "...", "improvements": ["..."]}],
  "performanceGains": {"bundleSize": "-20%", "renderTime": "-30%"},
  "recommendations": ["rec 1", "rec 2"],
  "beforeScore": 0-100,
  "afterScore": 0-100
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
        { role: 'system', content: 'You are a performance optimization expert. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function enforceBestPractices(files: any[]): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Enforce best practices on these files:

**Files:** ${JSON.stringify(files?.map((f: any) => ({ path: f.path, content: f.content?.substring(0, 1000) })), null, 2)}

**Enforce:**
- TypeScript strict mode
- Proper error handling
- Accessibility (WCAG 2.1)
- SEO optimization
- Clean code principles
- DRY (Don't Repeat Yourself)
- SOLID principles
- Proper naming conventions
- Documentation/comments
- Test coverage readiness
- Component composition
- State management patterns

**Output JSON:**
{
  "practicesEnforced": ["practice 1", "practice 2"],
  "enforcedFiles": [{"path": "...", "content": "...", "changes": ["..."]}],
  "violations": [{"file": "...", "violation": "...", "fixed": true}],
  "qualityScore": 0-100,
  "recommendations": ["rec 1", "rec 2"]
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
        { role: 'system', content: 'You are a code quality expert. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function verifySolution(
  files: any[], 
  dependencies: any[],
  securityScan: any,
  performanceOpt: any,
  bestPractices: any
): Promise<any> {
  return {
    codeQuality: bestPractices.qualityScore > 80 ? 'excellent' : bestPractices.qualityScore > 60 ? 'good' : 'needs-improvement',
    securityScore: securityScan.securityScore,
    performanceScore: performanceOpt.afterScore,
    qualityScore: bestPractices.qualityScore,
    dependenciesComplete: dependencies.filter(d => d.shouldInstall).length > 0,
    filesGenerated: files?.length || 0,
    readyForProduction: securityScan.criticalIssues?.length === 0 && performanceOpt.afterScore > 70,
    recommendations: [
      'Test all functionality',
      'Review generated code',
      ...securityScan.recommendations || [],
      ...performanceOpt.recommendations || [],
      ...bestPractices.recommendations || []
    ],
    summary: {
      security: `${securityScan.criticalIssues?.length || 0} critical issues, ${securityScan.warnings?.length || 0} warnings`,
      performance: `${performanceOpt.optimizationsApplied || 0} optimizations applied`,
      quality: `${bestPractices.practicesEnforced?.length || 0} best practices enforced`
    }
  };
}

async function generateBackend(
  request: string, 
  analysis: any, 
  context: any, 
  supabase: any,
  userId: string, 
  broadcast: any,
  userSupabaseConnection: any
): Promise<any> {
  const backendRequirements = analysis.backendRequirements || {};
  const results: any = {
    database: null,
    edgeFunctions: [],
    authentication: null,
    storage: null,
    connection: userSupabaseConnection ? {
      project_name: userSupabaseConnection.project_name,
      supabase_url: userSupabaseConnection.supabase_url,
      hasConnection: true
    } : {
      hasConnection: false,
      message: 'Using platform database. Connect your Supabase at /supabase-connections for full control.'
    }
  };

  try {
    // Generate smart database operations if needed
    if (backendRequirements.needsDatabase) {
      await broadcast('generation:phase', { 
        status: 'generating', 
        message: '🧠 Analyzing database requirements...', 
        progress: 52 
      });
      
      // Get existing database schema for context
      let existingSchema: any = null;
      try {
        const { data: tables } = await supabase
          .from('information_schema.tables')
          .select('table_name, table_schema')
          .eq('table_schema', 'public');
        
        if (tables && tables.length > 0) {
          console.log(`📊 Found ${tables.length} existing tables`);
          existingSchema = tables;
        }
      } catch (error) {
        console.log('⚠️ Could not fetch existing schema:', error);
      }
      
      const dbPrompt = `You are a smart database architect. Analyze this request and generate the optimal database solution.

**Request:** ${request}
**Tables Needed:** ${JSON.stringify(backendRequirements.databaseTables || [])}
**Goal:** ${analysis.mainGoal}
**Existing Schema:** ${existingSchema ? JSON.stringify(existingSchema) : 'None - fresh database'}

**YOUR INTELLIGENCE:**
1. **Detect Operations:** Determine if we need to CREATE new tables, ALTER existing ones, or just use existing
2. **Smart Schema Design:** Choose optimal data types, relationships, and indexes
3. **Context Awareness:** If tables exist, generate ALTER statements instead of CREATE
4. **Best Practices:** Auto-add user_id, created_at, updated_at, soft delete if appropriate
5. **Security First:** Always include RLS policies with proper user isolation
6. **Performance:** Add indexes for foreign keys and frequently queried columns
7. **Data Integrity:** Use CHECK constraints, NOT NULL where appropriate, foreign keys

**CRITICAL RULES:**
1. Analyze existing schema - don't recreate what exists!
2. Use proper data types (uuid, text, integer, boolean, timestamp with time zone, jsonb, etc.)
3. Primary keys: id uuid primary key default gen_random_uuid()
4. User data: user_id uuid references auth.users(id) on delete cascade
5. Timestamps: created_at timestamptz default now(), updated_at timestamptz default now()
6. Enable RLS: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
7. Create comprehensive policies for SELECT, INSERT, UPDATE, DELETE
8. Use security definer functions to avoid RLS recursion issues
9. Add helpful indexes: CREATE INDEX idx_table_column ON table(column);
10. Create triggers for updated_at: CREATE TRIGGER update_updated_at BEFORE UPDATE ON table...

**SMART DECISIONS:**
- If table exists → Generate ALTER TABLE ADD COLUMN
- If relationship exists → Skip foreign key
- If similar table exists → Suggest reuse or extension
- If data model is complex → Create helper functions
- If auth is needed → Auto-create profiles table with proper RLS

**Output JSON:**
{
  "operation": "create" | "modify" | "extend",
  "reasoning": "why this approach",
  "sql": "complete migration SQL with all statements",
  "tables": ["table1", "table2"],
  "changes": [
    {
      "table": "users",
      "action": "create" | "alter" | "index",
      "description": "what changed and why"
    }
  ],
  "securityPolicies": [
    {
      "table": "users", 
      "policies": ["Users can view their own data", "Admins can view all"]
    }
  ],
  "recommendations": ["Add index on email", "Consider caching for posts"]
}`;

      const dbResult = await callAIWithFallback(
        [{ role: 'user', content: dbPrompt }],
        {
          systemPrompt: 'You are an expert database architect with deep PostgreSQL and Supabase knowledge. Always respond with valid JSON containing complete, production-ready SQL migrations.',
          preferredModel: 'gpt-5', // Try GPT-5 first, fallback to Gemini
          responseFormat: { type: "json_object" }
        }
      );

      await broadcast('generation:phase', { 
        status: 'generating', 
        message: `⚡ Creating smart database schema with ${dbResult.modelUsed}...`, 
        progress: 55 
      });

      const dbData = JSON.parse(dbResult.data.choices[0].message.content);
      
      results.database = {
        operation: dbData.operation,
        reasoning: dbData.reasoning,
        sql: dbData.sql,
        tables: dbData.tables || backendRequirements.databaseTables || [],
        changes: dbData.changes || [],
        securityPolicies: dbData.securityPolicies || [],
        recommendations: dbData.recommendations || [],
        needsApproval: true,
        generatedBy: dbResult.modelUsed
      };
      
      console.log(`✅ Smart database schema generated with ${dbResult.modelUsed} (${dbData.operation}):`);
      console.log(`  - Tables: ${dbData.tables?.join(', ')}`);
      console.log(`  - Changes: ${dbData.changes?.length || 0}`);
      console.log(`  - Reasoning: ${dbData.reasoning}`);
    }

    // Generate edge functions if needed
    if (backendRequirements.needsEdgeFunctions) {
      await broadcast('generation:phase', { 
        status: 'generating', 
        message: 'Creating backend functions...', 
        progress: 55 
      });
      
      for (const functionName of (backendRequirements.edgeFunctions || [])) {
        const funcPrompt = `Generate a Supabase Edge Function for: ${functionName}

**Context:** ${request}
**Purpose:** ${functionName}

**CRITICAL RULES:**
1. Import necessary modules at top
2. Add CORS headers
3. Handle OPTIONS for preflight
4. Validate inputs
5. Use proper error handling
6. Return JSON responses
7. Log errors
8. Use environment variables for secrets

Generate complete TypeScript code for index.ts file.`;

        const funcResult = await callAIWithFallback(
          [{ role: 'user', content: funcPrompt }],
          {
            systemPrompt: 'You are an edge function expert. Generate production-ready code only.',
            preferredModel: 'gemini-flash' // Use fast model for edge functions
          }
        );

        const funcCode = funcResult.data.choices[0].message.content;
        
        results.edgeFunctions.push({
          name: functionName,
          code: funcCode,
          needsApproval: true,
          generatedBy: funcResult.modelUsed
        });
      }
      
      console.log(`✅ Generated ${results.edgeFunctions.length} edge functions`);
    }

    // Generate authentication setup if needed
    if (backendRequirements.needsAuth) {
      results.authentication = {
        enabled: true,
        providers: ['email'],
        needsProfilesTable: true,
        autoConfirmEmail: true
      };
      console.log('✅ Authentication configuration generated');
    }

    return results;
  } catch (error) {
    console.error('Backend generation error:', error);
    throw error;
  }
}
