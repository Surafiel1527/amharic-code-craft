import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CollaboratorPresence {
  user_id: string;
  user_email: string;
  status: 'active' | 'idle' | 'offline';
  last_seen: string;
  current_file?: string;
}

export const CollaborationIndicator = () => {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveCollaborators = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
      
      if (!user) return;

      // Query active sessions from database
      const { data: sessions } = await supabase
        .from('active_sessions')
        .select('user_id, last_active, current_file')
        .gte('last_active', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

      if (sessions) {
        const presenceData: CollaboratorPresence[] = await Promise.all(
          sessions.map(async (session) => {
            const isActive = new Date(session.last_active).getTime() > Date.now() - 2 * 60 * 1000;
            const isIdle = new Date(session.last_active).getTime() > Date.now() - 5 * 60 * 1000;
            
            return {
              user_id: session.user_id,
              user_email: session.user_id === user.id ? 'You' : session.user_id.substring(0, 8),
              status: isActive ? 'active' : isIdle ? 'idle' : 'offline',
              last_seen: session.last_active,
              current_file: session.current_file || undefined
            };
          })
        );
        setCollaborators(presenceData.filter(p => p.status !== 'offline'));
      }
    };
    
    fetchActiveCollaborators();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchActiveCollaborators, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (email: string) => {
    if (email === 'You') return 'You';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="flex -space-x-2">
          {collaborators.map((collab) => (
            <Tooltip key={collab.user_id}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {getInitials(collab.user_email)}
                    </AvatarFallback>
                  </Avatar>
                  <Circle 
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(collab.status)} rounded-full border-2 border-background`}
                    fill="currentColor"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{collab.user_email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{collab.status}</p>
                  {collab.current_file && (
                    <p className="text-xs text-muted-foreground">
                      Editing: {collab.current_file}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Badge variant="secondary" className="ml-2">
          {collaborators.filter(c => c.status === 'active').length} active
        </Badge>
      </div>
    </TooltipProvider>
  );
};