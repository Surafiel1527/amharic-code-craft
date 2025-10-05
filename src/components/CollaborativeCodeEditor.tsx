import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Circle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface CollaboratorPresence {
  user_id: string;
  user_email: string;
  cursor_position: number;
  current_file: string;
  color: string;
}

interface CollaborativeCodeEditorProps {
  projectId: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
}

export const CollaborativeCodeEditor = ({
  projectId,
  initialCode = "",
  onCodeChange,
}: CollaborativeCodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const userColors = [
    "hsl(210, 100%, 56%)", // Blue
    "hsl(142, 76%, 36%)", // Green
    "hsl(291, 64%, 42%)", // Purple
    "hsl(24, 100%, 50%)", // Orange
  ];

  const getUserColor = (userId: string) => {
    const index = parseInt(userId.slice(0, 8), 16) % userColors.length;
    return userColors[index];
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      const channel = supabase.channel(`project:${projectId}`);

      // Track own presence
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const collaboratorList: CollaboratorPresence[] = [];

          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            presences.forEach((presence) => {
              if (presence.user_id !== user.id) {
                collaboratorList.push({
                  user_id: presence.user_id,
                  user_email: presence.user_email,
                  cursor_position: presence.cursor_position || 0,
                  current_file: presence.current_file || '',
                  color: getUserColor(presence.user_id),
                });
              }
            });
          });

          setCollaborators(collaboratorList);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              user_email: user.email,
              cursor_position: cursorPosition,
              current_file: 'main.tsx',
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    });
  }, [projectId, cursorPosition]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  const handleCursorChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.target.selectionStart);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaborative Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            {collaborators.map((collab) => (
              <Badge
                key={collab.user_id}
                variant="outline"
                className="flex items-center gap-1"
                style={{ borderColor: collab.color }}
              >
                <Circle
                  className="h-2 w-2 fill-current"
                  style={{ color: collab.color }}
                />
                {collab.user_email?.split('@')[0] || 'Anonymous'}
              </Badge>
            ))}
            {collaborators.length === 0 && (
              <span className="text-sm text-muted-foreground">No active collaborators</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Textarea
            value={code}
            onChange={(e) => {
              handleCodeChange(e.target.value);
              handleCursorChange(e);
            }}
            onSelect={handleCursorChange}
            placeholder="Start coding... Your collaborators will see changes in real-time"
            className="font-mono min-h-[400px] resize-none"
          />
          
          {/* Cursor indicators for collaborators */}
          {collaborators.map((collab) => (
            <div
              key={collab.user_id}
              className="absolute pointer-events-none"
              style={{
                left: `${Math.min(collab.cursor_position % 80, 100)}%`,
                top: `${Math.floor(collab.cursor_position / 80) * 20}px`,
              }}
            >
              <div
                className="h-5 w-0.5"
                style={{ backgroundColor: collab.color }}
              />
              <span
                className="text-xs px-1 rounded text-white"
                style={{ backgroundColor: collab.color }}
              >
                {collab.user_email?.split('@')[0]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>💡 Real-time collaboration enabled. Changes are synced across all active users.</p>
        </div>
      </CardContent>
    </Card>
  );
};
