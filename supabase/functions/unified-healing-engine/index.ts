import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealingOperation {
  operation: 'detect_error' | 'generate_fix' | 'apply_fix' | 'verify_fix' | 'rollback_fix' | 'learn_pattern' | 'get_healing_history' | 'conversational_diagnosis' | 'apply_diagnostic_fix';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Healing Engine request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: HealingOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'detect_error':
        result = await handleDetectError(payload.params, supabase, requestId);
        break;
      case 'generate_fix':
        result = await handleGenerateFix(payload.params, supabase, requestId);
        break;
      case 'apply_fix':
        result = await handleApplyFix(payload.params, supabase, requestId);
        break;
      case 'verify_fix':
        result = await handleVerifyFix(payload.params, supabase, requestId);
        break;
      case 'rollback_fix':
        result = await handleRollbackFix(payload.params, supabase, requestId);
        break;
      case 'learn_pattern':
        result = await handleLearnPattern(payload.params, supabase, requestId);
        break;
      case 'get_healing_history':
        result = await handleGetHealingHistory(payload.params, supabase, requestId);
        break;
      case 'conversational_diagnosis':
        result = await handleConversationalDiagnosis(payload.params, supabase, requestId);
        break;
      case 'apply_diagnostic_fix':
        result = await handleApplyDiagnosticFix(payload.params, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleDetectError(params: any, supabase: any, requestId: string) {
  const { errorMessage, stackTrace, code, userId, projectId } = params;
  
  if (!errorMessage) {
    throw new Error('errorMessage is required');
  }

  console.log(`[${requestId}] Detecting error: ${errorMessage.substring(0, 100)}...`);

  const severity = classifyErrorSeverity(errorMessage, stackTrace);
  const errorType = extractErrorType(errorMessage);

  const { data: detectedError, error } = await supabase
    .from('detected_errors')
    .insert({
      user_id: userId,
      project_id: projectId,
      error_message: errorMessage,
      stack_trace: stackTrace,
      error_type: errorType,
      severity,
      code_context: code,
      status: 'detected',
    })
    .select()
    .single();

  if (error) throw error;

  const { data: patterns } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .eq('error_category', errorType)
    .gte('confidence_score', 0.7)
    .order('confidence_score', { ascending: false })
    .limit(3);

  console.log(`[${requestId}] Error detected: severity=${severity}, patterns=${patterns?.length || 0}`);
  return { 
    errorId: detectedError.id, 
    severity, 
    errorType, 
    matchingPatterns: patterns || [],
    suggestedFix: patterns?.[0]?.solution_template || null
  };
}

async function handleGenerateFix(params: any, supabase: any, requestId: string) {
  const { errorId, errorMessage, code } = params;
  
  if (!errorMessage || !code) {
    throw new Error('errorMessage and code are required');
  }

  console.log(`[${requestId}] Generating fix for error: ${errorId || 'inline'}`);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const prompt = `Analyze error and generate fix:
Error: ${errorMessage}
Code: ${code}

Return JSON: { "fixedCode": "...", "explanation": "...", "confidence": 85 }`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!aiResponse.ok) throw new Error('Failed to generate fix');

  const aiData = await aiResponse.json();
  const content = aiData.choices[0].message.content;
  const fixData = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  const { data: autoFix, error } = await supabase
    .from('auto_fixes')
    .insert({
      error_id: errorId,
      fix_type: 'ai_generated',
      original_code: code,
      fixed_code: fixData.fixedCode,
      explanation: fixData.explanation,
      ai_confidence: fixData.confidence / 100,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Fix generated: confidence=${fixData.confidence}%`);
  return { 
    fixId: autoFix.id, 
    fixedCode: fixData.fixedCode, 
    explanation: fixData.explanation,
    confidence: fixData.confidence 
  };
}

async function handleApplyFix(params: any, supabase: any, requestId: string) {
  const { fixId } = params;
  
  if (!fixId) throw new Error('fixId is required');

  console.log(`[${requestId}] Applying fix: ${fixId}`);

  const { data: fix, error: fetchError } = await supabase
    .from('auto_fixes')
    .select('*')
    .eq('id', fixId)
    .single();

  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from('auto_fixes')
    .update({ 
      status: 'applied',
      applied_at: new Date().toISOString()
    })
    .eq('id', fixId);

  if (updateError) throw updateError;

  if (fix.error_id) {
    await supabase
      .from('detected_errors')
      .update({ status: 'fixed' })
      .eq('id', fix.error_id);
  }

  console.log(`[${requestId}] Fix applied`);
  return { success: true, fixedCode: fix.fixed_code };
}

async function handleVerifyFix(params: any, supabase: any, requestId: string) {
  const { fixId, success, testResults } = params;
  
  if (!fixId || success === undefined) {
    throw new Error('fixId and success are required');
  }

  console.log(`[${requestId}] Verifying fix: ${fixId}, success=${success}`);

  const { error } = await supabase
    .from('auto_fixes')
    .update({ 
      status: success ? 'verified' : 'failed',
      verified_at: new Date().toISOString(),
      verification_result: { success, testResults }
    })
    .eq('id', fixId);

  if (error) throw error;

  console.log(`[${requestId}] Fix verification recorded`);
  return { verified: true, status: success ? 'verified' : 'failed' };
}

async function handleRollbackFix(params: any, supabase: any, requestId: string) {
  const { fixId, reason } = params;
  
  if (!fixId) throw new Error('fixId is required');

  console.log(`[${requestId}] Rolling back fix: ${fixId}`);

  const { data: fix, error: fetchError } = await supabase
    .from('auto_fixes')
    .select('*')
    .eq('id', fixId)
    .single();

  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from('auto_fixes')
    .update({ 
      status: 'rolled_back',
      rolled_back_at: new Date().toISOString()
    })
    .eq('id', fixId);

  if (updateError) throw updateError;

  if (fix.error_id) {
    await supabase
      .from('detected_errors')
      .update({ status: 'detected' })
      .eq('id', fix.error_id);
  }

  console.log(`[${requestId}] Fix rolled back: ${reason || 'user requested'}`);
  return { success: true, originalCode: fix.original_code };
}

async function handleLearnPattern(params: any, supabase: any, requestId: string) {
  const { errorType, errorPattern, solution, success, context } = params;
  
  if (!errorType || !errorPattern || !solution) {
    throw new Error('errorType, errorPattern, and solution are required');
  }

  console.log(`[${requestId}] Learning pattern: ${errorType}`);

  const { data: existingPattern } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .eq('error_category', errorType)
    .eq('pattern_description', errorPattern)
    .maybeSingle();

  if (existingPattern) {
    const newSuccessCount = success ? existingPattern.success_count + 1 : existingPattern.success_count;
    const newFailureCount = success ? existingPattern.failure_count : existingPattern.failure_count + 1;
    const totalAttempts = newSuccessCount + newFailureCount;
    const newConfidence = totalAttempts > 0 ? (newSuccessCount + 2.0) / (totalAttempts + 4.0) : 0.5;

    await supabase
      .from('universal_error_patterns')
      .update({
        success_count: newSuccessCount,
        failure_count: newFailureCount,
        confidence_score: newConfidence,
        last_used_at: new Date().toISOString(),
        last_success_at: success ? new Date().toISOString() : existingPattern.last_success_at
      })
      .eq('id', existingPattern.id);

    console.log(`[${requestId}] Updated pattern: confidence=${newConfidence.toFixed(2)}`);
    return { patternId: existingPattern.id, confidence: newConfidence, updated: true };
  } else {
    const { data: newPattern, error } = await supabase
      .from('universal_error_patterns')
      .insert({
        error_category: errorType,
        pattern_description: errorPattern,
        solution_template: solution,
        success_count: success ? 1 : 0,
        failure_count: success ? 0 : 1,
        confidence_score: 0.5,
        context_requirements: context || {}
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[${requestId}] Created new pattern`);
    return { patternId: newPattern.id, confidence: 0.5, created: true };
  }
}

async function handleGetHealingHistory(params: any, supabase: any, requestId: string) {
  const { userId, projectId, limit = 50 } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Fetching healing history`);

  const { data: fixes, error } = await supabase
    .from('auto_fixes')
    .select(`
      *,
      detected_errors:error_id (
        error_message,
        error_type,
        severity,
        created_at
      )
    `)
    .eq('detected_errors.user_id', userId)
    .eq('detected_errors.project_id', projectId || null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const stats = {
    total: fixes?.length || 0,
    applied: fixes?.filter((f: any) => f.status === 'applied').length || 0,
    verified: fixes?.filter((f: any) => f.status === 'verified').length || 0,
    failed: fixes?.filter((f: any) => f.status === 'failed').length || 0,
    rolledBack: fixes?.filter((f: any) => f.status === 'rolled_back').length || 0,
  };

  console.log(`[${requestId}] Retrieved ${fixes?.length || 0} records`);
  return { history: fixes || [], stats };
}

function classifyErrorSeverity(errorMessage: string, stackTrace?: string): string {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('critical') || message.includes('fatal') || message.includes('crash')) {
    return 'critical';
  }
  if (message.includes('error') || message.includes('exception') || message.includes('failed')) {
    return 'high';
  }
  if (message.includes('warning') || message.includes('deprecated')) {
    return 'medium';
  }
  return 'low';
}

function extractErrorType(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('typeerror')) return 'TypeError';
  if (message.includes('referenceerror')) return 'ReferenceError';
  if (message.includes('syntaxerror')) return 'SyntaxError';
  if (message.includes('rangeerror')) return 'RangeError';
  if (message.includes('network') || message.includes('fetch')) return 'NetworkError';
  if (message.includes('timeout')) return 'TimeoutError';
  if (message.includes('permission') || message.includes('unauthorized')) return 'PermissionError';
  
  return 'UnknownError';
}

async function handleConversationalDiagnosis(params: any, supabase: any, requestId: string) {
  const { jobId, conversationId, errorMessage, stackTrace, context } = params;
  
  if (!jobId || !conversationId) {
    throw new Error('jobId and conversationId are required');
  }

  console.log(`[${requestId}] Running conversational diagnosis for job: ${jobId}`);

  // Fetch job details and logs
  const { data: job, error: jobError } = await supabase
    .from('ai_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  // Build diagnostic context
  const diagnosticContext = {
    userRequest: job.input_data?.request || 'Unknown request',
    framework: context?.framework || 'react',
    errorMessage: errorMessage || job.error_message || 'No error message available',
    stackTrace: stackTrace || 'No stack trace available',
    jobStatus: job.status,
    progress: job.progress,
    currentStep: job.current_step,
    streamUpdates: job.stream_updates || []
  };

  // Use Lovable AI to analyze the failure
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const diagnosticPrompt = `You are a platform self-diagnostic AI. Analyze this generation failure and explain what went wrong in a conversational, helpful way.

USER REQUEST:
${diagnosticContext.userRequest}

ERROR MESSAGE:
${diagnosticContext.errorMessage}

STACK TRACE:
${diagnosticContext.stackTrace}

JOB STATUS:
- Status: ${diagnosticContext.jobStatus}
- Progress: ${diagnosticContext.progress}%
- Current Step: ${diagnosticContext.currentStep}

STREAM UPDATES (last 5):
${diagnosticContext.streamUpdates.slice(-5).map((u: any, i: number) => `${i + 1}. ${u.message || u.status}`).join('\n')}

INSTRUCTIONS:
1. Explain what went wrong in simple terms
2. Identify the root cause
3. Suggest 2-3 specific fixes
4. Format response as JSON:
{
  "rootCause": "brief explanation of what went wrong",
  "explanation": "detailed conversational explanation",
  "suggestedFixes": [
    { "fix": "description", "confidence": 85, "approach": "how to fix" }
  ],
  "nextSteps": "what should happen next"
}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: diagnosticPrompt }],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`AI diagnosis failed: ${errorText}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices[0].message.content;
  const diagnosis = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  // Store diagnosis in job
  await supabase
    .from('ai_generation_jobs')
    .update({
      diagnostic_run: true,
      diagnostic_explanation: diagnosis.explanation,
      diagnostic_fixes: diagnosis.suggestedFixes
    })
    .eq('id', jobId);

  // Post explanation to conversation
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `## 🔍 Self-Diagnosis Complete

