/**
 * UX-Pattern Integration Layer
 * Connects UX frustration data with pattern learning confidence
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createLogger } from './logger.ts';

const logger = createLogger('ux-pattern-integration');

interface PatternConfidenceUpdate {
  pattern_id: string;
  old_confidence: number;
  new_confidence: number;
  reason: string;
  frustration_score: number;
}

interface InterventionTrigger {
  pattern_id: string;
  pattern_name: string;
  frustration_score: number;
  failure_count: number;
  suggested_alternative?: string;
}

/**
 * Update pattern confidence based on UX frustration
 */
export async function updatePatternConfidenceFromUX(
  supabase: SupabaseClient,
  patternId: string,
  frustrationScore: number,
  generationId: string
): Promise<PatternConfidenceUpdate | null> {
  try {
    // Get current pattern
    const { data: pattern, error: fetchError } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('id', patternId)
      .single();

    if (fetchError || !pattern) {
      logger.error('Pattern not found', { patternId }, fetchError);
      return null;
    }

    const oldConfidence = pattern.confidence_score;
    let newConfidence = oldConfidence;
    let reason = '';

    // Adjust confidence based on frustration
    if (frustrationScore > 70) {
      // High frustration - significantly lower confidence
      newConfidence = Math.max(0, oldConfidence - 0.15);
      reason = 'High user frustration detected';
    } else if (frustrationScore > 50) {
      // Moderate frustration - lower confidence
      newConfidence = Math.max(0, oldConfidence - 0.08);
      reason = 'Moderate user frustration detected';
    } else if (frustrationScore < 30) {
      // Low frustration - boost confidence
      newConfidence = Math.min(1.0, oldConfidence + 0.05);
      reason = 'Low frustration - positive user experience';
    }

    // Update pattern confidence
    const { error: updateError } = await supabase
      .from('learned_patterns')
      .update({
        confidence_score: newConfidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', patternId);

    if (updateError) {
      logger.error('Failed to update pattern confidence', { patternId }, updateError);
      return null;
    }

    // Log the confidence update
    await supabase.from('pattern_confidence_history').insert({
      pattern_id: patternId,
      old_confidence: oldConfidence,
      new_confidence: newConfidence,
      reason,
      frustration_score: frustrationScore,
      generation_id: generationId
    });

    logger.info('Pattern confidence updated', {
      patternId,
      oldConfidence,
      newConfidence,
      frustrationScore
    });

    return {
      pattern_id: patternId,
      old_confidence: oldConfidence,
      new_confidence: newConfidence,
      reason,
      frustration_score: frustrationScore
    };

  } catch (error) {
    logger.error('Error updating pattern confidence from UX', { patternId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Process UX correlation and update all related patterns
 */
export async function processUXCorrelation(
  supabase: SupabaseClient,
  correlationId: string
): Promise<PatternConfidenceUpdate[]> {
  try {
    const updates: PatternConfidenceUpdate[] = [];

    // Get correlation data
    const { data: correlation, error: corrError } = await supabase
      .from('ux_quality_correlations')
      .select('*')
      .eq('id', correlationId)
      .single();

    if (corrError || !correlation) {
      logger.error('Correlation not found', { correlationId }, corrError);
      return updates;
    }

    // Find patterns used in this generation
    const { data: patterns, error: patternsError } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('last_used_generation_id', correlation.generation_id);

    if (patternsError || !patterns) {
      logger.warn('No patterns found for generation', { generationId: correlation.generation_id });
      return updates;
    }

    // Update each pattern's confidence
    for (const pattern of patterns) {
      const update = await updatePatternConfidenceFromUX(
        supabase,
        pattern.id,
        correlation.frustration_score,
        correlation.generation_id
      );
      
      if (update) {
        updates.push(update);
      }
    }

    logger.info('Processed UX correlation', {
      correlationId,
      patternsUpdated: updates.length,
      frustrationScore: correlation.frustration_score
    });

    return updates;

  } catch (error) {
    logger.error('Error processing UX correlation', { correlationId, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Detect patterns that need intervention
 */
export async function detectPatternInterventions(
  supabase: SupabaseClient,
  userId: string
): Promise<InterventionTrigger[]> {
  try {
    const interventions: InterventionTrigger[] = [];

    // Get patterns with low confidence and recent failures
    const { data: patterns, error } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('user_id', userId)
      .lt('confidence_score', 0.4)
      .gt('failure_count', 2)
      .order('confidence_score', { ascending: true })
      .limit(5);

    if (error) {
      logger.error('Error fetching patterns for intervention', { userId }, error);
      return interventions;
    }

    // Check recent frustration for each pattern
    for (const pattern of patterns || []) {
      const { data: recentCorrelations } = await supabase
        .from('ux_quality_correlations')
        .select('frustration_score')
        .eq('generation_id', pattern.last_used_generation_id)
        .order('created_at', { ascending: false })
        .limit(3);

      const avgFrustration = recentCorrelations
        ? recentCorrelations.reduce((sum, c) => sum + c.frustration_score, 0) / recentCorrelations.length
        : 0;

      if (avgFrustration > 50) {
        // Find alternative pattern
        const { data: alternative } = await supabase
          .from('learned_patterns')
          .select('pattern_name')
          .eq('pattern_category', pattern.pattern_category)
          .gt('confidence_score', 0.7)
          .neq('id', pattern.id)
          .order('confidence_score', { ascending: false })
          .limit(1)
          .single();

        interventions.push({
          pattern_id: pattern.id,
          pattern_name: pattern.pattern_name,
          frustration_score: avgFrustration,
          failure_count: pattern.failure_count,
          suggested_alternative: alternative?.pattern_name
        });
      }
    }

    logger.info('Pattern interventions detected', {
      userId,
      interventionCount: interventions.length
    });

    return interventions;

  } catch (error) {
    logger.error('Error detecting pattern interventions', { userId, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Automatic pattern degradation based on consistent poor performance
 */
export async function degradeUnderperformingPatterns(
  supabase: SupabaseClient
): Promise<number> {
  try {
    // Find patterns with:
    // - Low confidence (< 0.3)
    // - High failure rate (> 70%)
    // - Recent usage (within 7 days)
    const { data: patterns, error } = await supabase
      .from('learned_patterns')
      .select('*')
      .lt('confidence_score', 0.3)
      .gt('failure_count', 5)
      .gte('last_used_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !patterns) {
      logger.error('Error fetching underperforming patterns', {}, error);
      return 0;
    }

    let degradedCount = 0;

    for (const pattern of patterns) {
      const failureRate = pattern.failure_count / (pattern.success_count + pattern.failure_count);
      
      if (failureRate > 0.7) {
        // Mark as deprecated or significantly lower confidence
        const { error: updateError } = await supabase
          .from('learned_patterns')
          .update({
            confidence_score: 0.1,
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', pattern.id);

        if (!updateError) {
          degradedCount++;
          
          // Log degradation
          await supabase.from('pattern_degradation_log').insert({
            pattern_id: pattern.id,
            old_confidence: pattern.confidence_score,
            new_confidence: 0.1,
            reason: `High failure rate (${(failureRate * 100).toFixed(1)}%)`,
            failure_count: pattern.failure_count,
            success_count: pattern.success_count
          });
        }
      }
    }

    logger.info('Degraded underperforming patterns', { count: degradedCount });
    return degradedCount;

  } catch (error) {
    logger.error('Error degrading patterns', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/**
 * Run complete UX-Pattern integration cycle
 */
export async function runUXPatternIntegrationCycle(
  supabase: SupabaseClient
): Promise<{
  correlations_processed: number;
  patterns_updated: number;
  interventions_detected: number;
  patterns_degraded: number;
}> {
  try {
    logger.info('Starting UX-Pattern integration cycle');

    // Get recent unprocessed correlations
    const { data: correlations, error: corrError } = await supabase
      .from('ux_quality_correlations')
      .select('id, user_id')
      .is('processed_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (corrError) {
      logger.error('Error fetching correlations', {}, corrError);
      return { correlations_processed: 0, patterns_updated: 0, interventions_detected: 0, patterns_degraded: 0 };
    }

    let totalUpdates = 0;
    const processedUserIds = new Set<string>();

    // Process each correlation
    for (const correlation of correlations || []) {
      const updates = await processUXCorrelation(supabase, correlation.id);
      totalUpdates += updates.length;
      processedUserIds.add(correlation.user_id);

      // Mark as processed
      await supabase
        .from('ux_quality_correlations')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', correlation.id);
    }

    // Detect interventions for active users
    let totalInterventions = 0;
    for (const userId of processedUserIds) {
      const interventions = await detectPatternInterventions(supabase, userId);
      totalInterventions += interventions.length;

      // Create intervention notifications
      for (const intervention of interventions) {
        await supabase.from('pattern_interventions').insert({
          user_id: userId,
          pattern_id: intervention.pattern_id,
          pattern_name: intervention.pattern_name,
          frustration_score: intervention.frustration_score,
          failure_count: intervention.failure_count,
          suggested_alternative: intervention.suggested_alternative,
          status: 'pending'
        });
      }
    }

    // Degrade consistently underperforming patterns
    const degradedCount = await degradeUnderperformingPatterns(supabase);

    logger.info('UX-Pattern integration cycle completed', {
      correlationsProcessed: correlations?.length || 0,
      patternsUpdated: totalUpdates,
      interventionsDetected: totalInterventions,
      patternsDegraded: degradedCount
    });

    return {
      correlations_processed: correlations?.length || 0,
      patterns_updated: totalUpdates,
      interventions_detected: totalInterventions,
      patterns_degraded: degradedCount
    };

  } catch (error) {
    logger.error('Error in UX-Pattern integration cycle', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
