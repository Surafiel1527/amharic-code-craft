import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Code2, Sparkles, Loader2, Copy, 
  CheckCircle2, Brain, Target, FileCode, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useUniversalAIChat, Message } from "@/hooks/useUniversalAIChat";
import { EnhancedSensitiveDataDetector } from "@/components/EnhancedSensitiveDataDetector";
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
  placeholder = 'Type your message...'
}: UniversalChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [contextMode, setContextMode] = useState<'selected' | 'all' | 'none'>('selected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const config = MODE_CONFIGS[mode];
  const containerHeight = height || config.height;

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
    projectContext
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">
                  <Brain className="w-3 h-3 mr-1" />
                  Universal Learning
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  <Target className="w-3 h-3 mr-1" />
                  Smart Routing
                </Badge>
              </div>
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
                  <div className="flex items-center justify-center gap-3 mt-4 text-[10px]">
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      8 Error Categories
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Smart Routing
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Auto-Fix
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const RouteIcon = message.metadata?.routedTo 
              ? ROUTE_ICONS[message.metadata.routedTo]
              : null;
            const routeLabel = message.metadata?.routedTo 
              ? ROUTE_LABELS[message.metadata.routedTo]
              : null;
            const routeColor = message.metadata?.routedTo
              ? ROUTE_COLORS[message.metadata.routedTo]
              : '';

            return (
              <div
                key={message.id}
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
            );
          })}

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
          <Button onClick={stopGeneration} variant="destructive" size="icon">
            <AlertCircle className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={!input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="text-xs text-muted-foreground text-center mt-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Brain className="w-3 h-3" />
              8 Error Categories
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Smart Routing
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Learning
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}