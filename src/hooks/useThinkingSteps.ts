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

export function useThinkingSteps(conversationId?: string): UseThinkingStepsResult {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load historical steps from database on mount by conversation
  useEffect(() => {
    if (!conversationId || loaded) return;

    const loadHistoricalSteps = async () => {
      try {
        const { data, error } = await supabase
          .from('thinking_steps')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('timestamp', { ascending: true });

        if (error) {
          console.warn('Failed to load historical thinking steps:', error);
          return;
        }

        if (data && data.length > 0) {
          const historicalSteps: ThinkingStep[] = data.map((row: any) => ({
            id: `${row.operation}_${row.timestamp}`,
            operation: row.operation,
            detail: row.detail,
            status: row.status,
            duration: row.duration,
            timestamp: row.timestamp
          }));
          
          console.log(`📚 Loaded ${historicalSteps.length} historical thinking steps for conversation`);
          setSteps(historicalSteps);
          setLoaded(true);
        }
      } catch (err) {
        console.error('Error loading historical steps:', err);
      }
    };

    loadHistoricalSteps();
  }, [conversationId, loaded]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`ai-status-${conversationId}`);

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
        // When generation completes, keep steps permanent - don't hide them
        if (payload.type === 'execution_complete') {
          console.log('✅ Generation complete, keeping thinking steps permanent');
          // Keep thinking false to stop spinner, but steps remain visible
          setIsThinking(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
