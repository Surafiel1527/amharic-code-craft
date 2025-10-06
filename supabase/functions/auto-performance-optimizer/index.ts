import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { callAIWithFallback } from '../_shared/aiWithFallback.ts';

const SUPER_MODEL = 'google/gemini-2.5-pro';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('⚡ Auto Performance Optimizer activated');

    // Analyze job performance
    const { data: jobs } = await supabaseClient
      .from('ai_generation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No jobs to analyze',
          optimizations: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate performance metrics
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const avgCompletionTime = completedJobs.map(j => {
      if (j.completed_at && j.started_at) {
        return new Date(j.completed_at).getTime() - new Date(j.started_at).getTime();
      }
      return 0;
    }).filter(t => t > 0).reduce((sum, t) => sum + t, 0) / completedJobs.length || 0;

    const slowJobs = completedJobs.filter(j => {
      if (j.completed_at && j.started_at) {
        const duration = new Date(j.completed_at).getTime() - new Date(j.started_at).getTime();
        return duration > avgCompletionTime * 1.5;
      }
      return false;
    });

    // Deep performance analysis
    const optimizationPrompt = `You are SUPER MEGA MIND's Auto Performance Optimizer.

**MISSION:** Analyze system performance and create AUTOMATIC optimizations.

**Performance Metrics:**
- Total Jobs: ${jobs.length}
- Completed: ${completedJobs.length}
- Average Completion Time: ${(avgCompletionTime / 1000).toFixed(2)}s
- Slow Jobs: ${slowJobs.length}

**Slow Job Analysis:**
${JSON.stringify(slowJobs.slice(0, 5).map(j => ({
  duration: j.completed_at && j.started_at ? 
    ((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000).toFixed(2) + 's' : 
    'unknown',
  steps: j.total_steps,
  type: j.job_type,
  retries: j.retry_count
})), null, 2)}

**Your Performance Optimization Tasks:**

1. **Identify Bottlenecks**
   - What operations are slowest?
   - What patterns cause delays?
   - What resources are constrained?

2. **Design Optimizations**
   - Code-level optimizations
   - Algorithm improvements
   - Caching strategies
   - Parallel processing opportunities

3. **Auto-Implementation**
   - Which optimizations can be applied automatically?
   - What monitoring is needed?
   - What are the risks?

**OUTPUT FORMAT (Strict JSON):**
{
  "analysis": {
    "bottlenecks": [
      {
        "area": "specific area",
        "impact": "performance impact",
        "frequency": "how often it occurs"
      }
    ],
    "opportunities": ["optimization opportunities"]
  },
  "optimizations": [
    {
      "name": "optimization name",
      "type": "caching|parallelization|algorithm|resource",
      "description": "what it does",
      "implementation": {
        "automatic": true/false,
        "code": "code changes if automatic",
        "manual": "manual steps if needed"
      },
      "expectedImprovement": "percentage or time saved",
      "risk": "low|medium|high",
      "confidence": 0.0-1.0
    }
  ],
  "monitoring": {
    "metrics": ["new metrics to track"],
    "benchmarks": {"metric": "target value"}
  }
}`;

    const aiResponse = await callAIWithFallback(
      LOVABLE_API_KEY,
      [
        {
          role: 'system',
          content: 'You are SUPER MEGA MIND Auto Performance Optimizer. Respond with valid JSON only.'
        },
        { role: 'user', content: optimizationPrompt }
      ],
      { 
        preferredModel: SUPER_MODEL,
        temperature: 0.2
      }
    );

    const result = JSON.parse(aiResponse.data.choices[0].message.content);

    // Store and apply automatic optimizations
    const appliedOptimizations = [];
    
    for (const optimization of result.optimizations) {
      // Store optimization
      await supabaseClient
        .from('performance_optimizations')
        .insert({
          name: optimization.name,
          type: optimization.type,
          description: optimization.description,
          implementation: optimization.implementation,
          expected_improvement: optimization.expectedImprovement,
          risk_level: optimization.risk,
          confidence: optimization.confidence,
          status: optimization.implementation.automatic ? 'applied' : 'pending_manual',
          created_at: new Date().toISOString()
        });

      if (optimization.implementation.automatic && optimization.risk === 'low' && optimization.confidence > 0.7) {
        appliedOptimizations.push(optimization);
        console.log(`✅ Auto-applied optimization: ${optimization.name}`);
      }
    }

    console.log(`⚡ Performance optimization complete: ${appliedOptimizations.length} auto-applied`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: result.analysis,
        optimizations: result.optimizations,
        autoApplied: appliedOptimizations.length,
        modelUsed: SUPER_MODEL,
        metrics: {
          avgCompletionTime: avgCompletionTime / 1000,
          slowJobs: slowJobs.length,
          totalJobs: jobs.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in auto-performance-optimizer:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
