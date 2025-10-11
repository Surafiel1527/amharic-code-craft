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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action,
      decisionData,
      outcomeData,
      userRequest,
      conversationId
    } = await req.json();

    console.log('Decision Validator Action:', action);

    // ACTION 1: Log a new decision
    if (action === 'log_decision') {
      const { data: decisionLog, error: logError } = await supabaseClient
        .from('decision_logs')
        .insert({
          user_id: decisionData.userId,
          conversation_id: conversationId,
          job_id: decisionData.jobId,
          decision_type: decisionData.decisionType,
          decision_input: decisionData.input,
          decision_output: decisionData.output,
          confidence_score: decisionData.confidence || 0.5,
          user_request: userRequest,
          classified_as: decisionData.classifiedAs,
          intent_detected: decisionData.intentDetected,
          complexity_detected: decisionData.complexityDetected,
          model_used: decisionData.modelUsed,
          processing_time_ms: decisionData.processingTimeMs,
          context_used: decisionData.contextUsed || {}
        })
        .select()
        .single();

      if (logError) throw logError;

      return new Response(JSON.stringify({
        success: true,
        decisionId: decisionLog.id,
        message: 'Decision logged successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 2: Validate outcome and detect errors
    if (action === 'validate_outcome') {
      const { decisionId, userId } = outcomeData;

      // Get the decision log
      const { data: decision, error: decisionError } = await supabaseClient
        .from('decision_logs')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (decisionError) throw decisionError;

      // Analyze if outcome matches intent
      const symptoms = await detectSymptoms(supabaseClient, decision, outcomeData);
      const wasCorrect = symptoms.length === 0;

      // Log the outcome
      const { data: outcome, error: outcomeError } = await supabaseClient
        .from('decision_outcomes')
        .insert({
          decision_id: decisionId,
          was_correct: wasCorrect,
          actual_intent: outcomeData.actualIntent,
          user_feedback: outcomeData.userFeedback,
          correction_needed: !wasCorrect,
          detected_by: outcomeData.detectedBy || 'outcome_analysis',
          detection_confidence: outcomeData.detectionConfidence || 0.8,
          error_severity: outcomeData.errorSeverity || (wasCorrect ? 'low' : 'medium'),
          user_satisfaction_score: outcomeData.satisfactionScore,
          symptoms: symptoms,
          actual_outcome: outcomeData.actualOutcome,
          expected_outcome: outcomeData.expectedOutcome
        })
        .select()
        .single();

      if (outcomeError) throw outcomeError;

      // If wrong, trigger learning
      if (!wasCorrect) {
        console.log('❌ Decision was incorrect, triggering meta-learning...');
        
        // Call meta-learning-engine
        const learningResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-learning-engine`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              action: 'learn_from_mistake',
              decisionId,
              outcomeId: outcome.id
            })
          }
        );

        const learningResult = await learningResponse.json();
        console.log('Learning result:', learningResult);
      }

      return new Response(JSON.stringify({
        success: true,
        outcomeId: outcome.id,
        wasCorrect,
        symptoms,
        message: wasCorrect ? 'Decision validated as correct' : 'Error detected, learning initiated'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 3: Check confidence for a classification
    if (action === 'check_confidence') {
      const { classificationType, keywords, context } = decisionData;

      // Get historical confidence for this type of classification
      const { data: confidenceScores } = await supabaseClient
        .from('confidence_scores')
        .select('*')
        .eq('classification_type', classificationType)
        .order('current_confidence', { ascending: false })
        .limit(5);

      // Get known misclassification patterns
      const { data: patterns } = await supabaseClient
        .from('misclassification_patterns')
        .select('*')
        .eq('wrong_classification', classificationType)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .limit(3);

      // Calculate adjusted confidence based on history
      let baseConfidence = 0.5;
      if (confidenceScores && confidenceScores.length > 0) {
        const avgConfidence = confidenceScores.reduce((sum, score) => 
          sum + parseFloat(score.current_confidence), 0) / confidenceScores.length;
        baseConfidence = avgConfidence;
      }

      // Check if keywords match known error patterns
      let warningPatterns = [];
      if (patterns && keywords) {
        for (const pattern of patterns) {
          const commonKeywords = pattern.common_keywords as string[];
          const hasMatchingKeyword = keywords.some((kw: string) => 
            commonKeywords.some(pk => kw.toLowerCase().includes(pk.toLowerCase()))
          );
          if (hasMatchingKeyword) {
            warningPatterns.push({
              patternName: pattern.pattern_name,
              correctClassification: pattern.correct_classification,
              confidence: pattern.confidence_score
            });
            // Reduce confidence if we match an error pattern
            baseConfidence *= 0.7;
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        confidence: Math.max(0.1, Math.min(1.0, baseConfidence)),
        warnings: warningPatterns,
        historicalData: confidenceScores,
        recommendation: warningPatterns.length > 0 ? 
          'High risk of misclassification detected' : 
          'Classification confidence acceptable'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action specified');

  } catch (error: any) {
    console.error('Decision Validator Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to validate decision'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to detect symptoms of wrong decisions
async function detectSymptoms(supabase: any, decision: any, outcomeData: any): Promise<string[]> {
  const symptoms = [];

  // Check if user explicitly complained
  if (outcomeData.userFeedback) {
    const feedback = outcomeData.userFeedback.toLowerCase();
    const negativeKeywords = [
      'wrong', 'incorrect', 'didn\'t', 'not what', 'should have',
      'instead', 'actually', 'meant to', 'supposed to', 'expected'
    ];
    
    if (negativeKeywords.some(keyword => feedback.includes(keyword))) {
      symptoms.push('explicit_user_complaint');
    }
  }

  // Check if classification confidence was low
  if (parseFloat(decision.confidence_score) < 0.4) {
    symptoms.push('low_confidence_classification');
  }

  // Check if this is a repeated request (user had to ask again)
  const { data: recentDecisions } = await supabase
    .from('decision_logs')
    .select('id, user_request')
    .eq('user_id', decision.user_id)
    .eq('conversation_id', decision.conversation_id)
    .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
    .not('id', 'eq', decision.id);

  if (recentDecisions && recentDecisions.length > 2) {
    symptoms.push('repeated_requests_in_conversation');
    
    // Check for semantic similarity (user rephrasing same request)
    const currentRequest = decision.user_request.toLowerCase();
    const similarRequests = recentDecisions.filter((r: any) => {
      const similarity = calculateSimilarity(currentRequest, r.user_request.toLowerCase());
      return similarity > 0.6;
    });
    
    if (similarRequests.length > 0) {
      symptoms.push('user_rephrasing_request');
    }
  }

  // Check if execution failed
  if (outcomeData.executionFailed) {
    symptoms.push('execution_failure');
  }

  // Check if output doesn't match expected type
  if (outcomeData.expectedOutcome && outcomeData.actualOutcome) {
    const expected = typeof outcomeData.expectedOutcome;
    const actual = typeof outcomeData.actualOutcome;
    if (expected !== actual) {
      symptoms.push('output_type_mismatch');
    }
  }

  // Check if user provided actual intent (strong signal)
  if (outcomeData.actualIntent && outcomeData.actualIntent !== decision.classified_as) {
    symptoms.push('explicit_intent_mismatch');
  }

  // Check if the request keywords don't match classification
  const requestKeywords = extractKeywords(decision.user_request);
  const classificationKeywords = extractKeywords(decision.classified_as);
  const keywordOverlap = requestKeywords.filter(k => classificationKeywords.includes(k)).length;
  
  if (keywordOverlap === 0 && requestKeywords.length > 2) {
    symptoms.push('keyword_mismatch');
  }

  return symptoms;
}

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// Helper function to extract meaningful keywords
function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  return text.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
}