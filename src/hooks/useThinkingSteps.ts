import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ThinkingStep {
  id: string;
  operation: string;
  detail: string;
  status: 'pending' | 'active' | 'complete';
  duration?: number;
  timestamp: string;
}

interface UseThinkingStepsResult {
  steps: ThinkingStep[];
  isThinking: boolean;
  clearSteps: () => void;
}

export function useThinkingSteps(projectId?: string): UseThinkingStepsResult {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase.channel(`ai-status-${projectId}`);

    channel
      .on('broadcast', { event: 'thinking_step' }, ({ payload }) => {
        const step: ThinkingStep = {
          id: `${payload.operation}_${payload.timestamp}`,
          operation: payload.operation,
          detail: payload.detail,
          status: payload.status,
          duration: payload.duration,
          timestamp: payload.timestamp
        };

        setSteps(prev => {
          // If step exists, update it
          const existingIndex = prev.findIndex(s => s.operation === payload.operation && s.status !== 'complete');
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = step;
            return updated;
          }
          // Otherwise add new step
          return [...prev, step];
        });

        setIsThinking(payload.status === 'active');
      })
      .on('broadcast', { event: 'generation_event' }, ({ payload }) => {
        // When generation completes, keep steps visible for a while
        if (payload.type === 'execution_complete') {
          console.log('✅ Generation complete, keeping thinking steps visible');
          // Don't immediately stop - let them see the final state
          setTimeout(() => {
            setIsThinking(false);
          }, 6000); // Keep visible for 6 seconds
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const clearSteps = () => {
    setSteps([]);
    setIsThinking(false);
  };

  return {
    steps,
    isThinking,
    clearSteps
  };
}
