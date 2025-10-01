import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  title: string;
  prompt: string;
  html_code: string;
  created_at: string;
}

interface ProjectsGridProps {
  projects: Project[];
  onLoadProject: (project: Project) => void;
  onProjectsChange: () => void;
}

export const ProjectsGrid = ({ projects, onLoadProject, onProjectsChange }: ProjectsGridProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (projectId: string, projectTitle: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast.success(`"${projectTitle}" ተሰርዟል`);
      onProjectsChange();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("ፕሮጀክት መሰረዝ አልተቻለም");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("am-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ፕሮጀክቶችን ፈልግ..."
          className="pl-10"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>ምንም ፕሮጀክት አልተገኘም</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="p-4 hover-scale hover-glow cursor-pointer group relative overflow-hidden"
            >
              <div onClick={() => onLoadProject(project)} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg truncate flex-1">
                    {project.title}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(project.created_at)}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {project.prompt}
                </p>

                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    ለመክፈት ጠቅ ያድርጉ
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ፕሮጀክት ሰርዝ</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{project.title}" የሚለውን ፕሮጀክት መሰረዝ ይፈልጋሉ? ይህ ድርጊት መመለስ አይቻልም።
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ተወው</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(project.id, project.title)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      ሰርዝ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
