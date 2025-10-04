import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3x3, List, Star, Clock, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  title: string;
  prompt: string;
  description: string | null;
  html_code: string;
  status: string;
  is_favorite: boolean;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  user_id: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Load projects
  useEffect(() => {
    if (!user) return;

    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error: any) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateProject = async () => {
    if (!user || !newProject.title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: newProject.title.trim(),
          prompt: newProject.description.trim() || "New project",
          description: newProject.description.trim() || null,
          html_code: "<!-- Start building your project -->",
          status: "active",
          is_public: false,
          tags: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Project created successfully");
      setShowCreateDialog(false);
      setNewProject({ title: "", description: "" });
      navigate(`/project/${data.id}`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error(error.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleToggleFavorite = async (projectId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_favorite: !currentFavorite })
        .eq("id", projectId);

      if (error) throw error;

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, is_favorite: !currentFavorite } : p
        )
      );
    } catch (error: any) {
      console.error("Error updating favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteProjects = filteredProjects.filter((p) => p.is_favorite);
  const recentProjects = filteredProjects.filter((p) => !p.is_favorite);

  if (authLoading || (loading && !user)) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Sparkles className="w-9 h-9 text-primary" />
                My Projects
              </h1>
              <p className="text-muted-foreground mt-2 text-base">
                Create and manage your AI-powered projects
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-background/50 backdrop-blur-sm border-border/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={view === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("grid")}
                className="h-12 w-12"
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("list")}
                className="h-12 w-12"
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No projects found" : "No projects yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search"
                : "Create your first project to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-8">
            <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                All Projects ({filteredProjects.length})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-background">
                <Star className="w-4 h-4 mr-2" />
                Favorites ({favoriteProjects.length})
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-background">
                <Clock className="w-4 h-4 mr-2" />
                Recent
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className={`${view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}`}>
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                            {project.title}
                          </CardTitle>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-background/80 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(project.id, project.is_favorite || false);
                          }}
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              project.is_favorite
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground hover:text-yellow-400"
                            }`}
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="favorites">
              {favoriteProjects.length === 0 ? (
                <div className="text-center py-16">
                  <Star className="w-20 h-20 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">
                    No favorite projects yet
                  </p>
                </div>
              ) : (
                <div className={`${view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}`}>
                  {favoriteProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                              {project.title}
                            </CardTitle>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-background/80 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(project.id, project.is_favorite || false);
                            }}
                          >
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Updated {new Date(project.updated_at).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent">
              <div className={`${view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}`}>
                {recentProjects.slice(0, 9).map((project) => (
                  <Card
                    key={project.id}
                    className="hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                            {project.title}
                          </CardTitle>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-background/80 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(project.id, project.is_favorite || false);
                          }}
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              project.is_favorite
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground hover:text-yellow-400"
                            }`}
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new AI-powered project. Give it a name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                placeholder="My Awesome Project"
                value={newProject.title}
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What will you build?"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={creating}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
