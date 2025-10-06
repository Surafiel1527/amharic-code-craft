import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Copy, Check, Clock, LogOut, Settings, Download, Shield, Layers, TrendingUp, Keyboard, Database, DollarSign, Users, Key, Code, Maximize2, Minimize2, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { TemplatesBrowser } from "@/components/TemplatesBrowser";
import { VersionHistory } from "@/components/VersionHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DevicePreview } from "@/components/DevicePreview";
import { FeaturedGallery } from "@/components/FeaturedGallery";
import { ExportOptions } from "@/components/ExportOptions";
import { ComponentLibrary } from "@/components/ComponentLibrary";
import { APIIntegration } from "@/components/APIIntegration";
import { ProjectAnalytics } from "@/components/ProjectAnalytics";
import { SecurityScanner } from "@/components/SecurityScanner";
import { PrivacySettings } from "@/components/PrivacySettings";
import { BackupRestore } from "@/components/BackupRestore";
import { UsageInsights } from "@/components/UsageInsights";
import PremiumTemplates from "@/components/PremiumTemplates";
import TeamWorkspaces from "@/components/TeamWorkspaces";
import APIAccessManager from "@/components/APIAccessManager";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { downloadHTML } from "@/utils/downloadHelpers";
import { useDynamicCustomizations } from "@/hooks/useDynamicCustomizations";
import { DynamicComponent } from "@/components/DynamicComponent";
import { PreviewBanner } from "@/components/PreviewBanner";
import { usePreviewMode } from "@/hooks/usePreviewMode";

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

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole(user?.id);
  const isOnline = useNetworkStatus();
  const { t } = useLanguage();

  const navigate = useNavigate();
  
  const EXAMPLE_PROMPTS = [
    {
      titleKey: "examples.coffee",
      promptKey: "examples.coffeePrompt",
      emoji: "☕"
    },
    {
      titleKey: "examples.blog",
      promptKey: "examples.blogPrompt",
      emoji: "📝"
    },
    {
      titleKey: "examples.business",
      promptKey: "examples.businessPrompt",
      emoji: "🏢"
    },
    {
      titleKey: "examples.portfolio",
      promptKey: "examples.portfolioPrompt",
      emoji: "🎨"
    },
  ];
  const [mode, setMode] = useState<"quick">("quick");
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<"quick" | "templates">("quick");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [quickHistory, setQuickHistory] = useState<Project[]>([]);

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Auto-enable preview mode if URL has ?preview=true parameter
  const urlPreviewMode = usePreviewMode();
  const { customizations, getDynamicStyles } = useDynamicCustomizations(urlPreviewMode || true, undefined, '/');
  const pendingCustomizations = customizations.filter((c: any) => c.status === 'pending');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('App installed successfully!');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      ctrl: true,
      handler: () => {
        setGeneratedCode("");
        setPrompt("");
        toast.success(t("toast.newProject"));
      },
      description: t("shortcuts.newProject"),
    },
    {
      key: "k",
      ctrl: true,
      handler: () => {
        if (generatedCode) {
          copyCode();
        }
      },
      description: t("shortcuts.copyCode"),
    },
    {
      key: "/",
      ctrl: true,
      handler: () => {
        setShowShortcuts(!showShortcuts);
      },
      description: t("shortcuts.show"),
    },
  ]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentProjects();
      fetchConversations();
      fetchQuickHistory();
    }
  }, [user]);

  const fetchRecentProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecentProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchQuickHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setQuickHistory(data || []);
    } catch (error) {
      console.error("Error fetching quick history:", error);
    }
  };

  const handleQuickGenerate = async () => {
    // Manual project creation - no AI generation
    if (!projectTitle.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    setIsGenerating(true);
    
    try {
      // Create blank project for manual development
      const { data: project, error: saveError } = await supabase
        .from("projects")
        .insert({
          title: projectTitle,
          prompt: prompt || "Manual project",
          html_code: "<!-- Start building your project here -->",
          user_id: user.id,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      if (project) {
        // Create conversation for this project
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            title: `Workspace: ${projectTitle}`,
            user_id: user.id,
            project_id: project.id
          })
          .select()
          .single();

        if (!convError && conversation) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            role: "assistant",
            content: `Project "${projectTitle}" created. You can now manually develop and deploy to Vercel.`
          });
        }

        toast.success("Project created! Opening workspace...");
        navigate(`/workspace/${project.id}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProject = async () => {
    // Simplified - projects are auto-saved when created
    toast.success(t("toast.saved"));
  };

  const loadProject = (project: Project) => {
    setPrompt(project.prompt);
    setGeneratedCode(project.html_code);
    setCurrentProjectId(project.id);
    toast.success(`"${project.title}" ${t("toast.projectLoaded")}`);
  };

  const useExamplePrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    toast.success(t("toast.exampleLoaded"));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success(t("toast.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedCode) {
      toast.error(t("toast.noCode"));
      return;
    }

    const filename = projectTitle.trim() 
      ? `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.html`
      : "website.html";
    
    downloadHTML(generatedCode, filename);
    toast.success(t("toast.downloaded"));
  };

  const createNewConversation = async () => {
    // Simplified - no longer needed
    toast.info("Create new project instead");
  };

  const handleCodeGenerated = (code: string) => {
    setGeneratedCode(code);
  };

  const handleConversationChange = (id: string) => {
    // Simplified - no longer needed
    fetchConversations();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Preview Banner */}
      {pendingCustomizations.length > 0 && (
        <div className="container mx-auto px-4 pt-4">
          <PreviewBanner
            pendingCount={pendingCustomizations.length}
            affectedPages={[...new Set(pendingCustomizations.map((c: any) => c.applied_changes?.page).filter(Boolean))]}
          />
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_91%_65%/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(142_76%_36%/0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-4 py-6 md:py-12 relative">
          <div className="max-w-4xl mx-auto text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-4 w-full gap-2">
              {/* Mobile-only Language Toggle */}
              <div className="md:hidden flex-shrink-0">
                <LanguageToggle />
              </div>

              {/* Desktop Badge - Hidden on Mobile, Centered on Desktop */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm text-primary animate-fade-in mx-auto">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {t("header.badge")}
              </div>

              {/* Desktop Navigation - Absolutely Hidden on Mobile */}
              <div className="hidden md:flex items-center gap-2 animate-fade-in flex-shrink-0" style={{ animationDelay: "100ms" }}>
                <LanguageToggle />
                <Button variant="outline" size="sm" onClick={() => navigate("/projects")} className="gap-2 hover-scale">
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden lg:inline">My Projects</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/explore")} className="gap-2 hover-scale">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden lg:inline">{t("header.explore")}</span>
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2 hover-scale">
                    <Shield className="h-4 w-4" />
                    <span className="hidden lg:inline">{t("header.admin")}</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  title="Keyboard Shortcuts (Ctrl+/)"
                  className="gap-2 hover-scale"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="gap-2 hover-scale">
                  <Settings className="h-4 w-4" />
                  <span className="hidden lg:inline">{t("header.settings")}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={signOut} className="gap-2 hover-scale">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">{t("header.logout")}</span>
                </Button>
              </div>

              {/* Mobile Navigation - Only Visible on Mobile */}
              <div className="md:hidden flex-shrink-0">
                <MobileNav 
                  isAdmin={isAdmin}
                  onShowShortcuts={() => setShowShortcuts(!showShortcuts)}
                  onSignOut={signOut}
                />
              </div>
            </div>
            
            <DynamicComponent name="Home-Hero-Title">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent leading-tight px-2">
                {t("hero.title")}
              </h1>
            </DynamicComponent>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid lg:grid-cols-[300px_1fr_2fr] gap-4 max-w-full mx-auto">
          {/* Editor Panel */}
          {!isPreviewExpanded && (
          <Card className="p-6 space-y-4 bg-card border-border shadow-lg lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "quick" | "templates")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {t("tabs.quick")}
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-2">
                  <Layers className="h-4 w-4" />
                  {t("tabs.templates")}
                </TabsTrigger>
              </TabsList>

                <TabsContent value="quick" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Main project creation area */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Create New Project</label>
                        <p className="text-sm text-muted-foreground">
                          Create a project manually and deploy it to Vercel when ready
                        </p>
                      </div>
                      
                      <Input
                        placeholder="Enter project title..."
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        className="text-base"
                      />
                      
                      <Textarea
                        placeholder="Optional: Add a description or notes (optional)"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                      
                      <Button
                        onClick={handleQuickGenerate}
                        disabled={isGenerating || !projectTitle.trim()}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Project...
                          </>
                        ) : (
                          <>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Create Project
                          </>
                        )}
                      </Button>

                      {generatedCode && (
                        <Button variant="outline" onClick={handleDownload} className="gap-2">
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      )}
                    </div>

                    {/* Quick History Panel */}
                    <div className="lg:col-span-1">
                      <Card className="p-4 h-full">
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-sm">{t("tabs.quickHistory")}</h3>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {quickHistory.length === 0 ? (
                            <div className="text-center py-8">
                              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                              <p className="text-sm font-medium text-muted-foreground">{t("tabs.noHistory")}</p>
                              <p className="text-xs text-muted-foreground mt-1">{t("tabs.noHistoryDesc")}</p>
                            </div>
                          ) : (
                            quickHistory.map((item) => (
                              <Card key={item.id} className="p-3 hover:bg-accent/50 transition-colors">
                                <div className="flex flex-col gap-2">
                                  <p className="text-sm font-medium line-clamp-2">{item.title.replace('Quick: ', '')}</p>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>{t("tabs.generatedAgo")} {new Date(item.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-1"
                                    onClick={() => loadProject(item)}
                                  >
                                    <Code className="h-3 w-3 mr-1" />
                                    {t("tabs.loadGeneration")}
                                  </Button>
                                </div>
                              </Card>
                            ))
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="mt-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                  <TemplatesBrowser
                    onSelectTemplate={(template) => {
                      setPrompt(template.prompt);
                      setGeneratedCode(template.html_code);
                      setActiveTab("quick");
                      toast.success(`"${template.title}" ${t("templates.loaded")}`);
                    }}
                  />
                </TabsContent>
              </Tabs>
          </Card>
          )}

          {/* Preview Panel */}
          <Card className={`p-6 space-y-4 bg-card border-border shadow-lg ${isPreviewExpanded ? 'col-span-full' : ''}`}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-2">
                🎨 {t("chat.preview")}
              </label>
              {generatedCode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    className="gap-2"
                    title={isPreviewExpanded ? "Exit full screen" : "Full screen"}
                  >
                    {isPreviewExpanded ? (
                      <Minimize2 className="h-3 w-3" />
                    ) : (
                      <Maximize2 className="h-3 w-3" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyCode} className="gap-2">
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        {t("chat.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        {t("chat.copy")}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="h-3 w-3" />
                    {t("chat.download")}
                  </Button>
                </div>
              )}
            </div>

            <DevicePreview generatedCode={generatedCode} />
          </Card>
        </div>
      </section>

      {/* Projects Section */}
      {recentProjects.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                {t("projects.title")}
              </h2>
            </div>
            <ProjectsGrid
              projects={recentProjects}
              onLoadProject={loadProject}
              onProjectsChange={fetchRecentProjects}
              isLoading={isLoadingProjects}
            />
          </div>
        </section>
      )}

      {/* Featured Projects Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <FeaturedGallery />
        </div>
      </section>

      {/* Backup & Restore Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            {t("section.backup")}
          </h2>
          <BackupRestore />
        </div>
      </section>

      {/* Usage Insights Section */}
      <section className="container mx-auto px-4 py-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {t("section.usage")}
          </h2>
          <UsageInsights />
        </div>
      </section>

      {/* Monetization Features */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Premium Templates Marketplace */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              {t("section.marketplace")}
            </h2>
            <PremiumTemplates />
          </div>

          {/* Team Workspaces */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {t("section.workspaces")}
            </h2>
            <TeamWorkspaces />
          </div>

          {/* API Access */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Key className="h-6 w-6 text-primary" />
              {t("section.apiAccess")}
            </h2>
            <APIAccessManager />
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("shortcuts.title")}</DialogTitle>
            <DialogDescription>{t("shortcuts.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm">{t("shortcuts.newProject")}</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl + N</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm">{t("shortcuts.saveProject")}</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm">{t("shortcuts.copyCode")}</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">{t("shortcuts.show")}</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl + /</kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <PWAInstallPrompt
          onInstall={handleInstallPWA}
          onDismiss={() => setShowInstallPrompt(false)}
        />
      )}
    </div>
  );
};

export default Index;
