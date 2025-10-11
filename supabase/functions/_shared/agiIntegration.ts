/**
 * AGI Integration Helper
 * 
 * Connects the orchestrator to the AGI self-correcting system
 */

/**
 * Log a decision to the AGI system
 */
export async function logDecision(
  analysis: any,
  ctx: {
    userId: string;
    conversationId: string;
    jobId?: string;
    userRequest: string;
    processingTimeMs?: number;
  }
): Promise<string | null> {
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/decision-validator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'log_decision',
          userRequest: ctx.userRequest,
          conversationId: ctx.conversationId,
          decisionData: {
            userId: ctx.userId,
            jobId: ctx.jobId,
            decisionType: 'classification',
            input: { userRequest: ctx.userRequest },
            output: analysis,
            confidence: analysis.confidence || 0.5,
            classifiedAs: analysis.isMetaRequest ? 'meta_request' : 
                         analysis.outputType === 'html-website' ? 'html_website' :
                         analysis.outputType === 'modification' ? 'code_modification' :
                         'feature_generation',
            intentDetected: analysis.intent,
            complexityDetected: analysis.complexity,
            modelUsed: 'google/gemini-2.5-flash',
            processingTimeMs: ctx.processingTimeMs,
            contextUsed: {
              hasConversationHistory: true,
              analysisConfidence: analysis.confidence
            }
          }
        })
      }
    );

    if (!response.ok) {
      console.warn('Failed to log decision:', response.status);
      return null;
    }

    const result = await response.json();
    console.log('✅ Decision logged:', result.decisionId);
    return result.decisionId;
  } catch (error) {
    console.error('Error logging decision:', error);
    return null;
  }
}

/**
 * Check if the current classification needs correction
 */
export async function checkForCorrection(
  userRequest: string,
  currentClassification: string
): Promise<{
  needsCorrection: boolean;
  suggestedClassification?: string;
  confidence?: number;
  reasoning?: string;
}> {
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/autonomous-corrector`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'check_needed',
          userRequest,
          currentClassification
        })
      }
    );

    if (!response.ok) {
      return { needsCorrection: false };
    }

    const result = await response.json();
    
    if (result.correctionNeeded && result.suggestions.hasSuggestions) {
      console.log('⚠️ Correction suggested:', {
        current: currentClassification,
        suggested: result.suggestions.suggestedClassification,
        confidence: result.suggestions.confidence
      });

      return {
        needsCorrection: true,
        suggestedClassification: result.suggestions.suggestedClassification,
        confidence: result.suggestions.confidence,
        reasoning: result.suggestions.reasoning
      };
    }

    return { needsCorrection: false };
  } catch (error) {
    console.error('Error checking for correction:', error);
    return { needsCorrection: false };
  }
}

/**
 * Perform self-reflection on a decision
 * Uses AI to critique its own classification
 */
export async function reflectOnDecision(
  userRequest: string,
  analysis: any
): Promise<{
  isConfident: boolean;
  concerns: string[];
  recommendation: string;
}> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const reflectionPrompt = `You are an AI reflecting on your own decision. Critique this classification:

User Request: "${userRequest}"

Your Classification:
- Type: ${analysis.isMetaRequest ? 'meta_request' : analysis.outputType}
- Intent: ${analysis.intent}
- Complexity: ${analysis.complexity}
- Confidence: ${analysis.confidence || 'unknown'}

Self-Critique Instructions:
1. Is this classification correct for the user's intent?
2. Are there any red flags or contradictions?
3. What could go wrong with this classification?
4. Should this be reclassified?

Return JSON:
{
  "isConfident": boolean,
  "concerns": ["concern1", "concern2"],
  "recommendation": "keep_classification" | "reclassify_to_X",
  "reasoning": "explanation"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a critical AI that reflects on and critiques its own decisions to improve accuracy.' 
          },
          { role: 'user', content: reflectionPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      return { isConfident: true, concerns: [], recommendation: 'keep_classification' };
    }

    const aiResult = await aiResponse.json();
    const reflection = JSON.parse(aiResult.choices[0].message.content);

    if (!reflection.isConfident || reflection.recommendation !== 'keep_classification') {
      console.log('🤔 Self-reflection identified concerns:', reflection);
    }

    return {
      isConfident: reflection.isConfident,
      concerns: reflection.concerns || [],
      recommendation: reflection.recommendation
    };
  } catch (error) {
    console.error('Error during self-reflection:', error);
    return { isConfident: true, concerns: [], recommendation: 'keep_classification' };
  }
}

/**
 * Validate the outcome after execution
 */
export async function validateOutcome(
  decisionId: string,
  ctx: {
    userId: string;
    executionSuccess: boolean;
    userFeedback?: string;
    actualOutcome?: any;
    expectedOutcome?: any;
    symptoms?: string[];
  }
): Promise<{ wasCorrect: boolean; triggeredLearning: boolean }> {
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/decision-validator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'validate_outcome',
          outcomeData: {
            decisionId,
            userId: ctx.userId,
            executionFailed: !ctx.executionSuccess,
            userFeedback: ctx.userFeedback,
            detectedBy: 'outcome_analysis',
            detectionConfidence: 0.8,
            errorSeverity: ctx.executionSuccess ? 'low' : 'medium',
            actualOutcome: ctx.actualOutcome,
            expectedOutcome: ctx.expectedOutcome,
            symptoms: ctx.symptoms || []
          }
        })
      }
    );

    if (!response.ok) {
      console.warn('Failed to validate outcome');
      return { wasCorrect: true, triggeredLearning: false };
    }

    const result = await response.json();
    console.log('✅ Outcome validated:', result.wasCorrect ? 'Correct' : 'Learning triggered');
    
    return {
      wasCorrect: result.wasCorrect,
      triggeredLearning: !result.wasCorrect
    };
  } catch (error) {
    console.error('Error validating outcome:', error);
    return { wasCorrect: true, triggeredLearning: false };
  }
}

/**
 * Get AGI confidence check for a classification
 */
export async function getConfidenceCheck(
  classificationType: string,
  keywords: string[],
  context: any
): Promise<number> {
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/decision-validator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'check_confidence',
          decisionData: {
            classificationType,
            keywords,
            context
          }
        })
      }
    );

    if (!response.ok) {
      return 0.5; // Default confidence
    }

    const result = await response.json();
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('⚠️ Known misclassification patterns detected:', result.warnings);
    }

    return result.confidence;
  } catch (error) {
    console.error('Error checking confidence:', error);
    return 0.5;
  }
}