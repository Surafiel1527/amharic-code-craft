import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, Code, Download } from "lucide-react";
import { toast } from "sonner";
import { AICapabilitiesGuide } from "./AICapabilitiesGuide";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolUsed?: string;
  toolResult?: {
    success: boolean;
    imageUrl?: string;
    prompt?: string;
    analysis?: any;
    suggestions?: any;
    error?: string;
  };
}

interface AIAssistantProps {
  projectContext?: {
    title: string;
    prompt: string;
    codeLength: number;
    codeSnippet?: string; // First 1000 chars of code for context
    fullCode?: string; // Full code for code view
  };
}

export const AIAssistant = ({ projectContext }: AIAssistantProps) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "code">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load or create conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to find existing conversation for this project
        let convId: string | null = null;
        
        if (projectContext) {
          const { data: existingConvs } = await supabase
            .from('assistant_conversations')
            .select('id, created_at')
            .eq('user_id', user.id)
            .eq('title', `AI Assistant: ${projectContext.title}`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingConvs && existingConvs.length > 0) {
            convId = existingConvs[0].id;
            
            // Load messages from this conversation
            const { data: existingMessages } = await supabase
              .from('assistant_messages')
              .select('*')
              .eq('conversation_id', convId)
              .order('created_at', { ascending: true });

            if (existingMessages && existingMessages.length > 0) {
              setMessages(existingMessages.map(msg => {
                const metadata = msg.metadata as any;
                return {
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                  toolUsed: metadata?.toolUsed,
                  toolResult: metadata?.toolResult
                };
              }));
            }
          }
        }

        // Create new conversation if none exists
        if (!convId) {
          const { data: newConv, error } = await supabase
            .from('assistant_conversations')
            .insert({
              user_id: user.id,
              title: projectContext ? `AI Assistant: ${projectContext.title}` : 'AI Assistant Chat',
              context: projectContext ? { projectTitle: projectContext.title, prompt: projectContext.prompt } : {}
            })
            .select('id')
            .single();

          if (error) throw error;
          convId = newConv.id;
        }

        setConversationId(convId);
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initConversation();
  }, [projectContext?.title]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !conversationId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase.from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: messageText
      });

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: messageText,
          history: messages.map(m => ({ role: m.role, content: m.content })), // Send clean history
          projectContext
        }
      });

      if (error) {
        // Handle specific error types
        if (error.message?.includes('rate_limit') || error.message?.includes('429')) {
          toast.error("በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።\nToo many requests. Please wait.");
        } else if (error.message?.includes('payment_required') || error.message?.includes('402')) {
          toast.error("የክፍያ ማዘመኛ ያስፈልጋል። Credits are needed.\nPlease add credits to your workspace.");
        } else {
          toast.error("መልእክት መላክ አልተቻለም\nFailed to send message");
        }
        throw error;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        toolUsed: data.toolUsed,
        toolResult: data.toolResult
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: data.message,
        metadata: {
          toolUsed: data.toolUsed,
          toolResult: data.toolResult
        }
      });

      // Show toast for tool usage
      if (data.toolUsed) {
        if (data.toolUsed === 'generate_image') {
          toast.success("✨ Image generated successfully!");
        } else if (data.toolUsed === 'analyze_code') {
          toast.success("🔍 Code analysis complete!");
        } else if (data.toolUsed === 'suggest_improvements') {
          toast.success("💡 Improvement suggestions ready!");
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownloadZip = async () => {
    if (!projectContext?.fullCode) {
      toast.error("No code available to download");
      return;
    }

    try {
      // Create a simple HTML file download (for full zip with multiple files, would need JSZip library)
      const blob = new Blob([projectContext.fullCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectContext.title || 'project'}.html`;
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

  return (
    <div className="space-y-4">
      <AICapabilitiesGuide />
      
      <Card className="glass-effect border-primary/20 h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t("aiAssistant.title")}
              </CardTitle>
              <CardDescription>
                {t("aiAssistant.subtitle")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("chat")}
              >
                Chat
              </Button>
              <Button
                variant={activeTab === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("code")}
                disabled={!projectContext?.fullCode}
              >
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        {activeTab === "chat" ? (
          <>
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("aiAssistant.placeholder")}</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show generated image */}
                  {message.toolResult?.imageUrl && (
                    <div className="mt-3">
                      <img 
                        src={message.toolResult.imageUrl} 
                        alt={message.toolResult.prompt || "Generated image"} 
                        className="rounded-lg max-w-full h-auto shadow-lg"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        📸 Generated image
                      </p>
                    </div>
                  )}
                  
                  {/* Show code analysis results */}
                  {message.toolResult?.analysis && (
                    <div className="mt-3 p-2 bg-background/50 rounded border">
                      <p className="text-xs font-semibold mb-1">🔍 Code Analysis:</p>
                      <p className="text-xs">Quality Score: {message.toolResult.analysis.quality_score}/100</p>
                    </div>
                  )}
                  
                  {/* Show improvement suggestions */}
                  {message.toolResult?.suggestions && Array.isArray(message.toolResult.suggestions) && (
                    <div className="mt-3 space-y-2">
                      {message.toolResult.suggestions.map((suggestion: any, idx: number) => (
                        <div key={idx} className="p-2 bg-background/50 rounded border text-xs">
                          <p className="font-semibold">💡 {suggestion.title}</p>
                          <p className="text-muted-foreground">{suggestion.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ጥያቄዎን ያስገቡ..."
            disabled={isLoading}
            dir="auto"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        </>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Project Code</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadZip}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download HTML
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                <code>{projectContext?.fullCode || "No code available"}</code>
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
