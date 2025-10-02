import { SmartChatBuilder } from "@/components/SmartChatBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { AICapabilitiesGuide } from "@/components/AICapabilitiesGuide";
import { TestGenerator } from "@/components/TestGenerator";
import { RefactoringAssistant } from "@/components/RefactoringAssistant";
import { DependencyIntelligence } from "@/components/DependencyIntelligence";
import { DocumentationGenerator } from "@/components/DocumentationGenerator";
import { CollaborationHub } from "@/components/CollaborationHub";

export default function Builder() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const [activeDevTool, setActiveDevTool] = useState<string>("testing");

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please log in to access the AI Builder");
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Redirect to home if not admin
  useEffect(() => {
    if (authLoading || roleLoading) return;
    
    if (user && !roleLoading && !isAdmin) {
      toast.error("Access denied. AI Builder is only available to administrators.");
      navigate("/");
    }
  }, [authLoading, roleLoading, isAdmin, user, navigate]);

  // Show loading while checking permissions
  if (authLoading || roleLoading || !user || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-primary" />
                AI Code Builder
              </h1>
              <p className="text-muted-foreground">
                Generate complete applications with AI-powered multi-file generation
              </p>
            </div>
          </div>
          <AICapabilitiesGuide />
        </div>

        {/* Main Builder with Tabs */}
        <TooltipProvider>
          <Tabs defaultValue="builder" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="builder" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Builder</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI-powered code generation with multi-file support</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="devtools" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span>Development Tools</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Professional tools for testing, refactoring, docs & collaboration</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>

          <TabsContent value="builder" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Smart Chat Builder</CardTitle>
                <CardDescription>
                  Describe what you want to build, and the AI will generate complete, working code with proper file organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SmartChatBuilder />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devtools" className="mt-6 space-y-6">
            {/* Dev Tools Sub-Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Development Tools Suite
                </CardTitle>
                <CardDescription>
                  Professional-grade tools to enhance your development workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeDevTool} onValueChange={setActiveDevTool} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="testing" className="flex items-center gap-1 text-xs sm:text-sm">
                          <span>🧪</span>
                          <span className="hidden sm:inline">Tests</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Automatically generate unit tests for your components</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="refactor" className="flex items-center gap-1 text-xs sm:text-sm">
                          <span>🔄</span>
                          <span className="hidden sm:inline">Refactor</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Get AI suggestions to improve code quality and structure</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="deps" className="flex items-center gap-1 text-xs sm:text-sm">
                          <span>📦</span>
                          <span className="hidden sm:inline">Deps</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Audit dependencies for security and outdated packages</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="docs" className="flex items-center gap-1 text-xs sm:text-sm">
                          <span>📝</span>
                          <span className="hidden sm:inline">Docs</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generate comprehensive documentation for your code</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="collab" className="flex items-center gap-1 text-xs sm:text-sm">
                          <span>👥</span>
                          <span className="hidden sm:inline">Collab</span>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Real-time collaboration sessions with your team</p>
                      </TooltipContent>
                    </Tooltip>
                  </TabsList>

                  <TabsContent value="testing" className="mt-6">
                    <TestGenerator />
                  </TabsContent>

                  <TabsContent value="refactor" className="mt-6">
                    <RefactoringAssistant />
                  </TabsContent>

                  <TabsContent value="deps" className="mt-6">
                    <DependencyIntelligence />
                  </TabsContent>

                  <TabsContent value="docs" className="mt-6">
                    <DocumentationGenerator />
                  </TabsContent>

                  <TabsContent value="collab" className="mt-6">
                    <CollaborationHub />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </TooltipProvider>

        {/* Quick Tips */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🧠 Smart Memory</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>The AI remembers your entire project, even with 40+ functions. It maintains consistency across all changes.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🗂️ Multi-File</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Request complete features and get multiple organized files: components, hooks, types, and utilities.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🛡️ Self-Healing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Errors are automatically detected and fixed. The system learns from every fix to prevent future issues.</p>
            </CardContent>
          </Card>
        </div>

        {/* Example Prompts */}
        <Card>
          <CardHeader>
            <CardTitle>💡 Example Prompts</CardTitle>
            <CardDescription>Try these to see the AI in action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <strong>Authentication System:</strong> "Create a complete auth system with login, signup, password reset components, useAuth hook, auth types, and API utilities"
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong>Dashboard:</strong> "Build a dashboard with sidebar navigation, header, stats cards, and 3 different chart components"
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong>CRUD Feature:</strong> "Generate a todo app with TodoList, TodoItem, TodoForm components, useTodos hook, Todo types, and API functions"
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong>Social Features:</strong> "Create a social media feed with Post, Comment, Like components, usePost and useComments hooks, and API integration"
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
