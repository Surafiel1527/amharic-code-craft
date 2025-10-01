import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Share2, GitFork, Tag, Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  is_favorite: boolean;
  is_public: boolean;
  share_token: string | null;
  tags: string[];
}

interface ProjectActionsProps {
  project: Project;
  onUpdate: () => void;
}

export const ProjectActions = ({ project, onUpdate }: ProjectActionsProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState(false);

  const toggleFavorite = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_favorite: !project.is_favorite })
        .eq('id', project.id);

      if (error) throw error;
      toast.success(project.is_favorite ? "ከተወዳጅ ተወግዷል" : "ወደ ተወዳጅ ታክሏል");
      onUpdate();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error("ተግባር አልተሳካም");
    }
  };

  const togglePublic = async () => {
    try {
      let shareToken = project.share_token;
      
      if (!project.is_public && !shareToken) {
        // Generate share token if making public for first time
        const { data } = await supabase.rpc('generate_share_token');
        shareToken = data;
      }

      const { error } = await supabase
        .from('projects')
        .update({ 
          is_public: !project.is_public,
          share_token: shareToken
        })
        .eq('id', project.id);

      if (error) throw error;
      toast.success(project.is_public ? "ፕሮጀክት የግል ሆኗል" : "ፕሮጀክት ይፋዊ ሆኗል");
      onUpdate();
    } catch (error) {
      console.error('Error toggling public:', error);
      toast.error("ተግባር አልተሳካም");
    }
  };

  const handleFork = async () => {
    try {
      const { data: originalProject } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();

      if (!originalProject) throw new Error('Project not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('projects').insert({
        title: `${originalProject.title} (የተወረሰ)`,
        prompt: originalProject.prompt,
        html_code: originalProject.html_code,
        user_id: user.id,
        forked_from: project.id,
        tags: originalProject.tags
      });

      if (error) throw error;
      toast.success("ፕሮጀክት በተሳካ ሁኔታ ተወርሷል!");
      onUpdate();
    } catch (error) {
      console.error('Error forking project:', error);
      toast.error("ፕሮጀክት መውረስ አልተቻለም");
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;

    try {
      const updatedTags = [...(project.tags || []), newTag.trim()];
      const { error } = await supabase
        .from('projects')
        .update({ tags: updatedTags })
        .eq('id', project.id);

      if (error) throw error;
      setNewTag("");
      toast.success("መለያ ታክሏል");
      onUpdate();
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error("መለያ ማከል አልተቻለም");
    }
  };

  const removeTag = async (tagToRemove: string) => {
    try {
      const updatedTags = project.tags.filter(tag => tag !== tagToRemove);
      const { error } = await supabase
        .from('projects')
        .update({ tags: updatedTags })
        .eq('id', project.id);

      if (error) throw error;
      toast.success("መለያ ተወግዷል");
      onUpdate();
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error("መለያ መወገድ አልተቻለም");
    }
  };

  const copyShareLink = () => {
    if (!project.share_token) return;
    
    const shareUrl = `${window.location.origin}/shared/${project.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("አገናኝ ተቀድቷል!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openShareLink = () => {
    if (!project.share_token) return;
    const shareUrl = `${window.location.origin}/shared/${project.share_token}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={project.is_favorite ? "default" : "outline"}
        size="sm"
        onClick={toggleFavorite}
        className="gap-2"
      >
        <Heart className={`h-4 w-4 ${project.is_favorite ? 'fill-current' : ''}`} />
        ተወዳጅ
      </Button>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            አጋራ
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ፕሮጀክት አጋራ</DialogTitle>
            <DialogDescription>
              ይህን ፕሮጀክት ይፋዊ ያድርጉት እና አገናኙን ያጋሩ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">ይፋዊ ማድረግ</span>
              <Button
                variant={project.is_public ? "default" : "outline"}
                size="sm"
                onClick={togglePublic}
              >
                {project.is_public ? "ይፋዊ ነው" : "የግል ነው"}
              </Button>
            </div>

            {project.is_public && project.share_token && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyShareLink}
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        ተቀድቷል
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        አገናኝ ቅዳ
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openShareLink}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" onClick={handleFork} className="gap-2">
        <GitFork className="h-4 w-4" />
        ውረስ
      </Button>

      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Tag className="h-4 w-4" />
            መለያዎች ({project.tags?.length || 0})
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>መለያዎችን አስተዳድር</DialogTitle>
            <DialogDescription>
              ለፕሮጀክትዎ መለያዎችን ይጨምሩ ወይም ያስወግዱ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="አዲስ መለያ..."
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag}>ጨምር</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {project.tags?.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
              {(!project.tags || project.tags.length === 0) && (
                <p className="text-sm text-muted-foreground">ምንም መለያ የለም</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
