import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type BackgroundJob = Database['public']['Tables']['ai_generation_jobs']['Row'];

export function useBackgroundJobs(userId?: string) {
  const [activeJobs, setActiveJobs] = useState<BackgroundJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<BackgroundJob[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial jobs
    const fetchJobs = async () => {
      const { data: active } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['queued', 'processing'])
        .order('created_at', { ascending: false });

      if (active) {
        setActiveJobs(active);
        
        // Show toast for resumed jobs
        active.forEach(job => {
          if (job.status === 'running') {
            toast.info('Resuming Previous Work', {
              description: `${job.current_step || 'Processing your request...'}`,
              duration: 5000
            });
          }
        });
      }
    };

    fetchJobs();

    // Subscribe to job updates
    const channel = supabase
      .channel('user-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_generation_jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const job = payload.new as BackgroundJob;

          if (job.status === 'completed') {
            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            setCompletedJobs(prev => [job, ...prev]);
            
            toast.success('Work Complete!', {
              description: `${job.job_type} finished successfully`,
              duration: 8000
            });
          } else if (job.status === 'cancelled') {
            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            
            toast.info('Job Cancelled', {
              description: 'The background job was cancelled',
              duration: 5000
            });
          } else if (job.status === 'running') {
            setActiveJobs(prev => {
              const existing = prev.find(j => j.id === job.id);
              if (existing) {
                return prev.map(j => j.id === job.id ? job : j);
              }
              return [job, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismissCompleted = (jobId: string) => {
    setCompletedJobs(prev => prev.filter(j => j.id !== jobId));
  };

  return {
    activeJobs,
    completedJobs,
    dismissCompleted,
    hasActiveJobs: activeJobs.length > 0
  };
}