**What Went Wrong:**
${diagnosis.rootCause}

**Detailed Analysis:**
${diagnosis.explanation}

**Suggested Fixes:**
${diagnosis.suggestedFixes.map((fix: any, i: number) => 
  `${i + 1}. **${fix.fix}** (${fix.confidence}% confidence)
   - ${fix.approach}`
).join('\n\n')}

**Next Steps:**
${diagnosis.nextSteps}

*This diagnosis was automatically generated by the platform's self-healing system.*`,
      metadata: {
        diagnosticRun: true,
        jobId,
        diagnosis
      }
    });

  console.log(`[${requestId}] Conversational diagnosis completed and posted to chat`);
  
  return {
    success: true,
    diagnosis,
    postedToChat: true
  };
}

async function handleApplyDiagnosticFix(params: any, supabase: any, requestId: string) {
  const { jobId, fixIndex = 0, conversationId } = params;
  
  if (!jobId || !conversationId) {
    throw new Error('jobId and conversationId are required');
  }

  console.log(`[${requestId}] Applying diagnostic fix for job: ${jobId}, fix index: ${fixIndex}`);

  // Fetch the job with diagnostic fixes
  const { data: job, error: jobError } = await supabase
    .from('ai_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  if (!job.diagnostic_fixes || job.diagnostic_fixes.length === 0) {
    throw new Error('No diagnostic fixes available for this job');
  }

  if (fixIndex >= job.diagnostic_fixes.length) {
    throw new Error(`Fix index ${fixIndex} out of range. Available fixes: ${job.diagnostic_fixes.length}`);
  }

  const selectedFix = job.diagnostic_fixes[fixIndex];
  
  // Use Lovable AI to generate the actual code fix
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const fixPrompt = `You are a code fixing AI. Apply this fix to the codebase:

ORIGINAL REQUEST:
${job.input_data?.request || 'Unknown request'}

ERROR THAT OCCURRED:
${job.error_message || 'No error message'}

FIX TO APPLY:
${selectedFix.fix}

APPROACH:
${selectedFix.approach}

INSTRUCTIONS:
1. Generate the minimal code changes needed to implement this fix
2. Only modify what's directly related to the fix
3. Preserve all existing functionality that works
4. Return JSON with the structure:
{
  "files": [
    { "path": "src/...", "content": "full file content", "action": "update" }
  ],
  "explanation": "what was changed and why"
}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: fixPrompt }],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`AI fix generation failed: ${errorText}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices[0].message.content;
  const fixData = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  // Update job status to show fix is being applied
  await supabase
    .from('ai_generation_jobs')
    .update({
      status: 'processing',
      current_step: 'applying_diagnostic_fix',
      output_data: {
        ...job.output_data,
        diagnostic_fix_applied: true,
        fix_index: fixIndex
      }
    })
    .eq('id', jobId);

  // Post confirmation to chat
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `## ✅ Applying Fix

I'm implementing: **${selectedFix.fix}**

**Changes being made:**
${fixData.explanation}

**Files being modified:**
${fixData.files.map((f: any) => `- ${f.path}`).join('\n')}

*This will only modify what's needed to fix the issue.*`,
      metadata: {
        fixApplied: true,
        jobId,
        fixIndex,
        selectedFix
      }
    });

  console.log(`[${requestId}] Diagnostic fix applied and posted to chat`);
  
  return {
    success: true,
    fixData,
    explanation: fixData.explanation,
    filesModified: fixData.files.length
  };
}
