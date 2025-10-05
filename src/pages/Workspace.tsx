import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Send, Save, ArrowLeft, Maximize2, Minimize2, 
  History, Code2, Eye, MessageSquare, Sparkles, RotateCcw, Target, Download, Code, FileCode2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DevicePreview } from "@/components/DevicePreview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { VersionHistory } from "@/components/VersionHistory";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PatternLearner } from "@/components/PatternLearner";
import { OrchestrationProgress } from "@/components/OrchestrationProgress";
import { ArchitecturePlanViewer } from "@/components/ArchitecturePlanViewer";
import { QualityMetrics } from "@/components/QualityMetrics";
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
import { EnhancedChatInterface } from "@/components/EnhancedChatInterface";
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
import { PythonProjectViewer } from "@/components/PythonProjectViewer";
import { LanguageCapabilities } from "@/components/LanguageCapabilities";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  orchestrationData?: {
    phases: any[];
    plan?: any;
    qualityMetrics?: any;
    totalDuration?: number;
  };
  pythonProject?: {
    projectName: string;
    description: string;
    framework: string;
    files: Array<{ path: string; content: string }>;
    setupInstructions: string[];
  };
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string>('');
  const [currentOrchestration, setCurrentOrchestration] = useState<{
    phases: any[];
    plan?: any;
    qualityMetrics?: any;
    totalDuration?: number;
  } | null>(null);
  
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
    
    setProject(prev => prev ? { ...prev, html_code: htmlCode } : null);
    await handleSave();
    setShowVersionHistory(false);
    toast.success("Version restored successfully");
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
      
      // Try to get the first conversation for this project (with explicit typing)
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
      }

      if (convId) {
        setConversationId(convId);

        // Load existing messages
        const { data: existingMessages } = await (supabase
          .from('messages')
          .select('*') as any)
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (existingMessages && existingMessages.length > 0) {
          setMessages(existingMessages.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.created_at
          })));
        } else {
          // Add initial context message only if no messages exist
          const initialMsg = {
            role: 'assistant' as const,
            content: `Welcome to your workspace! I can help you enhance "${data.title}".\n\n✨ I can now work with:\n• React/TypeScript (live preview)\n• Python projects (download & run)\n• Mobile apps (Capacitor)\n\nWhat would you like to create or improve?`,
            timestamp: new Date().toISOString()
          };
          setMessages([initialMsg]);
          
          // Save initial message
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: initialMsg.role,
            content: initialMsg.content
          });
        }
      }
    };

    loadProject();
  }, [projectId, user, navigate]);

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
  }, [projectId]);

  const handleCreateFile = async (path: string, type: 'file' | 'folder') => {
    if (!projectId || !user) return;
    
    const { error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_path: path,
        file_content: type === 'file' ? '// New file\n' : '',
        file_type: path.split('.').pop() || 'txt',
        created_by: user.id
      });

    if (error) {
      toast.error('Failed to create file');
      return;
    }

    toast.success('File created');
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
    const { error } = await supabase
      .from('project_files')
      .update({ 
        file_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('file_path', filePath);

    if (error) {
      toast.error('Failed to save file');
      return;
    }

    setProjectFiles(prev =>
      prev.map(f => f.file_path === filePath ? { ...f, file_content: content } : f)
    );
    
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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !project || !conversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);
    setThinkingMessage('🧠 Reading your project...');

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: userMessage.role,
      content: userMessage.content
    });

    try {
      // Detect if this is conversational (not a code request)
      const conversationalPatterns = /^(thank you|thanks|thx|ok|okay|great|awesome|nice|cool|got it|understood|yes|no|hi|hello|hey|bye|help|what|how|when|why|can you|could you|please|let's|discuss|proposal|question|tell me|explain|show me)[\s\?\!\.]*$/i;
      const isConversational = conversationalPatterns.test(userInput.trim()) || 
                               (userInput.trim().length < 50 && !userInput.match(/\b(create|build|add|make|generate|update|change|modify|fix|remove|delete)\b/i));

      if (isConversational) {
        setThinkingMessage('💭 Thinking about your message...');
        // Handle conversational messages with simple AI chat
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session. Please log in again.');
        }

        // Get recent conversation context (last 10 messages)
        const conversationHistory = messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content
        }));

        // Use a simple chat endpoint for conversation
        const { data, error } = await supabase.functions.invoke('chat-generate', {
          body: {
            message: userInput,
            conversationHistory,
            currentCode: null, // Don't include code for casual chat
            userId: user?.id // Include user ID for personalization
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) throw error;

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || "I'm here to help! What would you like to work on?",
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Save assistant message to database
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: assistantMessage.role,
          content: assistantMessage.content
        });

        setIsLoading(false);
        setThinkingMessage('');
        return;
      }

      // For code requests, use the full orchestrator
      setThinkingMessage('🔍 Analyzing your request...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // Initialize orchestration tracking
      setCurrentOrchestration({ phases: [] });
      setThinkingMessage('📐 Planning the best approach...');

      // Get conversation context for better understanding
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      setThinkingMessage('🚀 Working on your request...');
      // Use smart orchestrator for enhancement
      const { data, error } = await supabase.functions.invoke('smart-orchestrator', {
        body: {
          userRequest: userInput,
          conversationId,
          currentCode: project.html_code,
          conversationHistory, // Pass context
          autoRefine: true,
          autoLearn: true
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setThinkingMessage('✨ Finalizing...');
      
      // Check if this is a Python project response
      const isPythonProject = data.projectType === 'python' || data.projectData;
      
      if (isPythonProject) {
        // Handle Python project generation
        const pythonMessage: Message = {
          role: 'assistant',
          content: data.message || `Python project "${data.projectData.projectName}" generated successfully! Download it below.`,
          timestamp: new Date().toISOString(),
          pythonProject: data.projectData
        };

        setMessages(prev => [...prev, pythonMessage]);
        setThinkingMessage('');
        
        // Save assistant message to database
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: pythonMessage.role,
          content: pythonMessage.content
        });

        toast.success(`🐍 Python project ready: ${data.projectData.projectName}`);
        setIsLoading(false);
        return;
      }
      
      // Handle regular React/web code generation
      const finalCode = data.finalCode;
      
      // Update project with new code
      setProject(prev => prev ? { ...prev, html_code: finalCode } : null);

      // Store orchestration data
      const orchestrationData = {
        phases: data.phases || [],
        plan: data.plan,
        qualityMetrics: data.qualityMetrics,
        totalDuration: data.totalDuration
      };
      setCurrentOrchestration(orchestrationData);

      // Add assistant message with orchestration details
      const phaseNames = data.phases?.map((p: any) => p.name).join(', ') || 'code generation';
      const explanation = data.explanation || data.plan?.architecture_overview || 'Improvements applied successfully';
      const assistantMessage: Message = {
        role: 'assistant',
        content: `✨ ${explanation}\n\n${data.phases?.length > 0 ? `**Work Done:** ${phaseNames}\n\n` : ''}**Duration:** ${data.totalDuration ? (data.totalDuration / 1000).toFixed(2) + 's' : 'N/A'}`,
        timestamp: new Date().toISOString(),
        orchestrationData
      };

      setMessages(prev => [...prev, assistantMessage]);
      setThinkingMessage('');

      // Save assistant message to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        generated_code: finalCode
      });

      // Automatically learn from this successful interaction
      if (finalCode && user) {
        await supabase.functions.invoke('learn-from-conversation', {
          body: {
            conversationId,
            messages: messages.slice(-5),
            userRequest: userInput,
            generatedResponse: finalCode
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }).catch(err => console.error('Learning failed (non-blocking):', err));
      }

      // Auto-save project and create version
      const { data: versions } = await supabase
        .from('project_versions')
        .select('version_number')
        .eq('project_id', project.id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      await Promise.all([
        supabase.from('projects').update({ 
          html_code: finalCode,
          updated_at: new Date().toISOString()
        }).eq('id', project.id),
        
        supabase.from('project_versions').insert({
          project_id: project.id,
          version_number: nextVersion,
          html_code: finalCode,
          changes_summary: userInput.substring(0, 200)
        })
      ]);

      toast.success("Project enhanced successfully");
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error(error.message || "Failed to enhance project");
      setThinkingMessage('');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
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
                  <TabsList className="w-full grid grid-cols-3 lg:grid-cols-16">
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
                    <EnhancedChatInterface
                      projectId={projectId}
                      selectedFiles={selectedFiles}
                      projectFiles={projectFiles}
                      onCodeApply={(code, filePath) => {
                        const fileExists = projectFiles.some(f => f.file_path === filePath);
                        if (fileExists) {
                          setSelectedFiles([filePath]);
                          handleSaveFile(code);
                        } else {
                          toast.error('File not found');
                        }
                      }}
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
                    <CodeReviewPanel projectId={projectId} />
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
          /* Single-File View (Original) */
          <div className={`flex h-full ${isPreviewExpanded ? '' : 'lg:flex-row flex-col'} transition-all`}>
          {/* Chat Panel - Collapsible at bottom when preview expanded */}
          <div className={`flex flex-col border-r bg-card/30 transition-all ${
            isPreviewExpanded 
              ? 'fixed bottom-0 left-0 right-0 h-20 border-t border-r-0 z-50' 
              : 'lg:w-[480px] w-full'
          }`}>
              {!isPreviewExpanded && (
                <>
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="w-4 h-4" />
                      AI Assistant
                      <Badge variant="secondary" className="ml-auto">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Smart Mode
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'assistant' && msg.pythonProject ? (
                            // Python project response
                            <div className="w-full max-w-full">
                              <PythonProjectViewer 
                                projectData={msg.pythonProject}
                                message={msg.content}
                              />
                            </div>
                          ) : (
                            // Regular text message
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && thinkingMessage && (
                        <div className="flex justify-start">
                          <div className="bg-muted/70 rounded-lg p-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm italic text-muted-foreground">
                              {thinkingMessage}
                            </span>
                          </div>
                        </div>
                      )}
                      {isLoading && !thinkingMessage && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {currentOrchestration && currentOrchestration.phases.length > 0 && (
                    <div className="px-4 pb-2">
                      <OrchestrationProgress 
                        phases={currentOrchestration.phases}
                        isLoading={isLoading}
                        totalDuration={currentOrchestration.totalDuration}
                      />
                    </div>
                  )}
                </>
              )}

              <div className={`p-4 border-t bg-background shrink-0 ${isPreviewExpanded ? 'p-2' : ''}`}>
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isPreviewExpanded ? "Type to chat..." : "Describe what you want to add or improve..."}
                    className="resize-none min-h-[60px]"
                    rows={isPreviewExpanded ? 1 : 2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="shrink-0 h-[60px] w-[60px]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                {!isPreviewExpanded && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                )}
              </div>
            </div>

          {/* Preview Panel */}
          <div className={`flex flex-col bg-background ${isPreviewExpanded ? 'w-full' : 'flex-1'}`}>
            {!isPreviewExpanded && (
              <div className="p-4 border-b">
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="preview">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="code">
                      <Code className="w-4 h-4 mr-2" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="plan" disabled={!currentOrchestration?.plan}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Architecture
                    </TabsTrigger>
                    <TabsTrigger value="metrics" disabled={!currentOrchestration?.qualityMetrics}>
                      <Target className="w-4 h-4 mr-2" />
                      Quality
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
                  <TabsContent value="plan" className="mt-4">
                    {currentOrchestration?.plan && (
                      <ArchitecturePlanViewer plan={currentOrchestration.plan} />
                    )}
                  </TabsContent>
                  <TabsContent value="metrics" className="mt-4">
                    {currentOrchestration?.qualityMetrics && (
                      <QualityMetrics metrics={currentOrchestration.qualityMetrics} />
                    )}
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
