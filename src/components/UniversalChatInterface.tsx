import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Send, Code2, Sparkles, Loader2, Copy, 
  CheckCircle2, Brain, Target, FileCode, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useUniversalAIChat, Message } from "@/hooks/useUniversalAIChat";
import { EnhancedSensitiveDataDetector } from "@/components/EnhancedSensitiveDataDetector";
import { RealtimeAIPanel } from "@/components/RealtimeAIPanel";
import { PlanApprovalCard } from "@/components/PlanApprovalCard";
import { useThinkingSteps } from "@/hooks/useThinkingSteps";
import { InlineThinkingSteps } from "@/components/InlineThinkingSteps";
import { supabase } from "@/integrations/supabase/client";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";

export interface UniversalChatInterfaceProps {
  // Core props
  projectId?: string;
  conversationId?: string;
  selectedFiles?: string[];
  projectFiles?: Array<{ file_path: string; file_content: string }>;
  onCodeApply?: (code: string, filePath: string) => Promise<void>;
  onConversationChange?: (id: string) => void;
  projectContext?: any;
  context?: any; // Additional context to pass to orchestrator
  
  // UI customization
  mode?: 'fullscreen' | 'sidebar' | 'panel' | 'inline';
  showContext?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  height?: string;
  className?: string;
  welcomeMessage?: React.ReactNode;
  
  // Behavior
  autoLearn?: boolean;
  autoApply?: boolean;
  persistMessages?: boolean;
  enableTools?: boolean;
  enableStreaming?: boolean;
  placeholder?: string;
  operationMode?: 'generate' | 'enhance'; // Operation mode: generate new vs enhance existing
}

const MODE_CONFIGS = {
  fullscreen: {
    height: 'h-screen',
    padding: 'p-6',
    headerSize: 'text-2xl'
  },
  sidebar: {
    height: 'h-full',
    padding: 'p-4',
    headerSize: 'text-lg'
  },
  panel: {
    height: 'h-[600px]',
    padding: 'p-4',
    headerSize: 'text-xl'
  },
  inline: {
    height: 'h-[400px]',
    padding: 'p-3',
    headerSize: 'text-base'
  }
};

const ROUTE_ICONS = {
  'error-teacher': Brain,
  'orchestrator': Target,
  'direct': Sparkles
};

const ROUTE_LABELS = {
  'error-teacher': 'Error Teacher',
  'orchestrator': 'Smart Orchestrator',
  'direct': 'Direct Response'
};

const ROUTE_COLORS = {
  'error-teacher': 'text-purple-500',
  'orchestrator': 'text-blue-500',
  'direct': 'text-green-500'
};

/**
 * Universal Chat Interface
 * 
 * The single, reusable chat component for the entire platform.
 * Uses the unified AI brain for consistent intelligence everywhere.
 * 
 * Modes:
 * - fullscreen: Full page chat experience
 * - sidebar: Sidebar panel chat
 * - panel: Embedded panel (default)
 * - inline: Compact inline chat
 */
