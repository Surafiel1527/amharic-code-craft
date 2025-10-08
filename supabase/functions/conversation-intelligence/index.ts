import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Conversation Intelligence Engine
 * Understands complex requests, maintains context, and orchestrates intelligently
 * Makes the platform understand like a human AI assistant
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      userRequest,
      conversationId,
      userId,
      projectId
    } = await req.json();

    console.log('🧠 Conversation Intelligence analyzing request...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // **Step 1: Load Conversation Context**
    const context = await loadConversationContext(supabase, conversationId, userId, projectId);
    console.log('📚 Context loaded:', {
      messagesCount: context.previousMessages.length,
      hasAuth: context.projectState.has_auth,
      hasTodos: context.projectState.generated_features.includes('todos'),
      hasProfiles: context.projectState.has_profiles
    });

    // **Step 2: Parse Intent with AI (Understanding like you do)**
    const intentAnalysis = await parseIntentWithAI(LOVABLE_API_KEY, userRequest, context);
    console.log('🎯 Intent parsed:', intentAnalysis);

    // **Step 3: Build Execution Plan**
    const executionPlan = await buildExecutionPlan(
      supabase,
      LOVABLE_API_KEY,
      intentAnalysis,
      context
    );
    console.log('📋 Execution plan:', executionPlan);

    // **Step 4: Save Understanding to Context**
    await updateConversationContext(supabase, conversationId, userId, {
      last_request: userRequest,
      intent: intentAnalysis,
      execution_plan: executionPlan,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      understanding: {
        intent: intentAnalysis.intent,
        complexity: intentAnalysis.complexity,
        requires_existing_features: intentAnalysis.dependencies,
        multi_step: intentAnalysis.is_multi_step
      },
      execution_plan: executionPlan,
      context_used: {
        previous_features: context.projectState.generated_features,
        has_auth: context.projectState.has_auth,
        conversation_depth: context.previousMessages.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in conversation-intelligence:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Load full conversation context
async function loadConversationContext(
  supabase: any, 
  conversationId: string, 
  userId: string,
  projectId?: string
) {
  // Get conversation history
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get project state
  const { data: projectContext } = await supabase
    .from('project_intelligence_context')
    .select('*')
    .eq('project_id', projectId || conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  // Get generated components/features
  const { data: generatedCode } = await supabase
    .from('generated_code')
    .select('component_name, file_path, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    previousMessages: messages || [],
    projectState: projectContext || {
      has_auth: false,
      has_profiles: false,
      has_rls: false,
      protected_routes: [],
      generated_features: []
    },
    generatedComponents: generatedCode || [],
    generatedFeatures: extractFeaturesFromComponents(generatedCode)
  };
}

// Extract feature names from generated components
function extractFeaturesFromComponents(components: any[]) {
  const features = new Set<string>();
  
  components?.forEach(comp => {
    const name = comp.component_name?.toLowerCase() || '';
    const path = comp.file_path?.toLowerCase() || '';
    
    if (name.includes('todo') || path.includes('todo')) features.add('todos');
    if (name.includes('auth') || path.includes('auth')) features.add('auth');
    if (name.includes('profile') || path.includes('profile')) features.add('profiles');
    if (name.includes('note') || path.includes('note')) features.add('notes');
    if (name.includes('post') || path.includes('post')) features.add('posts');
    if (name.includes('comment') || path.includes('comment')) features.add('comments');
    if (name.includes('settings') || path.includes('settings')) features.add('settings');
  });
  
  return Array.from(features);
}

// Parse user intent using AI (like how you understand requests)
async function parseIntentWithAI(apiKey: string, userRequest: string, context: any) {
  const systemPrompt = `You are an intelligent intent parser for a code generation platform.

Analyze the user's request and understand:
1. What they want to build/add
2. If it requires existing features (progressive enhancement)
3. Dependencies on previous work
4. Multi-step nature
5. Complexity level

Current Project State:
- Has Auth: ${context.projectState.has_auth}
- Has Profiles: ${context.projectState.has_profiles}
- Existing Features: ${context.projectState.generated_features.join(', ')}
- Previous Messages: ${context.previousMessages.length}

Return JSON:
{
  "intent": "clear description of what user wants",
  "primary_action": "main thing to build/add",
  "secondary_actions": ["list of additional things"],
  "dependencies": ["features this needs from existing code"],
  "is_multi_step": boolean,
  "is_progressive_enhancement": boolean,
  "complexity": "simple|moderate|complex",
  "requires_confirmation": boolean,
  "suggested_order": ["step1", "step2", "step3"],
  "reasoning": "why you parsed it this way"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userRequest }
      ],
      temperature: 0.3 // Lower for more consistent parsing
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {
      intent: userRequest,
      primary_action: 'generate',
      complexity: 'moderate',
      is_multi_step: false
    };
  } catch {
    return {
      intent: userRequest,
      primary_action: 'generate',
      complexity: 'moderate',
      is_multi_step: false
    };
  }
}

// Build intelligent execution plan
async function buildExecutionPlan(
  supabase: any,
  apiKey: string,
  intent: any,
  context: any
) {
  const systemPrompt = `You are an intelligent execution planner for code generation.

Given the user's intent and project context, create a detailed execution plan.

Intent: ${JSON.stringify(intent)}
Project Context: ${JSON.stringify(context.projectState)}

Create a step-by-step execution plan that:
1. Handles dependencies first (e.g., auth before protected features)
2. Sequences operations logically
3. Identifies what needs confirmation
4. Links to existing features when doing progressive enhancement

Return JSON:
{
  "steps": [
    {
      "order": 1,
      "action": "clear action name",
      "description": "what this step does",
      "requires_confirmation": boolean,
      "depends_on": ["previous steps it needs"],
      "creates": ["tables/components this creates"],
      "links_to_existing": ["existing features to integrate with"]
    }
  ],
  "total_steps": number,
  "estimated_complexity": "simple|moderate|complex",
  "requires_migrations": boolean,
  "requires_new_auth": boolean
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Create execution plan' }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { steps: [], total_steps: 0 };
  } catch {
    return { steps: [], total_steps: 0 };
  }
}

// Update conversation context with new understanding
async function updateConversationContext(
  supabase: any,
  conversationId: string,
  userId: string,
  update: any
) {
  await supabase
    .from('conversation_context_log')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      request: update.last_request,
      intent: update.intent,
      execution_plan: update.execution_plan,
      created_at: update.timestamp
    });
}
