import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Heart, Eye, Code, Check, Copy, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface Project {
  id: string;
  title: string;
  prompt: string;
  html_code: string;
  created_at: string;
  is_favorite: boolean;
  is_public: boolean;
  share_token: string | null;
  tags: string[];
  usage_count?: number;
  views_count?: number;
  forked_from?: string | null;
}

interface ProjectActionsProps {
  project: Project;
  onUpdate: () => void;
}

export const ProjectActions = ({ project, onUpdate }: ProjectActionsProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const openInWorkspace = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workspace/${project.id}`);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_favorite: !project.is_favorite })
        .eq("id", project.id);

      if (error) throw error;
      toast.success(project.is_favorite ? t("projectActions.removedFromFavorites") : t("projectActions.addedToFavorites"));
      onUpdate();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error(t("toast.errorOccurred"));
    }
  };

  const togglePublic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let shareToken = project.share_token;
      
      if (!project.is_public && !shareToken) {
        // Generate share token if making public
        const { data, error: tokenError } = await supabase
          .rpc('generate_share_token');
        
        if (tokenError) throw tokenError;
        shareToken = data;
      }

      const { error } = await supabase
        .from("projects")
        .update({ 
          is_public: !project.is_public,
          share_token: shareToken
        })
        .eq("id", project.id);

      if (error) throw error;
      toast.success(project.is_public ? t("privacy.madePrivate") : t("privacy.madePublic"));
      onUpdate();
    } catch (error) {
      console.error("Error toggling public:", error);
      toast.error(t("privacy.error"));
    }
  };

  const copyShareLink = () => {
    if (project.share_token) {
      const shareUrl = `${window.location.origin}/shared/${project.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("privacy.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Primary Action - Open in Workspace */}
      <Button
        variant="default"
        size="sm"
        onClick={openInWorkspace}
        className="w-full"
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        Open in Workspace
      </Button>

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFavorite}
          className="flex-1"
        >
          <Heart className={`h-4 w-4 mr-1 ${project.is_favorite ? 'fill-current text-red-500' : ''}`} />
          <span className="text-xs">{project.is_favorite ? t("projectActions.unfavorite") : t("projectActions.favorite")}</span>
        </Button>

        {project.is_public ? (
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="flex-1">
                <Share2 className="h-4 w-4 mr-1" />
                <span className="text-xs">{t("projectActions.share")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>{t("projectActions.shareTitle")}</DialogTitle>
                <DialogDescription>
                  {t("projectActions.shareDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  value={project.share_token ? `${window.location.origin}/shared/${project.share_token}` : ''}
                  readOnly
                />
                <Button onClick={copyShareLink} size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePublic}
            className="flex-1"
          >
            <Link2 className="h-4 w-4 mr-1" />
            <span className="text-xs">{t("projectActions.makePublic")}</span>
          </Button>
        )}

        <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          {project.views_count || 0}
        </div>
      </div>
    </div>
  );
};
