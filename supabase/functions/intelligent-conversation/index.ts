import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent Recognition Rules
function recognizeIntent(userMessage: string, context: any): string {
  const msg = userMessage.toLowerCase();
  
  // Code generation patterns
  if (
    msg.includes('create') || msg.includes('build') || msg.includes('generate') ||
    msg.includes('add') || msg.includes('implement') || msg.includes('make') ||
    msg.includes('component') || msg.includes('function') || msg.includes('feature') ||
    context.currentCode || context.conversationId
  ) {
    return 'code-generation';
  }
  
  // Image generation patterns
  if (
    msg.includes('image') || msg.includes('picture') || msg.includes('photo') ||
    msg.includes('generate image') || msg.includes('create image')
  ) {
    return 'image-generation';
  }
  
  // Analysis patterns
  if (
    msg.includes('analyze') || msg.includes('review') || msg.includes('check') ||
    msg.includes('improve') || msg.includes('refactor') || msg.includes('optimize')
  ) {
    return 'code-analysis';
  }
  
  // Default to conversational chat
  return 'chat';
}

// Context Loading
async function loadUniversalContext(supabase: any, userId: string | null, conversationId?: string) {
  const context: any = {
    userPreferences: null,
    professionalKnowledge: [],
    conversationLearnings: [],
    crossProjectPatterns: [],
    conversationHistory: []
  };

  if (!userId) return context;

  try {
    // Load user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    context.userPreferences = prefs;

    // Load professional knowledge (top 5 most applicable)
    const { data: knowledge } = await supabase
      .from('professional_knowledge')
      .select('*')
      .order('applicability_score', { ascending: false })
      .limit(5);
    context.professionalKnowledge = knowledge || [];

    // Load conversation learnings for this user
    const { data: learnings } = await supabase
      .from('conversation_learnings')
      .select('*')
      .eq('user_id', userId)
      .order('confidence', { ascending: false })
      .limit(10);
    context.conversationLearnings = learnings || [];

    // Load cross-project patterns
    const { data: patterns } = await supabase
      .from('cross_project_patterns')
      .select('*')
      .eq('user_id', userId)
      .gte('confidence_score', 60)
      .order('success_rate', { ascending: false })
      .limit(5);
    context.crossProjectPatterns = patterns || [];

    // Load conversation history if conversationId provided
    if (conversationId) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);
      context.conversationHistory = messages || [];
    }
  } catch (error) {
    console.error('Error loading context:', error);
  }

  return context;
}

// Route to appropriate module
async function routeToModule(
  intent: string,
  userMessage: string,
  context: any,
  supabase: any,
  userId: string | null
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    switch (intent) {
      case 'code-generation': {
        // Route to smart-orchestrator for full intelligence
        const { data, error } = await supabase.functions.invoke('smart-orchestrator', {
          body: {
            userRequest: userMessage,
            conversationId: context.conversationId,
            currentCode: context.currentCode,
            autoRefine: true,
            autoLearn: true
          }
        });

        if (error) throw error;
        return {
          intent: 'code-generation',
          module: 'smart-orchestrator',
          response: data
        };
      }

      case 'image-generation': {
        // Route to generate-image
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt: userMessage }
        });

        if (error) throw error;
        return {
          intent: 'image-generation',
          module: 'generate-image',
          response: data
        };
      }

      case 'code-analysis': {
        // Route to analyze-code
        const { data, error } = await supabase.functions.invoke('analyze-code', {
          body: {
            code: context.currentCode || '',
            analysisType: 'quality'
          }
        });

        if (error) throw error;
        return {
          intent: 'code-analysis',
          module: 'analyze-code',
          response: data
        };
      }

      case 'chat':
      default: {
        // Route to chat-generate with enhanced context
        const { data, error } = await supabase.functions.invoke('chat-generate', {
          body: {
            message: userMessage,
            history: context.conversationHistory,
            currentCode: context.currentCode,
            userId: userId
          }
        });

        if (error) throw error;
        return {
          intent: 'chat',
          module: 'chat-generate',
          response: data
        };
      }
    }
  } catch (error: any) {
    console.error('Module routing error:', error);
    throw new Error(`Failed to route to module: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      message,
      conversationId,
      currentCode,
      projectId,
      history = []
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        userId = user?.id || null;
      } catch (error) {
        console.error('Auth error:', error);
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🧠 INTELLIGENT CONVERSATION - Processing request');
    console.log('User ID:', userId);
    console.log('Message:', message.substring(0, 100));

    // Phase 1: Load Universal Context
    const startContext = Date.now();
    const universalContext = await loadUniversalContext(supabase, userId, conversationId);
    universalContext.currentCode = currentCode;
    universalContext.conversationId = conversationId;
    universalContext.projectId = projectId;
    universalContext.conversationHistory = history;
    const contextTime = Date.now() - startContext;
    console.log(`✅ Context loaded in ${contextTime}ms`);

    // Phase 2: Recognize Intent
    const startIntent = Date.now();
    const intent = recognizeIntent(message, universalContext);
    const intentTime = Date.now() - startIntent;
    console.log(`🎯 Intent recognized: ${intent} (${intentTime}ms)`);

    // Phase 3: Route to Module
    const startRoute = Date.now();
    const moduleResponse = await routeToModule(intent, message, universalContext, supabase, userId);
    const routeTime = Date.now() - startRoute;
    console.log(`📡 Routed to ${moduleResponse.module} in ${routeTime}ms`);

    // Phase 4: Format Response
    const response = {
      success: true,
      intent: moduleResponse.intent,
      module: moduleResponse.module,
      data: moduleResponse.response,
      metadata: {
        contextLoadTime: contextTime,
        intentRecognitionTime: intentTime,
        moduleExecutionTime: routeTime,
        totalTime: contextTime + intentTime + routeTime,
        userId: userId,
        conversationId: conversationId
      }
    };

    console.log('✨ Response prepared successfully');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Intelligent conversation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
