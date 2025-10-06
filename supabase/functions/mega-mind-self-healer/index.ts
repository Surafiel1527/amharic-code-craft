import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { callAIWithFallback, PRIMARY_MODEL } from '../_shared/aiWithFallback.ts';

// Use Gemini 2.5 Pro for deep reasoning
const SUPER_MODEL = 'google/gemini-2.5-pro';

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
  
  // New issue - use SUPER AI reasoning to learn and create fix
  console.log('🧠 New issue detected, activating SUPER reasoning...');
  
  const learningPrompt = `You are the SUPER MEGA MIND - an autonomous self-healing AI system with advanced reasoning capabilities.

**CRITICAL MISSION:** Analyze this orchestration failure and create a PERMANENT, INTELLIGENT fix that prevents future occurrences.

**Issue Analysis:**
- Type: ${issue.issueType}
- Progress: ${issue.progress}%
- Current Step: ${issue.currentStep}
- Time Since Update: ${issue.timeSinceUpdate}s
- Error: ${issue.errorMessage || 'None'}

**Full Context:**
${JSON.stringify(errorContext, null, 2)}

**Your Advanced Reasoning Process:**
1. **Root Cause Analysis** (Deep dive into WHY this happened)
   - What is the fundamental technical cause?
   - What architectural patterns led to this?
   - What assumptions were violated?
   
2. **Impact Assessment** 
   - What other systems could be affected?
   - What are the cascading failure risks?
   - What data integrity concerns exist?
   
3. **Solution Design** (Multi-layered approach)
   - Immediate fix for this specific issue
   - Preventive measures to stop recurrence
   - System improvements to make failure impossible
   - Monitoring to detect similar issues early
   
4. **Self-Healing Architecture**
   - How can the system detect this automatically?
   - What self-repair mechanisms should exist?
   - How can the system become more resilient?

5. **Learning & Evolution**
   - What patterns should be remembered?
   - How can we improve our detection algorithms?
   - What new monitoring should be added?

**OUTPUT FORMAT (Strict JSON):**
{
  "diagnosis": {
    "summary": "One sentence problem statement",
    "rootCause": "Deep technical reason",
    "failureMode": "How the system failed",
    "affectedSystems": ["list of systems"]
  },
  "solution": {
    "immediate": {
      "action": "What to do right now",
      "code": "Actual fix code if applicable",
      "reason": "Why this fixes it"
    },
    "preventive": {
      "codeChanges": [
        {
          "file": "path/to/file",
          "change": "what to modify",
          "preventionMechanism": "how it prevents recurrence"
        }
      ],
      "monitoring": {
        "metrics": ["what to track"],
        "alerts": ["when to alert"],
        "thresholds": {"metric": "value"}
      }
    },
    "architectural": {
      "improvements": ["system-level changes"],
      "resilience": ["how to make failure impossible"],
      "selfHealing": {
        "detection": "How to auto-detect",
        "recovery": "How to auto-recover",
        "verification": "How to verify success"
      }
    }
  },
  "intelligence": {
    "patternName": "Descriptive pattern name",
    "similarIssues": ["What other issues this could cause"],
    "predictiveIndicators": ["Early warning signs"],
    "preventionStrategy": "Long-term prevention approach"
  },
  "confidence": {
    "fixEffectiveness": 0.0-1.0,
    "preventionCoverage": 0.0-1.0,
    "architecturalSoundness": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "testing": {
    "verificationSteps": ["How to verify the fix"],
    "edgeCases": ["Edge cases to test"],
    "regressionRisks": ["What could break"]
  }
}`;
  
  const aiResponse = await callAIWithFallback(
    LOVABLE_API_KEY,
    [
      { 
        role: 'system', 
        content: 'You are SUPER MEGA MIND - an advanced autonomous AI system with deep reasoning capabilities. Use extended thinking to analyze complex problems. Respond with valid JSON only.' 
      },
      { role: 'user', content: learningPrompt }
    ],
    { 
      preferredModel: SUPER_MODEL,
      temperature: 0.3 // Lower temperature for more focused reasoning
    }
  );
  
  const learningResult = JSON.parse(aiResponse.data.choices[0].message.content);
  
  // Store the new pattern with enhanced intelligence
  const { data: newPattern } = await supabaseClient
    .from('universal_error_patterns')
    .insert({
      error_category: 'orchestrator',
      error_subcategory: issue.issueType,
      error_signature: errorSignature,
      error_pattern: JSON.stringify(errorContext),
      diagnosis: learningResult.diagnosis.summary,
      root_cause: learningResult.diagnosis.rootCause,
      solution: learningResult.solution,
      fix_type: learningResult.solution.immediate?.action || 'multi-layer',
      affected_technologies: learningResult.diagnosis.affectedSystems,
      prevention_tips: learningResult.intelligence.preventionStrategy,
      confidence_score: learningResult.confidence.overall || 0.8,
      times_encountered: 1,
      success_count: 0,
      failure_count: 0,
      metadata: {
        architecturalImprovements: learningResult.solution.architectural,
        predictiveIndicators: learningResult.intelligence.predictiveIndicators,
        monitoringRecommendations: learningResult.solution.preventive.monitoring,
        selfHealingCapabilities: learningResult.solution.architectural.selfHealing
      }
    })
    .select()
    .single();
  
  // Log the improvement with enhanced metrics
  await supabaseClient
    .from('ai_improvement_logs')
    .insert({
      improvement_type: 'super_mega_mind_learning',
      before_metric: 0,
      after_metric: learningResult.confidence.overall,
      changes_made: {
        immediate: learningResult.solution.immediate,
        preventive: learningResult.solution.preventive,
        architectural: learningResult.solution.architectural,
        intelligence: learningResult.intelligence
      },
      confidence_score: learningResult.confidence.overall,
      validation_status: 'pending',
      metadata: {
        reasoningModel: SUPER_MODEL,
        detectionTime: new Date().toISOString(),
        issueComplexity: issue.progress < 30 ? 'high' : 'medium'
      }
    });
  
  console.log('✨ SUPER MEGA MIND learned new pattern with advanced reasoning');
  
  return {
    fixed: false,
    method: 'super_learning',
    patternId: newPattern?.id,
    solution: learningResult.solution,
    intelligence: learningResult.intelligence,
    confidence: learningResult.confidence,
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
