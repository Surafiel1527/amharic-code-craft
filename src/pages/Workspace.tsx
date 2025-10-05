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
  const [currentOrchestration, setCurrentOrchestration] = useState<{
    phases: any[];
    plan?: any;
    qualityMetrics?: any;
    totalDuration?: number;
  } | null>(null);
  
  // Multi-file system state
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [showMultiFileGen, setShowMultiFileGen] = useState(false);

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
            content: `Welcome to your workspace! I can help you enhance "${data.title}". What would you like to add or improve?`,
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
    if (selectedFile === path) setSelectedFile(null);
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
    if (selectedFile === oldPath) setSelectedFile(newPath);
  };

  const handleSaveFile = async (content: string) => {
    if (!projectId || !selectedFile) return;
    
    const { error } = await supabase
      .from('project_files')
      .update({ 
        file_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('file_path', selectedFile);

    if (error) {
      toast.error('Failed to save file');
      return;
    }

    setProjectFiles(prev =>
      prev.map(f => f.file_path === selectedFile ? { ...f, file_content: content } : f)
    );
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
        return;
      }

      // For code requests, use the full orchestrator
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // Initialize orchestration tracking
      setCurrentOrchestration({ phases: [] });

      // Get conversation context for better understanding
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

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
      const assistantMessage: Message = {
        role: 'assistant',
        content: `✨ Enhanced with Smart Orchestrator!\n\n**Phases Completed:** ${phaseNames}\n\n**Overview:** ${data.plan?.architecture_overview || 'Improvements applied successfully'}\n\n**Duration:** ${data.totalDuration ? (data.totalDuration / 1000).toFixed(2) + 's' : 'N/A'}`,
        timestamp: new Date().toISOString(),
        orchestrationData
      };

      setMessages(prev => [...prev, assistantMessage]);

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMultiFileGen(!showMultiFileGen)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Project
              </Button>
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
                <FileTree
                  files={projectFiles.map(f => ({
                    id: f.id,
                    path: f.file_path,
                    type: 'file' as const,
                    content: f.file_content
                  }))}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                />
              </div>

              {/* Code Editor */}
              <div className="flex-1 border-r">
                <CodeEditor
                  filePath={selectedFile}
                  initialContent={projectFiles.find(f => f.file_path === selectedFile)?.file_content || ''}
                  onSave={handleSaveFile}
                />
              </div>

              {/* Component Templates Sidebar */}
              <div className="w-96">
                <ComponentTemplates
                  onInsertTemplate={(code, name) => {
                    if (selectedFile) {
                      const currentContent = projectFiles.find(f => f.file_path === selectedFile)?.file_content || '';
                      handleSaveFile(currentContent + '\n\n' + code);
                      toast.success(`Inserted ${name}`);
                    } else {
                      toast.info('Please select a file first');
                    }
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          /* Single-File View (Original) */
          <div className={`flex h-full ${isPreviewExpanded ? '' : 'lg:flex-row flex-col'} transition-all`}>
          {/* Chat Panel - Collapsible at bottom when preview expanded */}
          <div className={`flex flex-col border-r bg-card/30 transition-all ${
            isPreviewExpanded 
              ? 'fixed bottom-0 left-0 right-0 h-16 border-t border-r-0 z-50' 
              : 'lg:w-[400px] w-full'
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
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {isLoading && currentOrchestration && (
                    <div className="px-4 pb-4">
                      <OrchestrationProgress 
                        phases={currentOrchestration.phases}
                        isLoading={isLoading}
                        totalDuration={currentOrchestration.totalDuration}
                      />
                    </div>
                  )}
                </>
              )}

              <div className={`p-4 border-t bg-background ${isPreviewExpanded ? 'p-2' : ''}`}>
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isPreviewExpanded ? "Type to chat..." : "Describe what you want to add or improve..."}
                    className="resize-none"
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
                    className="shrink-0"
                  >
                    <Send className="w-4 h-4" />
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
