import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugRequest {
  error: {
    message: string;
    stack?: string;
    type?: string;
    file?: string;
    line?: number;
    column?: number;
  };
  context?: {
    code?: string;
    recentChanges?: any[];
    dependencies?: string[];
    browserInfo?: any;
  };
  projectId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { error, context = {}, projectId }: DebugRequest = await req.json();

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

    console.log('🐛 Smart Debugger started for error:', error.message.substring(0, 100));

    // Step 1: Store the error
    const { data: runtimeError, error: errorInsertError } = await supabaseClient
      .from('runtime_errors')
      .insert({
        user_id: user.id,
        project_id: projectId,
        error_type: error.type || 'runtime',
        error_message: error.message,
        stack_trace: error.stack,
        file_path: error.file,
        line_number: error.line,
        column_number: error.column,
        error_context: context,
        browser_info: context.browserInfo,
        severity: determineSeverity(error.message),
        status: 'analyzing'
      })
      .select()
      .single();

    if (errorInsertError || !runtimeError) {
      throw new Error('Failed to store error');
    }

    const errorId = runtimeError.id;

    // Step 2: Check for known patterns
    const knownPattern = await checkKnownPatterns(error.message, supabaseClient);
    
    // Step 3: Perform intelligent analysis
    console.log('🔍 Analyzing error...');
    const analysis = await analyzeError(error, context, knownPattern);

    // Store analysis
    const { data: errorAnalysis } = await supabaseClient
      .from('error_analysis')
      .insert({
        error_id: errorId,
        root_cause: analysis.rootCause,
        affected_components: analysis.affectedComponents,
        error_category: analysis.category,
        confidence_score: analysis.confidence
      })
      .select()
      .single();

    // Step 4: Generate fixes with context
    console.log('💡 Generating intelligent fixes...');
    const fixes = await generateContextualFixes(error, context, analysis);

    // Store fixes
    const fixRecords = fixes.map((fix: any) => ({
      error_id: errorId,
      analysis_id: errorAnalysis?.id,
      fix_type: fix.type,
      fix_description: fix.description,
      original_code: fix.originalCode,
      fixed_code: fix.fixedCode,
      explanation: fix.explanation,
      steps_to_apply: fix.steps
    }));

    const { data: savedFixes } = await supabaseClient
      .from('error_fixes')
      .insert(fixRecords)
      .select();

    // Update error status
    await supabaseClient
      .from('runtime_errors')
      .update({ status: 'fixed' })
      .eq('id', errorId);

    console.log(`✅ Smart debugging completed: ${fixes.length} fixes generated`);

    return new Response(
      JSON.stringify({
        success: true,
        errorId,
        analysis: {
          ...analysis,
          knownPattern: knownPattern ? {
            name: knownPattern.pattern_name,
            successRate: knownPattern.fix_success_rate
          } : null
        },
        fixes: savedFixes || fixes,
        summary: {
          rootCause: analysis.rootCause,
          confidence: analysis.confidence,
          fixesGenerated: fixes.length,
          quickFix: fixes[0] // Highest priority fix
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in smart-debugger:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function determineSeverity(errorMessage: string): string {
  const criticalKeywords = ['crash', 'fatal', 'cannot read', 'undefined is not', 'null is not'];
  const messageLower = errorMessage.toLowerCase();
  
  if (criticalKeywords.some(keyword => messageLower.includes(keyword))) {
    return 'critical';
  }
  
  if (messageLower.includes('warn')) {
    return 'warning';
  }
  
  return 'error';
}

async function checkKnownPatterns(errorMessage: string, supabaseClient: any): Promise<any | null> {
  const signature = await crypto.subtle.digest(
    'MD5',
    new TextEncoder().encode(errorMessage)
  );
  const hashHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const { data } = await supabaseClient
    .from('error_patterns')
    .select('*')
    .eq('error_signature', hashHex)
    .single();

  return data;
}

async function analyzeError(error: any, context: any, knownPattern: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Perform deep error analysis and trace the root cause:

**Error Message:** ${error.message}
**Stack Trace:** ${error.stack || 'Not available'}
**File:** ${error.file || 'Unknown'}
**Line:** ${error.line || 'Unknown'}

**Context:**
- Code: ${context.code?.substring(0, 1000) || 'Not provided'}
- Recent Changes: ${JSON.stringify(context.recentChanges || [])}
- Dependencies: ${JSON.stringify(context.dependencies || [])}
${knownPattern ? `\n**Known Pattern:** ${knownPattern.pattern_name} (${knownPattern.detection_count} occurrences, ${knownPattern.fix_success_rate}% success rate)` : ''}

**Trace Error Source:**
1. What is the immediate cause of the error?
2. What code path led to this error?
3. Which components are affected?
4. What was the user trying to do?
5. Are there upstream dependencies causing this?

**Output JSON:**
{
  "rootCause": "Detailed explanation of the root cause",
  "category": "type-error|null-reference|api-error|logic-error|dependency-error",
  "affectedComponents": ["Component1.tsx", "Component2.tsx"],
  "errorPath": ["User action", "Component A", "Function B", "Error occurred"],
  "confidence": 0-100,
  "relatedIssues": ["Related issue 1", "Related issue 2"],
  "preventionStrategy": "How to prevent this in the future"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Use Pro for deep analysis
      messages: [
        { role: 'system', content: 'You are an expert debugging assistant with deep knowledge of error tracing. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateContextualFixes(error: any, context: any, analysis: any): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Generate intelligent fixes with full context:

**Error:** ${error.message}
**Root Cause:** ${analysis.rootCause}
**Category:** ${analysis.category}
**Affected Components:** ${JSON.stringify(analysis.affectedComponents)}
**Error Path:** ${JSON.stringify(analysis.errorPath)}

**Context:**
${context.code ? `**Current Code:**\n\`\`\`\n${context.code.substring(0, 2000)}\n\`\`\`` : ''}

**Generate 3 fixes ordered by priority:**
1. Quick fix (immediate solution)
2. Proper fix (best practice solution)
3. Preventive fix (prevents similar errors)

**Output JSON array:**
[
  {
    "type": "code-change|dependency|config|refactor",
    "priority": 1,
    "description": "Brief description",
    "originalCode": "problematic code",
    "fixedCode": "corrected code",
    "explanation": "Why this works and what it fixes",
    "steps": ["Step 1", "Step 2"],
    "preventsFutureErrors": true|false,
    "testingStrategy": "How to verify the fix works"
  }
]`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert at generating contextual bug fixes. Respond with JSON array only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  return result.fixes || result || [];
}
