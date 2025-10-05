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
  const lastMessageCountRef = useRef(0);

  // Only scroll when a new message is added (not during streaming updates)
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]); // Only depend on message count, not content

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
    // Check for file path comments in various formats
    if (firstLine.startsWith('//') && (firstLine.includes('.tsx') || firstLine.includes('.ts') || firstLine.includes('.jsx') || firstLine.includes('.js'))) {
      return firstLine.replace('//', '').trim();
    }
    // Check for file path in format: "File: src/..."
    if (firstLine.toLowerCase().includes('file:') && (firstLine.includes('.tsx') || firstLine.includes('.ts'))) {
      return firstLine.split('file:')[1].trim();
    }
    // Try to extract from selected files context
    if (selectedFiles.length === 1) {
      return selectedFiles[0];
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

      // 🤖 SMART ROUTING: Decide between Universal Error Teacher and Smart Orchestrator
      const errorKeywords = /error|failed|exception|warning|issue|problem|bug|broken|not working|doesn't work|can't|cannot|unable|crash|freeze/i;
      const isLikelyError = errorKeywords.test(input);
      
      // Route 1: Error Detection - Use Universal Error Teacher first
      if (isLikelyError) {
        console.log('🔍 Error detected - trying universal error teacher first');
        
        try {
          const { data: errorTeacherResult, error: teachError } = await supabase.functions.invoke('universal-error-teacher', {
            body: {
              errorMessage: input,
              errorContext: {
                selectedFiles,
                conversationHistory: messages.slice(-3).map(m => ({ role: m.role, content: m.content })),
                timestamp: new Date().toISOString()
              },
              projectContext: {
                files: contextData,
                selectedFiles,
                projectId,
                projectType: 'vite-react-typescript'
              }
            }
          });

          // If error teacher found a solution, apply it
          if (errorTeacherResult?.solution && !teachError) {
            const { solution, diagnosis, category, confidence, isKnown, patternId } = errorTeacherResult;
            
            toast.success(isKnown 
              ? `✅ Applied known ${category} fix (${Math.round(confidence * 100)}% confidence)` 
              : `🎓 AI learned new ${category} fix - applying now!`
            );
            
            // Extract and apply the first file fix
            if (solution.files && solution.files.length > 0) {
              const fileToApply = solution.files[0];
              const fileCode = fileToApply.content;
              const filePath = fileToApply.path;
              
              if (onCodeApply && fileCode && filePath) {
                try {
                  await onCodeApply(fileCode, filePath);
                  
                  // Build success message with feedback option
                  const successMsg = `✅ **${category.toUpperCase()} Error Fixed!**\n\n` +
                    `**What was wrong:** ${diagnosis}\n\n` +
                    `**What I did:**\n` +
                    solution.files.map((f: any, i: number) => 
                      `${i + 1}. ${f.action === 'create' ? 'Created' : f.action === 'modify' ? 'Modified' : 'Updated'} \`${f.path}\`\n   → ${f.explanation}`
                    ).join('\n') +
                    `\n\n**Verification steps:**\n` +
                    solution.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') +
                    `\n\n${solution.verification}` +
                    (errorTeacherResult.preventionTips?.length > 0 
                      ? `\n\n**💡 Prevention Tips:**\n${errorTeacherResult.preventionTips.map((t: string) => `• ${t}`).join('\n')}` 
                      : '') +
                    `\n\n---\n\n${isKnown 
                      ? `🧠 **Known Solution Applied** - The AI recognized this ${category} error and applied a proven fix.` 
                      : `🎓 **New Pattern Learned** - The AI learned how to fix this ${category} error for future occurrences.`}`;
                  
                  const successMessage: Message = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: successMsg,
                    timestamp: new Date().toISOString(),
                    codeBlock: {
                      language: filePath.endsWith('.json') ? 'json' : filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
                      code: fileCode,
                      filePath: filePath
                    }
                  };
                  
                  setMessages(prev => [...prev, successMessage]);
                  
                  // Submit feedback automatically as success
                  if (patternId) {
                    await supabase.from('error_fix_feedback').insert({
                      pattern_id: patternId,
                      user_id: (await supabase.auth.getUser()).data.user?.id,
                      project_id: projectId,
                      fix_worked: true,
                      error_context: { errorMessage: input, selectedFiles },
                      applied_solution: solution
                    });
                  }
                  
                  setLoading(false);
                  toast.success(`✅ ${category} error fixed - created ${filePath}`);
                  return; // Successfully handled by error teacher
                } catch (applyError) {
                  console.error('Failed to auto-apply error fix:', applyError);
                  // Continue to smart orchestrator as fallback
                }
              }
            } else if (solution.codeChanges && solution.codeChanges.length > 0) {
              // Handle code modifications (not file creation)
              const changeInstructions = solution.codeChanges.map((change: any, i: number) =>
                `**${i + 1}. ${change.file}**\n${change.changes}\n\`\`\`typescript\n// Before:\n${change.before || '// N/A'}\n\n// After:\n${change.after}\n\`\`\``
              ).join('\n\n');
              
              const instructionsMsg = `🔧 **${category.toUpperCase()} Error Analysis**\n\n` +
                `**Diagnosis:** ${diagnosis}\n\n` +
                `**Required Changes:**\n${changeInstructions}\n\n` +
                `**Steps:**\n${solution.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n` +
                `**Verification:** ${solution.verification}`;
              
              const instructionsMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: instructionsMsg,
                timestamp: new Date().toISOString()
              };
              
              setMessages(prev => [...prev, instructionsMessage]);
              setLoading(false);
              return;
            }
          }
        } catch (errorTeacherError) {
          console.log('⚠️ Error teacher failed, falling back to smart orchestrator:', errorTeacherError);
          // Continue to smart orchestrator as fallback
        }
      }

      // Route 2: Smart Orchestrator - Handles general requests and complex fixes
      console.log('🎯 Routing to smart orchestrator for intelligent processing');
      
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

      // Extract code and explanation from orchestrator response
      let fullContent = '';
      let codeToApply = null;
      let filePathToApply = null;

      // Handle different response formats from smart orchestrator
      if (data?.finalCode && typeof data.finalCode === 'string' && data.finalCode.length > 50) {
        // Got actual code to apply
        codeToApply = data.finalCode;
        filePathToApply = selectedFiles.length === 1 ? selectedFiles[0] : null;
        
        // Build user-friendly message
        const explanation = data?.explanation || data?.message || 'Applied the fix';
        fullContent = `${explanation}\n\n${filePathToApply ? `Updated: ${filePathToApply}` : ''}`;
      } else if (data?.message) {
        // Got an explanation or instructions
        fullContent = data.message;
        
        // Try to detect if message contains configuration files (like vercel.json)
        const jsonConfigMatch = fullContent.match(/```json\s*\n?([\s\S]*?)\n?```/);
        if (jsonConfigMatch) {
          const configContent = jsonConfigMatch[1].trim();
          
          // Check if it's a vercel.json or other deployment config
          if (fullContent.toLowerCase().includes('vercel.json') || 
              configContent.includes('"buildCommand"') || 
              configContent.includes('"outputDirectory"')) {
            codeToApply = configContent;
            filePathToApply = 'vercel.json';
            fullContent = `📝 **Creating Deployment Configuration**\n\n${fullContent}`;
          }
        }
      } else if (data?.explanation) {
        fullContent = data.explanation;
      } else {
        fullContent = "I've analyzed your request. Please provide more details about the deployment error.";
      }

      // Try to extract code blocks from the message
      const codeBlock = extractCodeBlocks(fullContent);
      if (codeBlock && !codeToApply) {
        codeToApply = codeBlock.code;
        filePathToApply = codeBlock.filePath;
      }

      // Auto-apply code fixes if we have valid code and file path
      if (codeToApply && filePathToApply && onCodeApply && codeToApply.length > 10) {
        try {
          await onCodeApply(codeToApply, filePathToApply);
          fullContent = `✅ **Fix Complete!**\n\nCreated/Updated: \`${filePathToApply}\`\n\n${fullContent}\n\n---\n\n💡 **Next Steps:**\n• Check if the file was created correctly\n• Commit and push to trigger a new deployment\n• Verify the deployment succeeds`;
          toast.success(`✅ Created ${filePathToApply}`);
        } catch (applyError) {
          console.error('Failed to auto-apply code:', applyError);
          fullContent = `⚠️ **Fix Generated But Not Applied**\n\n${fullContent}\n\nPlease manually create the file or check permissions.`;
          toast.error('Generated fix but failed to apply. Please check the file.');
        }
      } else if (codeToApply && !filePathToApply) {
        fullContent = `📝 **Fix Generated**\n\n${fullContent}\n\n⚠️ No target file specified. Please select a file to apply changes.`;
      }

      // Auto-apply code fixes if we have valid code and file path
      if (codeToApply && filePathToApply && onCodeApply && codeToApply.length > 50) {
        try {
          await onCodeApply(codeToApply, filePathToApply);
          fullContent = `✅ **Fix Complete!**\n\nApplied changes to: \`${filePathToApply}\`\n\n${fullContent}\n\n---\n\n💡 **Next Steps:**\n• Check the preview to verify the fix\n• Test the deployment if this was a deployment error\n• Ask me for more improvements if needed`;
          toast.success(`✅ Fix applied to ${filePathToApply}`);
        } catch (applyError) {
          console.error('Failed to auto-apply code:', applyError);
          fullContent = `⚠️ **Fix Generated But Not Applied**\n\n${fullContent}\n\nPlease manually apply the changes or check file permissions.`;
          toast.error('Generated fix but failed to apply. Please check the file.');
        }
      } else if (codeToApply && !filePathToApply) {
        fullContent = `📝 **Fix Generated**\n\n${fullContent}\n\n⚠️ No target file specified. Please select a file to apply changes.`;
      }

      // Update the assistant message with complete response
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { 
              ...m, 
              content: fullContent, 
              codeBlock: codeToApply && filePathToApply ? { 
                language: 'typescript', 
                code: codeToApply, 
                filePath: filePathToApply 
              } : undefined,
              streaming: false 
            }
          : m
      ));

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMsg);
      
      // Remove the streaming assistant message
      setMessages(prev => prev.filter(m => !m.streaming));
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ **Error Occurred**\n\n${errorMsg}\n\n**What to try:**\n• Simplify your request\n• Check if files are selected\n• Try again in a moment`,
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
          <Badge variant="outline" className="text-[10px]">
            🧠 Universal Error Learning
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            🎯 Smart Orchestrator
          </Badge>
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
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span>🧠 Universal Error Learning (8 categories)</span>
          <span>•</span>
          <span>🎯 Smart Orchestrator</span>
          <span>•</span>
          <span>🔒 Privacy Protected</span>
          <span>•</span>
          <span>📊 Auto-improving AI</span>
        </div>
      </div>
    </Card>
  );
}
