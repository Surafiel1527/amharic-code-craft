/**
 * User Experience Monitoring System
 * 
 * Tracks user behavior signals to detect frustration and quality issues
 * Enables proactive intervention when the platform detects user struggles
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createLogger } from './logger.ts';

const logger = createLogger({ module: 'ux-monitoring' });

export interface UXSignal {
  user_id: string;
  project_id?: string;
  generation_id?: string;
  signal_type: 'quick_question' | 'quick_edit' | 'immediate_regeneration' | 
                'fix_request' | 'error_report' | 'download' | 'session_length';
  signal_value: number;
  signal_data: Record<string, any>;
  quality_correlation?: number;
  timestamp: string;
}

export interface UXQualityCorrelation {
  generation_id: string;
  quality_score: number;
  ux_signals: UXSignal[];
  frustration_score: number; // 0-100
  intervention_triggered: boolean;
  intervention_type?: 'proactive_fix' | 'clarification_prompt' | 'quality_review';
}

/**
 * Track a user experience signal
 */
export async function trackUXSignal(
  supabase: SupabaseClient,
  signal: Omit<UXSignal, 'timestamp'>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ux_quality_signals')
      .insert({
        ...signal,
        timestamp: new Date().toISOString()
      });

    if (error) {
      logger.warn('Failed to track UX signal', { error: error.message });
    } else {
      logger.debug('UX signal tracked', { type: signal.signal_type });
    }
  } catch (error) {
    logger.error('Error tracking UX signal', { signal }, error as Error);
  }
}

/**
 * Calculate frustration score based on recent signals
 */
export async function calculateFrustrationScore(
  supabase: SupabaseClient,
  userId: string,
  generationId?: string,
  timeWindowMinutes: number = 10
): Promise<number> {
  try {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

    const query = supabase
      .from('ux_quality_signals')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', since);

    if (generationId) {
      query.eq('generation_id', generationId);
    }

    const { data: signals, error } = await query;

    if (error || !signals) {
      logger.warn('Failed to fetch UX signals for frustration calculation', { error: error?.message });
      return 0;
    }

    let frustrationScore = 0;

    // Quick questions after generation = +20 frustration
    const quickQuestions = signals.filter(s => 
      s.signal_type === 'quick_question' && s.signal_value < 60
    ).length;
    frustrationScore += quickQuestions * 20;

    // Immediate regeneration = +30 frustration
    const immediateRegenerations = signals.filter(s => 
      s.signal_type === 'immediate_regeneration' && s.signal_value < 30
    ).length;
    frustrationScore += immediateRegenerations * 30;

    // Error reports = +25 frustration
    const errorReports = signals.filter(s => s.signal_type === 'error_report').length;
    frustrationScore += errorReports * 25;

    // Multiple fix requests = +15 frustration each
    const fixRequests = signals.filter(s => s.signal_type === 'fix_request').length;
    frustrationScore += fixRequests * 15;

    // Quick edits (user manually fixing) = +10 frustration
    const quickEdits = signals.filter(s => 
      s.signal_type === 'quick_edit' && s.signal_value < 120
    ).length;
    frustrationScore += quickEdits * 10;

    return Math.min(100, frustrationScore);

  } catch (error) {
    logger.error('Error calculating frustration score', { userId, generationId }, error as Error);
    return 0;
  }
}

/**
 * Correlate UX signals with quality metrics
 */
export async function correlateUXWithQuality(
  supabase: SupabaseClient,
  generationId: string
): Promise<UXQualityCorrelation | null> {
  try {
    // Get quality metrics
    const { data: qualityMetric, error: qualityError } = await supabase
      .from('generation_quality_metrics')
      .select('*')
      .eq('generation_id', generationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qualityError || !qualityMetric) {
      logger.warn('No quality metrics found for generation', { generationId });
      return null;
    }

    // Get UX signals for this generation
    const { data: signals, error: signalsError } = await supabase
      .from('ux_quality_signals')
      .select('*')
      .eq('generation_id', generationId)
      .order('timestamp', { ascending: true });

    if (signalsError) {
      logger.warn('Failed to fetch UX signals', { error: signalsError.message });
      return null;
    }

    const uxSignals = signals || [];
    
    // Calculate frustration score
    const userId = qualityMetric.user_id;
    const frustrationScore = await calculateFrustrationScore(
      supabase, 
      userId, 
      generationId, 
      30 // 30 minute window
    );

    // Determine if intervention is needed
    const intervention_triggered = 
      frustrationScore > 50 || 
      (qualityMetric.quality_score < 70 && frustrationScore > 30);

    let intervention_type: UXQualityCorrelation['intervention_type'];
    if (intervention_triggered) {
      if (frustrationScore > 70) {
        intervention_type = 'proactive_fix';
      } else if (qualityMetric.quality_score < 60) {
        intervention_type = 'quality_review';
      } else {
        intervention_type = 'clarification_prompt';
      }
    }

    const correlation: UXQualityCorrelation = {
      generation_id: generationId,
      quality_score: qualityMetric.quality_score,
      ux_signals: uxSignals,
      frustration_score: frustrationScore,
      intervention_triggered,
      intervention_type
    };

    logger.info('UX-Quality correlation calculated', {
      generationId,
      qualityScore: qualityMetric.quality_score,
      frustrationScore,
      interventionNeeded: intervention_triggered
    });

    return correlation;

  } catch (error) {
    logger.error('Error correlating UX with quality', { generationId }, error as Error);
    return null;
  }
}

