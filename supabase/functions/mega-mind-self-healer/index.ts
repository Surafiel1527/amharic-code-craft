import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Inlined from aiWithFallback.ts
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  data: {
    choices: Array<{
      message: {
        role: string;
        content: string;
      };
    }>;
  };
  modelUsed: string;
  wasBackup: boolean;
  gateway: 'lovable' | 'direct-gemini-emergency';
  attempts: number;
  totalLatency: number;
}

const PRIMARY_MODEL = "google/gemini-2.5-pro";
const BACKUP_MODEL = "google/gemini-2.5-flash";
const SUPER_MODEL = 'google/gemini-2.5-pro';

function calculateBackoff(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 10000;
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
}

async function callAIWithFallback(
  LOVABLE_API_KEY: string,
  messages: AIMessage[],
  options: {
    preferredModel?: string;
    temperature?: number;
    maxRetries?: number;
    enableEmergencyFallback?: boolean;
  } = {}
): Promise<AIResponse> {
  const {
    preferredModel,
    temperature = 0.7,
    maxRetries = 2,
    enableEmergencyFallback = true
  } = options;

  const models = preferredModel 
    ? [preferredModel, preferredModel === PRIMARY_MODEL ? BACKUP_MODEL : PRIMARY_MODEL]
    : [PRIMARY_MODEL, BACKUP_MODEL];
  
  let lastError: Error | null = null;
  let totalAttempts = 0;
  const startTime = Date.now();

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    const isBackup = modelIndex > 0;
    
    for (let retry = 0; retry <= maxRetries; retry++) {
      totalAttempts++;
      const isRetry = retry > 0;
      
      try {
        console.log(
          `${isBackup ? '🔄 Layer 2 (Backup)' : '🚀 Layer 1 (Primary)'} - ` +
          `Model: ${model}${isRetry ? ` (Retry ${retry}/${maxRetries})` : ''}`
        );
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
          }),
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : calculateBackoff(retry);
          console.warn(`⚠️ Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (response.status === 402) {
          console.error('💳 Payment required - Lovable AI credits exhausted');
          throw new Error('Payment required: Lovable AI credits exhausted.');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Lovable Gateway error (${response.status}): ${errorText}`);
          throw new Error(`Lovable Gateway error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const totalLatency = Date.now() - startTime;
        
        console.log(
          `✅ SUCCESS via Lovable Gateway ${isBackup ? '(backup)' : '(primary)'} - ` +
          `Model: ${model}, Attempts: ${totalAttempts}, Latency: ${totalLatency}ms`
        );
        
        return {
          success: true,
          data,
          modelUsed: model,
          wasBackup: isBackup,
          gateway: 'lovable',
          attempts: totalAttempts,
          totalLatency
        };
      } catch (error: any) {
        lastError = error;
        console.error(
          `❌ Attempt ${totalAttempts} failed - ${isBackup ? 'Backup' : 'Primary'} ${model}: ${error.message}`
        );
        
        if (retry < maxRetries) {
          const backoffTime = calculateBackoff(retry);
          console.log(`⏳ Backing off ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        if (modelIndex < models.length - 1) {
          console.log(`⏭️ Moving to backup model...`);
          break;
        }
      }
    }
  }

  if (!enableEmergencyFallback) {
    throw new Error(`All attempts exhausted after ${totalAttempts} attempts. Last error: ${lastError?.message}`);
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error(`All Lovable Gateway attempts failed. Emergency fallback not configured.`);
  }

  console.log('🆘 Layer 3 (Emergency) - Attempting direct Gemini API fallback...');

  for (let retry = 0; retry <= maxRetries; retry++) {
    totalAttempts++;
    
    try {
      if (retry > 0) {
        const backoffTime = calculateBackoff(retry);
        console.log(`⏳ Emergency retry ${retry}/${maxRetries} - waiting ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
      
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: temperature,
              maxOutputTokens: 8000,
            }
          })
        }
      );

      if (geminiResponse.status === 429) {
        const waitTime = calculateBackoff(retry + 2);
        console.warn(`⚠️ Gemini rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        throw new Error(`Direct Gemini API error (${geminiResponse.status}): ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!content) {
        throw new Error('Gemini API returned empty response');
      }

      const totalLatency = Date.now() - startTime;
      
      console.log(`🎉 EMERGENCY SUCCESS via direct Gemini API! Attempts: ${totalAttempts}, Latency: ${totalLatency}ms`);
      
      return {
        success: true,
        data: {
          choices: [{
            message: {
              role: 'assistant',
              content: content
            }
          }]
        },
        modelUsed: 'gemini-2.0-flash-exp',
        wasBackup: true,
        gateway: 'direct-gemini-emergency',
        attempts: totalAttempts,
        totalLatency
      };
    } catch (error: any) {
      console.error(`❌ Emergency attempt ${totalAttempts} failed: ${error.message}`);
      
      if (retry < maxRetries) {
        continue;
      }
      
      throw new Error(`All ${totalAttempts} AI attempts failed. Last error: ${error.message}`);
    }
  }

  throw new Error('Unexpected error in AI fallback system');
}

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
