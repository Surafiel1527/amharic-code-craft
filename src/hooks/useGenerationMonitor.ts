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

export function useGenerationMonitor(conversationId?: string): UseGenerationMonitorResult {
  const [currentDecision, setCurrentDecision] = useState<any | null>(null);
  const [currentCorrection, setCurrentCorrection] = useState<any | null>(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'failed' | 'correcting'>('idle');
  const [events, setEvents] = useState<GenerationEvent[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to generation events channel
    const channel = supabase.channel(`generation:${conversationId}`);

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
            setCurrentDecision(payload.decision);
            setExecutionStatus('idle');
            break;

          case 'correction':
            setCurrentCorrection({
              from: payload.originalClassification,
              to: payload.correctedClassification,
              timestamp: payload.timestamp
            });
            break;

          case 'clarification_needed':
            setNeedsClarification(true);
            setClarificationQuestions(payload.questions || []);
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
            setExecutionStatus('failed');
            break;

          case 'correction_applied':
            setExecutionStatus('correcting');
            setCurrentCorrection({
              from: 'error',
              to: 'corrected',
              timestamp: payload.timestamp
            });
            break;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Reset when conversation changes
  useEffect(() => {
    setCurrentDecision(null);
    setCurrentCorrection(null);
    setNeedsClarification(false);
    setClarificationQuestions([]);
    setIsExecuting(false);
    setExecutionStatus('idle');
    setEvents([]);
  }, [conversationId]);

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
