import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced Intent Recognition with Sub-Intent Detection
interface IntentResult {
  primaryIntent: string;
  subIntent?: string;
  confidence: number;
}

function recognizeIntent(userMessage: string, context: any): IntentResult {
  const msg = userMessage.toLowerCase();
  
  // Dockerfile/Docker patterns - HIGH PRIORITY
  if (
    msg.includes('dockerfile') || msg.includes('docker') || 
    msg.includes('containerize') || msg.includes('container')
  ) {
    return {
      primaryIntent: 'infrastructure-generation',
      subIntent: 'dockerfile',
      confidence: 0.95
    };
  }
  
  // Component generation patterns
  if (
    (msg.includes('component') || msg.includes('card') || msg.includes('button') ||
     msg.includes('form') || msg.includes('modal') || msg.includes('navbar')) &&
    (msg.includes('create') || msg.includes('build') || msg.includes('generate'))
  ) {
    return {
      primaryIntent: 'code-generation',
      subIntent: 'component',
      confidence: 0.9
    };
  }
  
  // General code generation patterns
  if (
    msg.includes('create') || msg.includes('build') || msg.includes('generate') ||
    msg.includes('add') || msg.includes('implement') || msg.includes('make') ||
    msg.includes('function') || msg.includes('feature') ||
    context.currentCode || context.conversationId
  ) {
    return {
      primaryIntent: 'code-generation',
      subIntent: 'general',
      confidence: 0.75
    };
  }
  
  // Image generation patterns
  if (
    msg.includes('image') || msg.includes('picture') || msg.includes('photo') ||
    msg.includes('generate image') || msg.includes('create image')
  ) {
    return {
      primaryIntent: 'image-generation',
      confidence: 0.9
    };
  }
  
  // Analysis patterns
  if (
    msg.includes('analyze') || msg.includes('review') || msg.includes('check') ||
    msg.includes('improve') || msg.includes('refactor') || msg.includes('optimize')
  ) {
    return {
      primaryIntent: 'code-analysis',
      confidence: 0.85
    };
  }
  
  // Default to conversational chat
  return {
    primaryIntent: 'chat',
    confidence: 0.5
  };
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

// INTELLIGENT ORCHESTRATOR: Routes to Specialist Agents
async function routeToModule(
  intentResult: IntentResult,
  userMessage: string,
  context: any,
  supabase: any,
  userId: string | null
) {
  const { primaryIntent, subIntent } = intentResult;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  try {
    // ORCHESTRATOR ROUTING LOGIC
    switch (primaryIntent) {
      case 'infrastructure-generation': {
        // Route to Dockerfile Agent
        if (subIntent === 'dockerfile') {
          console.log('🎯 ORCHESTRATOR: Routing to Dockerfile Agent');
          
          const { data: dockerfileData, error: dockerfileError } = await supabase.functions.invoke('dockerfile-agent', {
            body: {
              projectDescription: userMessage,
              additionalServices: [] // Could be extracted from message in future
            }
          });

          if (dockerfileError) throw dockerfileError;

          return {
            intent: 'infrastructure-generation',
            subIntent: 'dockerfile',
            module: 'dockerfile-agent',
            response: dockerfileData
          };
        }
        break;
      }

      case 'code-generation': {
        // Route to Smart Update Agent - understands existing project context
        if (subIntent === 'component' || subIntent === 'general') {
        console.log('🧠 SMART UPDATE: Analyzing project and applying intelligent changes...');
        
        // Enhanced context: understand what exists
        const projectContext = {
          currentCode: context.currentCode,
          hasCode: !!context.currentCode,
          message: userMessage,
          conversationHistory: context.conversationHistory
        };
        
        // SMART ANALYSIS: Understand the intent and target
        const analysisPrompt = `You are an expert software architect analyzing a modification request.

CURRENT PROJECT:
${projectContext.hasCode ? `\`\`\`\n${projectContext.currentCode.substring(0, 3000)}\n\`\`\`` : 'No existing code'}

USER REQUEST: ${userMessage}

ANALYZE:
1. What specific element/component needs to be changed?
2. What type of change is being requested (color, layout, text, functionality)?
3. What files/sections are affected?
4. What's the minimal change needed?

Return a JSON object with:
{
  "changeType": "style" | "content" | "structure" | "functionality",
  "targetElement": "description of what to change (e.g., 'header background color')",
  "targetSelector": "CSS selector or component name if identifiable",
  "modification": "specific change description",
  "reasoning": "why this interpretation"
}`;

        const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [{ role: 'user', content: analysisPrompt }],
            temperature: 0.1
          })
        });

        if (!analysisResponse.ok) {
          throw new Error(`Analysis failed: ${analysisResponse.status}`);
        }

        const analysisData = await analysisResponse.json();
        let analysisContent = analysisData.choices[0].message.content;
        
        const jsonMatch = analysisContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          analysisContent = jsonMatch[1];
        }
        
        const analysis = JSON.parse(analysisContent);
        console.log('✅ ANALYSIS COMPLETE:', analysis);
        
        // SMART MODIFICATION: Apply the change intelligently
        console.log('🔧 APPLYING MODIFICATION...');
        const modificationPrompt = `You are an expert developer. Apply this specific modification to the existing code.

CURRENT CODE:
\`\`\`
${projectContext.currentCode || '<!-- No existing code -->'}
\`\`\`

MODIFICATION NEEDED:
- Target: ${analysis.targetElement}
- Change Type: ${analysis.changeType}
- Modification: ${analysis.modification}
- User Request: ${userMessage}

CRITICAL RULES:
1. If code exists, MODIFY it - don't create from scratch
2. Keep ALL existing functionality and structure
3. ONLY change what's requested
4. For style changes (colors, sizes), update only those attributes
5. Maintain all existing classes and content
6. Return the COMPLETE modified code

If the change is a color change:
- Find the element (header, button, section, etc.)
- Update its background/color classes from red/current to gray/requested
- Keep everything else identical

Return ONLY the complete updated code, ready to use.`;

        const modificationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [{ role: 'user', content: modificationPrompt }],
            temperature: 0.1
          })
        });

        if (!modificationResponse.ok) {
          throw new Error(`Modification failed: ${modificationResponse.status}`);
        }

        const modificationData = await modificationResponse.json();
        let modifiedCode = modificationData.choices[0].message.content;
        
        const codeMatch = modifiedCode.match(/```(?:html|tsx|typescript|jsx)?\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          modifiedCode = codeMatch[1];
        }
        
        console.log('✅ MODIFICATION COMPLETE');
        console.log('🎉 SMART UPDATE: Successfully applied changes');

        return {
          intent: 'code-generation',
          subIntent: subIntent,
          module: 'smart-update-agent',
          response: {
            success: true,
            code: modifiedCode,
            generatedCode: modifiedCode,
            finalCode: modifiedCode,
            analysis: analysis,
            explanation: `Updated ${analysis.targetElement}: ${analysis.modification}`,
            smartWorkflow: {
              analysis: analysis,
              steps: ['analyze-intent', 'apply-modification'],
              completed: true
            }
          }
        };
        }
        break;
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
            model: 'google/gemini-2.5-pro', // Using most powerful model for analysis quality
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
            model: 'google/gemini-2.5-pro', // Using most powerful model for conversational quality
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

    // Phase 2: Recognize Intent (with sub-intent detection)
    const startIntent = Date.now();
    const intentResult = recognizeIntent(message, universalContext);
    const intentTime = Date.now() - startIntent;
    console.log(`🎯 Intent recognized: ${intentResult.primaryIntent}${intentResult.subIntent ? ` -> ${intentResult.subIntent}` : ''} (confidence: ${intentResult.confidence}, ${intentTime}ms)`);

    // Phase 3: Route to Specialist Agent
    const startRoute = Date.now();
    const moduleResponse = await routeToModule(intentResult, message, universalContext, supabase, userId);
    const routeTime = Date.now() - startRoute;
    
    if (!moduleResponse) {
      throw new Error('Module routing failed to produce a response');
    }
    
    console.log(`📡 Routed to ${moduleResponse.module} in ${routeTime}ms`);

    // Phase 4: Format Response
    const response = {
      success: true,
      intent: moduleResponse.intent,
      subIntent: moduleResponse.subIntent,
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
