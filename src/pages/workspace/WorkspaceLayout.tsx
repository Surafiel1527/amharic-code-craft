import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Maximize2, Minimize2, 
  RotateCcw, MessageSquarePlus, Save, Loader2, FileCode2, Code2, Sparkles, MessageSquare, Eye
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PatternLearner } from "@/components/PatternLearner";
import { VersionHistory } from "@/components/VersionHistory";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { CollaborativePresence } from "@/components/CollaborativePresence";
import { LiveGenerationProgress } from "@/components/LiveGenerationProgress";

interface Project {
  id: string;
  title: string;
  html_code: string;
  prompt: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  framework?: 'react' | 'html' | 'vue';
}

interface WorkspaceLayoutProps {
  viewMode: 'single' | 'multi';
  setViewMode: (mode: 'single' | 'multi') => void;
  editorMode: 'single' | 'split';
  setEditorMode: (mode: 'single' | 'split') => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  isPreviewExpanded: boolean;
  setIsPreviewExpanded: (expanded: boolean) => void;
  showVersionHistory: boolean;
  setShowVersionHistory: (show: boolean) => void;
  showConversations: boolean;
  setShowConversations: (show: boolean) => void;
  showMultiFileGen: boolean;
  setShowMultiFileGen: (show: boolean) => void;
  project: Project | null;
  conversationId: string | null;
  conversations: any[];
  isSaving: boolean;
  handleSave: () => void;
  handleRestoreVersion: (htmlCode: string) => void;
  handleConversationSelect: (id: string) => void;
  handleNewConversation: () => void;
  loadConversations: () => void;
  mobileTab?: 'chat' | 'preview' | 'code';
  setMobileTab?: (tab: 'chat' | 'preview' | 'code') => void;
  children: React.ReactNode;
}

export function WorkspaceLayout({
  viewMode,
  setViewMode,
  editorMode,
  setEditorMode,
  autoSaveEnabled,
  setAutoSaveEnabled,
  isPreviewExpanded,
  setIsPreviewExpanded,
  showVersionHistory,
  setShowVersionHistory,
  showConversations,
  setShowConversations,
  showMultiFileGen,
  setShowMultiFileGen,
  project,
  conversationId,
  conversations,
  isSaving,
  handleSave,
  handleRestoreVersion,
  handleConversationSelect,
  handleNewConversation,
  loadConversations,
  mobileTab: externalMobileTab,
  setMobileTab: externalSetMobileTab,
  children
}: WorkspaceLayoutProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const isMobile = useIsMobile();
  const [internalMobileTab, setInternalMobileTab] = useState<'chat' | 'preview' | 'code'>('preview');
  
  // Use external control if provided, otherwise use internal state
  const mobileTab = externalMobileTab || internalMobileTab;
  const setMobileTab = externalSetMobileTab || setInternalMobileTab;
  
  useEffect(() => {
    if (!project) {
      setIsGenerating(false);
      return;
    }
    
    const checkJobStatus = async () => {
      const { data: jobs } = await supabase
        .from('ai_generation_jobs')
        .select('status')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestJob = jobs?.[0];
      const activeStatuses = ['queued', 'generating'];
      const isActuallyGenerating = latestJob && activeStatuses.includes(latestJob.status);
      
      setIsGenerating(isActuallyGenerating);
    };
    
    checkJobStatus();
  }, [project]);
  
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background">
        <LiveGenerationProgress 
          projectId={project.id}
          onComplete={() => window.location.reload()}
          onCancel={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <PatternLearner />
      
      {/* Header - Hidden on mobile */}
      <div className={`border-b bg-card/50 backdrop-blur-sm ${isMobile ? 'hidden' : 'block'}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{project.title}</h1>
              <p className="text-sm text-muted-foreground">Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'single' | 'multi')}>
              <TabsList>
                <TabsTrigger value="single">Single File</TabsTrigger>
                <TabsTrigger value="multi">Multi-File</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Version History</DialogTitle>
                </DialogHeader>
                <VersionHistory 
                  projectId={project.id} 
                  onRestore={handleRestoreVersion}
                />
              </DialogContent>
            </Dialog>
            
            <Sheet open={showConversations} onOpenChange={setShowConversations}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquarePlus className="w-4 h-4 mr-2" />
                  Chats
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[350px]">
                <SheetHeader>
                  <SheetTitle>Conversations</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <ConversationSidebar
                    conversations={conversations}
                    activeConversation={conversationId}
                    onConversationSelect={handleConversationSelect}
                    onNewConversation={handleNewConversation}
                    onConversationsChange={loadConversations}
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'single' ? 'multi' : 'single')}
              className="gap-2"
            >
              {viewMode === 'single' ? (
                <>
                  <FileCode2 className="h-4 w-4" />
                  Multi-File Mode
                </>
              ) : (
                <>
                  <Code2 className="h-4 w-4" />
                  Single-File Mode
                </>
              )}
            </Button>
            
            {viewMode === 'multi' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMultiFileGen(!showMultiFileGen)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Project
                </Button>
                <Button
                  variant={editorMode === 'split' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode(editorMode === 'single' ? 'split' : 'single')}
                  className="gap-2"
                >
                  <Code2 className="h-4 h-4" />
                  {editorMode === 'split' ? 'Split View' : 'Single View'}
                </Button>
                <Button
                  variant={autoSaveEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setAutoSaveEnabled(!autoSaveEnabled);
                    toast.success(autoSaveEnabled ? 'Auto-save disabled' : 'Auto-save enabled');
                  }}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Auto-save {autoSaveEnabled ? 'ON' : 'OFF'}
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
            >
              {isPreviewExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <CollaborativePresence projectId={projectId!} />

      {/* Main Content */}
      {isMobile ? (
        <>
          {/* Mobile: Single View Based on Active Tab */}
          <div className="flex-1 overflow-hidden pb-16">
            {children}
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm z-50">
            <div className="flex items-center justify-around px-2 py-3">
              <button
                onClick={() => setMobileTab('chat')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  mobileTab === 'chat' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs font-medium">Chat</span>
              </button>
              
              <button
                onClick={() => setMobileTab('preview')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  mobileTab === 'preview' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="h-5 w-5" />
                <span className="text-xs font-medium">Preview</span>
              </button>
              
              <button
                onClick={() => setMobileTab('code')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  mobileTab === 'code' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="h-5 w-5" />
                <span className="text-xs font-medium">Code</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Desktop: Side-by-side layout */
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}
