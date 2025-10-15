import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Sparkles, Code, Wrench, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { cn } from '@/lib/utils';

interface AIProcessChatProps {
  projectId?: string;
  conversationId?: string;
  className?: string;
}

interface AIMessage {
  id: string;
  type: 'status' | 'thinking' | 'action' | 'completion' | 'error';
  content: string;
  timestamp: string;
  metadata?: {
    phase?: string;
    filesAffected?: string[];
    progress?: number;
    emoji?: string;
  };
}

export function AIProcessChat({ projectId, conversationId, className }: AIProcessChatProps) {
  const { status, codeUpdates, errors, isActive } = useRealtimeAI({ projectId, conversationId });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);

  // Convert realtime updates to AI messages
  useEffect(() => {
    if (status.message) {
      const newMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        type: status.status === 'idle' ? 'completion' : 'status',
        content: status.message,
        timestamp: status.timestamp,
        metadata: {
          phase: status.status,
          progress: status.progress,
          emoji: getEmojiForStatus(status.status)
        }
      };
      
      setMessages(prev => {
        // Avoid duplicates
        if (prev[prev.length - 1]?.content === newMessage.content) {
          return prev;
        }
        return [...prev, newMessage];
      });
    }
  }, [status]);

  // Add code update messages
  useEffect(() => {
    if (codeUpdates.length > 0) {
      const latestUpdate = codeUpdates[codeUpdates.length - 1];
      const message: AIMessage = {
        id: `code-${Date.now()}`,
        type: 'action',
        content: `Updated ${latestUpdate.component}`,
        timestamp: latestUpdate.timestamp,
        metadata: {
          filesAffected: [latestUpdate.component],
          emoji: '📝'
        }
      };
      
      setMessages(prev => [...prev, message]);
    }
  }, [codeUpdates]);

  // Add error messages
  useEffect(() => {
    if (errors.length > 0) {
      const latestError = errors[errors.length - 1];
      const message: AIMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: latestError,
        timestamp: new Date().toISOString(),
        metadata: { emoji: '⚠️' }
      };
      
      setMessages(prev => [...prev, message]);
    }
  }, [errors]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function getEmojiForStatus(status: string): string {
    const emojiMap: Record<string, string> = {
      thinking: '🤔',
      analyzing: '🔍',
      editing: '✏️',
      fixing: '🔧',
      generating: '⚡',
      reading: '📖',
      idle: '✅'
    };
    return emojiMap[status] || '💭';
  }

  function getStatusColor(type: string) {
    switch (type) {
      case 'thinking':
      case 'status':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'action':
        return 'bg-success/10 text-success border-success/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completion':
        return 'bg-accent/10 text-accent-foreground border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  function getIconForType(type: string) {
    switch (type) {
      case 'thinking':
      case 'status':
        return <Brain className="h-4 w-4" />;
      case 'action':
        return <Code className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'completion':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  }

  if (!isActive && messages.length === 0) {
    return null;
  }

  return (
    <Card className={cn("flex flex-col h-[400px]", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <Brain className="h-5 w-5 text-primary" />
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
            <p className="text-xs text-muted-foreground truncate">
              {isActive ? 'Actively processing your request...' : 'Ready'}
            </p>
          </div>
        </div>
        {isActive && (
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            Working
          </Badge>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-50" />
                <p>AI messages will appear here</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    getStatusColor(message.type)
                  )}>
                    {message.metadata?.emoji ? (
                      <span className="text-sm">{message.metadata.emoji}</span>
                    ) : (
                      getIconForType(message.type)
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 space-y-2">
                  <div className="bg-card border rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-foreground leading-relaxed">
                      {message.content}
                    </p>
                    
                    {/* Files affected */}
                    {message.metadata?.filesAffected && message.metadata.filesAffected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.metadata.filesAffected.map((file, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-mono">
                            {file}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  {message.metadata?.progress !== undefined && message.metadata.progress < 100 && (
                    <div className="space-y-1">
                      <Progress value={message.metadata.progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {message.metadata.progress}% complete
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with summary when idle */}
      {!isActive && messages.length > 0 && (
        <div className="border-t p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Completed • {messages.length} message{messages.length > 1 ? 's' : ''}</span>
            {codeUpdates.length > 0 && (
              <span>• {codeUpdates.length} file{codeUpdates.length > 1 ? 's' : ''} updated</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
