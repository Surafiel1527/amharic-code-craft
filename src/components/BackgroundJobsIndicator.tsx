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
  'database_setup': [
    'Setting up database schema',
    'Creating tables and columns',
    'Configuring relationships',
    'Setting up RLS policies',
    'Testing security'
  ],
  'authentication': [
    'Configuring authentication',
    'Setting up user profiles', 
    'Creating signup flow',
    'Implementing login',
    'Setting permissions'
  ],
  'code_generation': [
    'Analyzing requirements',
    'Planning architecture',
    'Generating components',
    'Adding AI features',
    'Optimizing code',
    'Adding animations'
  ],
  'ai_integration': [
    'Setting up AI gateway',
    'Creating chat interface',
    'Implementing smart suggestions',
    'Adding auto-categorization',
    'Testing AI features'
  ],
  'ui_components': [
    'Creating dashboard layout',
    'Building task components',
    'Adding drag-and-drop',
    'Implementing filters',
    'Making it responsive'
  ],
  'realtime_features': [
    'Setting up realtime subscriptions',
    'Configuring live updates',
    'Testing sync functionality'
  ],
  'file_operations': [
    'Creating files',
    'Writing code',
    'Organizing structure',
    'Adding dependencies'
  ],
  'default': [
    'Initializing',
    'Processing',
    'Finalizing'
  ]
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

  const getPhaseSteps = (jobType: string, currentStep?: string) => {
    // Try to match the job type to a phase category
    const phaseKeys = Object.keys(PHASE_STEPS);
    for (const key of phaseKeys) {
      if (jobType.includes(key) || (currentStep && currentStep.toLowerCase().includes(key))) {
        return PHASE_STEPS[key as keyof typeof PHASE_STEPS];
      }
    }
    
    // If job mentions multiple systems, create a combined flow
    if (jobType.includes('complete') || jobType.includes('full')) {
      return [
        'Planning architecture',
        'Setting up database',
        'Configuring authentication',
        'Building UI components',
        'Adding AI features',
        'Implementing realtime',
        'Testing & polishing',
        'Finalizing deployment'
      ];
    }
    
    return PHASE_STEPS.default;
  };

  const getCurrentPhaseIndex = (progress: number, totalSteps: number) => {
    // More granular progress tracking
    return Math.min(Math.floor((progress / 100) * totalSteps), totalSteps - 1);
  };

  const getMotivationalMessage = (progress: number, phaseIndex: number, steps: string[]) => {
    if (progress === 0) return "🚀 Starting your build...";
    if (progress < 20) return "⚡ Setting things up...";
    if (progress < 40) return "🎯 Making great progress!";
    if (progress < 60) return "🔥 More than halfway there!";
    if (progress < 80) return "✨ Almost done!";
    if (progress < 100) return "🎉 Finishing touches...";
    return "✅ Complete!";
  };

  if (!hasActiveJobs && completedJobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Active Jobs */}
      {activeJobs.map(job => {
        const steps = getPhaseSteps(job.job_type, job.current_step || undefined);
        const currentPhaseIndex = getCurrentPhaseIndex(job.progress, steps.length);
        const isExpanded = expandedJobs.has(job.id);
        const motivationMsg = getMotivationalMessage(job.progress, currentPhaseIndex, steps);

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
                        className="h-auto p-0 hover:bg-transparent flex items-center gap-1"
                      >
                        <span className="text-sm font-medium">Building Your App</span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                  
                  <p className="text-xs font-medium text-primary mb-1">
                    {motivationMsg}
                  </p>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {job.current_step || steps[currentPhaseIndex]}
                  </p>

                  <CollapsibleContent>
                    <div className="space-y-1.5 mb-3 max-h-[200px] overflow-y-auto">
                      {steps.map((step, index) => {
                        const isCompleted = index < currentPhaseIndex;
                        const isCurrent = index === currentPhaseIndex;
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            {isCompleted ? (
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : isCurrent ? (
                              <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                            ) : (
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
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
                    <div className="mt-2 w-full bg-secondary rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-1.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>You can safely continue using the app</span>
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
