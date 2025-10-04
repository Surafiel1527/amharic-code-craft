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
    // 1. Parse request body
    const { userRequest, conversationId, currentCode, autoRefine = true, autoLearn = true } = await req.json();
    
    console.log('📥 Smart orchestrator request received');
    console.log('   - User request length:', userRequest?.length || 0);
    console.log('   - Conversation ID:', conversationId);
    console.log('   - Has current code:', !!currentCode);
    
    // 2. Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      console.error('   Available headers:', Object.fromEntries(req.headers.entries()));
      throw new Error('Authentication required: Missing Authorization header');
    }

    console.log('✅ Authorization header present');
    console.log('   Token preview:', authHeader.substring(0, 30) + '...');

    // 3. Create Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        },
        auth: {
          persistSession: false, // Edge functions don't persist sessions
          autoRefreshToken: false, // Don't auto-refresh in edge function
        }
      }
    );

    // 4. Validate user authentication
    console.log('🔐 Validating user authentication...');
    
    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.error('❌ No token found in Authorization header');
      throw new Error('Authentication required: Invalid token format');
    }
    
    console.log('   Token extracted, length:', token.length);
    
    // Validate the token by passing it explicitly to getUser
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      console.error('   Error name:', authError.name);
      console.error('   Error status:', authError.status);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error('❌ No user found in auth session');
      throw new Error('Unauthorized: Invalid or expired session');
    }
    
    console.log('✅ User authenticated successfully');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');

    const startTime = Date.now();
    const phases: any[] = [];
    let currentResult: any = {};

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

    // PHASE 1: Architecture Planning
    console.log('Phase 1: Architecture Planning');
    const planResponse = await supabaseClient.functions.invoke('generate-with-plan', {
      body: {
        phase: 'plan',
        userRequest,
        conversationId,
        currentCode
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
    
    const planId = currentResult.plan?.planId;
    console.log('📋 Using plan ID:', planId);
    
    if (!planId) {
      console.error('❌ No plan ID available from planning phase');
      console.error('   Current result plan:', currentResult.plan);
      throw new Error('Plan ID not available from planning phase');
    }
    
    const generateResponse = await supabaseClient.functions.invoke('generate-with-plan', {
      body: {
        phase: 'generate',
        userRequest,
        conversationId,
        currentCode,
        planId: planId,
        userId: user.id,
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

    // PHASE 6: Learning (if enabled)
    if (autoLearn && currentResult.refinedCode) {
      console.log('Phase 6: Pattern Learning');
      const learnStart = Date.now();
      
      const learnResponse = await supabaseClient.functions.invoke('multi-project-learn', {
        body: {
          action: 'learn',
          userId: user.id,
          generatedCode: currentResult.refinedCode,
          context: userRequest,
          success: true
        }
      });

      if (!learnResponse.error) {
        phases.push({ 
          name: 'learning', 
          duration: Date.now() - learnStart,
          result: learnResponse.data 
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
    console.error('❌ Smart orchestrator error:', error);
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    console.error('   Stack trace:', error.stack);
    
    // Determine error type and provide specific feedback
    let statusCode = 500;
    let errorMessage = error.message || 'Internal server error';
    
    if (error.message?.includes('Authentication') || error.message?.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Authentication failed. Please log in again.';
    } else if (error.message?.includes('Authorization')) {
      statusCode = 403;
      errorMessage = 'Access denied. You do not have permission.';
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Resource not found.';
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});