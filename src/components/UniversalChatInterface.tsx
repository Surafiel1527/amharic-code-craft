import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  persistMessages?: boolean; // ✅ ENTERPRISE: Persistence enabled by default
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
  
  // ✅ ENTERPRISE: Persistent AI Status tracking
  const [persistentAIStatus, setPersistentAIStatus] = useState<{
    isVisible: boolean;
    status: 'analyzing' | 'generating' | 'complete' | 'error';
    message: string;
    progress: number;
    summary?: string;
    filesGenerated?: number;
    duration?: number;
  } | null>(null);
  
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
    progress,
    loadConversation
  } = useUniversalAIChat({
    projectId,
    conversationId,
    contextFiles: projectFiles,
    selectedFiles: contextMode === 'selected' ? selectedFiles : contextMode === 'all' ? projectFiles.map(f => f.file_path) : [],
    onCodeApply,
    onConversationChange,
    persistMessages: true, // ✅ ENTERPRISE: Always persist messages for permanent conversation history
    autoLearn,
    autoApply,
    enableTools,
    enableStreaming,
    projectContext: { ...projectContext, ...(context || {}) }, // Merge contexts
    mode: operationMode // Pass operation mode to the hook
  });

  // ✅ ENTERPRISE: Subscribe to generation status with permanent AI status display
  useEffect(() => {
    if (!conversationId) return;
    
    console.log('🔌 Chat subscribing to generation status:', `ai-status-${conversationId}`);
    
    const statusChannel = supabase
      .channel(`ai-status-${conversationId}`)
      .on('broadcast', { event: 'status-update' }, async ({ payload }) => {
        console.log('📥 Chat received status-update:', payload);
        
        // ============================================
        // ENTERPRISE FIX: Keep AI status permanently visible
        // ============================================
        
        // Handle error status
        if (payload.status === 'error') {
          setPersistentAIStatus({
            isVisible: true,
            status: 'error',
            message: payload.message || 'Generation failed',
            progress: 0,
            summary: payload.errors?.join('\n') || 'An error occurred during generation'
          });
          setGenerationStatus({
            isGenerating: false,
            message: '',
            progress: 0
          });
          return;
        }
        
        // Handle idle status (completion) - Add completion summary
        if (payload.status === 'idle') {
          console.log('✅ Generation completed - showing summary');
          
          const filesGenerated = payload.metadata?.filesGenerated || 0;
          const duration = payload.metadata?.duration || 0;
          
          const summary = `Generation complete! ${filesGenerated > 0 ? `${filesGenerated} file${filesGenerated > 1 ? 's' : ''} generated` : 'Task completed'}${duration > 0 ? ` in ${Math.round(duration / 1000)}s` : ''}`;
          
          setPersistentAIStatus({
            isVisible: true,
            status: 'complete',
            message: payload.message || 'Project generated successfully',
            progress: 100,
            summary,
            filesGenerated,
            duration
          });
          
          setTimeout(() => {
            setGenerationStatus({ isGenerating: false, message: '', progress: 0 });
            // Keep status visible for 5 seconds after completion
            setTimeout(() => {
              setPersistentAIStatus(null);
            }, 5000);
          }, 500);
          return;
        }
        
        // Update persistent status with current progress
        const isGenerating = payload.status !== 'idle' && payload.status !== 'error';
        
        if (isGenerating) {
          setPersistentAIStatus({
            isVisible: true,
            status: payload.status as 'analyzing' | 'generating',
            message: payload.message || 'Processing...',
            progress: payload.progress || 0
          });
        }
        
        setGenerationStatus({
          isGenerating,
          message: payload.message || 'Generating...',
          progress: payload.progress || 0
        });
      })
      .on('broadcast', { event: 'generation:coding' }, ({ payload }) => {
        console.log('📥 Chat received generation:coding:', payload);
        
        setPersistentAIStatus({
          isVisible: true,
          status: 'generating',
          message: payload.message || 'Generating code...',
          progress: payload.progress || 50
        });
        
        setGenerationStatus({
          isGenerating: true,
          message: payload.message || 'Generating code...',
          progress: payload.progress || 50
        });
      })
      .subscribe();
    
    return () => {
      console.log('🔌 Chat unsubscribing from generation status');
      supabase.removeChannel(statusChannel);
    };
  }, [conversationId]);

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
              // Show generation start messages but filter other system messages
              if (msg.role === 'system' && !msg.metadata?.isGenerationStart) return false;
              
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
              const showStepsForAssistant = message.role === 'assistant' && 
                stepsForMessage && 
                stepsForMessage.length > 0 &&
                !message.metadata?.isSummary; // Don't show steps above summary messages (they're integrated)
              
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
                          <div className="space-y-2">
                            <span>{message.content}</span>
                            <span className="animate-pulse">▋</span>
                            {/* Show inline progress for streaming generation messages */}
                            {message.metadata?.isGenerationStart && generationStatus.isGenerating && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                                  <span className="text-xs font-medium">{generationStatus.message}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${generationStatus.progress}%` }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 text-right">
                                  {generationStatus.progress}%
                                </div>
                              </div>
                            )}
                          </div>
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

          {/* ✅ ENTERPRISE: Persistent AI Status Display */}
          {persistentAIStatus?.isVisible && (
            <div className="flex justify-start">
              <Card className={`max-w-[85%] p-4 border-2 ${
                persistentAIStatus.status === 'complete' 
                  ? 'bg-success/5 border-success/50' 
                  : persistentAIStatus.status === 'error'
                    ? 'bg-destructive/5 border-destructive/50'
                    : 'bg-primary/5 border-primary/50'
              }`}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    {persistentAIStatus.status === 'complete' ? (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    ) : persistentAIStatus.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">AI</Badge>
                        <Badge 
                          variant={
                            persistentAIStatus.status === 'complete' 
                              ? 'default' 
                              : persistentAIStatus.status === 'error'
                                ? 'destructive'
                                : 'secondary'
                          } 
                          className="text-[10px]"
                        >
                          <Sparkles className="w-2 h-2 mr-1" />
                          {persistentAIStatus.status === 'complete' 
                            ? 'Complete' 
                            : persistentAIStatus.status === 'error'
                              ? 'Error'
                              : persistentAIStatus.status === 'analyzing'
                                ? 'Analyzing'
                                : 'Generating'}
                        </Badge>
                      </div>
                      
                      {/* Status Message */}
                      <p className="text-sm font-medium">
                        {persistentAIStatus.message}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar - Only show during active generation */}
                  {persistentAIStatus.status !== 'complete' && 
                   persistentAIStatus.status !== 'error' && 
                   persistentAIStatus.progress > 0 && (
                    <div className="space-y-1">
                      <Progress 
                        value={persistentAIStatus.progress} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{persistentAIStatus.progress}% complete</span>
                        <span className="font-medium">In progress...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Completion Summary */}
                  {persistentAIStatus.status === 'complete' && persistentAIStatus.summary && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        {persistentAIStatus.summary}
                      </p>
                      
                      {/* Details */}
                      {(persistentAIStatus.filesGenerated || persistentAIStatus.duration) && (
                        <div className="flex gap-4 mt-2 text-xs">
                          {persistentAIStatus.filesGenerated && (
                            <div className="flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              <span>{persistentAIStatus.filesGenerated} files</span>
                            </div>
                          )}
                          {persistentAIStatus.duration && (
                            <div className="flex items-center gap-1">
                              <span>⏱</span>
                              <span>{Math.round(persistentAIStatus.duration / 1000)}s</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Error Details */}
                  {persistentAIStatus.status === 'error' && persistentAIStatus.summary && (
                    <div className="pt-2 border-t border-destructive/20">
                      <p className="text-sm text-destructive/90">
                        {persistentAIStatus.summary}
                      </p>
                    </div>
                  )}
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
          <Button 
            onClick={() => setShowCancelDialog(true)} 
            variant="destructive" 
            size="icon"
            className="animate-pulse"
            title="Cancel generation"
          >
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