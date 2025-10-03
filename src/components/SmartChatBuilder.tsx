import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Code, AlertTriangle, CheckCircle2, Lightbulb, Settings, AlertCircle, Activity, Save, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProjectInstructionsPanel } from "./ProjectInstructionsPanel";
import { SelfHealingMonitor } from "./SelfHealingMonitor";
import { SnapshotManager } from "./SnapshotManager";
import { AICapabilitiesGuide } from "./AICapabilitiesGuide";
import { EnterpriseProjectDashboard } from "./EnterpriseProjectDashboard";
import { CollaborationIndicator } from "./CollaborationIndicator";
import { useErrorMonitor } from "@/hooks/useErrorMonitor";
import { useProactiveMonitoring } from "@/hooks/useProactiveMonitoring";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  action?: string;
  error?: boolean;
}

interface SmartChatBuilderProps {
  onCodeGenerated?: (code: string) => void;
  currentCode?: string;
}

export const SmartChatBuilder = ({ onCodeGenerated, currentCode }: SmartChatBuilderProps) => {
  // Error monitoring
  useErrorMonitor();
  const { healthStatus, issuesCount, isHealthy } = useProactiveMonitoring(60);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [workingCode, setWorkingCode] = useState(currentCode || "");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [fileStructure, setFileStructure] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create conversation on mount
  useEffect(() => {
    const createConversation = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user - skipping conversation creation');
          return;
        }

        const { data, error } = await supabase
          .from('conversations')
          .insert({ 
            title: 'Smart Code Builder Session',
            user_id: user.id 
          })
          .select('id')
          .single();
        
        if (!error && data) {
          setConversationId(data.id);
          console.log('📝 Created conversation:', data.id);
        } else if (error) {
          console.error('Failed to create conversation:', error);
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };
    
    createConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (currentCode) {
      setWorkingCode(currentCode);
    }
  }, [currentCode]);

  const detectAction = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('create') || lower.includes('build') || lower.includes('make') || lower.includes('generate')) {
      return 'create';
    }
    if (lower.includes('add') || lower.includes('modify') || lower.includes('change') || lower.includes('update')) {
      return 'modify';
    }
    if (lower.includes('fix') || lower.includes('error') || lower.includes('bug') || lower.includes('broken')) {
      return 'fix';
    }
    return workingCode ? 'modify' : 'create';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      action: detectAction(input)
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log('🚀 Sending to AI Code Builder:', { 
        action: userMessage.action,
        hasCode: !!workingCode,
        messageLength: input.length 
      });

      const { data, error } = await supabase.functions.invoke('ai-code-builder', {
        body: {
          action: userMessage.action,
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          currentCode: workingCode,
          conversationId, // Send conversation ID for memory tracking
          customInstructions,
          fileStructure,
          projectContext: {
            hasCode: !!workingCode,
            codeLength: workingCode?.length || 0
          }
        }
      });

      if (error) {
        console.error('❌ Error from edge function:', error);
        if (error.message?.includes('rate_limit') || error.message?.includes('429')) {
          toast.error("Too many requests. Please wait a moment.");
        } else if (error.message?.includes('payment_required') || error.message?.includes('402')) {
          toast.error("Credits needed. Please add credits to your workspace.");
        } else {
          toast.error("Failed to process request");
        }
        throw error;
      }

      console.log('✅ Received response:', { 
        success: data.success, 
        hasCode: !!data.code,
        action: data.action 
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.explanation || "Code generated successfully!",
        code: data.code,
        action: data.action
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update working code if new code was generated
      if (data.code) {
        setWorkingCode(data.code);
        if (onCodeGenerated) {
          onCodeGenerated(data.code);
        }
        
        const actionEmoji = data.action === 'create' ? '✨' : 
                           data.action === 'modify' ? '🔧' : '🔨';
        toast.success(`${actionEmoji} Code ${data.action === 'create' ? 'created' : data.action === 'modify' ? 'updated' : 'fixed'} successfully!`);
      }

    } catch (error: any) {
      console.error('💥 Error in chat builder:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "I encountered an error. Please try rephrasing your request or breaking it into smaller steps.",
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Enterprise Code Builder
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              AI with self-healing, version control, real-time collaboration & advanced diff
            </p>
            <div className="mt-2">
              <CollaborationIndicator />
            </div>
          </div>
          <div className="flex gap-2">
            <Sheet open={dashboardOpen} onOpenChange={setDashboardOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Enterprise Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                <EnterpriseProjectDashboard 
                  onCodeUpdate={(code) => {
                    setWorkingCode(code);
                    if (onCodeGenerated) onCodeGenerated(code);
                  }}
                />
              </SheetContent>
            </Sheet>
            <Sheet open={snapshotOpen} onOpenChange={setSnapshotOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Version Control">
                  <Save className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SnapshotManager />
              </SheetContent>
            </Sheet>
            
            <Sheet open={monitorOpen} onOpenChange={setMonitorOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Self-Healing Monitor">
                  <Activity className="h-4 w-4" />
                  {!isHealthy && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SelfHealingMonitor />
              </SheetContent>
            </Sheet>
            
            <Sheet open={showInstructions} onOpenChange={setShowInstructions}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Project Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Project Instructions</SheetTitle>
                  <SheetDescription>
                    Define custom guidelines and file structure for your project
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <ProjectInstructionsPanel
                    conversationId={conversationId || ''}
                    onSave={(instructions, structure) => {
                      setCustomInstructions(instructions);
                      setFileStructure(structure);
                      setShowInstructions(false);
                    }}
                    initialInstructions={customInstructions}
                    initialFileStructure={fileStructure}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {!isHealthy && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System health: {healthStatus} - {issuesCount} issue(s) detected. 
              <Button 
                variant="link" 
                className="h-auto p-0 ml-2"
                onClick={() => setMonitorOpen(true)}
              >
                View details
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div className="flex items-center justify-between">
                    <strong>🚀 Advanced AI Builder - Build Anything!</strong>
                    <AICapabilitiesGuide />
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✨ <strong>Create:</strong> "Build a social media platform with posts, likes, and comments"</li>
                    <li>🗂️ <strong>Multi-File:</strong> "Generate auth system with login, signup, hooks, and types"</li>
                    <li>🔧 <strong>Modify:</strong> "Add user profiles and follow system"</li>
                    <li>🔨 <strong>Auto-Fix:</strong> Errors are detected and fixed automatically</li>
                  </ul>
                  <div className="mt-3 p-2 bg-primary/5 rounded text-xs">
                    <strong>🧠 Smart Memory:</strong> Handles 40+ functions | 🛡️ Self-Healing | 📦 Version Control
                  </div>
                </AlertDescription>
              </Alert>
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
                    {message.error ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : message.code ? (
                      <Code className="h-4 w-4 text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.error
                      ? 'bg-destructive/10 border border-destructive/20'
                      : 'bg-muted'
                  }`}
                >
                  {message.action && message.role === 'user' && (
                    <div className="text-xs opacity-75 mb-1">
                      Action: {message.action}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.code && (
                    <div className="mt-3 p-2 bg-background/50 rounded border">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-3 w-3" />
                        <span className="text-xs font-semibold">Generated Code</span>
                      </div>
                      <pre className="text-xs overflow-x-auto">
                        {message.code.substring(0, 200)}...
                      </pre>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm">Building your code...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to build or change..."
            disabled={isLoading}
            className="min-h-[60px]"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[60px]"
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
  );
};
