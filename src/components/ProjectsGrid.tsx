import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Trash2, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProjectActions } from "@/components/ProjectActions";
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
  is_favorite: boolean;
  is_public: boolean;
  share_token: string | null;
  tags: string[];
}

interface ProjectsGridProps {
  projects: Project[];
  onLoadProject: (project: Project) => void;
  onProjectsChange: () => void;
}

export const ProjectsGrid = ({ projects, onLoadProject, onProjectsChange }: ProjectsGridProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjects = filteredProjects.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentProjects.map((project) => (
            <Card
              key={project.id}
              className="p-4 hover-scale hover-glow group relative overflow-hidden border-2"
              style={{
                borderColor: project.is_favorite ? 'hsl(var(--primary))' : undefined
              }}
            >
              <div className="space-y-3">
                <div onClick={() => onLoadProject(project)} className="cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className="font-semibold text-lg truncate">
                        {project.title}
                      </h3>
                      {project.is_favorite && (
                        <Heart className="h-4 w-4 fill-primary text-primary flex-shrink-0" />
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(project.created_at)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {project.prompt}
                  </p>

                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50">
                  <ProjectActions
                    project={project}
                    onUpdate={onProjectsChange}
                  />
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-[2.5rem]"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </>
      )}
    </div>
  );
};
