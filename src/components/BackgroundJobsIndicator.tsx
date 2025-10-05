import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs';
import { useAuth } from '@/hooks/useAuth';

export function BackgroundJobsIndicator() {
  const { user } = useAuth();
  const { activeJobs, completedJobs, dismissCompleted, hasActiveJobs } = useBackgroundJobs(user?.id);

  if (!hasActiveJobs && completedJobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Active Jobs */}
      {activeJobs.map(job => (
        <Card key={job.id} className="p-3 bg-background border-primary/20 shadow-lg">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium">Processing in Background</span>
                <Badge variant="outline" className="text-xs">
                  {job.progress}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {job.current_step || 'Working on your request...'}
              </p>
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
      ))}

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
