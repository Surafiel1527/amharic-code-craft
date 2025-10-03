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
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
    };
    
    getCurrentUser();

    // In a real implementation, this would connect to a realtime presence system
    // For now, we'll simulate with the current user
    if (currentUser) {
      const mockPresence: CollaboratorPresence = {
        user_id: currentUser,
        user_email: 'You',
        status: 'active',
        last_seen: new Date().toISOString(),
        current_file: 'main.tsx'
      };
      setCollaborators([mockPresence]);
    }
  }, [currentUser]);

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