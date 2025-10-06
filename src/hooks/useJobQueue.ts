import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type JobPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface QueueJob {
  id: string;
  status: string;
  priority: number;
  created_at: string;
  input_data: any;
}

/**
 * Hook for managing job queue with priorities
 * Allows setting priorities and viewing queue status
 */
export const useJobQueue = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create a new job with specified priority
   */
  const createJob = useCallback(async (
    requestData: any,
    priority: JobPriority = 5
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return null;
      }

      const { data, error } = await supabase
        .from('ai_generation_jobs')
        .insert({
          user_id: user.id,
          input_data: requestData,
          status: 'queued',
          progress: 0,
          job_type: 'orchestration'
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      toast.success(`Job queued with priority ${priority}`);
      return data.id;
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update job priority
   */
  const updatePriority = useCallback(async (
    jobId: string,
    priority: JobPriority
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_generation_jobs')
        .update({ updated_at: new Date().toISOString() } as any)
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`Priority updated to ${priority}`);
      return true;
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
      return false;
    }
  }, []);

  /**
   * Get current queue status
   */
  const getQueueStatus = useCallback(async (): Promise<QueueJob[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_generation_jobs')
        .select('id, status, created_at, input_data')
        .eq('user_id', user.id)
        .in('status', ['queued', 'processing'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(job => ({
        ...job,
        priority: 5
      })) as QueueJob[];
    } catch (error) {
      console.error('Error fetching queue status:', error);
      return [];
    }
  }, []);

  /**
   * Cancel a queued or processing job
   */
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel job');
      return false;
    }
  }, []);

  return {
    createJob,
    updatePriority,
    getQueueStatus,
    cancelJob,
    isLoading
  };
};
