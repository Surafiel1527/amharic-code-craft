import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Send, Save, ArrowLeft, Maximize2, Minimize2, 
  History, Code2, Eye, MessageSquare, Sparkles, RotateCcw
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !project || !conversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: userMessage.role,
      content: userMessage.content
    });

    try {
      // Get current session to ensure we have a valid token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // Use smart orchestrator for enhancement
      const { data, error } = await supabase.functions.invoke('smart-orchestrator', {
        body: {
          userRequest: input,
          conversationId,
          currentCode: project.html_code,
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

      // Add assistant message with details
      const phaseNames = data.phases?.map((p: any) => p.name).join(', ') || 'code generation';
      const assistantMessage: Message = {
        role: 'assistant',
        content: `✨ Enhanced with Smart Orchestrator!\n\nPhases: ${phaseNames}\n\n${data.plan?.architecture_overview || 'Improvements applied successfully'}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        generated_code: finalCode
      });

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
          changes_summary: input.substring(0, 200)
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
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
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  Live Preview
                </div>
              </div>
            )}
            <div className={`flex-1 overflow-hidden ${isPreviewExpanded ? 'p-0' : 'p-4'}`}>
              <DevicePreview generatedCode={project.html_code} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
