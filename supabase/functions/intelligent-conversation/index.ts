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
        // Route to Component Generation Agent (existing agentic method)
        if (subIntent === 'component' || subIntent === 'general') {
        console.log('🤖 AGENTIC METHOD: Starting 3-step code generation workflow');
        
        // STEP 1: PLAN GENERATION
        console.log('📋 STEP 1: Generating component plan...');
        const planPrompt = `You are a technical architect. Analyze this request and create a detailed implementation plan.

User Request: ${userMessage}

Return ONLY a valid JSON object with this exact structure:
{
  "componentName": "string",
  "description": "string",
  "framework": "React with TypeScript",
  "requiredTailwindClasses": ["array", "of", "tailwind", "classes"],
  "structure": ["array", "of", "html", "element", "descriptions"],
  "features": ["array", "of", "functional", "requirements"]
}

Focus on Tailwind CSS utility classes. Be specific about which classes will be used.`;

        const planResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [{ role: 'user', content: planPrompt }],
            temperature: 0.3
          })
        });

        if (!planResponse.ok) {
          throw new Error(`Plan generation failed: ${planResponse.status}`);
        }

        const planData = await planResponse.json();
        let planContent = planData.choices[0].message.content;
        
        // Extract JSON from markdown code blocks if present
        const jsonMatch = planContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          planContent = jsonMatch[1];
        }
        
        const plan = JSON.parse(planContent);
        console.log('✅ STEP 1 COMPLETE: Plan generated', plan);

        // STEP 2: STRUCTURE (HTML) GENERATION
        console.log('🏗️ STEP 2: Generating React component structure...');
        const structurePrompt = `You are a React developer. Create a clean, semantic React component with TypeScript based on this plan:

Component Name: ${plan.componentName}
Description: ${plan.description}
Structure Required: ${plan.structure.join(', ')}
Features: ${plan.features.join(', ')}

CRITICAL RULES:
1. Generate ONLY a React functional component with TypeScript
2. Use NO inline styles
3. Use NO className attributes yet (they will be added in the next step)
4. Use semantic HTML elements (div, section, article, header, etc.)
5. Include all necessary props with proper TypeScript types
6. Add placeholder text where needed

Return ONLY the raw React component code, nothing else.`;

        const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [{ role: 'user', content: structurePrompt }],
            temperature: 0.2
          })
        });

        if (!structureResponse.ok) {
          throw new Error(`Structure generation failed: ${structureResponse.status}`);
        }

        const structureData = await structureResponse.json();
        let rawComponent = structureData.choices[0].message.content;
        
        // Extract code from markdown blocks if present
        const codeMatch = rawComponent.match(/```(?:tsx|typescript|jsx)?\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          rawComponent = codeMatch[1];
        }
        
        console.log('✅ STEP 2 COMPLETE: Component structure generated');

        // STEP 3: STYLE (TAILWIND CLASS) INJECTION
        console.log('🎨 STEP 3: Injecting Tailwind CSS classes...');
        const stylePrompt = `You are a Tailwind CSS expert. Take this unstyled React component and add Tailwind CSS classes to make it beautiful and functional.

UNSTYLED COMPONENT:
\`\`\`tsx
${rawComponent}
\`\`\`

REQUIRED TAILWIND CLASSES TO USE:
${plan.requiredTailwindClasses.join(', ')}

CRITICAL RULES:
1. Add className attributes with Tailwind utility classes to EVERY element that needs styling
2. You MUST use Tailwind CSS classes - this is mandatory
3. Make the component responsive using Tailwind responsive prefixes (sm:, md:, lg:)
4. Use the Tailwind classes specified in the requirements
5. Ensure proper spacing, typography, colors, and layout
6. Keep the same component structure, only add className attributes

Return ONLY the complete styled React component code with Tailwind classes, nothing else.`;

        const styleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [{ role: 'user', content: stylePrompt }],
            temperature: 0.2
          })
        });

        if (!styleResponse.ok) {
          throw new Error(`Style injection failed: ${styleResponse.status}`);
        }

        const styleData = await styleResponse.json();
        let finalCode = styleData.choices[0].message.content;
        
        // Extract final code from markdown blocks if present
        const finalCodeMatch = finalCode.match(/```(?:tsx|typescript|jsx)?\s*([\s\S]*?)\s*```/);
        if (finalCodeMatch) {
          finalCode = finalCodeMatch[1];
        }
        
        console.log('✅ STEP 3 COMPLETE: Tailwind classes injected');
        console.log('🎉 AGENTIC METHOD: All 3 steps completed successfully');

        return {
          intent: 'code-generation',
          subIntent: subIntent,
          module: 'agentic-code-generation',
          response: {
            success: true,
            code: finalCode,
            generatedCode: finalCode,
            agenticWorkflow: {
              plan: plan,
              steps: ['plan-generation', 'structure-generation', 'style-injection'],
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
