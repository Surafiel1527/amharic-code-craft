import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Sparkles, Code, Wrench, CheckCircle, AlertCircle } from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { cn } from '@/lib/utils';

interface AIProcessChatProps {
  projectId?: string;
  conversationId?: string;
  className?: string;
}

export function AIProcessChat({ projectId, conversationId, className }: AIProcessChatProps) {
  const { status, codeUpdates, errors, isActive } = useRealtimeAI({ projectId, conversationId });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status, codeUpdates]);

  const getStatusIcon = () => {
    switch (status.status) {
      case 'thinking': return <Brain className="h-4 w-4" />;
      case 'analyzing': return <Sparkles className="h-4 w-4" />;
      case 'editing': return <Code className="h-4 w-4" />;
      case 'fixing': return <Wrench className="h-4 w-4" />;
      case 'generating': return <Code className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'thinking': return 'bg-primary/10 text-primary border-primary/20';
      case 'analyzing': return 'bg-accent/10 text-accent-foreground border-accent/20';
      case 'editing': return 'bg-success/10 text-success border-success/20';
      case 'fixing': return 'bg-warning/10 text-warning border-warning/20';
      case 'generating': return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!isActive && codeUpdates.length === 0) {
    return null;
  }

  return (
    <Card className={cn("flex flex-col h-[400px]", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            {getStatusIcon()}
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">AI Process</h3>
            <p className="text-xs text-muted-foreground truncate">
              {isActive ? 'Working on your request...' : 'Idle'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs", getStatusColor())}>
          {status.status}
        </Badge>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Status Message */}
          {status.message && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-shrink-0 mt-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  getStatusColor()
                )}>
                  {getStatusIcon()}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="bg-card border rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-foreground leading-relaxed">
                    {status.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(status.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                
                {/* Progress Bar */}
                {status.progress !== undefined && status.progress < 100 && (
                  <div className="space-y-1">
                    <Progress value={status.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{status.progress}% complete</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Updates */}
          {codeUpdates.length > 0 && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-success/10 text-success border border-success/20 flex items-center justify-center">
                  <Code className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-card border rounded-lg p-3 shadow-sm space-y-2">
                  <p className="text-sm font-medium text-foreground">Files Updated</p>
                  <div className="flex flex-wrap gap-1.5">
                    {codeUpdates.slice(-5).map((update, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs font-mono gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {update.component}
                      </Badge>
                    ))}
                  </div>
                  {codeUpdates.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{codeUpdates.length - 5} more files
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive mb-2">
                    {errors.length} Issue{errors.length > 1 ? 's' : ''} Found
                  </p>
                  <ul className="space-y-1">
                    {errors.slice(0, 3).map((error, i) => (
                      <li key={i} className="text-xs text-destructive/80">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
