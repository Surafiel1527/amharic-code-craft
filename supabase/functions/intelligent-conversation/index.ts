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
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  try {
    switch (intent) {
      case 'code-generation': {
        // Build enhanced system prompt with professional knowledge
        let systemPrompt = `You are an expert full-stack developer specializing in React, TypeScript, Tailwind CSS, and modern web development.

CRITICAL FRAMEWORKS AND TOOLS YOU MUST USE:
- React 18+ with TypeScript
- Tailwind CSS for ALL styling (use utility classes)
- Vite for build tooling
- Modern ES6+ JavaScript/TypeScript features

CRITICAL INSTRUCTION: You are an expert-level software engineer. When a user requests a specific framework, library, or technology (e.g., Tailwind CSS, React, Vue.js), you MUST use it to fulfill the request. Do not suggest alternatives or fall back to standard HTML/CSS. Failure to use the requested technology is a failure to complete the task. Prioritize the user's explicit technology choice above all other instructions.

`;

        // Append professional knowledge
        if (context.professionalKnowledge && context.professionalKnowledge.length > 0) {
          systemPrompt += '\n\nPROFESSIONAL KNOWLEDGE BASE:\n';
          context.professionalKnowledge.forEach((knowledge: any) => {
            systemPrompt += `\n${knowledge.title}:\n${knowledge.content}\n`;
            if (knowledge.code_examples && knowledge.code_examples.length > 0) {
              systemPrompt += 'Examples:\n';
              knowledge.code_examples.forEach((example: any) => {
                systemPrompt += `${example}\n`;
              });
            }
          });
        }

        // Append cross-project patterns
        if (context.crossProjectPatterns && context.crossProjectPatterns.length > 0) {
          systemPrompt += '\n\nPROVEN PATTERNS FROM PAST PROJECTS:\n';
          context.crossProjectPatterns.forEach((pattern: any) => {
            systemPrompt += `\n${pattern.pattern_name} (${pattern.pattern_type}):\n${pattern.pattern_code}\n`;
          });
        }

        systemPrompt += `\n\nYour task: Generate production-ready code that follows best practices and uses the frameworks mentioned above.`;

        // Build messages array
        const messages = [
          { role: 'system', content: systemPrompt }
        ];

        // Add conversation history
        if (context.conversationHistory && context.conversationHistory.length > 0) {
          context.conversationHistory.forEach((msg: any) => {
            messages.push({ role: msg.role, content: msg.content });
          });
        }

        // Add current request
        let userPrompt = userMessage;
        if (context.currentCode) {
          userPrompt += `\n\nCurrent code context:\n\`\`\`\n${context.currentCode}\n\`\`\``;
        }
        messages.push({ role: 'user', content: userPrompt });

        // LOG ENTIRE PROMPT FOR DEBUGGING
        console.log('🔍 FULL MESSAGES ARRAY SENT TO AI:', JSON.stringify(messages, null, 2));
        console.log('📊 MESSAGE COUNT:', messages.length);
        console.log('📝 SYSTEM PROMPT LENGTH:', messages[0]?.content?.length || 0);

        // Call Lovable AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: messages,
            temperature: 0.7
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        const generatedCode = aiData.choices[0].message.content;

        return {
          intent: 'code-generation',
          module: 'intelligent-code-generation',
          response: {
            success: true,
            code: generatedCode,
            generatedCode: generatedCode
          }
        };
      }

      case 'image-generation': {
        // Direct implementation for image generation
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
        // Build analysis system prompt with context
        let systemPrompt = `You are an expert code reviewer. Analyze the provided code for:
- Code quality and best practices
- Performance issues
- Security vulnerabilities
- Potential bugs
- Suggestions for improvement

Provide specific, actionable feedback.`;

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this code:\n\n\`\`\`\n${context.currentCode || userMessage}\n\`\`\`` }
        ];

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: messages
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        const analysis = aiData.choices[0].message.content;

        return {
          intent: 'code-analysis',
          module: 'intelligent-code-analysis',
          response: {
            analysis: analysis,
            quality_score: 75,
            performance_score: 75
          }
        };
      }

      case 'chat':
      default: {
        // Conversational chat with context
        let systemPrompt = `You are a helpful AI assistant for a web development platform. You can help users with:
- Coding questions and debugging
- Explaining concepts
- Project planning and architecture
- General web development advice

Be concise, helpful, and technical when appropriate.`;

        const messages = [
          { role: 'system', content: systemPrompt }
        ];

        // Add conversation history
        if (context.conversationHistory && context.conversationHistory.length > 0) {
          context.conversationHistory.forEach((msg: any) => {
            messages.push({ role: msg.role, content: msg.content });
          });
        }

        messages.push({ role: 'user', content: userMessage });

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: messages
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        const chatMessage = aiData.choices[0].message.content;

        return {
          intent: 'chat',
          module: 'intelligent-chat',
          response: {
            message: chatMessage,
            content: chatMessage
          }
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