/**
 * Trigger proactive intervention based on UX signals
 */
export async function triggerProactiveIntervention(
  supabase: SupabaseClient,
  correlation: UXQualityCorrelation,
  broadcast: (event: string, data: any) => Promise<void>
): Promise<void> {
  if (!correlation.intervention_triggered) {
    return;
  }

  logger.info('Triggering proactive intervention', {
    type: correlation.intervention_type,
    frustration: correlation.frustration_score,
    quality: correlation.quality_score
  });

  try {
    if (correlation.intervention_type === 'proactive_fix') {
      // High frustration - automatically investigate and fix
      await broadcast('ux:proactive_intervention', {
        type: 'auto_fix',
        message: '🤖 I noticed you might be having issues. Let me investigate and fix this automatically...',
        frustrationScore: correlation.frustration_score,
        qualityScore: correlation.quality_score
      });

      // TODO: Trigger autonomous healing engine
      
    } else if (correlation.intervention_type === 'quality_review') {
      // Low quality detected - offer to regenerate
      await broadcast('ux:proactive_intervention', {
        type: 'quality_review',
        message: '🔍 I detected some quality issues. Would you like me to review and improve the generated code?',
        frustrationScore: correlation.frustration_score,
        qualityScore: correlation.quality_score
      });

    } else if (correlation.intervention_type === 'clarification_prompt') {
      // Moderate frustration - ask for feedback
      await broadcast('ux:proactive_intervention', {
        type: 'clarification',
        message: '💬 Is everything working as expected? Let me know if you need any adjustments.',
        frustrationScore: correlation.frustration_score,
        qualityScore: correlation.quality_score
      });
    }

  } catch (error) {
    logger.error('Error triggering proactive intervention', { correlation }, error as Error);
  }
}

/**
 * Analyze user session for patterns
 */
export async function analyzeUserSession(
  supabase: SupabaseClient,
  userId: string,
  sessionDurationMinutes: number = 30
): Promise<{
  totalSignals: number;
  frustratedSessions: number;
  averageFrustration: number;
  commonIssues: string[];
}> {
  try {
    const since = new Date(Date.now() - sessionDurationMinutes * 60 * 1000).toISOString();

    const { data: signals, error } = await supabase
      .from('ux_quality_signals')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', since);

    if (error || !signals) {
      logger.warn('Failed to analyze user session', { error: error?.message });
      return {
        totalSignals: 0,
        frustratedSessions: 0,
        averageFrustration: 0,
        commonIssues: []
      };
    }

    // Group by generation_id to get sessions
    const sessionMap = new Map<string, UXSignal[]>();
    signals.forEach(signal => {
      const genId = signal.generation_id || 'no-gen';
      if (!sessionMap.has(genId)) {
        sessionMap.set(genId, []);
      }
      sessionMap.get(genId)!.push(signal);
    });

    // Calculate frustration for each session
    let totalFrustration = 0;
    let frustratedCount = 0;
    const issues: string[] = [];

    for (const [genId, sessionSignals] of sessionMap) {
      // Simple frustration calculation
      const errorReports = sessionSignals.filter(s => s.signal_type === 'error_report').length;
      const fixRequests = sessionSignals.filter(s => s.signal_type === 'fix_request').length;
      const quickQuestions = sessionSignals.filter(s => s.signal_type === 'quick_question').length;

      const frustration = (errorReports * 30) + (fixRequests * 20) + (quickQuestions * 15);
      totalFrustration += frustration;

      if (frustration > 50) {
        frustratedCount++;
      }

      // Collect common issues
      sessionSignals.forEach(s => {
        if (s.signal_data?.issue_type) {
          issues.push(s.signal_data.issue_type);
        }
      });
    }

    const avgFrustration = sessionMap.size > 0 ? totalFrustration / sessionMap.size : 0;

    // Count common issues
    const issueCount = issues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      totalSignals: signals.length,
      frustratedSessions: frustratedCount,
      averageFrustration: Math.round(avgFrustration),
      commonIssues
    };

  } catch (error) {
    logger.error('Error analyzing user session', { userId }, error as Error);
    return {
      totalSignals: 0,
      frustratedSessions: 0,
      averageFrustration: 0,
      commonIssues: []
    };
  }
}
