import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create authenticated client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, decisionId, userRequest, currentClassification } = await req.json();

    console.log('Autonomous Corrector Action:', action);

    // ACTION 1: Auto-correct a wrong decision
    if (action === 'auto_correct') {
      // Get the original decision
      const { data: decision, error: decisionError } = await supabaseClient
        .from('decision_logs')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (decisionError) throw decisionError;

      // Validate user owns this decision
      if (decision.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden: Cannot correct another user\'s decision' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check for correction patterns
      const { data: patterns } = await supabaseClient
        .from('misclassification_patterns')
        .select('*')
        .eq('wrong_classification', decision.classified_as)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false });

      if (!patterns || patterns.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'No correction patterns available',
          requiresManualReview: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find best matching pattern
      const userRequestLower = decision.user_request.toLowerCase();
      let bestPattern = patterns[0];
      let bestScore = 0;

      for (const pattern of patterns) {
        const keywords = pattern.common_keywords as string[];
        const matchCount = keywords.filter(kw => 
          userRequestLower.includes(kw.toLowerCase())
        ).length;
        
        const score = (matchCount / keywords.length) * parseFloat(pattern.confidence_score);
        if (score > bestScore) {
          bestScore = score;
          bestPattern = pattern;
        }
      }

      // Only auto-correct if confidence is high enough
      if (bestScore < 0.6) {
        console.log('⚠️ Confidence too low for auto-correction:', bestScore);
        return new Response(JSON.stringify({
          success: false,
          message: 'Confidence threshold not met',
          confidence: bestScore,
          requiresManualReview: true,
          suggestedClassification: bestPattern.correct_classification
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Apply correction
      const correctedClassification = bestPattern.correct_classification;
      
      console.log('✅ Auto-correcting:', {
        from: decision.classified_as,
        to: correctedClassification,
        confidence: bestScore,
        pattern: bestPattern.pattern_name
      });

      // Log the correction
      const { data: correction, error: correctionError } = await supabaseClient
        .from('auto_corrections')
        .insert({
          original_decision_id: decisionId,
          original_classification: decision.classified_as,
          corrected_classification: correctedClassification,
          correction_method: 'pattern_match',
          correction_confidence: bestScore,
          pattern_id: bestPattern.id,
          correction_reasoning: `Matched pattern "${bestPattern.pattern_name}" with ${bestScore.toFixed(2)} confidence`,
          user_id: decision.user_id,
          re_executed: false
        })
        .select()
        .single();

      if (correctionError) throw correctionError;

      return new Response(JSON.stringify({
        success: true,
        correctionId: correction.id,
        originalClassification: decision.classified_as,
        correctedClassification,
        confidence: bestScore,
        patternUsed: bestPattern.pattern_name,
        shouldReExecute: true,
        message: 'Decision auto-corrected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 2: Validate a correction (after re-execution)
    if (action === 'validate_correction') {
      const { correctionId, wasSuccessful, validationResult } = await req.json();

      const { error: updateError } = await supabaseClient
        .from('auto_corrections')
        .update({
          was_successful: wasSuccessful,
          validation_result: validationResult,
          validated_at: new Date().toISOString()
        })
        .eq('id', correctionId);

      if (updateError) throw updateError;

      // Update pattern confidence based on result
      const { data: correction } = await supabaseClient
        .from('auto_corrections')
        .select('*, misclassification_patterns(*)')
        .eq('id', correctionId)
        .single();

      if (correction && correction.pattern_id) {
        const pattern = correction.misclassification_patterns;
        const newSuccessRate = wasSuccessful ?
          ((pattern.success_rate * pattern.times_corrected) + 1) / (pattern.times_corrected + 1) :
          ((pattern.success_rate * pattern.times_corrected)) / (pattern.times_corrected + 1);

        await supabaseClient
          .from('misclassification_patterns')
          .update({
            times_corrected: pattern.times_corrected + 1,
            success_rate: newSuccessRate,
            confidence_score: wasSuccessful ? 
              Math.min(1.0, pattern.confidence_score + 0.05) :
              Math.max(0.1, pattern.confidence_score - 0.1)
          })
          .eq('id', correction.pattern_id);
      }

      console.log(wasSuccessful ? '✅ Correction validated as successful' : '❌ Correction failed');

      return new Response(JSON.stringify({
        success: true,
        message: wasSuccessful ? 'Correction validated' : 'Correction failed, pattern adjusted'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 3: Check if correction is needed
    if (action === 'check_needed') {
      // Get meta-learning suggestions with user's auth token
      const suggestionsResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-learning-engine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            action: 'get_correction_suggestions',
            userRequest,
            currentClassification
          })
        }
      );

      const suggestions = await suggestionsResponse.json();

      return new Response(JSON.stringify({
        success: true,
        correctionNeeded: suggestions.hasSuggestions,
        suggestions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action specified');

  } catch (error: any) {
    console.error('Autonomous Corrector Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to execute autonomous correction'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});