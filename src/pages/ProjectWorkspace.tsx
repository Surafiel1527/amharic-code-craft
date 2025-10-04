import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Sparkles, Code, Eye, Settings } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartChatBuilder } from "@/components/SmartChatBuilder";
import { Skeleton } from "@/components/ui/skeleton";
import { EnterpriseProjectDashboard } from "@/components/EnterpriseProjectDashboard";
import { UserWorkspace } from "@/components/UserWorkspace";

interface Project {
  id: string;
  title: string;
  description: string | null;
  html_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("generate");
  const [autoGeneratePrompt, setAutoGeneratePrompt] = useState<string | null>(null);

  // Update active tab when role is loaded
  useEffect(() => {
    if (!roleLoading) {
      setActiveTab(isAdmin ? "builder" : "generate");
    }
  }, [isAdmin, roleLoading]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please log in to access projects");
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Load project and conversation
  useEffect(() => {
    if (!projectId || !user) return;

    const loadProject = async () => {
      try {
        // Load project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError) throw projectError;
        if (!projectData) {
          toast.error("Project not found");
          navigate("/");
          return;
        }

        setProject(projectData);

        // Check if we should auto-generate
        const urlParams = new URLSearchParams(window.location.search);
        const shouldGenerate = urlParams.get('generate') === 'true';

        // Load or create conversation for this project
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (convError) throw convError;

        if (conversations && conversations.length > 0) {
          setConversationId(conversations[0].id);
        } else {
          // Create new conversation for this project
          const { data: newConv, error: createError } = await supabase
            .from("conversations")
            .insert({
              user_id: user.id,
              project_id: projectId,
              title: `${projectData.title} - Conversation`,
              current_code: projectData.html_code,
            })
            .select()
            .single();

          if (createError) throw createError;
          setConversationId(newConv.id);
        }

        // Check for auto-generation parameters (new approach)
        const autoPrompt = urlParams.get('autoPrompt');
        
        if (autoPrompt) {
          console.log('🚀 Auto-prompt detected:', autoPrompt);
          setAutoGeneratePrompt(autoPrompt);
          // Clear URL parameter after capturing it
          window.history.replaceState({}, '', `/project/${projectId}`);
        } else if (shouldGenerate && projectData.prompt) {
          // Fallback: Legacy support for ?generate=true
          console.log('🚀 Legacy generate flag detected');
          setAutoGeneratePrompt(projectData.prompt);
          window.history.replaceState({}, '', `/project/${projectId}`);
        }
      } catch (error: any) {
        console.error("Error loading project:", error);
        toast.error(error.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, user, navigate]);

  const handleCodeUpdate = async (newCode: string) => {
    if (!projectId || !conversationId) return;

    try {
      // Update local state immediately for instant UI feedback
      setProject((prev) => prev ? { ...prev, html_code: newCode } : null);

      // Update project code in background
      const { error: projectError } = await supabase
        .from("projects")
        .update({ html_code: newCode, updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (projectError) throw projectError;

      // Update conversation code
      const { error: convError } = await supabase
        .from("conversations")
        .update({ current_code: newCode })
        .eq("id", conversationId);

      if (convError) throw convError;

      console.log("✅ Project code saved to database");
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast.error(error.message || "Failed to save project");
    }
  };

  if (authLoading || loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!project || !conversationId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {project.title}
                </h1>
                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCodeUpdate(project.html_code)}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3 lg:w-[400px]' : 'grid-cols-2 lg:w-[300px]'}`}>
            {!isAdmin && (
              <TabsTrigger value="generate" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="builder" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Builder
              </TabsTrigger>
            )}
            <TabsTrigger value="code" className="gap-2">
              <Code className="w-4 h-4" />
              Code
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="manage" className="gap-2">
                <Settings className="w-4 h-4" />
                Manage
              </TabsTrigger>
            )}
          </TabsList>

          {/* Generate Tab - For Regular Users */}
          {!isAdmin && (
            <TabsContent value="generate" className="space-y-4">
              <UserWorkspace
                projectId={projectId!}
                conversationId={conversationId}
                initialCode={project.html_code}
                onCodeUpdate={handleCodeUpdate}
                autoGeneratePrompt={autoGeneratePrompt}
              />
            </TabsContent>
          )}

          {/* AI Builder Tab - For Admins Only */}
          {isAdmin && (
            <TabsContent value="builder" className="space-y-4">
              <div className="bg-card rounded-lg border p-6">
                <SmartChatBuilder
                  onCodeGenerated={handleCodeUpdate}
                  currentCode={project.html_code}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="code" className="space-y-4">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Project Code</h3>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
              <div className="bg-muted rounded-md p-4">
                <pre className="text-sm overflow-auto max-h-[600px]">
                  <code>{project.html_code}</code>
                </pre>
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="manage" className="space-y-4">
              <EnterpriseProjectDashboard
                projectId={projectId}
                onCodeUpdate={handleCodeUpdate}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
