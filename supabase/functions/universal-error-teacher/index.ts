import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced error category detection patterns (includes deployment)
const ERROR_CATEGORIES = {
  deployment: /vercel|netlify|firebase|deployment|build output|dist|public directory|failed to deploy|deploy error|hosting|production build/i,
  dependency: /module not found|cannot find module|npm|yarn|package|dependency|peer dependency/i,
  runtime: /undefined|null|cannot read property|reference error|is not a function|maximum call stack|memory/i,
  typescript: /type error|ts\(|typescript|interface|property.*does not exist|type.*is not assignable/i,
  api: /fetch|api|network|cors|401|403|404|429|500|rate limit|timeout|request failed/i,
  database: /supabase|postgres|sql|query|database|connection refused|authentication failed|rls|row level security/i,
  build: /bundle|webpack|vite|rollup|compilation|cannot resolve/i,
  ui: /layout|render|component|react|hook|state|props|css|style|responsive/i,
  performance: /slow|performance|optimization|memory leak|lag|fps|bottleneck/i
};

function detectErrorCategory(errorMessage: string): { category: string; confidence: number } {
  const scores: Record<string, number> = {};
  
  for (const [category, pattern] of Object.entries(ERROR_CATEGORIES)) {
    const matches = errorMessage.match(pattern);
    scores[category] = matches ? matches.length : 0;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return { category: 'runtime', confidence: 0.3 };
  
  const category = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'runtime';
  const confidence = Math.min(maxScore / 3, 1.0); // Normalize confidence
  
  return { category, confidence };
}

function generateErrorSignature(errorMessage: string, category: string): string {
  // Create a normalized signature for pattern matching
  const normalized = errorMessage
    .toLowerCase()
    .replace(/\d+/g, 'N') // Replace numbers
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 200); // Limit length
  
  return `${category}:${normalized}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errorMessage, errorContext, projectContext, deploymentProvider } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎓 Universal Error Teacher - Analyzing error');

    // Step 1: Detect error category
    const { category, confidence } = detectErrorCategory(errorMessage);
    const errorSignature = generateErrorSignature(errorMessage, category);
    
    console.log(`📊 Detected category: ${category} (confidence: ${confidence})`);

    // Step 2: Check if we've seen this error pattern before
    const { data: knownPatterns } = await supabaseClient
      .from('universal_error_patterns')
      .select('*')
      .eq('error_category', category)
      .eq('error_signature', errorSignature)
      .order('confidence_score', { ascending: false })
      .limit(1);

    if (knownPatterns && knownPatterns.length > 0) {
      const pattern = knownPatterns[0];
      console.log('✅ Found known solution for this error');
      
      // Update usage count
      await supabaseClient
        .from('universal_error_patterns')
        .update({ 
          times_encountered: pattern.times_encountered + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', pattern.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          category,
          patternId: pattern.id,
          solution: pattern.solution,
          diagnosis: pattern.diagnosis,
          rootCause: pattern.root_cause,
          fixType: pattern.fix_type,
          confidence: pattern.confidence_score,
          preventionTips: pattern.prevention_tips,
          isKnown: true,
          message: `✅ Known ${category} error - applying learned fix (${Math.round(pattern.confidence_score * 100)}% confidence)`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Use AI to learn and create a new solution
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const teachingPrompt = `You are an expert software engineer and debugging specialist. Analyze this error and create a structured solution.

**Error Category:** ${category}
**Error Message:**
${errorMessage}

**Error Context:**
${JSON.stringify(errorContext, null, 2)}

**Project Context:**
${JSON.stringify(projectContext, null, 2)}

**Your Task:**
1. Identify the root cause of the error
2. Determine what files need to be created/modified
3. Provide specific code changes or configuration updates
4. Create a reusable solution pattern

**Output Format (JSON only):**
{
  "diagnosis": "Clear, user-friendly explanation of what's wrong",
  "rootCause": "Technical reason for the error",
  "subcategory": "More specific error type (e.g., 'null-reference', 'type-mismatch', 'cors', etc.)",
  "fixType": "code|config|dependency|architecture|data",
  "affectedTechnologies": ["react", "typescript", "vite", etc.],
  "solution": {
    "files": [
      {
        "path": "path/to/file",
        "action": "create|modify|delete",
        "content": "exact file content or changes needed",
        "explanation": "why this change fixes the error"
      }
    ],
    "codeChanges": [
      {
        "file": "path/to/file",
        "changes": "description of what to change",
        "before": "code before (if modifying)",
        "after": "code after"
      }
    ],
    "steps": ["Step-by-step instructions to apply the fix"],
    "verification": "How to verify the fix worked"
  },
  "commonTriggers": ["What typically causes this error"],
  "preventionTips": ["How to avoid this in the future"],
  "relatedErrors": ["Other errors this might cause or relate to"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert debugging AI. Always respond with valid JSON only.' },
          { role: 'user', content: teachingPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const learningResult = JSON.parse(aiData.choices[0].message.content);

    // Step 4: Store this learning for future use (includes deployment info)
    const { data: newPattern, error: insertError } = await supabaseClient
      .from('universal_error_patterns')
      .insert({
        error_category: category,
        error_subcategory: learningResult.subcategory,
        error_signature: errorSignature,
        error_pattern: errorMessage,
        diagnosis: learningResult.diagnosis,
        root_cause: learningResult.rootCause,
        solution: learningResult.solution,
        fix_type: learningResult.fixType,
        affected_technologies: learningResult.affectedTechnologies,
        common_triggers: learningResult.commonTriggers,
        prevention_tips: learningResult.preventionTips,
        related_errors: learningResult.relatedErrors,
        confidence_score: confidence,
        learned_from_user_id: user.id,
        learned_from_project_id: projectContext?.projectId,
        deployment_provider: deploymentProvider || null,
        environment: errorContext?.environment || 'development'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store pattern:', insertError);
    }

    console.log(`✨ New ${category} error pattern learned and stored`);

    return new Response(
      JSON.stringify({
        success: true,
        category,
        patternId: newPattern?.id,
        solution: learningResult.solution,
        diagnosis: learningResult.diagnosis,
        rootCause: learningResult.rootCause,
        fixType: learningResult.fixType,
        confidence: confidence,
        preventionTips: learningResult.preventionTips,
        isKnown: false,
        message: `🎓 AI learned how to fix this ${category} error. Applying solution...`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in universal-error-teacher:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
