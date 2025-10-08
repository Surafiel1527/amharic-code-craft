import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { conversationId, codeContext, errorType, userRequest, projectContext } = await req.json();

    console.log('🔍 Enhanced Pattern Recognizer analyzing:', { conversationId, errorType, hasProjectContext: !!projectContext });

    // **NEW: Smart Pattern Detection for Common Scenarios**
    const detectedPatterns = await detectSmartPatterns(userRequest, codeContext, projectContext);
    console.log('🧠 Smart patterns detected:', detectedPatterns);

    // Create pattern signature
    const signature = `${errorType}_${codeContext?.substring(0, 100)}`;

    // Check if pattern exists
    const { data: existingPattern } = await supabase
      .from('pattern_recognition_cache')
      .select('*')
      .eq('pattern_type', errorType)
      .eq('pattern_signature', signature)
      .maybeSingle();

    if (existingPattern) {
      // Update pattern
      await supabase
        .from('pattern_recognition_cache')
        .update({
          occurrence_count: existingPattern.occurrence_count + 1,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', existingPattern.id);

      return new Response(JSON.stringify({
        success: true,
        pattern_recognized: true,
        recommended_action: existingPattern.recommended_action,
        confidence: existingPattern.success_rate / 100,
        smart_patterns: detectedPatterns // NEW: Include smart patterns
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to analyze new pattern
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const analysisPrompt = `
Analyze this error pattern and recommend a solution:

Error Type: ${errorType}
Code Context: ${codeContext}
User Request: ${userRequest}
Detected Smart Patterns: ${JSON.stringify(detectedPatterns)}

Provide:
1. Root cause analysis
2. Recommended fix
3. Prevention strategy
4. Security considerations
5. Required RLS policies (if database involved)

Return JSON:
{
  "root_cause": "<analysis>",
  "recommended_fix": "<fix>",
  "prevention_strategy": "<strategy>",
  "security_notes": "<security>",
  "rls_policies": ["<policy1>", "<policy2>"]
}
    `;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an enhanced pattern recognition system that understands security, authentication, and best practices.' },
          { role: 'user', content: analysisPrompt }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let analysis = {
      root_cause: 'Unknown',
      recommended_fix: 'Manual review required',
      prevention_strategy: 'Add tests',
      security_notes: '',
      rls_policies: []
    };
    
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Using default analysis');
    }

    // Store new pattern
    await supabase
      .from('pattern_recognition_cache')
      .insert({
        pattern_type: errorType,
        pattern_signature: signature,
        recommended_action: analysis
      });

    return new Response(JSON.stringify({
      success: true,
      pattern_recognized: false,
      is_new_pattern: true,
      recommended_action: analysis,
      smart_patterns: detectedPatterns // NEW: Include smart patterns
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

// **NEW: Smart Pattern Detection Function**
function detectSmartPatterns(userRequest: string, codeContext: string, projectContext: any) {
  const patterns = {
    needsAuth: false,
    needsConfirmation: false,
    needsRLS: false,
    needsProtectedRoute: false,
    isDestructiveOperation: false,
    involvesPII: false,
    requiredComponents: [] as string[]
  };

  const request = (userRequest || '').toLowerCase();
  const code = (codeContext || '').toLowerCase();

  // Detect CRUD operations that need auth
  const crudKeywords = ['todo', 'post', 'comment', 'note', 'task', 'item', 'list', 'message', 'user data'];
  patterns.needsAuth = crudKeywords.some(keyword => request.includes(keyword));

  // Detect destructive operations that need confirmation
  const destructiveKeywords = ['delete', 'remove', 'clear', 'destroy', 'wipe'];
  patterns.isDestructiveOperation = destructiveKeywords.some(keyword => request.includes(keyword));
  patterns.needsConfirmation = patterns.isDestructiveOperation || request.includes('edit');

  // Detect table creation = need RLS
  patterns.needsRLS = request.includes('table') || request.includes('database') || request.includes('store');

  // Detect PII
  const piiKeywords = ['email', 'phone', 'address', 'profile', 'personal'];
  patterns.involvesPII = piiKeywords.some(keyword => request.includes(keyword));

  // Detect if protected route is needed
  patterns.needsProtectedRoute = patterns.needsAuth;

  // Recommend required components
  if (patterns.needsAuth) {
    patterns.requiredComponents.push('Authentication', 'useAuth hook');
  }
  if (patterns.needsConfirmation) {
    patterns.requiredComponents.push('ConfirmDialog component');
  }
  if (patterns.needsRLS) {
    patterns.requiredComponents.push('RLS policies');
  }
  if (patterns.needsProtectedRoute) {
    patterns.requiredComponents.push('ProtectedRoute wrapper');
  }

  return patterns;
}

  } catch (error) {
    console.error('Error in pattern-recognizer:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});