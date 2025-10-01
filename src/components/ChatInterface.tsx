import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Bot, User, Code, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  generated_code?: string;
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onCodeGenerated: (code: string) => void;
  currentCode: string;
  onConversationChange: (id: string) => void;
}

export const ChatInterface = ({ 
  conversationId, 
  onCodeGenerated, 
  currentCode,
  onConversationChange 
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadConversation = async (convId: string) => {
    console.log('💬 Chat: Loading conversation:', convId);
    try {
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
      
      toast.error("ውይይትን መጫን አልተቻለም");
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
        .insert({ title: "አዲስ ውይይት", user_id: user.id })
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
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

      // Get conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call AI
      const { data, error } = await supabase.functions.invoke("chat-generate", {
        body: {
          message: userMessage,
          conversationHistory,
          currentCode,
        },
      });

      if (error) throw error;

      // Extract assistant response
      const assistantContent = data.message;
      const generatedCode = data.code;

      // Add assistant message to UI
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        generated_code: generatedCode,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message
      await supabase.from("messages").insert({
        conversation_id: activeConvId,
        role: "assistant",
        content: assistantContent,
        generated_code: generatedCode,
      });

      // Update code preview if code was generated
      if (generatedCode) {
        onCodeGenerated(generatedCode);
        toast.success("ኮድ ተዘምኗል!");
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConvId);

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("መልእክት መላክ አልተቻለም");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
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
                <h3 className="text-lg font-semibold">AI ረዳትዎ ዝግጁ ነው!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  ድህረ ገፅዎን ለመገንባት ወይም ለማሻሻል የሚፈልጉትን በአማርኛ ይግለጹ። 
                  ለምሳሌ፡ "ለንግዴ አዲስ የማረፊያ ገፅ ፍጠር" ወይም "ቀለሙን አረንጓዴ አድርግ"
                </p>
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
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Code className="h-3 w-3" />
                      <span>ኮድ ተፈጥሯል</span>
                    </div>
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
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">በማሰብ ላይ...</span>
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
            placeholder="መልእክትዎን ይፃፉ..."
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
