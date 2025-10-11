import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AGIDecision {
  id: string;
  user_request: string;
  classified_as: string;
  confidence_score: number;
  intent_detected: string;
  reasoning: string;
  created_at: string;
}

interface AGICorrection {
  id: string;
  original_classification: string;
  corrected_classification: string;
  correction_reasoning: string;
  correction_confidence: number;
  was_successful: boolean | null;
  corrected_at: string;
}

interface AGIMetrics {
  total_decisions: number;
  avg_confidence: number;
  total_corrections: number;
  successful_corrections: number;
  learning_patterns: number;
  learning_confidence: number;
}

export function useAGIRealtime(userId?: string) {
  const [currentDecision, setCurrentDecision] = useState<AGIDecision | null>(null);
  const [latestCorrection, setLatestCorrection] = useState<AGICorrection | null>(null);
  const [metrics, setMetrics] = useState<AGIMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Subscribe to decision logs
    const decisionChannel = supabase
      .channel('agi-decisions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'decision_logs',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          setCurrentDecision(payload.new as AGIDecision);
          setIsProcessing(true);
        }
      )
      .subscribe();

    // Subscribe to corrections
    const correctionChannel = supabase
      .channel('agi-corrections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auto_corrections',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          setLatestCorrection(payload.new as AGICorrection);
        }
      )
      .subscribe();

    // Subscribe to job status updates
    const jobChannel = supabase
      .channel('agi-jobs')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_generation_jobs',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          const job = payload.new as any;
          if (job.status === 'completed' || job.status === 'failed') {
            setIsProcessing(false);
          }
        }
      )
      .subscribe();

    // Fetch initial metrics from decision logs
    const fetchMetrics = async () => {
      const { data: decisions } = await supabase
        .from('decision_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: corrections } = await supabase
        .from('auto_corrections')
        .select('*');

      const { data: patterns } = await supabase
        .from('confidence_scores')
        .select('*');

      if (decisions && corrections && patterns) {
        const avgConfidence = decisions.reduce((acc, d) => acc + d.confidence_score, 0) / (decisions.length || 1);
        const successfulCorrections = corrections.filter(c => c.was_successful).length;
        const avgLearningConfidence = patterns.reduce((acc, p) => acc + p.current_confidence, 0) / (patterns.length || 1);

        setMetrics({
          total_decisions: decisions.length,
          avg_confidence: avgConfidence,
          total_corrections: corrections.length,
          successful_corrections: successfulCorrections,
          learning_patterns: patterns.length,
          learning_confidence: avgLearningConfidence
        });
      }
    };

    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 10000); // Update every 10s

    return () => {
      supabase.removeChannel(decisionChannel);
      supabase.removeChannel(correctionChannel);
      supabase.removeChannel(jobChannel);
      clearInterval(metricsInterval);
    };
  }, [userId]);

  return {
    currentDecision,
    latestCorrection,
    metrics,
    isProcessing
  };
}
