import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  Search, 
  Calendar, 
  History, 
  Eye, 
  Trash2, 
  RotateCcw,
  ArrowLeft,
  Filter,
  Grid,
  List
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  html_code: string;
}

interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  created_at: string;
  changes_summary: string;
}

interface ProjectWithVersions extends Project {
  versions: ProjectVersion[];
}

export default function ProjectsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithVersions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">("updated");

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      setLoading(true);

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user?.id)
        .order("updated_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Load versions for each project
      const projectsWithVersions: ProjectWithVersions[] = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: versions } = await supabase
            .from("project_versions")
            .select("*")
            .eq("project_id", project.id)
            .order("version_number", { ascending: false });

          return {
            ...project,
            versions: versions || []
          };
        })
      );

      setProjects(projectsWithVersions);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (projectId: string, versionId: string) => {
    try {
      const { data: version } = await supabase
        .from("project_versions")
        .select("html_code")
        .eq("id", versionId)
        .single();

      if (!version) throw new Error("Version not found");

      await supabase
        .from("projects")
        .update({ html_code: version.html_code })
        .eq("id", projectId);

      toast.success("Version restored successfully");
      loadProjects();
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      // Check authentication and ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to delete projects");
        return;
      }

      // Verify project ownership
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();

      if (fetchError) {
        console.error('Error fetching project:', fetchError);
        toast.error("Project not found");
        return;
      }

      if (project.user_id !== user.id) {
        toast.error("You don't have permission to delete this project");
        return;
      }

      // Delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast.success("Project deleted");
      loadProjects();
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error(error.message || "Failed to delete project");
    }
  };

  const filteredProjects = projects
    .filter(project => 
      project.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "updated") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.title.localeCompare(b.title);
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover-scale"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FolderOpen className="h-8 w-8 text-primary" />
                My Projects
              </h1>
              <p className="text-muted-foreground">
                {projects.length} {projects.length === 1 ? "project" : "projects"} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects */}
        {filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? "Try a different search term" : "Create your first project to get started"}
            </p>
            <Button onClick={() => navigate("/")}>
              Create New Project
            </Button>
          </Card>
        ) : (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {filteredProjects.map((project) => (
              <Card key={project.id} className="p-6 hover-scale animate-fade-in">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate mb-2">
                        {project.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <History className="h-3 w-3 mr-1" />
                          {project.versions.length} {project.versions.length === 1 ? "version" : "versions"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="versions" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="versions" className="flex-1">Versions</TabsTrigger>
                      <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="versions" className="space-y-2 max-h-48 overflow-y-auto">
                      {project.versions.slice(0, 5).map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Version {version.version_number}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreVersion(project.id, version.id)}
                            className="shrink-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {project.versions.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{project.versions.length - 5} more versions
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-2">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => navigate(`/workspace/${project.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Project
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
