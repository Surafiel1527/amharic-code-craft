import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model capabilities and costs (relative)
const MODEL_SPECS = {
  'google/gemini-2.5-pro': {
    capabilities: ['complex_reasoning', 'architecture', 'refactoring', 'large_context'],
    cost: 10,
    speed: 3,
    quality: 10
  },
  'google/gemini-2.5-flash': {
    capabilities: ['generation', 'moderate_reasoning', 'analysis'],
    cost: 3,
    speed: 8,
    quality: 8
  },
  'google/gemini-2.5-flash-lite': {
    capabilities: ['simple_tasks', 'classification', 'summarization'],
    cost: 1,
    speed: 10,
    quality: 6
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskType, complexity, codeLength, requiresReasoning } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get historical performance data
    const { data: performanceData } = await supabaseClient
      .from('model_performance')
      .select('model_name, success, quality_score, execution_time_ms')
      .eq('task_type', taskType)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate model scores based on historical data
    const modelScores: Record<string, number> = {};
    
    for (const [modelName, specs] of Object.entries(MODEL_SPECS)) {
      let score = 0;
      
      // Base capability match
      if (taskType === 'architecture' || taskType === 'planning') {
        score = specs.capabilities.includes('complex_reasoning') ? 100 : 20;
      } else if (taskType === 'generation') {
        score = specs.capabilities.includes('generation') ? 100 : 50;
      } else if (taskType === 'analysis' || taskType === 'diff') {
        score = specs.capabilities.includes('simple_tasks') ? 100 : 70;
      }
      
      // Adjust for complexity
      if (complexity === 'high' && specs.quality >= 9) score += 30;
      if (complexity === 'low' && specs.speed >= 8) score += 20;
      
      // Adjust for code length
      if (codeLength && codeLength > 5000 && specs.capabilities.includes('large_context')) {
        score += 20;
      }
      
      // Reasoning requirements
      if (requiresReasoning && specs.capabilities.includes('complex_reasoning')) {
        score += 25;
      }
      
      // Historical performance boost
      if (performanceData) {
        const modelData = performanceData.filter(d => d.model_name === modelName);
        if (modelData.length > 0) {
          const successRate = modelData.filter(d => d.success).length / modelData.length;
          const avgQuality = modelData
            .filter(d => d.quality_score)
            .reduce((sum, d) => sum + (d.quality_score || 0), 0) / modelData.length;
          
          score += successRate * 30;
          score += (avgQuality / 100) * 20;
        }
      }
      
      // Cost efficiency for simple tasks
      if (complexity === 'low') {
        score += (11 - specs.cost) * 2; // Favor cheaper models
      }
      
      modelScores[modelName] = score;
    }

    // Select best model
    const selectedModel = Object.entries(modelScores)
      .sort(([, a], [, b]) => b - a)[0][0];

    const selectedSpecs = MODEL_SPECS[selectedModel as keyof typeof MODEL_SPECS];

    console.log('Model selection:', {
      taskType,
      complexity,
      scores: modelScores,
      selected: selectedModel
    });

    return new Response(
      JSON.stringify({
        selectedModel,
        reasoning: {
          taskType,
          complexity,
          codeLength,
          requiresReasoning
        },
        modelInfo: {
          capabilities: selectedSpecs.capabilities,
          relativeCost: selectedSpecs.cost,
          relativeSpeed: selectedSpecs.speed,
          expectedQuality: selectedSpecs.quality
        },
        allScores: modelScores
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Model selector error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: 'google/gemini-2.5-flash' // Safe default
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});