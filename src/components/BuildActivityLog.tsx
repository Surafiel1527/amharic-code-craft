import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { 
  FileText, 
  Package, 
  Rocket, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Database,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BuildEvent {
  id: string;
  event_type: string;
  title: string;
  details: any; // Using any to match Supabase Json type
  status: 'success' | 'running' | 'failed' | 'info';
  motivation_message?: string | null;
  created_at: string;
}

export function BuildActivityLog() {
  const [events, setEvents] = useState<BuildEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial events
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('build_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching build events:', error);
        return;
      }

      setEvents((data || []) as BuildEvent[]);
    };

    fetchEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('build-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'build_events'
        },
        (payload) => {
          const newEvent = payload.new as BuildEvent;
          setEvents(prev => [newEvent, ...prev.slice(0, 49)]);

          // Show motivational toast for important events
          if (newEvent.motivation_message && newEvent.status === 'success') {
            toast({
              title: newEvent.title,
              description: newEvent.motivation_message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getEventIcon = (eventType: string, status: string) => {
    if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === 'failed') return <AlertCircle className="h-4 w-4 text-destructive" />;

    switch (eventType) {
      case 'file_created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'package_installed':
        return <Package className="h-4 w-4 text-green-500" />;
      case 'function_deployed':
        return <Rocket className="h-4 w-4 text-purple-500" />;
      case 'auth_setup':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'database_ready':
        return <Database className="h-4 w-4 text-cyan-500" />;
      case 'build_started':
      case 'build_complete':
        return <Zap className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      running: 'secondary',
      failed: 'destructive',
      info: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Build Activity</h3>
        <Badge variant="outline" className="text-xs">
          {events.length} events
        </Badge>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Waiting for activity...</p>
            </div>
          ) : (
            events.map((event) => {
              const isExpanded = expandedEvents.has(event.id);
              const hasDetails = event.details && Object.keys(event.details).length > 0;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "border rounded-lg p-3 transition-all hover:bg-accent/50",
                    event.status === 'running' && "border-primary/50 bg-primary/5",
                    event.status === 'failed' && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getEventIcon(event.event_type, event.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {event.title}
                        </span>
                        {getStatusBadge(event.status)}
                      </div>

                      {event.motivation_message && (
                        <p className="text-xs text-success font-medium mb-1">
                          ✨ {event.motivation_message}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {formatTime(event.created_at)}
                      </p>

                      {hasDetails && isExpanded && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {hasDetails && (
                      <button
                        onClick={() => toggleExpand(event.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}