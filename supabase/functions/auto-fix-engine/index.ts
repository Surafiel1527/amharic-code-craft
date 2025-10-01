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

    // Build enhanced AI prompt with codebase context
    const knowledgeContext = knowledgeBase && knowledgeBase.length > 0
      ? `\n\nKNOWN SOLUTIONS (${knowledgeBase.length} patterns found):\n${knowledgeBase.map(kb => 
          `- Pattern: ${kb.error_pattern}\n  Solution: ${kb.solution}\n  Success Rate: ${(kb.auto_fix_success_rate * 100).toFixed(0)}%`
        ).join('\n\n')}`
      : '\n\nNo similar patterns found in knowledge base.';

    const codebaseContext = `
CODEBASE ARCHITECTURE:
- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Backend: Supabase (PostgreSQL + Edge Functions)
- Authentication: Supabase Auth with email/password
- State Management: React hooks (useState, useEffect)
- Routing: React Router v6
- UI Components: Radix UI + shadcn/ui
- AI Integration: Lovable AI Gateway (Gemini 2.5)

COMMON PATTERNS IN THIS CODEBASE:
- RLS policies use security definer functions to avoid recursion
- All database operations use Supabase client methods (never raw SQL in edge functions)
- Edge functions use CORS headers for all responses
- Authentication stores full session object, not just user
- Error reporting goes to 'report-error' edge function
- Components use semantic design tokens from index.css

SECURITY REQUIREMENTS:
- Never expose API keys or secrets in frontend
- Always validate user input
- Use parameterized queries (Supabase client handles this)
- Implement proper RLS policies for all tables
- Check auth.uid() for user-specific operations`;

    const aiPrompt = `You are an expert full-stack debugger specializing in React + Supabase applications.

🔍 ERROR ANALYSIS:
Type: ${error.error_type}
Message: ${error.error_message}
Source: ${error.source}
${error.function_name ? `Function: ${error.function_name}` : ''}
${error.file_path ? `File: ${error.file_path}` : ''}
Severity: ${error.severity}
${error.stack_trace ? `\nStack Trace:\n${error.stack_trace}` : ''}

📋 ERROR CONTEXT:
${JSON.stringify(error.error_context, null, 2)}

💡 ${knowledgeContext}

🏗️ ${codebaseContext}

🎯 YOUR TASK:
1. Analyze the root cause considering the codebase architecture
2. Generate a precise fix that follows the codebase patterns
3. Choose the appropriate fix type:
   - code_patch: For frontend/component fixes (React, TypeScript, UI)
   - migration: For database changes (tables, RLS, triggers, functions)
   - config_change: For configuration updates (env vars, settings)
4. Provide detailed explanation with reasoning
5. Assign honest confidence score based on:
   - How well error matches known patterns (0.9+ if exact match)
   - Completeness of error information (0.8+ if full stack trace)
   - Complexity of fix (0.7+ if simple, 0.5-0.7 if complex)

⚠️ CRITICAL RULES:
- For RLS recursion: Create security definer function, never self-reference
- For null/undefined: Add optional chaining and null checks
- For auth errors: Ensure full session storage and onAuthStateChange
- For CORS: Add headers to ALL responses including errors
- For edge functions: Always return Response with proper headers
- For database: Use Supabase client methods, never raw SQL

Return JSON ONLY in this exact format:
{
  "fixType": "code_patch|migration|config_change",
  "originalCode": "the problematic code if available",
  "fixedCode": "complete working solution with proper syntax",
  "explanation": "detailed explanation: what was wrong, why it failed, how the fix works, and what it prevents",
  "confidence": 0.85,
  "reasoning": "why this confidence score - mention pattern matches, info completeness, fix complexity"
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

    console.log('✅ Generated fix:', {
      fixType: fixData.fixType,
      confidence: fixData.confidence,
      reasoning: fixData.reasoning,
      errorType: error.error_type,
      source: error.source
    });

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
