import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ProjectCommentsProps {
  projectId: string;
}

export const ProjectComments = ({ projectId }: ProjectCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchComments();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(`project-comments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_comments',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    // Fetch profiles separately
    const commentsWithProfiles = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', comment.user_id)
          .maybeSingle();

        return {
          ...comment,
          profiles: profile
        };
      })
    );

    setComments(commentsWithProfiles);
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      toast.success("አስተያየት ተጨምሯል");
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error("አስተያየት መጨመር አልተቻለም");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('project_comments')
        .update({ content: editContent.trim() })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      setEditContent("");
      toast.success("አስተያየት ተስተካክሏል");
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error("አስተካከል አልተቻለም");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("አስተያየት ተሰርዟል");
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error("መሰረዝ አልተቻለም");
    }
  };

  const getInitials = (comment: Comment) => {
    // SECURITY: Never use email for display
    const name = comment.profiles?.full_name || 'U';
    return name[0].toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          አስተያየቶች ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user && (
          <div className="space-y-2">
            <Textarea
              placeholder="አስተያየትዎን ያስገቡ..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
              dir="auto"
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !newComment.trim()}
              className="w-full sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              አስተያየት ይላኩ
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 border border-border rounded-lg"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(comment)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {comment.profiles?.full_name || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {user?.id === comment.user_id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px]"
                      dir="auto"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(comment.id)}
                      >
                        አስቀምጥ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                      >
                        ሰርዝ
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                )}
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">ገና ምንም አስተያየት የለም። የመጀመሪያው ይሁኑ!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
