import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GenerationEvent {
  type: 'decision' | 'correction' | 'clarification_needed' | 'execution_start' | 'execution_complete' | 'execution_failed' | 'correction_applied';
  data: any;
  timestamp: string;
}

interface UseGenerationMonitorResult {
  currentDecision: any | null;
  currentCorrection: any | null;
  needsClarification: boolean;
  clarificationQuestions: string[];
  isExecuting: boolean;
  executionStatus: 'idle' | 'running' | 'success' | 'failed' | 'correcting';
  events: GenerationEvent[];
}

export function useGenerationMonitor(projectId?: string): UseGenerationMonitorResult {
  const [currentDecision, setCurrentDecision] = useState<any | null>(null);
  const [currentCorrection, setCurrentCorrection] = useState<any | null>(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'failed' | 'correcting'>('idle');
  const [events, setEvents] = useState<GenerationEvent[]>([]);

  useEffect(() => {
    if (!projectId) return;

    // Subscribe to generation events channel (matches backend channel name)
    const channel = supabase.channel(`ai-status-${projectId}`);

      channel
      .on('broadcast', { event: 'generation_event' }, ({ payload }) => {
        const event: GenerationEvent = {
          type: payload.type,
          data: payload,
          timestamp: payload.timestamp
        };

        setEvents(prev => [...prev, event]);

        // Handle different event types
        switch (payload.type) {
          case 'decision':
            setCurrentDecision({
              type: payload.decision?.classification,
              classified_as: payload.decision?.classification,
              confidence: payload.decision?.confidence || payload.confidence,
              intent: payload.decision?.intent,
              reasoning: payload.message || payload.decision?.reflectionReason || '',
              userRequest: payload.decision?.userRequest || '',
              reflectionReason: payload.decision?.reflectionReason,
              timestamp: payload.timestamp
            });
            setExecutionStatus('idle');
            break;

          case 'correction':
          case 'correction_applied':
            setCurrentCorrection({
              from: payload.originalClassification || payload.correction?.from,
              to: payload.correctedClassification || payload.correction?.to,
              reasoning: payload.reasoning || payload.correction?.reasoning || payload.message || '',
              confidence: payload.confidence || payload.correction?.confidence,
              timestamp: payload.timestamp
            });
            // Update decision with corrected classification
            if (payload.correctedClassification) {
              setCurrentDecision(prev => prev ? {
                ...prev,
                type: payload.correctedClassification,
                classified_as: payload.correctedClassification,
                confidence: payload.confidence || prev.confidence,
                reasoning: payload.reasoning || prev.reasoning
              } : null);
            }
            if (payload.type === 'correction_applied') {
              setExecutionStatus('correcting');
            }
            break;

          case 'clarification_needed':
            setNeedsClarification(true);
            setClarificationQuestions(payload.questions || []);
            setCurrentDecision({
              type: payload.decision?.classification,
              classified_as: payload.decision?.classification,
              confidence: payload.confidence || payload.decision?.confidence,
              intent: payload.decision?.intent,
              reasoning: payload.message || '',
              userRequest: payload.decision?.userRequest || '',
              timestamp: payload.timestamp
            });
            setExecutionStatus('idle');
            break;

          case 'execution_start':
            setIsExecuting(true);
            setExecutionStatus('running');
            setNeedsClarification(false);
            break;

          case 'execution_complete':
            setIsExecuting(false);
            setExecutionStatus('success');
            break;

          case 'execution_failed':
            setIsExecuting(false);
            setExecutionStatus('failed');
            break;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Reset when project changes
  useEffect(() => {
    setCurrentDecision(null);
    setCurrentCorrection(null);
    setNeedsClarification(false);
    setClarificationQuestions([]);
    setIsExecuting(false);
    setExecutionStatus('idle');
    setEvents([]);
  }, [projectId]);

  return {
    currentDecision,
    currentCorrection,
    needsClarification,
    clarificationQuestions,
    isExecuting,
    executionStatus,
    events
  };
}
