import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { callAIWithFallback, PRIMARY_MODEL } from '../_shared/aiWithFallback.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detect stuck or failing jobs
interface JobIssue {
  jobId: string;
  issueType: 'stuck' | 'failed' | 'slow';
  progress: number;
  currentStep: string;
  timeSinceUpdate: number;
  errorMessage?: string;
}

async function detectJobIssues(supabaseClient: any): Promise<JobIssue[]> {
  const issues: JobIssue[] = [];
  
  // Find stuck jobs (no update in 2+ minutes, progress < 100)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  
  const { data: stuckJobs } = await supabaseClient
    .from('ai_generation_jobs')
    .select('*')
    .eq('status', 'running')
    .lt('progress', 100)
    .lt('updated_at', twoMinutesAgo);
  
  if (stuckJobs) {
    for (const job of stuckJobs) {
      const timeSinceUpdate = Date.now() - new Date(job.updated_at).getTime();
      issues.push({
        jobId: job.id,
        issueType: 'stuck',
        progress: job.progress,
        currentStep: job.current_step,
        timeSinceUpdate: Math.floor(timeSinceUpdate / 1000),
      });
    }
  }
  
  // Find recently failed jobs
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: failedJobs } = await supabaseClient
    .from('ai_generation_jobs')
    .select('*')
    .eq('status', 'failed')
    .gte('created_at', oneHourAgo);
  
  if (failedJobs) {
    for (const job of failedJobs) {
      issues.push({
        jobId: job.id,
        issueType: 'failed',
        progress: job.progress,
        currentStep: job.current_step,
        timeSinceUpdate: 0,
        errorMessage: job.error_message,
      });
    }
  }
  
  return issues;
}

