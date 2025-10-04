import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3x3, List, Star, Clock, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MobileNav } from "@/components/MobileNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { isAdmin } = useUserRole(user?.id);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    title: "",
    prompt: "",
    template: "blank",
  });
  const [creating, setCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{title?: string; prompt?: string}>({});

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("❌ Not authenticated, redirecting to auth page");
      navigate("/auth");
    } else if (!authLoading && user) {
      console.log("✅ User authenticated:", user.id);
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

  const validateProject = () => {
    const errors: {title?: string; prompt?: string} = {};
    
    if (!newProject.title.trim()) {
      errors.title = "Project name is required";
    } else if (newProject.title.trim().length < 3) {
      errors.title = "Project name must be at least 3 characters";
    } else if (newProject.title.trim().length > 100) {
      errors.title = "Project name must be less than 100 characters";
    }
    
    if (!newProject.prompt.trim()) {
      errors.prompt = "Initial prompt is required to generate your project";
    } else if (newProject.prompt.trim().length < 10) {
      errors.prompt = "Please provide a more detailed prompt (at least 10 characters)";
    } else if (newProject.prompt.trim().length > 1000) {
      errors.prompt = "Prompt must be less than 1000 characters";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Creates a new project and navigates to workspace for AI generation
   * Follows Lovable-style "instant workspace" pattern
   */
  const handleCreateProject = async () => {
    // Validation
    if (!user) {
      toast.error("Please log in to create a project");
      return;
    }

    if (!validateProject()) {
      return;
    }

    setCreating(true);

    try {
      // 1. Verify active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("❌ Session validation failed:", sessionError);
        toast.error("Your session has expired. Please log in again.");
        navigate("/auth");
        return;
      }

      console.log("✅ Session validated for user:", user.id);

      // 2. Create project with placeholder code
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: newProject.title.trim(),
          prompt: newProject.prompt.trim(),
          description: newProject.prompt.trim(),
          html_code: "<!-- Generating your project... Please wait -->",
          status: "active", // Set to active, generation will update it
          is_public: false,
          tags: [newProject.template],
        })
        .select()
        .single();

      if (projectError) {
        console.error("❌ Project creation failed:", projectError);
        throw new Error(projectError.message);
      }

      console.log("✅ Project created:", project.id);

      // 3. Create conversation for AI chat
      const { error: convError } = await supabase
        .from("conversations")
        .insert({
          project_id: project.id,
          user_id: user.id,
          current_code: "<!-- Initializing workspace... -->",
        });

      if (convError) {
        console.warn("⚠️ Conversation creation failed:", convError);
        // Non-critical - workspace will create it if missing
      }
      
      // 4. Success feedback
      toast.success("✨ Opening workspace...", {
        description: "Your AI will start generating the project",
      });
      
      // 5. Clean up and navigate
      setShowCreateDialog(false);
      setNewProject({ title: "", prompt: "", template: "blank" });
      setValidationErrors({});
      
      // 6. Navigate to workspace with auto-prompt parameter
      // The workspace will detect this and trigger AI generation
      navigate(`/project/${project.id}?autoPrompt=${encodeURIComponent(newProject.prompt.trim())}`);
      
    } catch (error: any) {
      console.error("❌ Project creation error:", error);
      
      // Provide specific user feedback
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION')) {
        toast.error("Connection error", {
          description: "Please check your internet and try again."
        });
      } else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        toast.error("Permission denied", {
          description: "Please log in again."
        });
        navigate("/auth");
      } else {
        toast.error("Failed to create project", {
          description: error.message || "Please try again."
        });
      }
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
    setProjectToDelete(projectId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectToDelete);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
      toast.success("Project deleted successfully");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    } finally {
      setShowDeleteDialog(false);
      setProjectToDelete(null);
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

  // Don't render if no user (will redirect via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">My Projects</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <MobileNav 
                isAdmin={isAdmin}
                onShowShortcuts={() => setShowShortcuts(true)}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col gap-6">
          {/* Title and New Project Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-muted-foreground text-sm sm:text-base">
              Create and manage your AI-powered projects
            </p>
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
          <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Projects List */}
          <div>
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
                    className="hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 animate-fade-in"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                            {project.title}
                          </CardTitle>
                          {project.status === 'generating' && (
                            <Badge variant="secondary" className="animate-pulse">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Generating
                            </Badge>
                          )}
                        </div>
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
    </div>
  </div>

      {/* Additional Feature Sections */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Trending Tags */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Trending Tags</h2>
              <p className="text-sm text-muted-foreground">Most used tags</p>
            </div>
          </div>
        </section>

        {/* Platform Statistics */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Platform Statistics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-blue-500">0</CardTitle>
                <p className="text-sm text-muted-foreground">Total Template Usage</p>
              </CardHeader>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-purple-500">0</CardTitle>
                <p className="text-sm text-muted-foreground">Total Tags</p>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Premium Templates Marketplace */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Premium Templates Marketplace</h2>
                <p className="text-sm text-muted-foreground">High-quality templates for your projects</p>
              </div>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No templates available yet</p>
            </CardContent>
          </Card>
        </section>

        {/* Team Workspaces */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Grid3x3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Team Workspaces</h2>
                <p className="text-sm text-muted-foreground">Collaborate with your team members</p>
              </div>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Button>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Workspaces</CardTitle>
            </CardHeader>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No workspaces yet. Create one to get started!</p>
            </CardContent>
          </Card>
        </section>

        {/* API Access */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">API Access</h2>
                <p className="text-sm text-muted-foreground">Programmatic project generation for businesses</p>
              </div>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create API Key
            </Button>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <p className="text-sm text-muted-foreground">Manage your API keys and access tokens</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No API keys created yet</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Backup & Restore */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Backup & Restore</h2>
              <p className="text-sm text-muted-foreground">Back up and manage all your projects</p>
            </div>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Current Data</h3>
                  <p className="text-sm text-muted-foreground">{projects.length} Your Projects</p>
                </div>
                <Button className="gap-2">
                  Create Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Usage Insights */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Usage Insights</h2>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Popular Templates</CardTitle>
              <p className="text-sm text-muted-foreground">Most used templates</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No template usage data available yet</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-base">
              Describe your vision and our AI will bring it to life. Be specific for best results.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Portfolio Website, Task Manager, Tic Tac Toe Game"
                value={newProject.title}
                onChange={(e) => {
                  setNewProject((prev) => ({ ...prev, title: e.target.value }));
                  if (validationErrors.title) {
                    setValidationErrors(prev => ({ ...prev, title: undefined }));
                  }
                }}
                className={validationErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                maxLength={100}
              />
              <div className="flex items-center justify-between">
                {validationErrors.title ? (
                  <p className="text-sm text-destructive">{validationErrors.title}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">3-100 characters</p>
                )}
                <p className="text-xs text-muted-foreground">{newProject.title.length}/100</p>
              </div>
            </div>
            
            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Template (Optional)</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "blank", label: "Blank", icon: "✨" },
                  { id: "website", label: "Website", icon: "🌐" },
                  { id: "game", label: "Game", icon: "🎮" },
                  { id: "app", label: "App", icon: "📱" }
                ].map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant={newProject.template === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewProject(prev => ({ ...prev, template: template.id }))}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-xl">{template.icon}</span>
                    <span className="text-xs">{template.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Project Description/Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-medium">
                What do you want to build? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="prompt"
                placeholder="Describe your project in detail. Example: Create a fully functional tic-tac-toe game with a clean, modern UI, score tracking, win/loss/draw detection, and a reset button."
                value={newProject.prompt}
                onChange={(e) => {
                  setNewProject((prev) => ({ ...prev, prompt: e.target.value }));
                  if (validationErrors.prompt) {
                    setValidationErrors(prev => ({ ...prev, prompt: undefined }));
                  }
                }}
                rows={5}
                className={validationErrors.prompt ? "border-destructive focus-visible:ring-destructive" : ""}
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                {validationErrors.prompt ? (
                  <p className="text-sm text-destructive">{validationErrors.prompt}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">10-1000 characters. Be specific!</p>
                )}
                <p className="text-xs text-muted-foreground">{newProject.prompt.length}/1000</p>
              </div>
            </div>

            {/* Example Prompts */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3 border">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <p className="text-sm font-medium">Professional Example Prompts:</p>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>"Build a modern landing page for a SaaS product with hero section, feature cards, pricing table, testimonials, and a contact form"</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>"Create a todo app with add/delete/edit functionality, mark as complete, filter by status, and local storage persistence"</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-medium">•</span>
                  <p>"Generate a professional portfolio website with animated hero, project showcase grid, skills section, timeline, and contact form"</p>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Pro Tips for Best Results:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Include specific features and functionality you want</li>
                  <li>• Mention desired design style (modern, minimal, colorful, etc.)</li>
                  <li>• List any interactive elements or animations needed</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewProject({ title: "", prompt: "", template: "blank" });
                setValidationErrors({});
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={creating || !newProject.title.trim() || !newProject.prompt.trim()}
              className="gap-2 min-w-[140px]"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setProjectToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
