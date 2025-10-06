import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧠 Advanced Reasoning Engine: Starting deep analysis...');

    // Step 1: Fetch complex/recurring errors that need deep analysis
    const { data: complexErrors, error: errorsError } = await supabase
      .from('detected_errors')
      .select('*')
      .in('status', ['pending', 'analyzing'])
      .or('severity.eq.critical,recurring_count.gte.3')
      .order('created_at', { ascending: false })
      .limit(10);

    if (errorsError) throw errorsError;

    console.log(`Found ${complexErrors?.length || 0} complex errors for deep analysis`);

    // Step 2: Fetch related context for each error
    const analysisResults = [];
    
    for (const error of complexErrors || []) {
      // Get historical fixes for similar errors
      const { data: similarFixes } = await supabase
        .from('auto_fixes')
        .select('*')
        .eq('error_type', error.error_type)
        .eq('fix_worked', true)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get related patterns
      const { data: relatedPatterns } = await supabase
        .from('universal_error_patterns')
        .select('*')
        .eq('error_type', error.error_type)
        .order('confidence_score', { ascending: false })
        .limit(3);

      // Get cross-project insights
      const { data: crossProjectData } = await supabase
        .from('cross_project_patterns')
        .select('*')
        .eq('error_type', error.error_type)
        .order('frequency', { ascending: false })
        .limit(3);

      console.log(`Analyzing error ${error.id} with deep reasoning...`);

      // Step 3: Use advanced reasoning model for deep analysis
      const reasoningPrompt = `You are an advanced software engineering analyst. Perform deep reasoning on this error:

ERROR DETAILS:
- Type: ${error.error_type}
- Message: ${error.error_message}
- Severity: ${error.severity}
- File: ${error.file_path || 'Unknown'}
- Stack Trace: ${error.stack_trace || 'N/A'}
- Context: ${JSON.stringify(error.context || {})}
- Times Recurring: ${error.recurring_count || 1}

HISTORICAL SUCCESS PATTERNS:
${similarFixes?.map(fix => `
  - Solution: ${fix.fix_description}
  - Code Changes: ${fix.code_changes?.substring(0, 200)}...
  - Success Rate: Applied ${fix.times_applied || 1} times
`).join('\n') || 'No historical fixes found'}

KNOWN PATTERNS:
${relatedPatterns?.map(p => `
  - Pattern: ${p.solution_pattern}
  - Root Cause: ${p.root_cause}
  - Confidence: ${(p.confidence_score * 100).toFixed(1)}%
`).join('\n') || 'No patterns identified'}

CROSS-PROJECT INSIGHTS:
${crossProjectData?.map(cp => `
  - Common Solution: ${cp.solution_pattern}
  - Frequency: ${cp.frequency} occurrences
  - Success Rate: ${cp.success_rate ? (cp.success_rate * 100).toFixed(1) : 'N/A'}%
`).join('\n') || 'No cross-project data'}

DEEP REASONING TASK:
1. Perform root cause analysis - what is the fundamental issue?
2. Identify contributing factors and dependencies
3. Evaluate multiple solution approaches with trade-offs
4. Recommend the optimal solution with reasoning
5. Predict potential side effects or edge cases
6. Suggest preventive measures for the future

Provide your analysis in JSON format:
{
  "root_cause_analysis": "Deep explanation of the fundamental issue",
  "contributing_factors": ["factor1", "factor2"],
  "solution_approaches": [
    {
      "approach": "Solution description",
      "pros": ["pro1", "pro2"],
      "cons": ["con1", "con2"],
      "complexity": "low|medium|high",
      "confidence": 0.85
    }
  ],
  "recommended_solution": {
    "approach": "The best solution",
    "reasoning": "Why this is optimal",
    "implementation_steps": ["step1", "step2"],
    "code_changes": "Specific code to apply",
    "testing_strategy": "How to verify the fix"
  },
  "predicted_side_effects": ["potential issue 1"],
  "preventive_measures": ["prevention 1", "prevention 2"],
  "confidence_score": 0.90
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: 'You are an expert software engineering analyst with deep reasoning capabilities.' },
            { role: 'user', content: reasoningPrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI API error: ${aiResponse.status}`);
        continue;
      }

      const aiData = await aiResponse.json();
      const analysisText = aiData.choices[0].message.content;
      
      // Parse JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (analysis) {
        // Store the advanced analysis
        const { error: insertError } = await supabase
          .from('advanced_reasoning_results')
          .insert({
            error_id: error.id,
            root_cause: analysis.root_cause_analysis,
            contributing_factors: analysis.contributing_factors,
            solution_approaches: analysis.solution_approaches,
            recommended_solution: analysis.recommended_solution,
            predicted_side_effects: analysis.predicted_side_effects,
            preventive_measures: analysis.preventive_measures,
            confidence_score: analysis.confidence_score,
            reasoning_model: 'gemini-2.5-pro',
          });

        if (insertError) {
          console.error('Error storing reasoning result:', insertError);
        }

        // If confidence is high enough, create an auto-fix
        if (analysis.confidence_score >= 0.85 && analysis.recommended_solution) {
          const { error: fixError } = await supabase
            .from('auto_fixes')
            .insert({
              error_id: error.id,
              error_type: error.error_type,
              fix_description: analysis.recommended_solution.reasoning,
              code_changes: analysis.recommended_solution.code_changes,
              confidence_score: analysis.confidence_score,
              fix_source: 'advanced_reasoning',
              metadata: {
                implementation_steps: analysis.recommended_solution.implementation_steps,
                testing_strategy: analysis.recommended_solution.testing_strategy,
                side_effects: analysis.predicted_side_effects,
              }
            });

          if (!fixError) {
            // Update error status
            await supabase
              .from('detected_errors')
              .update({ status: 'fix_proposed' })
              .eq('id', error.id);
          }
        }

        analysisResults.push({
          error_id: error.id,
          confidence: analysis.confidence_score,
          recommended: analysis.recommended_solution.approach,
        });
      }
    }

    // Step 4: Log the reasoning session
    await supabase.from('ai_improvement_logs').insert({
      operation_type: 'advanced_reasoning',
      changes_made: {
        errors_analyzed: complexErrors?.length || 0,
        high_confidence_solutions: analysisResults.filter(r => r.confidence >= 0.85).length,
        results: analysisResults,
      },
      success: true,
    });

    console.log(`✅ Advanced reasoning complete. Analyzed ${analysisResults.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed_count: analysisResults.length,
        high_confidence_count: analysisResults.filter(r => r.confidence >= 0.85).length,
        results: analysisResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in advanced-reasoning-engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
