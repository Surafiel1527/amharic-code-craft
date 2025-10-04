import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Send, Save, ArrowLeft, Maximize2, Minimize2, 
  History, Code2, Eye, MessageSquare, Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DevicePreview } from "@/components/DevicePreview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({ 
          title: `Workspace: ${data.title}`,
          user_id: user.id,
          project_id: projectId
        })
        .select('id')
        .single();
      
      if (!convError && convData) {
        setConversationId(convData.id);
      }

      // Add initial context message
      setMessages([{
        role: 'assistant',
        content: `Welcome to your workspace! I can help you enhance "${data.title}". What would you like to add or improve?`,
        timestamp: new Date().toISOString()
      }]);
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

      // Auto-save
      await supabase
        .from('projects')
        .update({ 
          html_code: finalCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

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
        <div className={`grid h-full ${isPreviewExpanded ? 'grid-cols-1' : 'lg:grid-cols-[1fr_2fr]'} transition-all`}>
          {/* Chat Panel */}
          {!isPreviewExpanded && (
            <div className="flex flex-col border-r bg-card/30">
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

              <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what you want to add or improve..."
                    className="resize-none"
                    rows={2}
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
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          )}

          {/* Preview Panel */}
          <div className="flex flex-col bg-background">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4" />
                Live Preview
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <DevicePreview generatedCode={project.html_code} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
