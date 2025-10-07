import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Textarea removed - no longer needed
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Save, ArrowLeft, Maximize2, Minimize2, 
  History, Code2, Eye, Sparkles, RotateCcw, Download, Code, FileCode2, Rocket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DevicePreview } from "@/components/DevicePreview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VersionHistory } from "@/components/VersionHistory";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PatternLearner } from "@/components/PatternLearner";
// OrchestrationProgress, ArchitecturePlanViewer, QualityMetrics removed - handled by UniversalChatInterface
import { FileTree } from "@/components/FileTree";
import { CodeEditor } from "@/components/CodeEditor";
import { ComponentTemplates } from "@/components/ComponentTemplates";
import { CollaborativePresence } from "@/components/CollaborativePresence";
import { MultiFileGenerator } from "@/components/MultiFileGenerator";
import { EnhancedFileTree } from "@/components/EnhancedFileTree";
import { SplitPaneEditor } from "@/components/SplitPaneEditor";
import { FileTemplatesLibrary } from "@/components/FileTemplatesLibrary";
import { DependencyGraph } from "@/components/DependencyGraph";
import { CodeMetrics } from "@/components/CodeMetrics";
import { useAutoSave } from "@/hooks/useAutoSave";
import { ConversationMemory } from "@/components/ConversationMemory";
import { AIImageGenerator } from "@/components/AIImageGenerator";
import { IntelligentRefactoring } from "@/components/IntelligentRefactoring";
import { ProactiveAIAssistant } from "@/components/ProactiveAIAssistant";
import { PatternIntelligenceDashboard } from "@/components/PatternIntelligenceDashboard";
import { UniversalChatInterface } from "@/components/UniversalChatInterface";
import { ReactComponentGenerator } from "@/components/ReactComponentGenerator";
import { TailwindUtilitiesBuilder } from "@/components/TailwindUtilitiesBuilder";
import { StateManagementHelper } from "@/components/StateManagementHelper";
import { AdvancedTestGenerator } from "@/components/AdvancedTestGenerator";
import { CICDPipelineBuilder } from "@/components/CICDPipelineBuilder";
import { APITestingSuite } from "@/components/APITestingSuite";
import { DeploymentManager } from "@/components/DeploymentManager";
import { CollaborativeCodeEditor } from "@/components/CollaborativeCodeEditor";
import { CodeReviewPanel } from "@/components/CodeReviewPanel";
import { TemplatesGallery } from "@/components/TemplatesGallery";
import { UsageAnalyticsDashboard } from "@/components/UsageAnalyticsDashboard";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { AICodeReview } from "@/components/AICodeReview";
import { SmartDebugger } from "@/components/SmartDebugger";
import { LiveGenerationProgress } from "@/components/LiveGenerationProgress";
// PythonProjectViewer removed - handled by UniversalChatInterface
import { LanguageCapabilities } from "@/components/LanguageCapabilities";
// orchestrationHelpers removed - no longer needed

// Message interface removed - now handled by UniversalChatInterface

