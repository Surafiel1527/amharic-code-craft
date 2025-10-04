import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface ActiveUser {
  user_id: string;
  current_file: string | null;
  cursor_position: any;
  last_active: string;
  profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface CollaborativePresenceProps {
  projectId: string;
}

export function CollaborativePresence({ projectId }: CollaborativePresenceProps) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    if (!user) return;

    // Track own presence
    const trackPresence = async () => {
      await supabase
        .from('active_sessions')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          last_active: new Date().toISOString()
        }, {
          onConflict: 'project_id,user_id'
        });
    };

    trackPresence();
    const interval = setInterval(trackPresence, 10000); // Update every 10s

    // Subscribe to presence changes
    const channel = supabase
      .channel(`project:${projectId}:presence`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_sessions',
          filter: `project_id=eq.${projectId}`
        },
        async () => {
          // Reload active users
          await loadActiveUsers();
        }
      )
      .subscribe();

    loadActiveUsers();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      
      // Remove presence on unmount
      supabase
        .from('active_sessions')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);
    };
  }, [projectId, user]);

  const loadActiveUsers = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('active_sessions')
      .select(`
        *,
        profile:user_id(full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .gte('last_active', fiveMinutesAgo);

    if (data) {
      setActiveUsers(data as any);
    }
  };

  const otherUsers = activeUsers.filter(u => u.user_id !== user?.id);

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b bg-card/50">
      <Users className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Active now:</span>
      <div className="flex items-center gap-2">
        {otherUsers.map(user => {
          const initials = user.profile?.full_name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase() || '?';

          return (
            <div key={user.user_id} className="relative">
              <Avatar className="h-8 w-8 border-2 border-green-500">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {user.current_file && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <Badge variant="secondary" className="text-xs">
                    {user.current_file.split('/').pop()}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
