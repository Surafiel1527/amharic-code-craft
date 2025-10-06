import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, CheckCircle, XCircle, Clock, X, ChevronDown } from 'lucide-react';
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const PHASE_STEPS = {
  'database_setup': ['Creating tables', 'Setting up relationships', 'Configuring RLS policies'],
  'authentication': ['Setting up auth', 'Creating user profiles', 'Configuring permissions'],
  'code_generation': ['Analyzing requirements', 'Generating components', 'Optimizing code'],
  'file_operations': ['Creating files', 'Writing code', 'Organizing structure'],
  'default': ['Initializing', 'Processing', 'Finalizing']
};

export function BackgroundJobsIndicator() {
  const { user } = useAuth();
  const { activeJobs, completedJobs, dismissCompleted, hasActiveJobs } = useBackgroundJobs(user?.id);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const toggleExpanded = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await supabase
        .from('ai_generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);
      
      toast.success('Job cancelled successfully');
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel job');
    }
  };

  const getPhaseSteps = (jobType: string) => {
    return PHASE_STEPS[jobType as keyof typeof PHASE_STEPS] || PHASE_STEPS.default;
  };

  const getCurrentPhaseIndex = (progress: number, totalSteps: number) => {
    return Math.min(Math.floor((progress / 100) * totalSteps), totalSteps - 1);
  };

  if (!hasActiveJobs && completedJobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Active Jobs */}
      {activeJobs.map(job => {
        const steps = getPhaseSteps(job.job_type);
        const currentPhaseIndex = getCurrentPhaseIndex(job.progress, steps.length);
        const isExpanded = expandedJobs.has(job.id);

        return (
          <Collapsible
            key={job.id}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(job.id)}
          >
            <Card className="p-3 bg-background border-primary/20 shadow-lg">
              <div className="flex items-start gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                      >
                        <span className="text-sm font-medium">Processing in Background</span>
                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {job.progress}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelJob(job.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {steps[currentPhaseIndex]}
                  </p>

                  <CollapsibleContent>
                    <div className="space-y-1.5 mb-2">
                      {steps.map((step, index) => {
                        const isCompleted = index < currentPhaseIndex;
                        const isCurrent = index === currentPhaseIndex;
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            {isCompleted ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : isCurrent ? (
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            ) : (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={`text-xs ${
                              isCompleted ? 'text-green-500 line-through' : 
                              isCurrent ? 'text-primary font-medium' : 
                              'text-muted-foreground'
                            }`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>

                  {job.progress > 0 && (
                    <div className="mt-2 w-full bg-secondary rounded-full h-1">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>You can safely close this window</span>
                  </div>
                </div>
              </div>
            </Card>
          </Collapsible>
        );
      })}

      {/* Completed Jobs */}
      {completedJobs.map(job => (
        <Card key={job.id} className="p-3 bg-background border-green-500/20 shadow-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium">Work Complete!</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissCompleted(job.id)}
                  className="h-6 text-xs"
                >
                  Dismiss
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {job.job_type} finished successfully
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
