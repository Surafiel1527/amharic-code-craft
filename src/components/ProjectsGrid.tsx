import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Trash2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProjectActions } from "@/components/ProjectActions";
import { Pagination } from "@/components/Pagination";
import { GridSkeleton } from "@/components/ui/loading-skeleton";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
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
  isLoading?: boolean;
}

export const ProjectsGrid = ({ 
  projects, 
  onLoadProject, 
  onProjectsChange,
  isLoading = false 
}: ProjectsGridProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      project.prompt.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      project.tags?.some(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({
    data: filteredProjects,
    itemsPerPage: 9,
  });

  const handleDelete = async (projectId: string, projectTitle: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast.success(`"${projectTitle}" deleted`);
      onProjectsChange();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigate with arrow keys when focused on search
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft' && hasPreviousPage) {
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && hasNextPage) {
        goToPage(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, hasNextPage, hasPreviousPage, goToPage]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            disabled
            placeholder="Search projects..."
            className="pl-10"
          />
        </div>
        <GridSkeleton count={9} />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="pl-10 transition-all focus:ring-2 focus:ring-primary"
          aria-label="Search projects"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No projects found</p>
          {searchQuery && (
            <p className="text-sm mt-2">
              Try adjusting your search terms
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.map((project, index) => (
              <Card
                key={project.id}
                className="p-4 hover-scale hover:shadow-lg group relative overflow-hidden border-2 transition-all animate-fade-in cursor-pointer focus-within:ring-2 focus-within:ring-primary"
                style={{
                  borderColor: project.is_favorite ? 'hsl(var(--primary))' : undefined,
                  animationDelay: `${index * 50}ms`
                }}
                tabIndex={0}
                role="article"
                aria-label={`Project: ${project.title}`}
              >
                <div className="space-y-3">
                  <div onClick={() => onLoadProject(project)} onKeyDown={(e) => {
                    if (e.key === 'Enter') onLoadProject(project);
                  }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <h3 className="font-semibold text-lg truncate">
                          {project.title}
                        </h3>
                        {project.is_favorite && (
                          <Heart className="h-4 w-4 fill-primary text-primary flex-shrink-0 animate-scale-in" />
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
                          <Badge key={index} variant="outline" className="text-xs hover-scale">
                            {tag}
                          </Badge>
                        ))}
                        {project.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.tags.length - 3}
                          </Badge>
                        )}
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
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive hover-scale"
                      aria-label={`Delete ${project.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{project.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(project.id, project.title)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Card>
            ))}
          </div>
          
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
            />
          )}
        </>
      )}
    </div>
  );
};