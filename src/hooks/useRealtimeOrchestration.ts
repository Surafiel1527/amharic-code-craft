import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface JobUpdate {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_step: string;
  phases: any[];
  stream_updates: string[];
  estimated_completion_at: string | null;
  error_message: string | null;
}

interface UseRealtimeOrchestrationOptions {
  jobId: string | null;
  onProgress?: (update: JobUpdate) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for real-time orchestration progress tracking
 * Provides live updates via Supabase Realtime
 */
export const useRealtimeOrchestration = ({
  jobId,
  onProgress,
  onComplete,
  onError
}: UseRealtimeOrchestrationOptions) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [jobData, setJobData] = useState<JobUpdate | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribe = useCallback(async () => {
    if (!jobId || isSubscribed) return;

    console.log('🔄 Subscribing to real-time updates for job:', jobId);

    const newChannel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_generation_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('📡 Real-time update received:', payload);
          const update = payload.new as JobUpdate;
          
          setJobData(update);
          onProgress?.(update);

          // Handle completion
          if (update.status === 'completed') {
            console.log('✅ Job completed');
            onComplete?.(update);
            unsubscribe();
          }

          // Handle errors
          if (update.status === 'failed') {
            console.error('❌ Job failed:', update.error_message);
            onError?.(update.error_message || 'Job failed');
            unsubscribe();
          }

          // Handle cancellation
          if (update.status === 'cancelled') {
            console.log('🛑 Job cancelled');
            onError?.('Job was cancelled');
            unsubscribe();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        }
      });

    setChannel(newChannel);
  }, [jobId, isSubscribed, onProgress, onComplete, onError]);

  const unsubscribe = useCallback(() => {
    if (channel) {
      console.log('🔌 Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
      setChannel(null);
      setIsSubscribed(false);
    }
  }, [channel]);

  // Auto-subscribe when jobId changes
  useEffect(() => {
    if (jobId) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [jobId]);

  return {
    jobData,
    isSubscribed,
    subscribe,
    unsubscribe
  };
};
