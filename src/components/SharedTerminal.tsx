import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Terminal, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TerminalSession {
  id: string;
  command: string;
  output: string | null;
  status: 'running' | 'completed' | 'failed';
  exit_code: number | null;
  executed_at: string;
  user_id: string;
}

interface SharedTerminalProps {
  sessionId: string;
}

export const SharedTerminal = ({ sessionId }: SharedTerminalProps) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [command, setCommand] = useState("");
  const [executing, setExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();

    // Subscribe to real-time terminal updates
    const channel = supabase
      .channel(`terminal:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'terminal_sessions',
          filter: `collaboration_session_id=eq.${sessionId}`
        },
        (payload) => {
          setSessions(prev => [...prev, payload.new as TerminalSession]);
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'terminal_sessions',
          filter: `collaboration_session_id=eq.${sessionId}`
        },
        (payload) => {
          setSessions(prev => 
            prev.map(s => s.id === payload.new.id ? payload.new as TerminalSession : s)
          );
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('terminal_sessions')
        .select('*')
        .eq('collaboration_session_id', sessionId)
        .order('executed_at', { ascending: true });

      if (error) throw error;
      setSessions((data || []) as TerminalSession[]);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching terminal sessions:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    setExecuting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      // Insert command into database
      const { data: newSession, error: insertError } = await supabase
        .from('terminal_sessions')
        .insert({
          collaboration_session_id: sessionId,
          user_id: user.id,
          command: command.trim(),
          status: 'running'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Execute command via edge function
      const { data, error } = await supabase.functions.invoke('terminal-executor', {
        body: {
          sessionId: newSession.id,
          command: command.trim()
        }
      });

      if (error) throw error;

      setCommand("");
      toast.success("Command executed");
    } catch (error) {
      console.error('Error executing command:', error);
      toast.error(error instanceof Error ? error.message : "Failed to execute command");
    } finally {
      setExecuting(false);
    }
  };

  const clearTerminal = async () => {
    try {
      const { error } = await supabase
        .from('terminal_sessions')
        .delete()
        .eq('collaboration_session_id', sessionId);

      if (error) throw error;
      setSessions([]);
      toast.success("Terminal cleared");
    } catch (error) {
      console.error('Error clearing terminal:', error);
      toast.error("Failed to clear terminal");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Shared Terminal
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            disabled={sessions.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] w-full rounded-md border bg-black/90 p-4" ref={scrollRef}>
          <div className="font-mono text-sm space-y-3">
            {sessions.length === 0 ? (
              <div className="text-green-400">$ Welcome to shared terminal. Type a command...</div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">$</span>
                    <span className="text-white">{session.command}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(session.status)}`}
                    >
                      {session.status}
                    </Badge>
                  </div>
                  {session.output && (
                    <div className="text-gray-300 pl-4 whitespace-pre-wrap">
                      {session.output}
                    </div>
                  )}
                  {session.exit_code !== null && session.exit_code !== 0 && (
                    <div className="text-red-400 pl-4">
                      Exit code: {session.exit_code}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Enter command (e.g., npm install, git status)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                executeCommand();
              }
            }}
            disabled={executing}
            className="font-mono"
          />
          <Button onClick={executeCommand} disabled={executing || !command.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          All team members see the same terminal output in real-time
        </div>
      </CardContent>
    </Card>
  );
};
