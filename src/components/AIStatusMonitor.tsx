import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, FileEdit, Eye, Code, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type AIStatus = 'idle' | 'thinking' | 'reading' | 'editing' | 'fixing' | 'analyzing' | 'generating';

interface StatusUpdate {
  status: AIStatus;
  message: string;
  timestamp: Date;
  progress?: number;
  errors?: string[];
}

interface AIStatusMonitorProps {
  projectId?: string;
}

export function AIStatusMonitor({ projectId }: AIStatusMonitorProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate>({
    status: 'idle',
    message: 'Ready',
    timestamp: new Date()
  });
  const [history, setHistory] = useState<StatusUpdate[]>([]);

  useEffect(() => {
    if (!projectId) return;

    // Subscribe to real-time status updates
    const channel = supabase
      .channel(`ai-status-${projectId}`)
      .on('broadcast', { event: 'status-update' }, ({ payload }) => {
        const update: StatusUpdate = {
          ...payload,
          timestamp: new Date(payload.timestamp)
        };
        setCurrentStatus(update);
        setHistory(prev => [update, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const getStatusIcon = (status: AIStatus) => {
    switch (status) {
      case 'thinking': return <Brain className="h-4 w-4 animate-pulse" />;
      case 'reading': return <Eye className="h-4 w-4" />;
      case 'editing': return <FileEdit className="h-4 w-4" />;
      case 'fixing': return <AlertCircle className="h-4 w-4" />;
      case 'analyzing': return <Code className="h-4 w-4" />;
      case 'generating': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return null;
    }
  };

  const getStatusColor = (status: AIStatus) => {
    switch (status) {
      case 'thinking': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'reading': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'editing': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'fixing': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'analyzing': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'generating': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI Status</h3>
        <Badge variant="outline" className={getStatusColor(currentStatus.status)}>
          <span className="flex items-center gap-2">
            {getStatusIcon(currentStatus.status)}
            {currentStatus.status.toUpperCase()}
          </span>
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="text-sm font-medium">Current:</div>
          <div className="text-sm text-muted-foreground flex-1">{currentStatus.message}</div>
        </div>

        {currentStatus.progress !== undefined && (
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentStatus.progress}%` }}
            />
          </div>
        )}

        {currentStatus.errors && currentStatus.errors.length > 0 && (
          <div className="space-y-1 mt-2">
            <div className="text-sm font-medium text-destructive">TypeScript Errors:</div>
            {currentStatus.errors.map((error, i) => (
              <div key={i} className="text-xs text-muted-foreground bg-destructive/10 p-2 rounded">
                {error}
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium">Recent Activity:</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.map((item, i) => (
              <div key={i} className="text-xs flex items-center gap-2 text-muted-foreground">
                {getStatusIcon(item.status)}
                <span className="flex-1">{item.message}</span>
                <span className="text-xs opacity-50">
                  {item.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
