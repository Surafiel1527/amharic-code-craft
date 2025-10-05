import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Code2, Eye, FileCode, Sparkles, 
  Loader2, CheckCircle2, XCircle, Copy 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnhancedSensitiveDataDetector } from "@/components/EnhancedSensitiveDataDetector";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";

interface EnhancedChatInterfaceProps {
  projectId?: string;
  selectedFiles?: string[];
  projectFiles?: Array<{ file_path: string; file_content: string }>;
  onCodeApply?: (code: string, filePath: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  codeBlock?: {
    language: string;
    code: string;
    filePath?: string;
  };
  contextFiles?: string[];
  streaming?: boolean;
}

export function EnhancedChatInterface({ 
  projectId, 
  selectedFiles = [], 
  projectFiles = [],
  onCodeApply 
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contextMode, setContextMode] = useState<'selected' | 'all' | 'none'>('selected');

  // Scroll to bottom whenever messages change or component mounts
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, streamingContent]);

  // Scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  useEffect(() => {
    // Syntax highlight all code blocks
    Prism.highlightAll();
  }, [messages]);

  const getContextFiles = () => {
    if (contextMode === 'none') return [];
    if (contextMode === 'selected') {
      return projectFiles.filter(f => selectedFiles.includes(f.file_path));
    }
    return projectFiles; // 'all' mode
  };

  const extractCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = [...content.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      const match = matches[0];
      return {
        language: match[1] || 'typescript',
        code: match[2].trim(),
        filePath: extractFilePath(match[2])
      };
    }
    return undefined;
  };

  const extractFilePath = (code: string): string | undefined => {
    const firstLine = code.split('\n')[0];
    if (firstLine.startsWith('//') && firstLine.includes('.tsx')) {
      return firstLine.replace('//', '').trim();
    }
    return undefined;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      contextFiles: getContextFiles().map(f => f.file_path)
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const contextFiles = getContextFiles();
      const contextData = contextFiles.map(f => ({
        path: f.file_path,
        content: f.file_content.substring(0, 1000) // First 1000 chars for context
      }));

      // Build comprehensive code context from selected files
      const currentCode = contextFiles.length > 0 
        ? contextFiles.map(f => `// ${f.file_path}\n${f.file_content}`).join('\n\n')
        : '';

      // Get conversation history for context
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Streaming response
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        streaming: true
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Add timeout to prevent indefinite waiting
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 60000) // 60 second timeout for complex fixes
      );

      // Use smart orchestrator for complex fixes with full context
      const invokePromise = supabase.functions.invoke('smart-orchestrator', {
        body: {
          userRequest: input,
          conversationId: projectId, // Use projectId as conversation context
          currentCode,
          conversationHistory,
          autoRefine: true,
          autoLearn: true,
          context: {
            files: contextData,
            selectedFiles
          }
        }
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (error) throw error;

      const fullContent = data?.message || data?.finalCode || data?.explanation || "I'm here to help!";
      const codeBlock = extractCodeBlocks(fullContent);

      // Update the assistant message with complete response
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { 
              ...m, 
              content: fullContent, 
              codeBlock,
              streaming: false 
            }
          : m
      ));

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMsg);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}. Please try again or simplify your request.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setStreamingContent("");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const applyCode = (code: string, filePath?: string) => {
    if (onCodeApply && filePath) {
      onCodeApply(code, filePath);
      toast.success(`Applied changes to ${filePath}`);
    } else {
      toast.error('No file path specified');
    }
  };

  return (
    <Card className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">Enhanced AI Chat</h3>
        </div>
        <Tabs value={contextMode} onValueChange={(v) => setContextMode(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="none" className="text-xs">No Context</TabsTrigger>
            <TabsTrigger value="selected" className="text-xs">
              Selected {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Files</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Context Indicator */}
      {contextMode !== 'none' && (
        <Card className="p-2 bg-muted/50">
          <div className="flex items-center gap-2 text-xs">
            <FileCode className="w-3 h-3" />
            <span className="text-muted-foreground">
              Context: {getContextFiles().length} file{getContextFiles().length !== 1 ? 's' : ''}
            </span>
            {getContextFiles().length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {getContextFiles().map(f => f.file_path.split('/').pop()).join(', ')}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 pr-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Start a conversation with context-aware AI</p>
              <p className="text-xs mt-2">
                {contextMode === 'selected' ? 'Using selected files as context' :
                 contextMode === 'all' ? 'Using all files as context' :
                 'No file context'}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card 
                className={`max-w-[80%] p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </Badge>
                  {message.contextFiles && message.contextFiles.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      <FileCode className="w-2 h-2 mr-1" />
                      {message.contextFiles.length} files
                    </Badge>
                  )}
                </div>

                {/* Message Content */}
                <div className="text-sm whitespace-pre-wrap">
                  {message.streaming && streamingContent ? streamingContent : message.content}
                  {message.streaming && <span className="animate-pulse">▋</span>}
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
                      <pre className="text-xs bg-background/50 p-3 rounded overflow-x-auto">
                        <code className={`language-${message.codeBlock.language}`}>
                          {message.codeBlock.code}
                        </code>
                      </pre>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyCode(message.codeBlock!.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        {message.codeBlock.filePath && onCodeApply && (
                          <Button
                            size="icon"
                            variant="default"
                            className="h-6 w-6"
                            onClick={() => applyCode(message.codeBlock!.code, message.codeBlock!.filePath)}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-[10px] text-muted-foreground mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </Card>
            </div>
          ))}
          {/* Invisible div to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Sensitive Data Detection */}
      <EnhancedSensitiveDataDetector 
        text={input} 
        autoMask={true}
        onMaskedText={(masked) => console.log('Auto-masked:', masked)}
      />

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about your code, request changes, or get suggestions..."
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Multi-file context • Syntax highlighting • Code preview • Smart security detection
      </div>
    </Card>
  );
}
