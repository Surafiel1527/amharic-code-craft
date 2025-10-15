import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, FileEdit, Wrench, Code, Loader2, CheckCircle } from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';

interface RealtimeAIPanelProps {
  projectId?: string;
  conversationId?: string;
}

export function RealtimeAIPanel({ projectId, conversationId }: RealtimeAIPanelProps) {
  const { status, codeUpdates, errors, isActive } = useRealtimeAI({ projectId, conversationId });

  const getStatusIcon = () => {
    switch (status.status) {
      case 'thinking': return <Brain className="h-3 w-3 animate-pulse" />;
      case 'reading': return <Eye className="h-3 w-3" />;
      case 'editing': return <FileEdit className="h-3 w-3" />;
      case 'fixing': return <Wrench className="h-3 w-3" />;
      case 'analyzing': return <Code className="h-3 w-3" />;
      case 'generating': return <Loader2 className="h-3 w-3 animate-spin" />;
      default: return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'thinking': return 'bg-blue-500/10 text-blue-500';
      case 'reading': return 'bg-purple-500/10 text-purple-500';
      case 'editing': return 'bg-green-500/10 text-green-500';
      case 'fixing': return 'bg-yellow-500/10 text-yellow-500';
      case 'analyzing': return 'bg-orange-500/10 text-orange-500';
      case 'generating': return 'bg-cyan-500/10 text-cyan-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (!isActive && codeUpdates.length === 0 && errors.length === 0) {
    return null;
  }

  return (
    <Card className="p-2 space-y-2">
      {/* Status */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={`${getStatusColor()} gap-1 text-xs`}>
          {getStatusIcon()}
          {status.status}
        </Badge>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {status.message}
        </span>
      </div>

      {/* Progress Bar */}
      {status.progress !== undefined && status.progress < 100 && (
        <div className="w-full bg-secondary rounded-full h-1">
          <div 
            className="bg-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}

      {/* Code Components */}
      {codeUpdates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {codeUpdates.slice(-3).map((update, i) => (
            <Badge key={i} variant="outline" className="text-xs gap-1">
              <CheckCircle className="h-2 w-2" />
              {update.component}
            </Badge>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="text-xs text-destructive">
          {errors.length} issue{errors.length > 1 ? 's' : ''} found
        </div>
      )}
    </Card>
  );
}
