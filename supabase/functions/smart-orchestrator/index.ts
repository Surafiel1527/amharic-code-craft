import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userRequest, conversationId, currentCode, autoRefine = true, autoLearn = true } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('Unauthorized: No authorization header');
    }
    
    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Create service role client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      throw new Error('Unauthorized: Invalid token');
    }
    
    console.log('✅ Authenticated user:', user.id);

    const startTime = Date.now();
    const phases: any[] = [];
    let currentResult: any = {};

    // PHASE 0: Load user preferences and professional knowledge
    console.log('Phase 0: Loading User Context & Professional Knowledge');
    const contextStart = Date.now();
    
    const { data: userPrefs } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id);

    const { data: professionalKnowledge } = await supabaseClient
      .from('professional_knowledge')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(10);

    const { data: recentLearnings } = await supabaseClient
      .from('conversation_learnings')
      .select('*')
      .eq('user_id', user.id)
      .order('last_reinforced_at', { ascending: false })
      .limit(5);

    phases.push({
      name: 'context_loading',
      duration: Date.now() - contextStart,
      result: {
        preferencesLoaded: userPrefs?.length || 0,
        knowledgeLoaded: professionalKnowledge?.length || 0,
        learningsLoaded: recentLearnings?.length || 0
      }
    });

    currentResult.userContext = {
      preferences: userPrefs,
      professionalKnowledge,
      recentLearnings
    };

    // Create orchestration run record
    const { data: runRecord } = await supabaseClient
      .from('orchestration_runs')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        request: userRequest,
        status: 'running'
      })
      .select()
      .single();

    console.log('Starting smart orchestration for:', userRequest);

    // PHASE 1: Architecture Planning (with user context)
    console.log('Phase 1: Architecture Planning');
    const planResponse = await supabaseClient.functions.invoke('generate-with-plan', {
      body: {
        phase: 'plan',
        userRequest,
        conversationId,
        currentCode,
        userContext: currentResult.userContext // Include preferences
      }
    });

    if (planResponse.error) throw planResponse.error;
    
    phases.push({ 
      name: 'planning', 
      duration: Date.now() - startTime,
      result: planResponse.data 
    });
    currentResult.plan = planResponse.data;

    // PHASE 2: Component Impact Analysis
    console.log('Phase 2: Component Impact Analysis');
    const impactStart = Date.now();
    
    if (currentCode) {
      const impactResponse = await supabaseClient.functions.invoke('component-awareness', {
        body: {
          action: 'analyze',
          conversationId,
          code: currentCode
        }
      });

      if (!impactResponse.error) {
        phases.push({ 
          name: 'impact_analysis', 
          duration: Date.now() - impactStart,
          result: impactResponse.data 
        });
        currentResult.impactAnalysis = impactResponse.data;
      }
    }

    // PHASE 3: Pattern Retrieval
    console.log('Phase 3: Pattern Retrieval');
    const patternStart = Date.now();
    
    const patternResponse = await supabaseClient.functions.invoke('multi-project-learn', {
      body: {
        action: 'retrieve',
        userId: user.id,
        context: userRequest,
        minConfidence: 60
      }
    });

    if (!patternResponse.error && patternResponse.data.patterns?.length > 0) {
      phases.push({ 
        name: 'pattern_retrieval', 
        duration: Date.now() - patternStart,
        result: patternResponse.data 
      });
      currentResult.suggestedPatterns = patternResponse.data.patterns;
    }

    // PHASE 4: Code Generation (with patterns and plan)
    console.log('Phase 4: Code Generation');
    const genStart = Date.now();
    
    const generateResponse = await supabaseClient.functions.invoke('generate-with-plan', {
      body: {
        phase: 'generate',
        userRequest,
        conversationId,
        currentCode,
        plan: currentResult.plan,
        suggestedPatterns: currentResult.suggestedPatterns || []
      }
    });

    if (generateResponse.error) throw generateResponse.error;
    
    phases.push({ 
      name: 'generation', 
      duration: Date.now() - genStart,
      result: generateResponse.data 
    });
    currentResult.generatedCode = generateResponse.data.code;

    // PHASE 5: Automatic Refinement (if enabled)
    if (autoRefine && currentResult.generatedCode) {
      console.log('Phase 5: Automatic Refinement');
      const refineStart = Date.now();
      
      const refineResponse = await supabaseClient.functions.invoke('iterative-refine', {
        body: {
          generatedCode: currentResult.generatedCode,
          userRequest,
          maxIterations: 2,
          targetQualityScore: 80,
          userId: user.id
        }
      });

      if (!refineResponse.error) {
        phases.push({ 
          name: 'refinement', 
          duration: Date.now() - refineStart,
          result: refineResponse.data 
        });
        currentResult.refinedCode = refineResponse.data.refinedCode;
        currentResult.qualityMetrics = refineResponse.data.summary;
      }
    }

    // PHASE 6: Learning (if enabled) - Enhanced with conversation learning
    if (autoLearn && currentResult.refinedCode) {
      console.log('Phase 6: Pattern Learning & User Preference Learning');
      const learnStart = Date.now();
      
      // Pattern learning
      const learnResponse = await supabaseClient.functions.invoke('multi-project-learn', {
        body: {
          action: 'learn',
          userId: user.id,
          generatedCode: currentResult.refinedCode,
          context: userRequest,
          success: true
        }
      });

      // Conversation learning (learns user preferences)
      const conversationLearnResponse = await supabaseClient.functions.invoke('learn-from-conversation', {
        body: {
          conversationId,
          messages: [],
          userRequest,
          generatedResponse: currentResult.refinedCode
        }
      });

      if (!learnResponse.error || !conversationLearnResponse.error) {
        phases.push({ 
          name: 'learning', 
          duration: Date.now() - learnStart,
          result: {
            patternLearning: learnResponse.data,
            conversationLearning: conversationLearnResponse.data
          }
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    // Update orchestration run
    await supabaseClient
      .from('orchestration_runs')
      .update({
        phases_completed: phases.map(p => p.name),
        total_duration_ms: totalDuration,
        status: 'completed',
        results: currentResult,
        completed_at: new Date().toISOString()
      })
      .eq('id', runRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        orchestrationId: runRecord.id,
        phases,
        totalDuration,
        finalCode: currentResult.refinedCode || currentResult.generatedCode,
        plan: currentResult.plan,
        impactAnalysis: currentResult.impactAnalysis,
        suggestedPatterns: currentResult.suggestedPatterns,
        qualityMetrics: currentResult.qualityMetrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Smart orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});