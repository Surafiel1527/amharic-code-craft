/**
 * Prompt Evolution System
 * Phase 4B: Autonomous Prompt Improvement
 * 
 * Analyzes prompt performance and generates improved versions
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface PromptPerformance {
  prompt_id: string;
  prompt_text: string;
  prompt_type: string;
  success_rate: number;
  avg_quality_score: number;
  times_used: number;
  user_satisfaction: number;
  last_used_at: string;
  created_at: string;
}

export interface PromptEvolutionSuggestion {
  original_prompt: string;
  improved_prompt: string;
  reasoning: string;
  expected_improvements: {
    success_rate_increase: number;
    quality_score_increase: number;
  };
  confidence_score: number;
  changes: Array<{
    type: string;
    description: string;
    impact: string;
  }>;
}

/**
 * Analyze prompt performance and identify underperforming prompts
 */
export async function analyzePromptPerformance(
  supabase: SupabaseClient
): Promise<PromptPerformance[]> {
  try {
    // Get all prompts with their performance metrics
    const { data: prompts, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .order('times_used', { ascending: false });

    if (error) throw error;

    // Calculate performance metrics
    const performance: PromptPerformance[] = prompts?.map(p => ({
      prompt_id: p.id,
      prompt_text: p.prompt_text,
      prompt_type: p.prompt_type,
      success_rate: p.success_rate || 0,
      avg_quality_score: p.avg_quality_score || 0,
      times_used: p.times_used || 0,
      user_satisfaction: p.user_satisfaction || 0,
      last_used_at: p.last_used_at,
      created_at: p.created_at
    })) || [];

    // Sort by performance (worst first)
    return performance.sort((a, b) => {
      const scoreA = (a.success_rate * 0.4) + (a.avg_quality_score * 0.4) + (a.user_satisfaction * 0.2);
      const scoreB = (b.success_rate * 0.4) + (b.avg_quality_score * 0.4) + (b.user_satisfaction * 0.2);
      return scoreA - scoreB;
    });
  } catch (error) {
    console.error('Error analyzing prompt performance:', error);
    throw error;
  }
}

/**
 * Use AI to generate improved version of a prompt
 */
export async function generateImprovedPrompt(
  originalPrompt: string,
  performance: PromptPerformance,
  apiKey: string
): Promise<PromptEvolutionSuggestion> {
  try {
    const analysisPrompt = `You are an expert AI prompt engineer. Analyze this prompt and suggest improvements.

CURRENT PROMPT:
"""
${originalPrompt}
"""

PERFORMANCE METRICS:
- Success Rate: ${performance.success_rate}%
- Quality Score: ${performance.avg_quality_score}/100
- User Satisfaction: ${performance.user_satisfaction}/10
- Times Used: ${performance.times_used}

TASK: Generate an improved version of this prompt that will:
1. Increase clarity and specificity
2. Improve success rate
3. Enhance output quality
4. Better align with user expectations

Respond in JSON format:
{
  "improved_prompt": "the rewritten prompt",
  "reasoning": "why this is better",
  "expected_improvements": {
    "success_rate_increase": 15,
    "quality_score_increase": 20
  },
  "confidence_score": 85,
  "changes": [
    {
      "type": "clarity",
      "description": "Added explicit instructions",
      "impact": "Users will understand requirements better"
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert prompt engineer specializing in improving AI prompts.' },
          { role: 'user', content: analysisPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'provide_improved_prompt',
            description: 'Provide the improved prompt with analysis',
            parameters: {
              type: 'object',
              properties: {
                improved_prompt: { type: 'string' },
                reasoning: { type: 'string' },
                expected_improvements: {
                  type: 'object',
                  properties: {
                    success_rate_increase: { type: 'number' },
                    quality_score_increase: { type: 'number' }
                  }
                },
                confidence_score: { type: 'number' },
                changes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      impact: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'provide_improved_prompt' } }
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return {
      original_prompt: originalPrompt,
      improved_prompt: result.improved_prompt,
      reasoning: result.reasoning,
      expected_improvements: result.expected_improvements,
      confidence_score: result.confidence_score,
      changes: result.changes
    };
  } catch (error) {
    console.error('Error generating improved prompt:', error);
    throw error;
  }
}

/**
 * Submit improved prompt to admin approval queue
 */
export async function submitPromptForApproval(
  supabase: SupabaseClient,
  promptId: string,
  suggestion: PromptEvolutionSuggestion,
  submitterId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('admin_approval_queue')
      .insert({
        item_type: 'prompt_improvement',
        item_id: promptId,
        status: 'pending',
        priority: suggestion.confidence_score > 80 ? 'high' : 'normal',
        approval_score: suggestion.confidence_score,
        submitted_by: submitterId,
        metadata: {
          before: suggestion.original_prompt,
          after: suggestion.improved_prompt,
          reasoning: suggestion.reasoning,
          changes: suggestion.changes,
          impact: {
            positive: [
              `+${suggestion.expected_improvements.success_rate_increase}% success rate`,
              `+${suggestion.expected_improvements.quality_score_increase} quality score`
            ],
            risks: ['Requires testing to validate improvements'],
            metrics: {
              expected_success_rate: suggestion.expected_improvements.success_rate_increase,
              expected_quality: suggestion.expected_improvements.quality_score_increase
            }
          },
          prompt_id: promptId
        }
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Prompt improvement submitted for approval: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error submitting prompt for approval:', error);
    throw error;
  }
}

/**
 * Track prompt usage and update performance metrics
 */
export async function trackPromptUsage(
  supabase: SupabaseClient,
  promptId: string,
  success: boolean,
  qualityScore: number
): Promise<void> {
  try {
    // Get current prompt data
    const { data: prompt, error: fetchError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new metrics
    const timesUsed = (prompt.times_used || 0) + 1;
    const successCount = (prompt.success_count || 0) + (success ? 1 : 0);
    const newSuccessRate = (successCount / timesUsed) * 100;
    
    const totalQuality = (prompt.avg_quality_score || 0) * (timesUsed - 1) + qualityScore;
    const newAvgQuality = totalQuality / timesUsed;

    // Update prompt metrics
    const { error: updateError } = await supabase
      .from('ai_prompts')
      .update({
        times_used: timesUsed,
        success_count: successCount,
        success_rate: newSuccessRate,
        avg_quality_score: newAvgQuality,
        last_used_at: new Date().toISOString()
      })
      .eq('id', promptId);

    if (updateError) throw updateError;

    console.log(`✅ Prompt usage tracked: ${promptId} (success: ${success}, quality: ${qualityScore})`);
  } catch (error) {
    console.error('Error tracking prompt usage:', error);
    throw error;
  }
}

/**
 * Run automatic prompt evolution cycle
 * Finds underperforming prompts and generates improvements
 */
export async function runEvolutionCycle(
  supabase: SupabaseClient,
  apiKey: string,
  submitterId: string
): Promise<{
  analyzed: number;
  improvements_generated: number;
  submitted_for_approval: number;
}> {
  try {
    console.log('🧬 Starting prompt evolution cycle...');

    // 1. Analyze all prompts
    const performance = await analyzePromptPerformance(supabase);
    console.log(`📊 Analyzed ${performance.length} prompts`);

    // 2. Find prompts that need improvement (bottom 20% or score < 70)
    const threshold = Math.max(70, performance[Math.floor(performance.length * 0.2)]?.success_rate || 70);
    const needsImprovement = performance.filter(p => 
      p.success_rate < threshold && p.times_used > 5
    );

    console.log(`🎯 Found ${needsImprovement.length} prompts needing improvement`);

    let improvementsGenerated = 0;
    let submittedForApproval = 0;

    // 3. Generate improvements for top 3 worst performers
    const toImprove = needsImprovement.slice(0, 3);
    
    for (const promptPerf of toImprove) {
      try {
        console.log(`🔄 Improving prompt: ${promptPerf.prompt_id}`);
        
        const suggestion = await generateImprovedPrompt(
          promptPerf.prompt_text,
          promptPerf,
          apiKey
        );
        
        improvementsGenerated++;

        // Only submit if confidence is high enough
        if (suggestion.confidence_score > 60) {
          await submitPromptForApproval(
            supabase,
            promptPerf.prompt_id,
            suggestion,
            submitterId
          );
          submittedForApproval++;
        }
      } catch (error) {
        console.error(`Failed to improve prompt ${promptPerf.prompt_id}:`, error);
      }
    }

    console.log(`✅ Evolution cycle complete: ${improvementsGenerated} improvements, ${submittedForApproval} submitted`);

    return {
      analyzed: performance.length,
      improvements_generated: improvementsGenerated,
      submitted_for_approval: submittedForApproval
    };
  } catch (error) {
    console.error('Error in evolution cycle:', error);
    throw error;
  }
}
