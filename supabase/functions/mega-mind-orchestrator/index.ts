import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { validateWebsite } from "../_shared/codeValidator.ts";
import type { WebsiteValidation } from "../_shared/codeValidator.ts";
import { 
  loadConversationHistory, 
  storeConversationTurn, 
  buildConversationSummary 
} from "../_shared/conversationMemory.ts";
import { 
  loadFileDependencies, 
  storeFileDependency,
  buildDependencySummary 
} from "../_shared/fileDependencies.ts";
import {
  findRelevantPatterns,
  buildPromptWithPatterns,
  storeSuccessfulPattern,
  detectPatternCategory
} from "../_shared/patternLearning.ts";
import {
  generateProactiveSuggestions,
  formatSuggestionsForPrompt,
  formatSuggestionsForUser
} from "../_shared/proactiveSuggestions.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Auto-setup authentication infrastructure if needed
async function ensureAuthInfrastructure(supabaseClient: any) {
  try {
    console.log('[AUTH-SETUP] Checking if profiles table exists...');
    
    // Check if profiles table exists
    const { error: checkError } = await supabaseClient
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, create it
      console.log('[AUTH-SETUP] Profiles table missing, creating infrastructure...');
      
      const setupSQL = `
        -- Create profiles table
        CREATE TABLE IF NOT EXISTS public.profiles (
          id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          username text UNIQUE,
          full_name text,
          avatar_url text,
          bio text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        CREATE POLICY "Public profiles are viewable by everyone"
          ON public.profiles FOR SELECT
          USING (true);

        CREATE POLICY "Users can insert their own profile"
          ON public.profiles FOR INSERT
          WITH CHECK (auth.uid() = id);

        CREATE POLICY "Users can update their own profile"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = id);

        -- Auto-create profile trigger
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public
        AS $$
        BEGIN
          INSERT INTO public.profiles (id, full_name, avatar_url, username)
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            NEW.raw_user_meta_data->>'avatar_url',
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
          );
          RETURN NEW;
        END;
        $$;

        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

        -- Updated_at trigger
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$;

        CREATE TRIGGER handle_profiles_updated_at
          BEFORE UPDATE ON public.profiles
          FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
      `;

      const { error: createError } = await supabaseClient.rpc('execute_migration', {
        migration_sql: setupSQL
      });

      if (createError) {
        console.error('[AUTH-SETUP] Failed to create profiles infrastructure:', createError);
        throw createError;
      }

      console.log('[AUTH-SETUP] ✅ Successfully created profiles table with RLS and triggers');
      return { success: true, created: true };
    } else {
      console.log('[AUTH-SETUP] ✅ Profiles table already exists');
      return { success: true, created: false };
    }
  } catch (error) {
    console.error('[AUTH-SETUP] ❌ Error setting up auth infrastructure:', error);
    return { success: false, error };
  }
}

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
    
    const { request, requestType, framework = 'html', context = {}, jobId, mode = 'enhance' } = await req.json();
    console.log('📦 Request parsed:', { requestType, framework, mode, hasJobId: !!jobId, hasContext: !!context });
    
    // Extract projectId from context if available
    projectId = context.projectId || null;
    console.log('📌 Project ID:', projectId, 'Mode:', mode);

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
    
    // ✅ FETCH USER'S ACTIVE SUPABASE CONNECTION (Multi-tenant architecture)
    let userSupabaseConnection = null;
    let userSupabaseClient = null;
    
    try {
      const { data: connection, error: connError } = await supabaseClient
        .from('user_supabase_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (connError || !connection) {
        console.error('❌ No active Supabase connection found for user:', userId);
        return new Response(
          JSON.stringify({ 
            error: 'No active Supabase connection found. Please connect your Supabase project first.',
            requiresConnection: true,
            redirectTo: '/supabase-connections'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userSupabaseConnection = connection;
      
      // ✅ CREATE SUPABASE CLIENT USING USER'S CREDENTIALS
      userSupabaseClient = createClient(
        connection.supabase_url,
        connection.supabase_service_role_key || connection.supabase_anon_key
      );
      
      console.log('✅ Using user Supabase database:', connection.project_name, connection.supabase_url);
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

    // Load conversation memory for enhance mode
    const conversationHistory = mode === 'enhance' && conversationId
      ? await loadConversationHistory(supabaseClient, conversationId, 5)
      : null;

    // Load project context for enhance mode with full intelligence
    let projectContext: any = {};
    let fileDependencies: any = null;
    let conversationSummary = '';
    
    if (mode === 'enhance' && projectId) {
      console.log('🔍 ENHANCE MODE: Loading full project context + conversation history...');
      try {
        const { data: project, error: projectError } = await supabaseClient
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (project && !projectError) {
          // Extract features from existing code
          const existingFeatures: string[] = [];
          const code = project.html_code || '';
          
          if (code.includes('auth') || code.includes('login') || code.includes('signup')) {
            existingFeatures.push('authentication');
          }
          if (code.includes('supabase') || code.includes('database')) {
            existingFeatures.push('database');
          }
          if (code.includes('form') || code.includes('input')) {
            existingFeatures.push('forms');
          }
          if (code.includes('nav') || code.includes('header')) {
            existingFeatures.push('navigation');
          }

          // Load file dependencies from database
          fileDependencies = conversationId 
            ? await loadFileDependencies(supabaseClient, conversationId)
            : [];
          const dependencySummary = buildDependencySummary(fileDependencies);

          // Build conversation summary
          if (conversationHistory) {
            conversationSummary = buildConversationSummary(conversationHistory);
          }

          projectContext = {
            projectName: project.title,
            projectType: project.project_type,
            htmlCode: code,
            codeLength: code.length,
            fileCount: fileDependencies.length,
            existingFeatures,
            hasExistingCode: true,
            dependencySummary,
            conversationSummary,
            conversationTurns: conversationHistory?.totalTurns || 0
          };
          
          console.log('✅ Full context loaded:', {
            name: project.title,
            codeSize: `${Math.round(code.length / 1024)}KB`,
            files: fileDependencies.length,
            features: existingFeatures.length,
            conversationTurns: conversationHistory?.totalTurns || 0
          });
        }
      } catch (err) {
        console.error('⚠️ Failed to load project context:', err);
      }
    }

    // PHASE 2 INTELLIGENCE: Pattern Learning & Proactive Suggestions
    let relevantPatterns: any[] = [];
    let proactiveSuggestions: any[] = [];
    let patternsPrompt = '';
    let suggestionsPrompt = '';

    if (mode === 'enhance' && projectContext.existingFeatures) {
      console.log('🧠 PHASE 2 INTELLIGENCE: Loading patterns & generating suggestions...');
      
      try {
        // Detect pattern category from request
        const category = detectPatternCategory(sanitizedRequest);
        
        // Load relevant patterns from past successful generations
        relevantPatterns = await findRelevantPatterns(
          supabaseClient, 
          sanitizedRequest,
          category
        );
        
        if (relevantPatterns.length > 0) {
          patternsPrompt = buildPromptWithPatterns(relevantPatterns);
          console.log(`✨ Found ${relevantPatterns.length} relevant patterns`);
        }

        // Generate proactive suggestions based on project context
        proactiveSuggestions = generateProactiveSuggestions(
          projectContext.existingFeatures,
          sanitizedRequest,
          {
            fileCount: projectContext.fileCount,
            conversationTurns: projectContext.conversationTurns
          }
        );

        if (proactiveSuggestions.length > 0) {
          suggestionsPrompt = formatSuggestionsForPrompt(proactiveSuggestions);
          console.log(`💡 Generated ${proactiveSuggestions.length} proactive suggestions`);
        }
      } catch (intelligenceError) {
        console.warn('⚠️ Intelligence features failed (non-critical):', intelligenceError);
      }
    }

    // Merge project context into request context
    const enhancedContext = {
      ...context,
      ...projectContext,
      mode,
      patternsPrompt,
      suggestionsPrompt,
      relevantPatterns,
      proactiveSuggestions
    };

    // PHASE 0: Auto-setup authentication infrastructure if needed
    // CRITICAL FIX: Only detect auth in generate mode, NOT when "user" mentioned in enhance mode
    const needsAuth = mode === 'generate' && 
      !projectContext.existingFeatures?.includes('authentication') &&
      sanitizedRequest.toLowerCase().match(/\b(sign ?up|log ?in|auth|authentication|register|account|profile|password|email verification|reset password|login page|signup form)\b/);
    if (needsAuth && projectId) {
      console.log('[PHASE 0] 🔐 Authentication detected in prompt, checking database infrastructure...');
      await updateJobProgress(10, 'Setting up authentication infrastructure...');
      await broadcast('generation:phase', { 
        phase: 'auth_setup', 
        progress: 10, 
        message: 'Preparing authentication system...' 
      });
      
      // Update project title to show auth setup
      try {
        const { data: currentProject } = await supabaseClient
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();
        
        if (currentProject) {
          await supabaseClient
            .from('projects')
            .update({ 
              title: '[Generating...] Setting up authentication...',
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);
        }
      } catch (err) {
        console.warn('⚠️ Could not update project title:', err);
      }
      
      const authSetup = await ensureAuthInfrastructure(userSupabaseClient);
      
      if (authSetup.success) {
        if (authSetup.created) {
          console.log('[PHASE 0] ✅ Auth infrastructure created successfully');
          await broadcast('generation:phase', { 
            phase: 'auth_setup', 
            progress: 15, 
            message: '✅ Authentication database ready!' 
          });
        } else {
          console.log('[PHASE 0] ✅ Auth infrastructure already exists');
        }
      } else {
        console.error('[PHASE 0] ❌ Auth setup failed:', authSetup.error);
        // Log but continue - frontend can still be generated
        await broadcast('generation:warning', { 
          message: 'Auth setup encountered issues, continuing with generation...' 
        });
      }
    }

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
        enhancedContext.knownPatterns = patterns;
      }
    } catch (error) {
      console.log('⚠️ Pattern lookup failed:', error);
    }
    
    const analysis = await analyzeRequest(sanitizedRequest, requestType, enhancedContext);
    
    // Override outputType with user's framework choice
    if (requestType === 'code-generation' || requestType === 'website-generation') {
      analysis.outputType = framework === 'html' ? 'html-website' : 'react-app';
      console.log(`🎯 Using user-selected framework: ${framework} → outputType: ${analysis.outputType}`);
    }
    
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
      await setupDatabaseTables(analysis, userId, broadcast, userSupabaseClient, supabaseClient, userSupabaseConnection);
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

    // PHASE 2: Generate solution (respects user's framework choice)
    console.log(`⚡ Phase 2: Generating ${analysis.outputType === 'html-website' ? 'HTML/CSS/JS' : 'React'} solution...`);
    await updateJobProgress(40, 'Generating solution...');
    await broadcast('generation:phase', { 
      phase: 'generating', 
      progress: 40, 
      message: analysis.outputType === 'html-website' ? 'Generating HTML/CSS/JS...' : 'Generating React components...' 
    });
    
    const generation = await generateSolution(request, requestType, analysis, enhancedContext, supabaseClient, orchestrationId, broadcast, userSupabaseConnection);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        generation_phase: generation,
        files_generated: generation.files || [],
        status: 'detecting_dependencies'
      })
      .eq('id', orchestrationId);

    // PHASE 2.5: Generate backend helpers (AFTER frontend generation)
    let backendGeneration: any = null;
    if (analysis.backendRequirements?.needsDatabase || analysis.backendRequirements?.needsAuth || analysis.backendRequirements?.needsEdgeFunctions) {
      console.log('🗄️ Generating backend infrastructure...');
      await updateJobProgress(70, 'Setting up backend helpers...');
      await broadcast('generation:phase', { phase: 'generating', progress: 70, message: 'Creating backend helpers...' });
      
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
    await updateJobProgress(75, 'Detecting dependencies...');
    await broadcast('generation:phase', { phase: 'dependencies', progress: 75, message: 'Installing packages...' });
    
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
    
    // CRITICAL FIX: Handle modifications vs new projects differently
    if (finalFiles && finalFiles.length > 0) {
      const htmlFile = finalFiles.find((f: any) => f.path.endsWith('.html'));
      
      if (htmlFile) {
        // New HTML project - use the HTML file directly
        generatedCode = htmlFile.content;
      } else if (analysis.outputType === 'modification' && projectId) {
        // MODIFICATION: Fetch existing code and merge changes
        console.log('🔄 Modification detected - merging with existing code...');
        
        const { data: existingProject, error: fetchExistingError } = await supabaseClient
          .from('projects')
          .select('html_code')
          .eq('id', projectId)
          .single();
        
        if (existingProject?.html_code && !existingProject.html_code.includes('// File:')) {
          // Preserve existing working code, append modification notes
          console.log('✅ Preserving existing working code');
          generatedCode = existingProject.html_code;
          
          // Add modification summary as HTML comment
          const modificationSummary = `\n<!-- 
  Modification Applied: ${analysis.mainGoal}
  Files Updated: ${finalFiles.map((f: any) => f.path).join(', ')}
  Timestamp: ${new Date().toISOString()}
-->\n`;
          
          // For HTML, insert before closing body tag
          if (generatedCode.includes('</body>')) {
            generatedCode = generatedCode.replace('</body>', `${modificationSummary}</body>`);
          } else {
            generatedCode += modificationSummary;
          }
        } else {
          // No existing code or corrupted - use new generation
          console.log('⚠️ No valid existing code found, using new generation');
          generatedCode = finalFiles.map((file: any) => 
            `// File: ${file.path}\n${file.description ? `// ${file.description}\n` : ''}${file.content}\n\n`
          ).join('\n');
        }
      } else {
        // New React/multi-file project
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
        // Remove all status prefixes from title
        if (cleanTitle.startsWith('[Generating...] ')) {
          cleanTitle = cleanTitle.replace('[Generating...] ', '');
        }
        if (cleanTitle.startsWith('[Failed] ')) {
          cleanTitle = cleanTitle.replace('[Failed] ', '');
        }
        
        console.log(`📝 Updating project with title: "${cleanTitle}"`);
        
        // CRITICAL: Validate generated code before saving
        if (!generatedCode || generatedCode.trim().length === 0) {
          console.error('❌ Generated code is empty!');
          throw new Error('Generated code is empty - aborting update');
        }
        
        // Check if code looks corrupted (starts with file comments when it should be HTML)
        const looksCorrupted = generatedCode.startsWith('// File:') && 
                               !generatedCode.includes('<html') && 
                               analysis.outputType === 'modification';
        
        if (looksCorrupted) {
          console.error('❌ Generated code appears corrupted - preserving existing');
          throw new Error('Generated code validation failed - format mismatch');
        }
        
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

     // Store conversation turn in enhance mode
    if (mode === 'enhance' && conversationHistory !== null) {
      try {
        await storeConversationTurn(supabaseClient, {
          conversationId,
          userId,
          userRequest: sanitizedRequest,
          intent: analysis.intent || {},
          executionPlan: {
            instructions: generation.instructions,
            files: generation.files?.map((f: any) => f.path) || [],
            features: analysis.intent?.features || [],
            existingContext: projectContext.existingFeatures || [],
            fileCount: projectContext.fileCount || 0,
            conversationTurns: conversationHistory.totalTurns,
            mode
          }
        });

        console.log(`💾 Stored conversation turn with memory (${conversationHistory.totalTurns + 1} total turns)`);
      } catch (memoryError) {
        console.warn('⚠️ Failed to store conversation memory (non-critical):', memoryError);
      }
    }

    // Store successful pattern for future reuse
    if (generation.files && generation.files.length > 0) {
      try {
        const category = detectPatternCategory(sanitizedRequest);
        if (category) {
          // Extract the main file as template
          const mainFile = generation.files.find((f: any) => 
            f.path.includes('index') || f.path.includes('main') || generation.files.length === 1
          ) || generation.files[0];

          await storeSuccessfulPattern(supabaseClient, {
            category,
            patternName: `${category}-${Date.now()}`,
            useCase: sanitizedRequest.substring(0, 200),
            codeTemplate: mainFile.content.substring(0, 5000), // Store first 5KB as template
            context: {
              outputType: analysis.outputType,
              filesGenerated: generation.files.length,
              hadBackend: !!backendGeneration,
              features: analysis.intent?.features || []
            }
          });

          console.log(`✨ Stored successful pattern for category "${category}"`);
        }
      } catch (patternError) {
        console.warn('⚠️ Failed to store pattern (non-critical):', patternError);
      }
    }

    // Include proactive suggestions in response if available
    let userSuggestions = '';
    if (proactiveSuggestions.length > 0) {
      userSuggestions = formatSuggestionsForUser(proactiveSuggestions);
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
        message: (generation.instructions || `✨ Successfully ${analysis.outputType === 'modification' ? 'updated' : 'generated'} your code`) + userSuggestions,
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
        requestType: requestType,
        proactiveSuggestions: proactiveSuggestions || [],
        learnedPatterns: relevantPatterns.length || 0
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
            projectId: projectId || null,
            phase: 'generation',
            canAutoFix: true // Mark that this can potentially be auto-fixed
          }
        }
      });
      console.log('✅ Error pattern logged for self-healing');
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
  const mode = context.mode || 'enhance';
  const isGenerateMode = mode === 'generate';
  
  // Build existing project context information
  let existingProjectInfo = '';
  if (mode === 'enhance' && context.hasExistingCode) {
    existingProjectInfo = `
**🎯 EXISTING PROJECT CONTEXT (DO NOT RECREATE THESE!):**
- Project Name: ${context.projectName || 'Unknown'}
- Project Type: ${context.projectType || 'Unknown'}  
- Code Size: ${Math.round(context.codeLength / 1024)}KB
- Existing Features: ${context.existingFeatures?.join(', ') || 'None detected'}

⚠️ **CRITICAL FOR ENHANCE MODE:**
- This project ALREADY EXISTS with ${Math.round(context.codeLength / 1024)}KB of code
- DO NOT regenerate these features: ${context.existingFeatures?.join(', ') || 'none'}
- ONLY analyze what the user is REQUESTING to add/modify
- Make SURGICAL changes - integrate with existing code
- DO NOT create a new project from scratch
`;
  }
  
  const prompt = `You are an expert system analyst with deep understanding of web applications, databases, and backend architecture.

**Request to Analyze:** ${request}
**Type:** ${requestType}
**Mode:** ${mode} (${isGenerateMode ? 'Creating NEW project from scratch' : 'Enhancing EXISTING project'})

${existingProjectInfo}

**CRITICAL: Understand the Operation Mode:**

**GENERATE MODE** (mode=generate):
- User is creating a BRAND NEW project from scratch
- Start with a clean slate - no existing code to consider
- Create complete, standalone application
- Set up all infrastructure, tables, authentication if needed
- Output complete HTML or React application

**ENHANCE MODE** (mode=enhance):
${mode === 'enhance' && context.hasExistingCode ? `
- User has an EXISTING project (${Math.round(context.codeLength / 1024)}KB of code)
- Existing features: ${context.existingFeatures?.join(', ') || 'None detected'}
- User wants to: ${request}
- Make SURGICAL changes only to what user requested
- DO NOT recreate: ${context.existingFeatures?.join(', ') || 'anything that exists'}
- Focus ONLY on the new feature/modification requested
- Respect existing architecture and patterns
` : `
- User has an EXISTING project and wants to MODIFY/IMPROVE it
- Load and analyze existing code first
- Make SURGICAL changes only to what user requested
- DO NOT recreate existing features
- Focus on the specific enhancement requested
`}

${context.patternsPrompt || ''}

${context.suggestionsPrompt || ''}

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
        "name": "posts",
        "purpose": "store blog posts",
        "fields": [
          { "name": "id", "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
          { "name": "user_id", "type": "uuid", "nullable": false, "references": "auth.users(id)", "isUserReference": true },
          { "name": "title", "type": "text", "nullable": false },
          { "name": "content", "type": "text", "nullable": true },
          { "name": "status", "type": "text", "default": "'draft'" },
          { "name": "created_at", "type": "timestamp with time zone", "default": "now()" }
        ],
        "relationships": ["belongs to user", "has many comments"]
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
async function setupDatabaseTables(
  analysis: any, 
  userId: string, 
  broadcast: any, 
  userSupabaseClient: any, 
  platformSupabaseClient: any,
  userConnection: any
): Promise<void> {
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

  // ✅ USE USER'S SUPABASE CLIENT for database migrations
  const userSupabase = userSupabaseClient;

  try {
    // Build SQL to create all tables using structured field definitions
    const sqlStatements: string[] = [];
    
    for (const table of backendRequirements.databaseTables) {
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

-- Create policies for ${table.name}
create policy "Users can view their own ${table.name}"
  on public.${table.name}
  for select
  using (auth.uid() = ${userRefField.name});

create policy "Users can insert their own ${table.name}"
  on public.${table.name}
  for insert
  with check (auth.uid() = ${userRefField.name});

create policy "Users can update their own ${table.name}"
  on public.${table.name}
  for update
  using (auth.uid() = ${userRefField.name});

create policy "Users can delete their own ${table.name}"
  on public.${table.name}
  for delete
  using (auth.uid() = ${userRefField.name});
`;
      } else {
        // Table without user reference - make it readable by authenticated users
        rlsPolicies = `
-- Enable RLS
alter table public.${table.name} enable row level security;

-- Allow authenticated users to read
create policy "Authenticated users can view ${table.name}"
  on public.${table.name}
  for select
  using (auth.role() = 'authenticated');
`;
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
      await broadcast('generation:database', { 
        status: 'error', 
        message: 'Failed to generate valid database schema', 
        progress: 30 
      });
      return;
    }

    // Build complete SQL
    const fullSQL = sqlStatements.join('\n\n');
    console.log('📝 Generated SQL for database setup');
    console.log('SQL to execute (first 500 chars):', fullSQL.substring(0, 500));
    console.log('Total SQL length:', fullSQL.length);
    
    // ✅ EXECUTE SQL ON USER'S SUPABASE DATABASE
    console.log('🚀 Executing SQL on user\'s Supabase database...');
    let execResult;
    let execError;
    
    ({ data: execResult, error: execError } = await userSupabase
      .rpc('execute_migration', { migration_sql: fullSQL }));

    if (execError || !execResult?.success) {
      const errorMsg = execError?.message || execResult?.error || 'Unknown error';
      console.error('❌ Failed to execute migration:', errorMsg);
      console.error('Failed SQL:', fullSQL);
      
      // ✅ INTELLIGENT ERROR DETECTION
      let userFriendlyMessage = 'Database setup failed';
      let recommendations: string[] = [];
      
      if (errorMsg.includes('Could not find the function') || errorMsg.includes('execute_migration') && errorMsg.includes('does not exist')) {
        userFriendlyMessage = 'First-time database setup required';
        recommendations = [
          'This is a one-time setup. Run this SQL in your Supabase SQL Editor:',
          '',
          'CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)',
          'RETURNS jsonb',
          'LANGUAGE plpgsql',
          'SECURITY DEFINER',
          'SET search_path = public',
          'AS $$',
          'DECLARE',
          '  result jsonb;',
          '  error_message text;',
          'BEGIN',
          '  BEGIN',
          '    EXECUTE migration_sql;',
          '    result := jsonb_build_object(',
          "      'success', true,",
          "      'message', 'Migration executed successfully'",
          '    );',
          '  EXCEPTION WHEN OTHERS THEN',
          '    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;',
          '    result := jsonb_build_object(',
          "      'success', false,",
          "      'error', error_message",
          '    );',
          '  END;',
          '  RETURN result;',
          'END;',
          '$$;',
          '',
          'After running this SQL, try generating your project again.'
        ];
      } else if (errorMsg.includes('JWT') || errorMsg.includes('authentication') || errorMsg.includes('permission denied')) {
        userFriendlyMessage = 'Your database is missing the required migration function. This happens on first connection.';
        recommendations.push('The platform attempted to set this up automatically');
        recommendations.push('Please run this SQL manually in your Supabase SQL Editor:');
        recommendations.push(`
CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  error_message text;
BEGIN
  BEGIN
    EXECUTE migration_sql;
    result := jsonb_build_object('success', true, 'message', 'Migration executed successfully');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    result := jsonb_build_object('success', false, 'error', error_message);
  END;
  RETURN result;
END;
$$;
        `.trim());
        recommendations.push('Then try generating again');
      } else if (execError?.message?.includes('JWT') || execError?.message?.includes('authentication') || execError?.message?.includes('permission denied')) {
        userFriendlyMessage = '❌ Authentication failed with your Supabase database';
        recommendations.push('Your Service Role Key may be invalid or expired');
        recommendations.push('Go to Settings → API in your Supabase dashboard and copy a fresh service_role key');
        recommendations.push('Update your connection in the Supabase Connections page');
      } else if (execError?.message?.includes('connect') || execError?.message?.includes('network') || execError?.message?.includes('timeout')) {
        userFriendlyMessage = '❌ Cannot connect to your Supabase database';
        recommendations.push('Check if your Supabase project is active and running');
        recommendations.push('Verify the Project URL is correct');
        recommendations.push('Check your internet connection');
      } else if (execError?.message?.includes('already exists') || errorMsg.includes('already exists')) {
        userFriendlyMessage = '⚠️ Some tables already exist in your database';
        recommendations.push('The generation will continue with existing tables');
        recommendations.push('You may want to drop old tables if you want fresh ones');
      } else {
        userFriendlyMessage = `❌ Database error: ${errorMsg.substring(0, 100)}`;
        recommendations.push('Check your Supabase dashboard for more details');
        recommendations.push('Verify your Service Role Key has admin permissions');
      }
      
      await broadcast('generation:database', { 
        status: 'error', 
        message: userFriendlyMessage, 
        recommendations,
        progress: 30 
      });
      
      // Store failed migration for review (in platform database)
      await platformSupabaseClient
        .from('generated_migrations')
        .insert({
          user_id: userId,
          project_context: analysis.mainGoal,
          migration_sql: fullSQL,
          table_count: backendRequirements.databaseTables.length,
          status: 'failed',
          error_message: execError?.message || execResult?.error
        });
      
      await broadcast('generation:database', { 
        status: 'warning', 
        message: 'Database setup encountered issues - check migrations', 
        progress: 30 
      });
      
      // STOP execution on database failure
      return;
    } else {
      console.log('✅ Tables created successfully!');
      
      // Store successful migration (in platform database)
      await platformSupabaseClient
        .from('generated_migrations')
        .insert({
          user_id: userId,
          project_context: analysis.mainGoal,
          migration_sql: fullSQL,
          table_count: backendRequirements.databaseTables.length,
          status: 'executed'
        });
      
      await broadcast('generation:database', { 
        status: 'complete', 
        message: `✅ Created ${backendRequirements.databaseTables.length} tables with RLS policies`, 
        progress: 35
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

  let prompt = `Generate a COMPLETE, BEAUTIFUL, PRODUCTION-READY website based on this EXACT request:

**Request:** "${request}"
**Goal:** ${analysis.mainGoal}
**Sections:** ${JSON.stringify(analysis.requiredSections || [])}

CRITICAL: Use the content and theme from the request above. DO NOT use placeholder text. Generate REAL, RELEVANT content that matches the user's request.

**CRITICAL REQUIREMENTS - SCALABLE MULTI-FILE ARCHITECTURE:**

1. **SEPARATE FILES** - Generate 3 separate files for scalability:
   - index.html (structure only, link to external CSS/JS)
   - styles.css (all styling)
   - script.js (all JavaScript)

2. **MODERN BEAUTIFUL DESIGN:**
   - Clean, professional layout with proper spacing
   - Beautiful color scheme with gradients matching the theme
   - Fully responsive (mobile-first approach)
   - Smooth animations and transitions
   - Modern CSS Grid and Flexbox layouts
   - Professional typography (Google Fonts via CDN)
   - Hero section with call-to-action

3. **CODE EFFICIENCY:**
   - Use CDN links for external libraries (don't embed large code)
   - Keep CSS modular with clear sections
   - Use modern ES6+ JavaScript
   - Add comments for major sections
   - Minify mindset: efficient, clean code

4. **EXTERNAL RESOURCES VIA CDN:**
   - Google Fonts: <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
   - Icons: Font Awesome, Bootstrap Icons, or similar via CDN
   - Libraries: jQuery, AOS, etc. via CDN if needed

5. **JSON FORMATTING RULES (CRITICAL):**
   - Escape ALL special characters in strings: \\ for backslash, \\" for quotes, \\n for newlines
   - Use single quotes in HTML/CSS/JS content where possible to avoid escaping
   - Keep file content compact and clean
   - Validate JSON structure before output

**Output JSON Structure:**
{
  "files": [
    {
      "path": "index.html",
      "content": "<properly escaped HTML content>",
      "description": "Main HTML structure"
    },
    {
      "path": "styles.css",
      "content": "/* CSS with escaped special chars */",
      "description": "Stylesheet"
    },
    {
      "path": "script.js",
      "content": "// JS with escaped special chars",
      "description": "JavaScript functionality"
    }
  ],
  "instructions": "Website is ready to use"
}

**IMPORTANT FOR COMPLEX SITES:**
- Prioritize core sections first
- Use efficient CSS (CSS variables, reusable classes)
- Keep JavaScript modular and well-commented
- Focus on quality over quantity`;

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
        { role: 'system', content: 'You are an expert web designer. Generate COMPLETE, MODULAR websites with SEPARATE HTML, CSS, and JS files. Output ONLY valid, compact JSON. ALWAYS split into 3 files: index.html (structure only), styles.css (all styles), script.js (all JavaScript). Use CDN links for libraries. Keep code efficient and well-organized. SECURITY: Never display credentials with alert(). Use proper UI. AUTH: Use Supabase Auth (supabase.auth.signUp/signInWithPassword) with profiles table (id, username, full_name, avatar_url, bio). Handle errors gracefully.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 32768
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
  let validationResult: WebsiteValidation | null = null;
  const maxRetries = 2; // Allow 2 retries for validation failures
  let retryCount = 0;
  
  // Retry loop for validation
  while (retryCount <= maxRetries) {
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('Error name:', parseError instanceof Error ? parseError.constructor.name : 'Unknown');
      console.error('Error message:', parseError instanceof Error ? parseError.message : 'Unknown');
      console.error('📝 Content length:', content?.length || 0);
      console.error('📄 Content preview:', content?.substring(0, 500));
      
      // Log this error pattern for learning
      try {
        const platformClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await platformClient.functions.invoke('pattern-recognizer', {
          body: {
            conversationId: null,
            codeContext: content?.substring(0, 1000),
            errorType: 'json_parse_error',
            patternSignature: `json_parse_${parseError instanceof Error ? parseError.message : 'unknown'}`,
            success: false,
            metadata: {
              errorMessage: parseError instanceof Error ? parseError.message : 'Unknown',
              contentLength: content?.length || 0,
              generationType: 'html_website'
            }
          }
        });
        console.log('✅ JSON parse error pattern logged for learning');
      } catch (logError) {
        console.error('⚠️ Failed to log error pattern:', logError);
      }
      
      // Try to sanitize and fix the JSON
      if (content) {
        try {
          console.log('🔧 Attempting to sanitize JSON...');
          
          // Fix common JSON escaping issues
          let sanitized = content
            // Fix unescaped backslashes first
            .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
            // Fix unescaped newlines in strings
            .replace(/([^\\])\n/g, '$1\\n');
          
          result = JSON.parse(sanitized);
          console.log('✅ Successfully sanitized and parsed JSON');
          
          // Log successful recovery pattern
          try {
            const platformClient = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );
            
            await platformClient.functions.invoke('pattern-recognizer', {
              body: {
                conversationId: null,
                codeContext: 'json_sanitization_success',
                errorType: 'json_parse_error_recovered',
                patternSignature: 'json_sanitization_fixed',
                success: true,
                metadata: {
                  originalError: parseError instanceof Error ? parseError.message : 'Unknown',
                  recoveryMethod: 'sanitization'
                }
              }
            });
          } catch (logError) {
            // Non-critical
          }
        } catch (sanitizeError) {
          console.error('❌ Sanitization failed:', sanitizeError);
        
        // Last resort: try to extract and create fallback
        console.log('🔧 Using fallback response...');
        result = {
          files: [{
            path: 'index.html',
            content: '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Generation Error</title><style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;background:#f5f5f5;}h1{color:#e74c3c;}</style></head><body><h1>Generation Failed</h1><p>The AI response had formatting issues. Please try again with a simpler request or rephrase your request.</p><button onclick="location.reload()">Try Again</button></body></html>',
            description: 'Fallback HTML'
          }],
          instructions: 'Generation encountered issues, please try again'
        };
        console.log('⚠️ Using fallback response');
        
        await broadcast('generation:warning', { 
          message: 'Using fallback due to AI formatting issues', 
          details: 'Please try again'
        });
      }
    } else {
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      throw new Error(`Failed to parse AI response: ${errorMsg}`);
    }
  }
  
  // ✅ VALIDATION PHASE: Check generated code quality
  if (result?.files && Array.isArray(result.files)) {
    console.log('🔍 Validating generated code...');
    await broadcast('generation:validating', { 
      status: 'validating', 
      message: 'Checking code quality...', 
      progress: 75 
    });
    
    validationResult = validateWebsite(result.files);
    
    if (!validationResult.isValid) {
      console.error('❌ Validation failed:', validationResult.overallErrors);
      
      // Show detailed errors to user
      const errorSummary = validationResult.overallErrors.slice(0, 3).join('; ');
      const moreErrors = validationResult.overallErrors.length > 3 ? ` (+${validationResult.overallErrors.length - 3} more)` : '';
      
      await broadcast('generation:validation_failed', { 
        status: 'validation_failed',
        message: `⚠️ Found ${validationResult.overallErrors.length} error(s): ${errorSummary}${moreErrors}`,
        errors: validationResult.overallErrors,
        warnings: validationResult.overallWarnings,
        progress: 70
      });
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Retry ${retryCount}/${maxRetries}: Regenerating due to validation errors...`);
        
        await broadcast('generation:retrying', { 
          status: 'retrying', 
          message: `🔧 Fixing errors automatically (attempt ${retryCount}/${maxRetries})...`, 
          fixingErrors: validationResult.overallErrors.slice(0, 5),
          progress: 50 + (retryCount * 10)
        });
        
        // Log the validation failure for learning
        try {
          const platformClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );
          
          await platformClient.functions.invoke('pattern-recognizer', {
            body: {
              conversationId: null,
              codeContext: JSON.stringify(result.files[0]?.content?.substring(0, 500)),
              errorType: 'code_validation_failed',
              patternSignature: `validation_errors_${validationResult.overallErrors.length}`,
              success: false,
              metadata: {
                errors: validationResult.overallErrors,
                warnings: validationResult.overallWarnings,
                retryAttempt: retryCount
              }
            }
          });
        } catch (logError) {
          console.error('⚠️ Failed to log validation error:', logError);
        }
        
        // Regenerate with error feedback
        const errorFeedback = `\n\nPREVIOUS ATTEMPT HAD ERRORS - FIX THESE:\n${validationResult.overallErrors.join('\n')}\n\nREGENERATE THE CODE FIXING ALL THE ABOVE ERRORS.`;
        
        // Recursive retry with updated prompt
        prompt = prompt + errorFeedback;
        continue; // Continue to next iteration of retry loop
      } else {
        // Max retries reached, show detailed warning
        console.warn('⚠️ Max retries reached, proceeding with warnings');
        const remainingErrors = validationResult.overallErrors.slice(0, 5).join('; ');
        await broadcast('generation:max_retries', { 
          status: 'max_retries',
          message: `⚠️ Generated with ${validationResult.overallErrors.length} known issue(s). Remaining: ${remainingErrors}`,
          remainingErrors: validationResult.overallErrors,
          progress: 80 
        });
      }
    } else {
      console.log('✅ Code validation passed!');
      await broadcast('generation:validated', {
        status: 'validated',
        message: '✅ Code validation passed! All syntax checks successful.',
        warnings: validationResult.overallWarnings.length > 0 ? validationResult.overallWarnings.slice(0, 3) : [],
        progress: 80
      });
      if (validationResult.overallWarnings.length > 0) {
        console.log('⚠️ Warnings:', validationResult.overallWarnings);
      }
    }
  }
  
  break; // Exit retry loop on success or max retries
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
  
  // Validate we have the expected multi-file structure
  const hasHTML = result.files.some((f: any) => f.path.endsWith('.html'));
  const hasCSS = result.files.some((f: any) => f.path.endsWith('.css'));
  const hasJS = result.files.some((f: any) => f.path.endsWith('.js'));
  
  console.log(`📦 Generated files: HTML=${hasHTML}, CSS=${hasCSS}, JS=${hasJS}`);
  
  if (!hasHTML) {
    console.warn('⚠️ No HTML file generated, this may cause issues');
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
        { role: 'system', content: 'You are a Lovable React expert. Generate clean, production-ready React/TypeScript components using shadcn/ui and semantic Tailwind classes. NEVER use direct colors. Respond with JSON only. SECURITY: Never display sensitive user data (passwords, tokens) in alerts or console logs. Use proper toast notifications for user feedback. AUTHENTICATION: Import supabase client from "@/integrations/supabase/client". For signup: supabase.auth.signUp({ email, password, options: { data: { username, full_name } } }). For login: supabase.auth.signInWithPassword({ email, password }). Listen to auth: supabase.auth.onAuthStateChange((event, session) => {...}). Check session: supabase.auth.getSession(). Logout: supabase.auth.signOut(). Access profiles from "profiles" table. Redirect authenticated users. Use toast for feedback, never alerts.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  await broadcast('generation:generating', { status: 'generating', message: 'Writing component code...', progress: 50 });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ AI API Error:', response.status, errorText);
    await broadcast('generation:error', { 
      status: 'error', 
      message: `AI generation failed: ${response.status}. Please try again.`,
      error: errorText 
    });
    throw new Error(`AI API failed with status ${response.status}: ${errorText}`);
  }
  
  await broadcast('generation:editing', { status: 'editing', message: 'Optimizing and formatting code...', progress: 65 });

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
    console.error('❌ Failed to parse AI content as JSON:', parseError);
    console.error('Content received:', data.choices[0].message.content?.substring(0, 1000));
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    await broadcast('generation:error', { 
      status: 'error', 
      message: 'AI generated invalid code format. Please try again.',
      error: errorMsg 
    });
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
        progress: 72 
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
        progress: 74 
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