export function UniversalChatInterface({
  projectId,
  conversationId,
  selectedFiles = [],
  projectFiles = [],
  onCodeApply,
  onConversationChange,
  projectContext,
  context, // Additional context
  mode = 'panel',
  showContext = true,
  showHeader = true,
  showFooter = true,
  height,
  className = '',
  welcomeMessage,
  autoLearn = true,
  autoApply = true,
  persistMessages = false,
  enableTools = false,
  enableStreaming = false,
  placeholder = 'Type your message...',
  operationMode = 'enhance' // Default to enhance for workspace
}: UniversalChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [contextMode, setContextMode] = useState<'selected' | 'all' | 'none'>('selected');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const config = MODE_CONFIGS[mode];
  const containerHeight = height || config.height;

  // Thinking steps tracking
  const { steps: thinkingSteps } = useThinkingSteps(conversationId);
  const [messageSteps, setMessageSteps] = useState<Map<string, typeof thinkingSteps>>(new Map());
  
  // ✅ NEW: Track project-level generation status for inline display
  const [generationStatus, setGenerationStatus] = useState<{
    isGenerating: boolean;
    message: string;
    progress: number;
  }>({ isGenerating: false, message: '', progress: 0 });

  // Use the unified AI brain
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    stopGeneration,
    conversationId: activeConversationId,
    currentPhase,
    progress
  } = useUniversalAIChat({
    projectId,
    conversationId,
    contextFiles: projectFiles,
    selectedFiles: contextMode === 'selected' ? selectedFiles : contextMode === 'all' ? projectFiles.map(f => f.file_path) : [],
    onCodeApply,
    onConversationChange,
    autoLearn,
    autoApply,
    persistMessages,
    enableTools,
    enableStreaming,
    projectContext: { ...projectContext, ...(context || {}) }, // Merge contexts
    mode: operationMode // Pass operation mode to the hook
  });

  // ✅ NEW: Subscribe to project-level generation status
  useEffect(() => {
    if (!projectId) return;
    
    console.log('🔌 Chat subscribing to project generation status:', `ai-status-${projectId}`);
    
    const statusChannel = supabase
      .channel(`chat-gen-status-${projectId}`)
      .on('broadcast', { event: 'status-update' }, ({ payload }) => {
        console.log('📥 Chat received generation status:', payload);
        
        const isGenerating = payload.status !== 'idle' && payload.status !== 'complete';
        setGenerationStatus({
          isGenerating,
          message: payload.message || payload.currentOperation || 'Generating...',
          progress: payload.progress || 0
        });
        
        // Clear when complete
        if (payload.status === 'complete' || payload.message?.includes('complete')) {
          setTimeout(() => {
            setGenerationStatus({ isGenerating: false, message: '', progress: 0 });
          }, 2000);
        }
      })
      .subscribe();
    
    return () => {
      console.log('🔌 Chat unsubscribing from generation status');
      supabase.removeChannel(statusChannel);
    };
  }, [projectId]);

  // ✅ FIX: Populate messageSteps from loaded messages with thinkingSteps
  // This ensures historical thinking steps appear when conversation loads
  useEffect(() => {
    const newMessageSteps = new Map<string, typeof thinkingSteps>();
    
    // For each message that has thinking steps, store them
    messages.forEach(message => {
      if (message.thinkingSteps && message.thinkingSteps.length > 0) {
        // If it's a user message, store steps directly
        if (message.role === 'user') {
          newMessageSteps.set(message.id, message.thinkingSteps);
        }
      }
    });
    
    // Only update if we have new steps to add
    if (newMessageSteps.size > 0) {
      setMessageSteps(newMessageSteps);
      console.log('✅ Loaded thinking steps for messages:', newMessageSteps.size);
    }
  }, [messages]);

  // Capture thinking steps for the current message - PERMANENT, never clear
  useEffect(() => {
    if (thinkingSteps.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        // Store in memory permanently
        setMessageSteps(prev => new Map(prev).set(lastUserMessage.id, [...thinkingSteps]));
        
        // Save to database if authenticated
        if (persistMessages && conversationId && !isLoading) {
          const saveSteps = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.user) return;
              
              await supabase.from('thinking_steps').insert(
                thinkingSteps.map(step => ({
                  conversation_id: conversationId,
                  message_id: lastUserMessage.id,
                  operation: step.operation,
                  detail: step.detail,
                  status: step.status,
                  duration: step.duration,
                  timestamp: step.timestamp,
                  user_id: session.user.id
                }))
              );
            } catch (error) {
              console.error('Failed to save thinking steps:', error);
            }
          };
          saveSteps();
        }
      }
    }
  }, [thinkingSteps, messages, isLoading, persistMessages, conversationId]);

  // ❌ REMOVED: Don't clear thinking steps - keep them permanent like Lovable/Replit

  // Auto-scroll on new messages AND on initial load
  useEffect(() => {
    // Scroll to bottom when:
    // 1. New messages are added (messages.length increases)
    // 2. Initial conversation load (messages exist but lastMessageCountRef is 0)
    const shouldScroll = messages.length > lastMessageCountRef.current || 
                        (messages.length > 0 && lastMessageCountRef.current === 0);
    
    if (shouldScroll) {
      // Use setTimeout to ensure DOM has fully rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      lastMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // Syntax highlighting
  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleCancelGeneration = () => {
    stopGeneration();
    setShowCancelDialog(false);
    toast.info('Generation cancelled');
  };

  const getContextFiles = () => {
    if (contextMode === 'none') return [];
    if (contextMode === 'selected') {
      return projectFiles.filter(f => selectedFiles.includes(f.file_path));
    }
    return projectFiles;
  };

  return (
    <Card className={`${config.padding} ${containerHeight} flex flex-col ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className={`font-bold ${config.headerSize}`}>AI Assistant</h3>
            </div>
          </div>

          {showContext && (
            <Tabs value={contextMode} onValueChange={(v) => setContextMode(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="none" className="text-xs">No Context</TabsTrigger>
                <TabsTrigger value="selected" className="text-xs">
                  Selected {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All Files</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      )}

      {/* Context Indicator */}
      {showContext && contextMode !== 'none' && getContextFiles().length > 0 && (
        <Card className="p-2 bg-muted/50 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <FileCode className="w-3 h-3" />
            <span className="text-muted-foreground">
              Context: {getContextFiles().length} file{getContextFiles().length !== 1 ? 's' : ''}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {getContextFiles().map(f => f.file_path.split('/').pop()).slice(0, 3).join(', ')}
              {getContextFiles().length > 3 && ` +${getContextFiles().length - 3}`}
            </Badge>
          </div>
        </Card>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4 mb-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-24 h-24 opacity-5" />
                </div>
                <div className="relative">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-2">Ready to help you build</p>
                  <p className="text-xs">
                    Report errors, request features, or ask questions
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages
            .filter(msg => {
              // Filter out system status messages
              if (msg.role === 'system') return false;
              
              // Don't filter user messages
              if (msg.role === 'user') return true;
              
              // For assistant messages, filter out placeholder status messages
              const content = msg.content.trim();
              if (msg.role === 'assistant') {
                // ✅ NEVER filter summary messages
                if (msg.metadata?.isSummary) {
                  return true;
                }
                
                // ALWAYS filter "Generation started" even with emoji
                if (content.includes('Generation started')) {
                  return false;
                }
                
                // Filter other auto-generated status patterns
                if (content.match(/^(generation complete|processing|thinking)\.?\.?\.?$/i)) {
                  return false;
                }
              }
              
              return true;
            })
            .map((message, index) => {
              const RouteIcon = message.metadata?.routedTo 
                ? ROUTE_ICONS[message.metadata.routedTo]
                : null;
              const routeLabel = message.metadata?.routedTo 
                ? ROUTE_LABELS[message.metadata.routedTo]
                : null;
              const routeColor = message.metadata?.routedTo
                ? ROUTE_COLORS[message.metadata.routedTo]
                : '';
              
              const isLastUserMessage = message.role === 'user' && 
                index === messages.filter(m => m.role === 'user').length - 1;

              // Show thinking steps inline for last user message when loading OR for assistant responses
              const userMessage = message.role === 'user' ? message : messages[index - 1];
              const stepsForMessage = userMessage?.role === 'user' ? messageSteps.get(userMessage.id) : undefined;
              
              // PERMANENT THINKING STEPS - Lovable/Replit style
              // For assistant messages: always show steps from previous user message (permanent)
              const showStepsForAssistant = message.role === 'assistant' && stepsForMessage && stepsForMessage.length > 0;
              
              // For user messages: show steps if it's the last one OR if we have stored steps for it
              const hasAssistantResponseAfter = message.role === 'user' && messages[index + 1]?.role === 'assistant';
              const showStepsForUser = message.role === 'user' && !hasAssistantResponseAfter && 
                (isLastUserMessage ? thinkingSteps.length > 0 : (stepsForMessage && stepsForMessage.length > 0));

              return (
                <div key={message.id}>
                  {/* Show thinking steps BEFORE assistant response (as context) */}
                  {showStepsForAssistant && (
                    <div className="mb-2">
                      <InlineThinkingSteps steps={stepsForMessage || []} />
                    </div>
                  )}
                  
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <Card 
                      className={`max-w-[85%] p-3 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.role === 'system'
                          ? 'bg-muted/50 border-dashed'
                          : 'bg-muted'
                      }`}
                    >
                      {/* Message Header */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {message.role === 'user' ? 'You' : 
                           message.role === 'system' ? 'System' : 'AI'}
                        </Badge>
                        
                        {/* Routing indicator */}
                        {RouteIcon && routeLabel && (
                          <Badge variant="secondary" className={`text-[10px] ${routeColor}`}>
                            <RouteIcon className="w-2 h-2 mr-1" />
                            {routeLabel}
                          </Badge>
                        )}

                        {/* Confidence score */}
                        {message.metadata?.confidence !== undefined && (
                          <Badge 
                            variant={message.metadata.confidence > 0.7 ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {Math.round(message.metadata.confidence * 100)}% confidence
                          </Badge>
                        )}

                        {/* Known pattern indicator */}
                        {message.metadata?.isKnown && (
                          <Badge variant="default" className="text-[10px]">
                            <CheckCircle2 className="w-2 h-2 mr-1" />
                            Known Fix
                          </Badge>
                        )}

                        {/* Context indicator */}
                        {message.contextFiles && message.contextFiles.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            <FileCode className="w-2 h-2 mr-1" />
                            {message.contextFiles.length} files
                          </Badge>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                        {message.streaming ? (
                          <span>{message.content}<span className="animate-pulse">▋</span></span>
                        ) : (
                          message.content
                        )}
                      </div>

                      {/* Implementation Plan */}
                      {message.plan && !message.streaming && !message.plan.approved && (
                        <div className="mt-3">
                          <PlanApprovalCard
                            plan={message.plan}
                            onApprove={() => {
                              // Send approval message to trigger actual generation
                              sendMessage('yes - proceed with implementation');
                            }}
                            onReject={(feedback) => {
                              // Send feedback to revise plan
                              sendMessage(feedback || 'Please revise the plan with these changes');
                            }}
                          />
                        </div>
                      )}

                      {/* Code Block */}
                      {message.codeBlock && !message.streaming && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">
                              <Code2 className="w-2 h-2 mr-1" />
                              {message.codeBlock.language}
                            </Badge>
                            {message.codeBlock.filePath && (
                              <Badge variant="secondary" className="text-[10px]">
                                {message.codeBlock.filePath}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="relative">
                            <pre className="text-xs bg-background/50 p-3 rounded overflow-x-auto max-h-[300px]">
                              <code className={`language-${message.codeBlock.language}`}>
                                {message.codeBlock.code}
                              </code>
                            </pre>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute top-2 right-2 h-6 w-6"
                              onClick={() => copyCode(message.codeBlock!.code)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
                        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                        {message.metadata?.category && (
                          <span className="opacity-50">{message.metadata.category}</span>
                        )}
                      </div>
                    </Card>
                  </div>
                  
                  {/* Show thinking steps AFTER user message (active or completed) */}
                  {showStepsForUser && (
                    <div className="mt-2">
                      <InlineThinkingSteps 
                        steps={thinkingSteps.length > 0 ? thinkingSteps : (stepsForMessage || [])} 
                      />
                    </div>
                  )}
                </div>
              );
            })}

          {/* ✅ NEW: Inline generation status indicator */}
          {generationStatus.isGenerating && (
            <div className="flex justify-start">
              <Card className="max-w-[85%] p-3 bg-muted border-primary/50">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">AI</Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        <Sparkles className="w-2 h-2 mr-1" />
                        Generating
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {generationStatus.message}
                    </p>
                    {generationStatus.progress > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-background/50 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${generationStatus.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {generationStatus.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Sensitive Data Detection */}
      <EnhancedSensitiveDataDetector 
        text={input} 
        autoMask={true}
        onMaskedText={(masked) => console.log('Auto-masked:', masked)}
      />

      {/* Input */}
      <div className="flex gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1"
        />
        {isLoading ? (
          <Button onClick={() => setShowCancelDialog(true)} variant="destructive" size="icon">
            <AlertCircle className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={!input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Generation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the current generation? This action cannot be undone and you'll lose all progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Generation</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelGeneration} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}