import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errorId } = await req.json();

    if (!errorId) {
      throw new Error('errorId is required');
    }

    console.log('Auto-fix engine analyzing error:', errorId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get error details
    const { data: error, error: fetchError } = await supabaseClient
      .from('detected_errors')
      .select('*')
      .eq('id', errorId)
      .single();

    if (fetchError || !error) {
      throw new Error('Error not found');
    }

    // Check if we should attempt fixing (prevent infinite loops)
    if (error.fix_attempts >= 3) {
      console.log('Max fix attempts reached, skipping');
      await supabaseClient
        .from('detected_errors')
        .update({ status: 'failed', auto_fix_enabled: false })
        .eq('id', errorId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Max fix attempts reached' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to analyzing
    await supabaseClient
      .from('detected_errors')
      .update({ status: 'analyzing' })
      .eq('id', errorId);

    // Check knowledge base for similar fixed errors
    const { data: knowledgeBase } = await supabaseClient
      .from('error_patterns')
      .select('*')
      .eq('error_type', error.error_type)
      .eq('resolution_status', 'solved')
      .order('frequency', { ascending: false })
      .limit(3);

    // Build AI prompt for fix generation
    const knowledgeContext = knowledgeBase && knowledgeBase.length > 0
      ? `\n\nKnown solutions for similar errors:\n${knowledgeBase.map(kb => 
          `- ${kb.error_pattern}: ${kb.solution}`
        ).join('\n')}`
      : '';

    const aiPrompt = `You are an expert code debugger and fixer. Analyze this error and generate a fix.

ERROR DETAILS:
Type: ${error.error_type}
Message: ${error.error_message}
Source: ${error.source}
${error.function_name ? `Function: ${error.function_name}` : ''}
${error.file_path ? `File: ${error.file_path}` : ''}
${error.stack_trace ? `Stack Trace: ${error.stack_trace}` : ''}

CONTEXT:
${JSON.stringify(error.error_context, null, 2)}
${knowledgeContext}

TASK:
1. Identify the root cause
2. Generate a fix (code patch, config change, or migration)
3. Explain the fix clearly
4. Provide confidence score (0-1)

Return JSON ONLY in this exact format:
{
  "fixType": "code_patch|migration|config_change",
  "originalCode": "original code if applicable",
  "fixedCode": "fixed code",
  "explanation": "clear explanation of what was wrong and how the fix resolves it",
  "confidence": 0.85
}`;

    // Call AI to generate fix
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: aiPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const fixData = JSON.parse(aiData.choices[0].message.content);

    console.log('Generated fix:', fixData.fixType, 'Confidence:', fixData.confidence);

    // Store the generated fix
    const { data: autoFix, error: fixInsertError } = await supabaseClient
      .from('auto_fixes')
      .insert({
        error_id: errorId,
        fix_type: fixData.fixType,
        original_code: fixData.originalCode,
        fixed_code: fixData.fixedCode,
        explanation: fixData.explanation,
        ai_confidence: fixData.confidence,
        status: 'pending'
      })
      .select()
      .single();

    if (fixInsertError) throw fixInsertError;

    // Update error status
    await supabaseClient
      .from('detected_errors')
      .update({ 
        status: 'fixing',
        fix_attempts: error.fix_attempts + 1
      })
      .eq('id', errorId);

    // Auto-apply fix if confidence is high enough
    if (fixData.confidence >= 0.8) {
      console.log('High confidence fix, auto-applying...');
      
      // Trigger fix application in background (don't await)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/apply-fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ fixId: autoFix.id }),
      }).catch(err => console.error('Failed to apply fix:', err));
    } else {
      // Notify admins for manual review
      await supabaseClient.rpc('notify_admins', {
        notification_type: 'improvement',
        notification_title: '🔧 Fix Generated (Manual Review Required)',
        notification_message: `Fix generated for ${error.error_type} with ${(fixData.confidence * 100).toFixed(0)}% confidence. Review required.`,
        notification_data: {
          fixId: autoFix.id,
          errorId: errorId,
          confidence: fixData.confidence
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fixId: autoFix.id,
        confidence: fixData.confidence,
        autoApplied: fixData.confidence >= 0.8
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-fix-engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
