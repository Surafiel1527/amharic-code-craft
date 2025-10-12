/**
 * Learning Integration Module
 * Connects orchestrator to learning engines
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function applyLearnedFixes(
  supabase: SupabaseClient,
  errorSignature: string,
  errorContext: any
): Promise<{ applied: boolean; fix?: any; confidence?: number }> {
  try {
    // Call self-learning engine to check for learned fixes
    const { data, error } = await supabase.functions.invoke('self-learning-engine', {
      body: { 
        action: 'apply_learned_fix',
        errorSignature,
        errorContext 
      }
    });
    
    if (error) {
      console.error('❌ Self-learning engine error:', error);
      return { applied: false };
    }
    
    if (data?.fixApplied) {
      console.log('✅ Applied learned fix:', data.fix);
      return { 
        applied: true, 
        fix: data.fix,
        confidence: data.confidence 
      };
    }
    
    return { applied: false };
  } catch (error) {
    console.error('❌ Error applying learned fixes:', error);
    return { applied: false };
  }
}

export async function recordGenerationOutcome(
  supabase: SupabaseClient,
  data: {
    decisionId?: string;
    userId: string;
    success: boolean;
    userFeedback?: number;
    actualOutput?: any;
    expectedOutput?: any;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    // Validate the outcome for AGI learning
    await supabase.functions.invoke('decision-validator', {
      body: {
        action: 'validate_outcome',
        decisionId: data.decisionId,
        executionSuccess: data.success,
        userFeedback: data.userFeedback,
        actualOutcome: data.actualOutput,
        expectedOutcome: data.expectedOutput
      }
    });
    
    // Store in generation analytics for pattern learning
    await supabase
      .from('generation_analytics')
      .insert({
        user_id: data.userId,
        user_prompt: data.actualOutput?.request || 'Unknown request', // Fixed: added required user_prompt field
        success: data.success,
        error_message: data.errorMessage,
        metadata: {
          decision_id: data.decisionId,
          user_feedback: data.userFeedback
        }
      });
      
    console.log('✅ Recorded generation outcome for learning');
  } catch (error) {
    console.error('❌ Error recording outcome:', error);
  }
}

export async function evolvePatternsAutonomously(
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Trigger pattern evolution
    const { data, error } = await supabase.functions.invoke('self-learning-engine', {
      body: { action: 'evolve_patterns' }
    });
    
    if (error) {
      console.error('❌ Pattern evolution error:', error);
      return;
    }
    
    console.log('✅ Patterns evolved:', data);
  } catch (error) {
    console.error('❌ Error evolving patterns:', error);
  }
}

export async function getDynamicConfidenceThreshold(
  supabase: SupabaseClient,
  classificationType: string
): Promise<number> {
  try {
    // Get learned confidence threshold for this classification type
    const { data } = await supabase
      .from('confidence_scores')
      .select('current_confidence, success_count, failure_count')
      .eq('classification_type', classificationType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
      
    if (data && data.success_count + data.failure_count > 10) {
      // Use learned threshold if we have enough data
      const successRate = data.success_count / (data.success_count + data.failure_count);
      return Math.max(0.6, Math.min(0.9, successRate)); // Keep between 60-90%
    }
    
    // Default threshold
    return 0.7;
  } catch {
    return 0.7; // Default fallback
  }
}
