import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobQueue, JobPriority } from '@/hooks/useJobQueue';
import { Loader2, X, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface JobQueueManagerProps {
  onRefresh?: () => void;
}

export const JobQueueManager = ({ onRefresh }: JobQueueManagerProps) => {
  const { getQueueStatus, updatePriority, cancelJob } = useJobQueue();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadQueue = async () => {
    setIsLoading(true);
    const queueJobs = await getQueueStatus();
    setJobs(queueJobs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handlePriorityChange = async (jobId: string, priority: string) => {
    const success = await updatePriority(jobId, parseInt(priority) as JobPriority);
    if (success) {
      loadQueue();
      onRefresh?.();
    }
  };

  const handleCancel = async (jobId: string) => {
    const success = await cancelJob(jobId);
    if (success) {
      loadQueue();
      onRefresh?.();
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'destructive';
    if (priority >= 5) return 'default';
    return 'secondary';
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 8) return <Zap className="w-3 h-3" />;
    if (priority >= 5) return <ArrowUp className="w-3 h-3" />;
    return <ArrowDown className="w-3 h-3" />;
  };

  if (jobs.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Job Queue ({jobs.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={loadQueue}>
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <Badge variant={job.status === 'processing' ? 'default' : 'secondary'}>
                {job.status}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {job.input_data?.request || 'Generating...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={job.priority.toString()}
                onValueChange={(value) => handlePriorityChange(job.id, value)}
                disabled={job.status === 'processing'}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((p) => (
                    <SelectItem key={p} value={p.toString()}>
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(p)}
                        P{p}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant={getPriorityColor(job.priority)}>
                {getPriorityIcon(job.priority)}
                P{job.priority}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancel(job.id)}
                disabled={job.status === 'processing'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