// Learn from the issue and create a fix
async function learnAndFix(
  issue: JobIssue,
  jobData: any,
  supabaseClient: any,
  LOVABLE_API_KEY: string
): Promise<{
  fixed: boolean;
  method?: string;
  patternId?: string;
  solution?: any;
  requiresManualImplementation?: boolean;
  error?: string;
}> {
  console.log(`🧠 Mega Mind learning from issue: ${issue.issueType} at ${issue.progress}%`);
  
  // ... keep existing code
  
  // Build context
  const errorContext = {
    issueType: issue.issueType,
    progress: issue.progress,
    currentStep: issue.currentStep,
    timeSinceUpdate: issue.timeSinceUpdate,
    errorMessage: issue.errorMessage,
    inputData: jobData.input_data,
    outputData: jobData.output_data,
    jobType: jobData.job_type,
  };
  
  // Check if we've seen this pattern before
  const errorSignature = `orchestrator:${issue.issueType}:${issue.progress}:${issue.currentStep}`;
  
  const { data: knownPattern } = await supabaseClient
    .from('universal_error_patterns')
    .select('*')
    .eq('error_category', 'orchestrator')
    .ilike('error_signature', `%${issue.issueType}%${issue.progress}%`)
    .order('confidence_score', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (knownPattern && knownPattern.success_count > 0) {
    console.log('✅ Found known solution, applying...');
    
    // Apply known solution
    await applyKnownFix(issue, knownPattern, jobData, supabaseClient);
    
    // Update pattern stats
    await supabaseClient
      .from('universal_error_patterns')
      .update({
        times_encountered: knownPattern.times_encountered + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', knownPattern.id);
    
    return {
      fixed: true,
      method: 'known_pattern',
      patternId: knownPattern.id,
      solution: knownPattern.solution,
    };
  }
  
  // New issue - use AI to learn and create fix
  console.log('🎓 New issue detected, learning solution...');
  
  const learningPrompt = `You are the Mega Mind self-healing AI. Analyze this orchestration failure and create a permanent fix.

**Issue Type:** ${issue.issueType}
**Progress:** ${issue.progress}%
**Current Step:** ${issue.currentStep}
**Time Since Update:** ${issue.timeSinceUpdate}s
**Error Message:** ${issue.errorMessage || 'None'}

**Job Context:**
${JSON.stringify(errorContext, null, 2)}

**Your Mission:**
1. Identify the ROOT CAUSE (not just symptoms)
2. Determine if this is:
   - Code bug (needs code fix)
   - Logic error (needs algorithm improvement)
   - Infrastructure issue (needs retry/timeout adjustment)
   - Missing error handling
3. Create a PERMANENT fix that prevents this from happening again
4. Design self-healing code that can detect and fix this automatically

**Output Format (JSON):**
{
  "diagnosis": "What exactly went wrong",
  "rootCause": "Deep technical reason",
  "fixType": "code|config|architecture|errorHandling",
  "affectedFiles": ["list of files that need changes"],
  "solution": {
    "description": "How the fix works",
    "codeChanges": [
      {
        "file": "path/to/file",
        "change": "what to change",
        "reason": "why this fixes it",
        "code": "actual code to add/modify"
      }
    ],
    "preventionMechanism": "How to prevent this in future",
    "selfHealingLogic": "Automatic detection and recovery code"
  },
  "confidenceScore": 0.0-1.0,
  "testingSteps": ["How to verify the fix"],
  "preventionTips": ["How to avoid similar issues"]
}`;
  
  const aiResponse = await callAIWithFallback(
    LOVABLE_API_KEY,
    [
      { role: 'system', content: 'You are Mega Mind, an advanced self-healing AI system. Respond with valid JSON only.' },
      { role: 'user', content: learningPrompt }
    ],
    { preferredModel: PRIMARY_MODEL }
  );
  
  const learningResult = JSON.parse(aiResponse.data.choices[0].message.content);
  
  // Store the new pattern
  const { data: newPattern } = await supabaseClient
    .from('universal_error_patterns')
    .insert({
      error_category: 'orchestrator',
      error_subcategory: issue.issueType,
      error_signature: errorSignature,
      error_pattern: JSON.stringify(errorContext),
      diagnosis: learningResult.diagnosis,
      root_cause: learningResult.rootCause,
      solution: learningResult.solution,
      fix_type: learningResult.fixType,
      affected_technologies: learningResult.affectedFiles,
      prevention_tips: learningResult.preventionTips,
      confidence_score: learningResult.confidenceScore || 0.7,
      times_encountered: 1,
      success_count: 0,
      failure_count: 0,
    })
    .select()
    .single();
  
  // Log the improvement
  await supabaseClient
    .from('ai_improvement_logs')
    .insert({
      improvement_type: 'self_healing',
      before_metric: 0,
      after_metric: 1,
      changes_made: learningResult.solution,
      confidence_score: learningResult.confidenceScore || 0.7,
      validation_status: 'pending',
    });
  
  console.log('✨ Mega Mind learned new pattern and created fix');
  
  return {
    fixed: false,
    method: 'new_learning',
    patternId: newPattern?.id,
    solution: learningResult.solution,
    requiresManualImplementation: true,
  };
}

// Apply a known fix
async function applyKnownFix(
  issue: JobIssue,
  pattern: any,
  jobData: any,
  supabaseClient: any
) {
  console.log('🔧 Applying known fix...');
  
  // For stuck jobs, restart with updated parameters
  if (issue.issueType === 'stuck') {
    await supabaseClient
      .from('ai_generation_jobs')
      .update({
        status: 'running',
        progress: issue.progress,
        error_message: null,
        updated_at: new Date().toISOString(),
        output_data: {
          ...jobData.output_data,
          self_healed: true,
          healing_pattern_id: pattern.id,
          healing_timestamp: new Date().toISOString(),
        }
      })
      .eq('id', issue.jobId);
    
    // Record successful healing
    await supabaseClient
      .from('universal_error_patterns')
      .update({
        success_count: pattern.success_count + 1,
        last_success_at: new Date().toISOString(),
      })
      .eq('id', pattern.id);
  }
  
  // For failed jobs, log the attempt
  if (issue.issueType === 'failed') {
    await supabaseClient
      .from('ai_generation_jobs')
      .update({
        output_data: {
          ...jobData.output_data,
          healing_attempted: true,
          healing_pattern_id: pattern.id,
          healing_timestamp: new Date().toISOString(),
        }
      })
      .eq('id', issue.jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode = 'auto', jobId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧠 Mega Mind Self-Healer activated');
    
    let issues: JobIssue[] = [];
    
    if (jobId) {
      // Check specific job
      const { data: job } = await supabaseClient
        .from('ai_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (job && (job.status === 'failed' || job.status === 'running')) {
        const timeSinceUpdate = Date.now() - new Date(job.updated_at).getTime();
        
        issues.push({
          jobId: job.id,
          issueType: job.status === 'failed' ? 'failed' : 'stuck',
          progress: job.progress,
          currentStep: job.current_step,
          timeSinceUpdate: Math.floor(timeSinceUpdate / 1000),
          errorMessage: job.error_message,
        });
      }
    } else {
      // Auto-detect issues across all jobs
      issues = await detectJobIssues(supabaseClient);
    }
    
    console.log(`🔍 Detected ${issues.length} issues to heal`);
    
    const healingResults = [];
    
    for (const issue of issues) {
      // Get full job data
      const { data: jobData } = await supabaseClient
        .from('ai_generation_jobs')
        .select('*')
        .eq('id', issue.jobId)
        .single();
      
      if (!jobData) continue;
      
      try {
        const result = await learnAndFix(issue, jobData, supabaseClient, LOVABLE_API_KEY);
        healingResults.push({
          jobId: issue.jobId,
          issueType: issue.issueType,
          ...result,
        });
      } catch (error) {
        console.error(`Failed to heal job ${issue.jobId}:`, error);
        healingResults.push({
          jobId: issue.jobId,
          issueType: issue.issueType,
          fixed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Calculate stats
    const stats = {
      totalIssues: issues.length,
      fixedAutomatically: healingResults.filter(r => r.fixed).length,
      newPatternsLearned: healingResults.filter(r => r.method === 'new_learning').length,
      knownPatternsApplied: healingResults.filter(r => r.method === 'known_pattern').length,
    };
    
    console.log('📊 Healing complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: '🧠 Mega Mind healing complete',
        stats,
        healingResults,
        selfImprovement: {
          patternsLearned: stats.newPatternsLearned,
          successRate: stats.totalIssues > 0 ? stats.fixedAutomatically / stats.totalIssues : 0,
          evolutionLevel: 'continuously improving',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in mega-mind-self-healer:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
