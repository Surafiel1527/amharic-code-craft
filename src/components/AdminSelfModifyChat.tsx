import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  customization_id?: string;
  created_at: string;
}

interface AdminSelfModifyChatProps {
  onCustomizationApplied?: () => void;
}

export default function AdminSelfModifyChat({ onCustomizationApplied }: AdminSelfModifyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load chat history
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data.map(msg => ({
          ...msg,
          role: msg.role as 'user' | 'assistant'
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add user message to chat
      const newUserMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newUserMessage]);

      // Save user message to database
      await supabase
        .from('admin_chat_messages')
        .insert({
          user_id: user.id,
          role: 'user',
          content: userMessage
        });

      // Call the admin-self-modify edge function
      const { data, error } = await supabase.functions.invoke('admin-self-modify', {
        body: { 
          prompt: userMessage,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Add assistant response to chat
      const assistantMessage: Message = {
        id: data.customization_id,
        role: 'assistant',
        content: data.message,
        customization_id: data.customization_id,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      toast({
        title: '✨ Analysis Complete',
        description: 'Review the proposed changes and apply them when ready.',
      });

      // Optionally trigger a callback to refresh the admin page
      onCustomizationApplied?.();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process request',
        variant: 'destructive',
      });
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

  if (isLoadingHistory) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Admin Self-Modify Chat</h3>
            <p className="text-sm text-muted-foreground">
              Tell me what you'd like to change in your admin page
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <Sparkles className="h-12 w-12 text-primary/20" />
            <div>
              <h4 className="font-semibold mb-2">Welcome to Self-Modify Chat!</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                I can help you customize your admin page. Try asking me to:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• "Change the background to blue"</li>
                <li>• "Add Spanish language support"</li>
                <li>• "Implement a blog management feature"</li>
                <li>• "Reorganize the sidebar layout"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.customization_id && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Customization #{message.customization_id.slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing your request...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you'd like to change..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}