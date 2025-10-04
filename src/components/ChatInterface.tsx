import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Send, Bot, User, Code, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  generated_code?: string;
  created_at: string;
  orchestration?: {
    phases: string[];
    duration: number;
    qualityScore?: number;
  };
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onCodeGenerated: (code: string, shouldSaveVersion?: boolean) => void;
  currentCode: string;
  onConversationChange: (id: string) => void;
  autoSendPrompt?: string;
  onAutoSendComplete?: () => void;
}

export const ChatInterface = ({ 
  conversationId, 
  onCodeGenerated, 
  currentCode,
  onConversationChange,
  autoSendPrompt,
  onAutoSendComplete
}: ChatInterfaceProps) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [activeProjectCode, setActiveProjectCode] = useState(currentCode || "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoSent = useRef(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  // Auto-send initial prompt after conversation is loaded
  useEffect(() => {
    if (
      autoSendPrompt && 
      conversationId && 
      conversationLoaded && 
      !isLoading && 
      !hasAutoSent.current
    ) {
      console.log('🚀 Auto-sending initial prompt:', autoSendPrompt);
      hasAutoSent.current = true;
      
      // Longer delay to ensure auth session is fully established
      setTimeout(() => {
        console.log('📤 Executing auto-send now...');
        handleSend(autoSendPrompt);
        if (onAutoSendComplete) {
          onAutoSendComplete();
        }
      }, 2000); // 2 second delay for stable auth
    }
  }, [autoSendPrompt, conversationId, conversationLoaded, isLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync active project code with prop changes
  useEffect(() => {
    if (currentCode) {
      setActiveProjectCode(currentCode);
    }
  }, [currentCode]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadConversation = async (convId: string) => {
    console.log('💬 Chat: Loading conversation:', convId);
    setConversationLoaded(false);
    try {
      // Load conversation with current_code
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("current_code")
        .eq("id", convId)
        .single();

      if (convError) {
        console.error('❌ Chat: Error loading conversation:', convError);
      } else if (convData?.current_code) {
        console.log('✅ Chat: Loaded project code from conversation');
        setActiveProjectCode(convData.current_code);
        // Pass false to prevent creating a version on initial load
        onCodeGenerated(convData.current_code, false);
      }

      // Load messages
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error('❌ Chat: Error loading conversation:', error);
        throw error;
      }
      
      console.log('✅ Chat: Loaded', data?.length || 0, 'messages');
      
      const typedMessages: Message[] = (data || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          generated_code: m.generated_code || undefined,
          created_at: m.created_at
        }));
      
      setMessages(typedMessages);
      setConversationLoaded(true);
      console.log('✅ Chat: Conversation loaded successfully');
    } catch (error) {
      console.error("❌ Chat: Error loading conversation:", error);
      
      // Report error to self-healing system
      await supabase.functions.invoke('report-error', {
        body: {
          errorType: 'DatabaseAccessError',
          errorMessage: error instanceof Error ? error.message : 'Failed to load conversation',
          source: 'frontend',
          filePath: 'components/ChatInterface.tsx',
          functionName: 'loadConversation',
          severity: 'medium',
          context: {
            operation: 'load_messages',
            conversationId: convId
          }
        }
      }).catch(err => console.error('Failed to report error:', err));
      
      toast.error(t("chat.loadFailed"));
      setConversationLoaded(true); // Set to true even on error to prevent infinite waiting
    }
  };

  const createNewConversation = async () => {
    console.log('💬 Chat: Creating new conversation...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ Chat: User not authenticated');
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert({ title: t("chat.newConversation"), user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('❌ Chat: Error creating conversation:', error);
        throw error;
      }
      
      console.log('✅ Chat: Created conversation:', data.id);
      return data.id;
    } catch (error) {
      console.error("❌ Chat: Error creating conversation:", error);
      
      // Report error to self-healing system
      await supabase.functions.invoke('report-error', {
        body: {
          errorType: 'DatabaseAccessError',
          errorMessage: error instanceof Error ? error.message : 'Failed to create conversation',
          source: 'frontend',
          filePath: 'components/ChatInterface.tsx',
          functionName: 'createNewConversation',
          severity: 'high',
          context: { operation: 'create_conversation' }
        }
      }).catch(err => console.error('Failed to report error:', err));
      
      throw error;
    }
  };

  const handleSend = async (messageOverrideOrEvent?: string | React.MouseEvent) => {
    // Extract message text from override or input
    const messageText = typeof messageOverrideOrEvent === 'string' 
      ? messageOverrideOrEvent 
      : input.trim();
    
    if (!messageText || isLoading) return;

    // Check authentication and ensure session is valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('❌ No valid session:', sessionError);
      toast.error("Please log in to use AI generation");
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ User not authenticated:', authError);
      toast.error("Please log in to use AI generation");
      return;
    }
    
    console.log('✅ User authenticated:', user.id);

    const userMessage = messageText;
    const hasActiveProject = !!activeProjectCode;
    
    // Detect if user wants to start fresh
    const wantsNewProject = userMessage.toLowerCase().match(/\b(create|build|make|generate|new)\b.*\b(project|app|website|game)\b/i) && 
                            !userMessage.toLowerCase().match(/\b(update|modify|change|fix|add to|improve)\b/i);
    
    setInput("");
    setIsLoading(true);

    try {
      // Create conversation if needed
      let activeConvId = conversationId;
      if (!activeConvId) {
        activeConvId = await createNewConversation();
        onConversationChange(activeConvId);
      }

      // Add user message to UI immediately
      const tempUserMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Save user message to database
      await supabase.from("messages").insert({
        conversation_id: activeConvId,
        role: "user",
        content: userMessage,
      });

      // Determine the right code to use based on context
      const codeToModify = wantsNewProject ? "" : activeProjectCode;
      
      // Detect if this is a simple modification (use fast path)
      const isSimpleChange = hasActiveProject && 
                            !wantsNewProject && 
                            userMessage.toLowerCase().match(/\b(change|update|modify|fix|adjust|set|make)\b.*\b(color|style|text|size|font|background)\b/i);
      
      let data, error;
      
      if (isSimpleChange) {
        // Fast path: Use smart-diff-update for simple style changes
        console.log('🚀 Using fast smart-diff-update on existing project');
        setCurrentPhase('Updating existing project');
        setProgress(50);
        
        const response = await supabase.functions.invoke("smart-diff-update", {
          body: {
            userRequest: userMessage,
            currentCode: activeProjectCode,
          },
        });
        
        data = response.data;
        error = response.error;
        setProgress(100);
      } else {
        // Full orchestration for complex changes or new projects
        const isModification = hasActiveProject && !wantsNewProject;
        console.log('🚀 Using full smart orchestration:', { 
          isModification, 
          hasCode: !!codeToModify,
          wantsNew: wantsNewProject 
        });
        
        const phases = ['Planning', 'Analyzing', 'Generating', 'Refining', 'Learning'];
        let currentPhaseIdx = 0;
        
        const progressInterval = setInterval(() => {
          if (currentPhaseIdx < phases.length) {
            setCurrentPhase(phases[currentPhaseIdx]);
            setProgress((currentPhaseIdx + 1) * 20);
            currentPhaseIdx++;
          }
        }, 800);

        const response = await supabase.functions.invoke("smart-orchestrator", {
          body: {
            userRequest: userMessage,
            conversationId: activeConvId,
            currentCode: codeToModify,
            autoRefine: true,
            autoLearn: true,
          },
        });

        clearInterval(progressInterval);
        data = response.data;
        error = response.error;
        setProgress(100);
      }

      if (error) throw error;

      // Extract results based on path taken
      const assistantContent = isSimpleChange 
        ? (data.explanation || "Updated the code with your changes.")
        : (data.plan?.architecture_overview || "I've generated the code based on your request with smart optimization.");
      const generatedCode = isSimpleChange ? data.updatedCode : data.finalCode;
      
      // Add assistant message with orchestration info
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        generated_code: generatedCode,
        created_at: new Date().toISOString(),
        orchestration: isSimpleChange ? {
          phases: ['smart-diff'],
          duration: data.processingTime || 1000,
          qualityScore: undefined
        } : {
          phases: data.phases?.map((p: any) => p.name) || [],
          duration: data.totalDuration || 0,
          qualityScore: data.qualityMetrics?.finalScore
        }
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message
      await supabase.from("messages").insert({
        conversation_id: activeConvId,
        role: "assistant",
        content: assistantContent,
        generated_code: generatedCode,
      });

      // Update code preview and active project if code was generated
      if (generatedCode) {
        setActiveProjectCode(generatedCode);
        // Pass true to save a version for new generations
        onCodeGenerated(generatedCode, true);
        
        if (isSimpleChange) {
          toast.success("⚡ Updated instantly!");
        } else if (hasActiveProject && !wantsNewProject) {
          toast.success("🔧 Project updated!");
        } else {
          toast.success("✨ New project created!");
        }
      }

      // Save project code to conversation for persistence
      await supabase
        .from("conversations")
        .update({ 
          updated_at: new Date().toISOString(),
          current_code: generatedCode || activeProjectCode
        })
        .eq("id", activeConvId);

    } catch (error: any) {
      console.error("Error sending message:", error);
      
      // Handle specific error cases
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('authentication')) {
        toast.error("Authentication error. Please log in again.");
      } else if (error?.message?.includes('FunctionsRelayError') || error?.message?.includes('FunctionsHttpError')) {
        toast.error("Service error. Please try again in a moment.");
      } else {
        toast.error(error?.message || t("chat.sendFailed"));
      }
    } finally {
      setIsLoading(false);
      setCurrentPhase("");
      setProgress(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartFresh = async () => {
    setActiveProjectCode("");
    setMessages([]);
    
    // Clear current_code from conversation
    if (conversationId) {
      await supabase
        .from("conversations")
        .update({ current_code: null })
        .eq("id", conversationId);
    }
    
    toast.info("Starting fresh project");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Project Status Header */}
      {activeProjectCode && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Active Project ({(activeProjectCode.length / 1000).toFixed(1)}KB)</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleStartFresh}
              className="h-7 text-xs"
            >
              Start Fresh
            </Button>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <Card className="p-8 text-center space-y-4 bg-card/50 border-dashed">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("chat.assistantReady")}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t("chat.assistantDesc")}
                </p>
                <div className="text-xs text-muted-foreground mt-4 p-3 bg-primary/5 rounded-lg">
                  <strong>💡 Smart Context:</strong> I'll remember your project throughout the conversation. 
                  Just ask to modify it naturally, or say "create new" to start fresh.
                </div>
              </div>
            </Card>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              
              <Card className={`p-4 max-w-[80%] ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card"
              }`}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap break-words">{msg.content.replace(/<code>[\s\S]*?<\/code>/g, '')}</p>
                </div>
                {msg.generated_code && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Code className="h-3 w-3" />
                      <span>{t("chat.codeGenerated")}</span>
                    </div>
                    {msg.orchestration && (
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="h-2.5 w-2.5 mr-1" />
                          {msg.orchestration.phases.length} phases
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {(msg.orchestration.duration / 1000).toFixed(1)}s
                        </Badge>
                        {msg.orchestration.qualityScore && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            Q: {msg.orchestration.qualityScore}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-accent" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <Card className="p-4 min-w-[300px] max-w-[80%] bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">AI Generation in Progress</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {progress}%
                    </div>
                  </div>

                  {/* Current Phase */}
                  {currentPhase && (
                    <div className="flex items-start gap-2 bg-background/50 p-3 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{currentPhase}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress < 20 && "Analyzing your requirements and planning the architecture..."}
                          {progress >= 20 && progress < 40 && "Reviewing existing code and dependencies..."}
                          {progress >= 40 && progress < 60 && "Generating high-quality code with best practices..."}
                          {progress >= 60 && progress < 80 && "Optimizing code for performance and readability..."}
                          {progress >= 80 && "Learning from this generation for future improvements..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>This may take 10-30 seconds</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Enterprise-grade quality
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={activeProjectCode 
              ? "Modify your project or say 'create new' to start fresh..." 
              : t("chat.writeMessage")
            }
            disabled={isLoading}
            className="flex-1"
            dir="auto"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