interface Project {
  id: string;
  title: string;
  html_code: string;
  prompt: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Multi-file system state
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [showMultiFileGen, setShowMultiFileGen] = useState(false);
  const [editorMode, setEditorMode] = useState<'single' | 'split'>('single');
  const [showMetrics, setShowMetrics] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const handleRestoreVersion = async (htmlCode: string) => {
    if (!project) return;
    
    try {
      // Update local state
      setProject(prev => prev ? { ...prev, html_code: htmlCode } : null);
      
      // Save directly to database
      const { error } = await supabase
        .from('projects')
        .update({ 
          html_code: htmlCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;
      
      setShowVersionHistory(false);
      toast.success("✅ Version restored! Refreshing preview...");
      
      // Force reload the page to show restored version in preview
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Restore error:', error);
      toast.error("Failed to restore version");
    }
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please log in to access your workspace");
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Load project
  useEffect(() => {
    if (!projectId || !user) return;

    const loadProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast.error("Failed to load project");
        navigate("/");
        return;
      }

      setProject(data);
      
      // Create or load conversation
      let convId: string | undefined;
      
      // Try to get the first conversation for this project
      const { data: existingConvs } = await (supabase
        .from('conversations')
        .select('id') as any)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .limit(1);
      
      if (existingConvs && existingConvs.length > 0) {
        convId = existingConvs[0].id;
      }

      if (!convId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ 
            title: `Workspace: ${data.title}`,
            user_id: user.id,
            project_id: projectId
          })
          .select('id')
          .single();
        
        convId = newConv?.id;
        
        // Insert the original prompt as the first message
        if (convId && data.prompt) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'user',
            content: data.prompt,
            metadata: { isOriginalPrompt: true }
          });
          
          // Insert a system message showing the project was created
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: `✨ I've created your project: **${data.title}**\n\nYour website is ready! You can now make changes by describing what you want to update.`,
            generated_code: data.html_code,
            metadata: { isInitialGeneration: true }
          });
        }
      }

      if (convId) {
        setConversationId(convId);
      }
    };

    loadProject();

    // Subscribe to real-time updates for this project
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          console.log('Project updated:', payload);
          const updatedProject = payload.new as Project;
          
          // Update project state with new data
          setProject(updatedProject);
          
          // Show notification if html_code was updated (generation completed)
          if (updatedProject.html_code && updatedProject.title && !updatedProject.title.includes('[Generating...]')) {
            toast.success('✅ Project generation completed!');
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user, navigate]);

  // Auto-scroll removed - handled by UniversalChatInterface

  // Load project files for multi-file mode
  useEffect(() => {
    if (!projectId) return;
    
    const loadProjectFiles = async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('file_path');

      if (!error && data) {
        setProjectFiles(data);
      }
    };

    loadProjectFiles();
  }, [projectId, project?.html_code]); // Reload when project code changes (e.g., after restore)

  const handleCreateFile = async (path: string, type: 'file' | 'folder') => {
    if (!projectId || !user) return;
    
    // Normalize path for root-level config files (like vercel.json)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    const { error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_path: normalizedPath,
        file_content: type === 'file' ? '' : '', // Empty for new files
        file_type: normalizedPath.split('.').pop() || 'txt',
        created_by: user.id
      });

    if (error) {
      console.error('Create file error:', error);
      toast.error('Failed to create file');
      return;
    }

    toast.success(`Created ${normalizedPath}`);
    // Reload files
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);
    
    if (data) setProjectFiles(data);
  };

  const handleDeleteFile = async (path: string) => {
    if (!projectId) return;
    
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('project_id', projectId)
      .eq('file_path', path);

    if (error) {
      toast.error('Failed to delete file');
      return;
    }

    toast.success('File deleted');
    setProjectFiles(prev => prev.filter(f => f.file_path !== path));
    setSelectedFiles(prev => prev.filter(p => p !== path));
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!projectId) return;
    
    const { error } = await supabase
      .from('project_files')
      .update({ file_path: newPath })
      .eq('project_id', projectId)
      .eq('file_path', oldPath);

    if (error) {
      toast.error('Failed to rename file');
      return;
    }

    toast.success('File renamed');
    setProjectFiles(prev => 
      prev.map(f => f.file_path === oldPath ? { ...f, file_path: newPath } : f)
    );
    setSelectedFiles(prev => prev.map(p => p === oldPath ? newPath : p));
  };

  const handleSaveFile = async (content: string) => {
    if (!projectId || selectedFiles.length === 0) return;
    
    const filePath = selectedFiles[0];
    
    // Check if file exists
    const existingFile = projectFiles.find(f => f.file_path === filePath);
    
    if (existingFile) {
      // Update existing file
      const { error } = await supabase
        .from('project_files')
        .update({ 
          file_content: content,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('file_path', filePath);

      if (error) {
        console.error('Save error:', error);
        toast.error('Failed to save file');
        return;
      }

      setProjectFiles(prev =>
        prev.map(f => f.file_path === filePath ? { ...f, file_content: content } : f)
      );
    } else {
      // Create new file if it doesn't exist
      const { error } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_path: filePath,
          file_content: content,
          file_type: filePath.split('.').pop() || 'txt',
          created_by: user?.id
        });

      if (error) {
        console.error('Create error:', error);
        toast.error('Failed to create file');
        return;
      }

      // Reload files to include the new one
      const { data } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);
      
      if (data) setProjectFiles(data);
    }
    
    if (!autoSaveEnabled) {
      toast.success('File saved');
    }
  };

  // Auto-save for project files
  useAutoSave(projectFiles, {
    delay: 3000,
    enabled: autoSaveEnabled && viewMode === 'multi',
    onSave: async (files) => {
      // Only auto-save modified files
      console.log('Auto-saving files...');
    }
  });

  const handleBulkDelete = async (paths: string[]) => {
    if (!projectId) return;
    
    for (const path of paths) {
      await handleDeleteFile(path);
    }
  };

  const handleSelectFile = (path: string, multiSelect?: boolean) => {
    if (multiSelect) {
      setSelectedFiles(prev => 
        prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
      );
    } else {
      setSelectedFiles([path]);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          html_code: project.html_code,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;
      toast.success("Project saved successfully");
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCode = () => {
    if (!project) return;
    
    try {
      const blob = new Blob([project.html_code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Code downloaded successfully!");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download code");
    }
  };

  // handleSendMessage removed - now handled by UniversalChatInterface

  // Check if project is still generating
  const isGenerating = project && project.title.includes('[Generating...]');
  
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show generating state with live progress
  if (isGenerating || (project && !project.html_code)) {
    return (
      <div className="min-h-screen bg-background">
        <LiveGenerationProgress 
          projectId={project.id}
          onComplete={() => {
            // Reload project data when generation completes
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Mobile Chat - Fixed at Bottom (Removed separate floating button) */}
      
      <PatternLearner />
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
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

      {/* Collaborative Presence */}
      <CollaborativePresence projectId={projectId!} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'multi' ? (
          /* Multi-File View */
          <>
            {showMultiFileGen && (
              <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-background/95 p-4 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Multi-File Project Generator</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMultiFileGen(false)}
                    >
                      Close
                    </Button>
                  </div>
                  <MultiFileGenerator
                    projectId={projectId!}
                    conversationId={conversationId!}
                    onFilesGenerated={() => {
                      // Reload files
                      const loadFiles = async () => {
                        const { data } = await supabase
                          .from('project_files')
                          .select('*')
                          .eq('project_id', projectId);
                        if (data) setProjectFiles(data);
                      };
                      loadFiles();
                      setShowMultiFileGen(false);
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex h-full">
              {/* File Tree */}
              <div className="w-64">
                <EnhancedFileTree
                  files={projectFiles}
                  selectedFiles={selectedFiles}
                  onSelectFile={handleSelectFile}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                  onBulkDelete={handleBulkDelete}
                />
              </div>

              {/* Code Editor or Split Pane */}
              <div className="flex-1 border-r">
                {editorMode === 'split' ? (
                  <SplitPaneEditor
                    files={projectFiles}
                    onSave={(path, content) => {
                      setSelectedFiles([path]);
                      handleSaveFile(content);
                    }}
                    initialFile={selectedFiles[0] || null}
                  />
                ) : (
                  <CodeEditor
                    filePath={selectedFiles[0] || null}
                    initialContent={projectFiles.find(f => f.file_path === selectedFiles[0])?.file_content || ''}
                    onSave={handleSaveFile}
                  />
                )}
              </div>

              {/* Right Sidebar - Enhanced with Phase 2 Features */}
              <div className="w-96">
                <Tabs defaultValue="templates">
                  <TabsList className="w-full grid grid-cols-3 lg:grid-cols-17">
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="deps">Deps</TabsTrigger>
                    <TabsTrigger value="refactor">Refactor</TabsTrigger>
                    <TabsTrigger value="proactive">Proactive</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="framework">Framework</TabsTrigger>
                    <TabsTrigger value="state">State</TabsTrigger>
                    <TabsTrigger value="testing">Testing</TabsTrigger>
                    <TabsTrigger value="deploy">Deploy</TabsTrigger>
                    <TabsTrigger value="ai">AI</TabsTrigger>
                    <TabsTrigger value="languages">Languages</TabsTrigger>
                    <TabsTrigger value="collab">Collab</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                    <TabsTrigger value="debug">Debug</TabsTrigger>
                    <TabsTrigger value="gallery">Gallery</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="perf">Performance</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="templates" className="h-[calc(100vh-200px)]">
                    <FileTemplatesLibrary
                      onSelectTemplate={(template, fileName) => {
                        handleCreateFile(fileName, 'file');
                        toast.success(`Created ${fileName} from template`);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="metrics" className="h-[calc(100vh-200px)] overflow-auto">
                    {selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0]) && (
                      <CodeMetrics
                        code={projectFiles.find(f => f.file_path === selectedFiles[0])!.file_content}
                        filePath={selectedFiles[0]}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="deps" className="h-[calc(100vh-200px)]">
                    <DependencyGraph
                      files={projectFiles}
                      selectedFile={selectedFiles[0]}
                    />
                  </TabsContent>

                  <TabsContent value="refactor" className="h-[calc(100vh-200px)]">
                    {selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0]) && (
                      <IntelligentRefactoring
                        code={projectFiles.find(f => f.file_path === selectedFiles[0])!.file_content}
                        filePath={selectedFiles[0]}
                        onApplySuggestion={(newCode) => {
                          handleSaveFile(newCode);
                        }}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="proactive" className="h-[calc(100vh-200px)]">
                    {selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0]) && (
                      <ProactiveAIAssistant
                        projectId={projectId}
                        currentFile={selectedFiles[0]}
                        currentCode={projectFiles.find(f => f.file_path === selectedFiles[0])!.file_content}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="chat" className="h-[calc(100vh-200px)]">
                    <UniversalChatInterface
                      mode="panel"
                      height="h-full"
                      projectId={projectId}
                      selectedFiles={selectedFiles}
                      projectFiles={projectFiles}
                      onCodeApply={async (code, filePath) => {
                        const fileExists = projectFiles.some(f => f.file_path === filePath);
                        if (fileExists) {
                          setSelectedFiles([filePath]);
                          await handleSaveFile(code);
                        } else {
                          toast.error('File not found');
                        }
                      }}
                      autoLearn={true}
                      autoApply={true}
                      showContext={true}
                      persistMessages={true}
                    />
                  </TabsContent>

                  <TabsContent value="framework" className="h-[calc(100vh-200px)] overflow-auto">
                    <div className="space-y-4">
                      <ReactComponentGenerator
                        onComponentGenerated={(code, fileName) => {
                          handleCreateFile(fileName, 'file');
                          // Save the generated code
                          toast.success(`Generated ${fileName}`);
                        }}
                      />
                      <TailwindUtilitiesBuilder />
                    </div>
                  </TabsContent>

                  <TabsContent value="state" className="h-[calc(100vh-200px)]">
                    <StateManagementHelper />
                  </TabsContent>

                  <TabsContent value="testing" className="h-[calc(100vh-200px)] overflow-auto">
                    <div className="space-y-4">
                      <AdvancedTestGenerator />
                      <APITestingSuite />
                    </div>
                  </TabsContent>

                  <TabsContent value="deploy" className="h-[calc(100vh-200px)] overflow-auto">
                    <div className="space-y-4">
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">Vercel Deployment</h3>
                            <p className="text-sm text-muted-foreground">Deploy your project to production</p>
                          </div>
                          <Button
                            onClick={() => navigate(`/deploy/${projectId}`)}
                            className="gap-2"
                          >
                            <Rocket className="h-4 w-4" />
                            Open Deployment Manager
                          </Button>
                        </div>
                      </Card>
                      <CICDPipelineBuilder />
                      <DeploymentManager />
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="h-[calc(100vh-200px)] overflow-auto">
                    <div className="space-y-4">
                      {conversationId && user && (
                        <ConversationMemory
                          conversationId={conversationId}
                          userId={user.id}
                        />
                      )}
                      {user && (
                        <PatternIntelligenceDashboard userId={user.id} />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="languages" className="h-[calc(100vh-200px)] overflow-auto">
                    <LanguageCapabilities />
                  </TabsContent>

                  <TabsContent value="collab" className="h-[calc(100vh-200px)] overflow-auto">
                    <CollaborativeCodeEditor
                      projectId={projectId}
                      initialCode={selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0])?.file_content || ''}
                      onCodeChange={handleSaveFile}
                    />
                  </TabsContent>

                  <TabsContent value="review" className="h-[calc(100vh-200px)] overflow-auto">
                    <div className="space-y-4">
                      {selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0]) && (
                        <AICodeReview
                          code={projectFiles.find(f => f.file_path === selectedFiles[0])!.file_content}
                          filePath={selectedFiles[0]}
                          language="typescript"
                        />
                      )}
                      <CodeReviewPanel projectId={projectId} />
                    </div>
                  </TabsContent>

                  <TabsContent value="debug" className="h-[calc(100vh-200px)] overflow-auto">
                    <SmartDebugger
                      projectId={projectId}
                      code={selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0])?.file_content}
                    />
                  </TabsContent>

                  <TabsContent value="gallery" className="h-[calc(100vh-200px)] overflow-auto">
                    <TemplatesGallery />
                  </TabsContent>

                  <TabsContent value="analytics" className="h-[calc(100vh-200px)] overflow-auto">
                    <UsageAnalyticsDashboard />
                  </TabsContent>

                  <TabsContent value="perf" className="h-[calc(100vh-200px)] overflow-auto">
                    <PerformanceMonitor projectId={projectId} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        ) : (
          /* Single-File View - Now uses UniversalChatInterface */
          <div className={`flex h-full ${isPreviewExpanded ? '' : 'lg:flex-row flex-col'} transition-all`}>
            {/* Chat Panel */}
            <div className={`flex flex-col border-r bg-card/30 transition-all ${
              isPreviewExpanded 
                ? 'fixed bottom-0 left-0 right-0 h-20 border-t border-r-0 z-50' 
                : 'lg:w-[480px] w-full md:relative fixed bottom-0 left-0 right-0 md:h-auto h-[50vh] z-40'
            }`}>
              {isPreviewExpanded ? (
                <div className="p-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Exit fullscreen to access AI chat
                  </p>
                </div>
              ) : (
                <UniversalChatInterface
                  mode="sidebar"
                  height="h-full"
                  conversationId={conversationId || undefined}
                  projectId={projectId}
                  selectedFiles={['main-project']}
                  projectFiles={project ? [{
                    file_path: 'main-project',
                    file_content: project.html_code
                  }] : []}
                  onCodeApply={async (code) => {
                    // Update project with new code
                    setProject(prev => prev ? { ...prev, html_code: code } : null);
                    
                    // Auto-save to database
                    if (project) {
                      const { data: versions } = await supabase
                        .from('project_versions')
                        .select('version_number')
                        .eq('project_id', project.id)
                        .order('version_number', { ascending: false })
                        .limit(1);

                      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

                      await Promise.all([
                        supabase.from('projects').update({ 
                          html_code: code,
                          updated_at: new Date().toISOString()
                        }).eq('id', project.id),
                        
                        supabase.from('project_versions').insert({
                          project_id: project.id,
                          version_number: nextVersion,
                          html_code: code,
                          changes_summary: 'AI-generated update'
                        })
                      ]);

                      toast.success("Project updated successfully");
                    }
                  }}
                  persistMessages={true}
                  autoLearn={true}
                  autoApply={true}
                  showContext={true}
                  showHeader={true}
                  showFooter={true}
                  placeholder="Describe what you want to add or improve..."
                />
              )}
            </div>

            {/* Preview Panel */}
            <div className={`flex flex-col bg-background ${
              isPreviewExpanded 
                ? 'w-full' 
                : 'flex-1 md:pb-0 pb-[50vh]'
            }`}>
              {!isPreviewExpanded && (
                <div className="p-4 border-b">
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="preview">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="code">
                        <Code className="w-4 h-4 mr-2" />
                        Code
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="mt-4">
                      <DevicePreview generatedCode={project.html_code} />
                    </TabsContent>
                    <TabsContent value="code" className="mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Project Code</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCode}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download HTML
                          </Button>
                        </div>
                        <ScrollArea className="h-[500px] border rounded-lg">
                          <pre className="text-xs bg-muted p-4 overflow-x-auto">
                            <code>{project.html_code}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              {isPreviewExpanded && (
                <div className="flex-1 overflow-hidden p-0">
                  <DevicePreview generatedCode={project.html_code} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
