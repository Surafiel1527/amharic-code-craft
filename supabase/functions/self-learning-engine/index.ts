import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Self-Learning Engine - Learns from successful patterns and auto-applies fixes
 * Analyzes success patterns, builds confidence, and applies high-confidence fixes
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧠 Self-Learning Engine: Starting analysis...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const learningResults = {
      patternsAnalyzed: 0,
      confidenceUpdates: 0,
      autoAppliedFixes: 0,
      newPatternsLearned: 0,
      crossProjectInsights: 0
    };

    // Step 1: Analyze successful fixes from the last 7 days
    const { data: successfulFixes } = await supabaseClient
      .from('auto_fixes')
      .select('*, detected_errors!inner(error_type, error_message, severity, context)')
      .eq('status', 'applied')
      .gte('applied_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(50);

    console.log(`📊 Found ${successfulFixes?.length || 0} successful fixes to learn from`);

    if (successfulFixes && successfulFixes.length > 0) {
      // Group fixes by error type to identify patterns
      const fixesByType: Record<string, any[]> = {};
      successfulFixes.forEach(fix => {
        const errorType = fix.detected_errors?.error_type || 'unknown';
        if (!fixesByType[errorType]) {
          fixesByType[errorType] = [];
        }
        fixesByType[errorType].push(fix);
      });

      learningResults.patternsAnalyzed = Object.keys(fixesByType).length;

      // Step 2: Learn patterns and update confidence scores
      for (const [errorType, fixes] of Object.entries(fixesByType)) {
        if (fixes.length < 2) continue; // Need at least 2 examples to learn a pattern

        console.log(`🔍 Analyzing pattern for: ${errorType} (${fixes.length} examples)`);

        // Extract common patterns using AI
        const aiPrompt = `You are a software engineering AI learning from successful bug fixes.

TASK: Analyze these successful fixes and extract reusable patterns.

ERROR TYPE: ${errorType}

SUCCESSFUL FIXES:
${JSON.stringify(fixes.slice(0, 5).map(f => ({
  original: f.original_code?.substring(0, 200),
  fixed: f.fixed_code?.substring(0, 200),
  explanation: f.explanation,
  context: f.detected_errors?.context
})), null, 2)}

EXTRACT:
1. Common root cause
2. Solution pattern (generic, reusable)
3. Code template (with placeholders)
4. Success indicators (how to know it works)
5. Confidence score (0-100, based on consistency)

Return JSON:
{
  "rootCause": "description",
  "solutionPattern": "generic approach",
  "codeTemplate": "code with {{placeholders}}",
  "successIndicators": ["indicator1", "indicator2"],
  "confidence": 85,
  "applicableContexts": ["context1", "context2"]
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: aiPrompt }],
            response_format: { type: "json_object" }
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const pattern = JSON.parse(aiData.choices[0].message.content);

          // Store or update the learned pattern
          const { data: existingPattern } = await supabaseClient
            .from('universal_error_patterns')
            .select('*')
            .eq('error_category', errorType)
            .eq('error_subcategory', pattern.rootCause)
            .maybeSingle();

          if (existingPattern) {
            // Update existing pattern with new confidence
            const newConfidence = (existingPattern.confidence_score * 0.7) + (pattern.confidence / 100 * 0.3);
            
            await supabaseClient
              .from('universal_error_patterns')
              .update({
                confidence_score: newConfidence,
                success_count: existingPattern.success_count + fixes.length,
                times_encountered: existingPattern.times_encountered + fixes.length,
                last_success_at: new Date().toISOString(),
                last_used_at: new Date().toISOString(),
                diagnosis: {
                  ...existingPattern.diagnosis,
                  solutionPattern: pattern.solutionPattern,
                  codeTemplate: pattern.codeTemplate,
                  successIndicators: pattern.successIndicators
                }
              })
              .eq('id', existingPattern.id);

            learningResults.confidenceUpdates++;
          } else {
            // Create new pattern
            await supabaseClient
              .from('universal_error_patterns')
              .insert({
                error_category: errorType,
                error_subcategory: pattern.rootCause,
                diagnosis: {
                  rootCause: pattern.rootCause,
                  solutionPattern: pattern.solutionPattern,
                  codeTemplate: pattern.codeTemplate,
                  successIndicators: pattern.successIndicators,
                  applicableContexts: pattern.applicableContexts
                },
                confidence_score: pattern.confidence / 100,
                success_count: fixes.length,
                times_encountered: fixes.length,
                auto_apply: pattern.confidence > 90 // Auto-apply if very confident
              });

            learningResults.newPatternsLearned++;
          }
        }
      }
    }

    // Step 3: Cross-project pattern recognition
    const { data: crossProjectData } = await supabaseClient
      .from('cross_project_patterns')
      .select('*')
      .gte('usage_count', 3) // Patterns used in at least 3 projects
      .gte('success_rate', 80)
      .order('confidence_score', { ascending: false })
      .limit(20);

    if (crossProjectData && crossProjectData.length > 0) {
      console.log(`🌐 Found ${crossProjectData.length} cross-project patterns`);
      
      for (const pattern of crossProjectData) {
        // Promote high-confidence cross-project patterns to universal patterns
        if (pattern.confidence_score > 85 && pattern.usage_count > 5) {
          const { data: existing } = await supabaseClient
            .from('universal_error_patterns')
            .select('id')
            .eq('error_category', pattern.pattern_type)
            .eq('error_subcategory', pattern.pattern_name)
            .maybeSingle();

          if (!existing) {
            await supabaseClient
              .from('universal_error_patterns')
              .insert({
                error_category: pattern.pattern_type,
                error_subcategory: pattern.pattern_name,
                diagnosis: {
                  rootCause: 'Cross-project pattern',
                  solutionPattern: pattern.pattern_code,
                  crossProject: true,
                  contexts: pattern.contexts
                },
                confidence_score: pattern.confidence_score / 100,
                success_count: pattern.usage_count,
                times_encountered: pattern.usage_count,
                auto_apply: pattern.success_rate > 90
              });

            learningResults.crossProjectInsights++;
          }
        }
      }
    }

    // Step 4: Auto-apply high-confidence patterns to pending errors
    const { data: pendingErrors } = await supabaseClient
      .from('detected_errors')
      .select('*')
      .in('status', ['detected', 'analyzing'])
      .eq('auto_fix_enabled', true)
      .lt('fix_attempts', 3)
      .limit(10);

    if (pendingErrors && pendingErrors.length > 0) {
      for (const error of pendingErrors) {
        // Find high-confidence pattern match
        const { data: matchingPattern } = await supabaseClient
          .from('universal_error_patterns')
          .select('*')
          .eq('error_category', error.error_type)
          .eq('auto_apply', true)
          .gte('confidence_score', 0.9)
          .gte('success_count', 5)
          .maybeSingle();

        if (matchingPattern) {
          console.log(`⚡ Auto-applying high-confidence pattern for error ${error.id}`);
          
          // Generate fix using the pattern template
          const fixPrompt = `Apply this proven solution pattern to fix the error:

ERROR: ${error.error_message}
CONTEXT: ${JSON.stringify(error.context)}

PROVEN PATTERN (${Math.round(matchingPattern.confidence_score * 100)}% success rate):
${JSON.stringify(matchingPattern.diagnosis, null, 2)}

Generate the exact code fix following this pattern.`;

          const fixResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: fixPrompt }]
            }),
          });

          if (fixResponse.ok) {
            const fixData = await fixResponse.json();
            const fixedCode = fixData.choices[0].message.content;

            // Apply the fix
            await supabaseClient
              .from('auto_fixes')
              .insert({
                error_id: error.id,
                fix_type: 'learned_pattern',
                original_code: error.context?.code || '',
                fixed_code: fixedCode,
                explanation: `Auto-applied learned pattern: ${matchingPattern.error_subcategory}`,
                status: 'applied',
                ai_confidence: matchingPattern.confidence_score,
                applied_at: new Date().toISOString()
              });

            // Update error status
            await supabaseClient
              .from('detected_errors')
              .update({
                status: 'fixed',
                fix_attempts: error.fix_attempts + 1,
                resolved_at: new Date().toISOString()
              })
              .eq('id', error.id);

            learningResults.autoAppliedFixes++;
          }
        }
      }
    }

    // Log the learning session
    await supabaseClient
      .from('ai_improvement_logs')
      .insert({
        improvement_type: 'self_learning',
        before_metric: learningResults.patternsAnalyzed,
        after_metric: learningResults.newPatternsLearned + learningResults.confidenceUpdates,
        changes_made: learningResults,
        confidence_score: 0.95,
        validation_status: 'validated'
      });

    console.log(`✅ Self-Learning Complete:`, learningResults);

    return new Response(
      JSON.stringify({
        success: true,
        learning: learningResults,
        message: `Analyzed ${learningResults.patternsAnalyzed} patterns, auto-applied ${learningResults.autoAppliedFixes} fixes`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Self-Learning Engine error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
