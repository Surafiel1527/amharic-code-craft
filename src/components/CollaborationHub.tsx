import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Loader2, UserPlus, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CollaborationHubProps {
  projectId?: string;
}

export const CollaborationHub = ({ projectId }: CollaborationHubProps) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchSessions();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('collaboration_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_sessions'
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchSessions = async () => {
    try {
      if (!projectId) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('collaboration_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim() || !projectId) {
      toast.error("Please provide a session name");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('collaboration_sessions')
        .insert({
          project_id: projectId,
          created_by: user.id,
          session_name: sessionName,
          active_users: [{ id: user.id, joinedAt: new Date().toISOString() }],
          is_active: true
        });

      if (error) throw error;

      toast.success("Collaboration session created");
      setSessionName("");
      setShowCreate(false);
      fetchSessions();
    } catch (error) {
      console.error('Session creation error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('collaboration_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success("Session ended");
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error("Failed to end session");
    }
  };

  if (loading) {
    return (
      <Card className="glass-effect border-primary/20">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Real-Time Collaboration
        </CardTitle>
        <CardDescription>
          Work together with other developers in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showCreate && (
          <Button 
            onClick={() => setShowCreate(true)} 
            className="w-full"
            variant="outline"
            disabled={!projectId}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Collaboration Session
          </Button>
        )}

        {showCreate && (
          <div className="space-y-2 p-4 border rounded-lg">
            <Input
              placeholder="Session name (e.g., Feature X Development)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateSession} 
                disabled={creating}
                className="flex-1"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Session
              </Button>
              <Button 
                onClick={() => {
                  setShowCreate(false);
                  setSessionName("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active collaboration sessions</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        {session.session_name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Started {new Date(session.started_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndSession(session.id)}
                    >
                      End Session
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <div className="flex -space-x-2">
                      {(session.active_users || []).slice(0, 5).map((user: any, idx: number) => (
                        <Avatar key={idx} className="h-8 w-8 border-2 border-background">
                          <AvatarFallback className="text-xs">U{idx + 1}</AvatarFallback>
                        </Avatar>
                      ))}
                      {(session.active_users || []).length > 5 && (
                        <Badge variant="secondary" className="ml-2">
                          +{session.active_users.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};