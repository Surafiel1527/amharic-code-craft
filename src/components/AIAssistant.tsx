import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User } from "lucide-react";
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
  };
}

export const AIAssistant = ({ projectContext }: AIAssistantProps) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: input,
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

  return (
    <div className="space-y-4">
      <AICapabilitiesGuide />
      
      <Card className="glass-effect border-primary/20 h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t("aiAssistant.title")}
          </CardTitle>
          <CardDescription>
            {t("aiAssistant.subtitle")}
          </CardDescription>
        </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
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
      </CardContent>
    </Card>
    </div>
  );
};
