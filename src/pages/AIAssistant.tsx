import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Send, 
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    loadErrorCount();
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: `👋 Hello! I'm your AI Error Analyst. I can help you understand the autonomous agent system, analyze detected errors, and suggest fixes. 

Try asking me:
- "What errors have been detected recently?"
- "How does the autonomous healing work?"
- "What should I do about the intentional test errors?"
- "Explain the decision engine capabilities"`,
      timestamp: new Date()
    }]);
  }, []);

  const loadErrorCount = async () => {
    const { count } = await supabase
      .from('detected_errors')
      .select('*', { count: 'exact', head: true });
    
    setErrorCount(count || 0);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-error-analyst', {
        body: { message: input }
      });

      if (error) throw error;

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setErrorCount(data.errorCount);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      toast({
        title: 'Chat Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Analyze recent errors",
    "How does auto-healing work?",
    "What are the intentional errors?",
    "System health status"
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Bot className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold">AI Error Analyst</h1>
          </div>
          <p className="text-muted-foreground">
            Intelligent assistant for understanding and resolving errors
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Detected Errors</p>
                <p className="text-2xl font-bold">{errorCount}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">AI Status</p>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Learning Mode</p>
                <Badge variant="secondary">Enabled</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Chat */}
        <Card className="p-6">
          <div className="space-y-4">
            
            {/* Messages */}
            <div className="h-[400px] overflow-y-auto space-y-4 pr-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput(prompt);
                  }}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about errors, healing, or system capabilities..."
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
