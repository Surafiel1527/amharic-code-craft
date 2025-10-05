import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  codeBlock?: {
    language: string;
    code: string;
    filePath?: string;
  };
  contextFiles?: string[];
  streaming?: boolean;
  metadata?: {
    category?: string;
    confidence?: number;
    isKnown?: boolean;
    patternId?: string;
    routedTo?: 'error-teacher' | 'orchestrator' | 'direct';
  };
}

export interface UniversalAIChatOptions {
  projectId?: string;
  contextFiles?: Array<{ file_path: string; file_content: string }>;
  selectedFiles?: string[];
  onCodeApply?: (code: string, filePath: string) => Promise<void>;
  onError?: (error: Error) => void;
  maxContextLength?: number;
  autoLearn?: boolean;
  autoApply?: boolean;
}

export interface UniversalAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  stopGeneration: () => void;
  addSystemMessage: (content: string) => void;
}

/**
 * Universal AI Chat Hook
 * 
 * The single source of truth for ALL AI interactions in the platform.
 * Provides consistent intelligence, routing, and learning across all chat interfaces.
 * 
 * Features:
 * - Smart routing between Error Teacher and Smart Orchestrator
 * - Automatic error detection and categorization
 * - Context-aware responses
 * - Universal error learning integration
 * - Auto-fix application
 * - Conversation history management
 * - Streaming support
 */
export function useUniversalAIChat(options: UniversalAIChatOptions = {}): UniversalAIChatReturn {
  const {
    projectId,
    contextFiles = [],
    selectedFiles = [],
    onCodeApply,
    onError,
    maxContextLength = 1000,
    autoLearn = true,
    autoApply = true
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');

  /**
   * Detects if the message is likely reporting an error
   */
  const detectError = useCallback((message: string): boolean => {
    const errorKeywords = /error|failed|exception|warning|issue|problem|bug|broken|not working|doesn't work|can't|cannot|unable|crash|freeze|fix|help/i;
    return errorKeywords.test(message);
  }, []);

  /**
   * Builds context for the AI based on selected files and conversation history
   */
  const buildContext = useCallback(() => {
    const contextData = contextFiles
      .filter(f => selectedFiles.includes(f.file_path))
      .map(f => ({
        path: f.file_path,
        content: f.file_content.substring(0, maxContextLength)
      }));

    const currentCode = contextData.length > 0
      ? contextData.map(f => `// ${f.path}\n${f.content}`).join('\n\n')
      : '';

    const conversationHistory = messages.slice(-5).map(m => ({
      role: m.role,
      content: m.content
    }));

    return { contextData, currentCode, conversationHistory };
  }, [contextFiles, selectedFiles, messages, maxContextLength]);

  /**
   * Routes the message to Universal Error Teacher
   */
  const routeToErrorTeacher = useCallback(async (message: string, context: any): Promise<any> => {
    console.log('🧠 Routing to Universal Error Teacher');

    try {
      const { data, error } = await supabase.functions.invoke('universal-error-teacher', {
        body: {
          errorMessage: message,
          errorContext: {
            selectedFiles,
            conversationHistory: context.conversationHistory,
            timestamp: new Date().toISOString()
          },
          projectContext: {
            files: context.contextData,
            selectedFiles,
            projectId,
            projectType: 'vite-react-typescript'
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Error teacher failed, will fallback to orchestrator:', error);
      return null;
    }
  }, [projectId, selectedFiles]);

  /**
   * Routes the message to Smart Orchestrator
   */
  const routeToOrchestrator = useCallback(async (message: string, context: any): Promise<any> => {
    console.log('🎯 Routing to Smart Orchestrator');

    try {
      const { data, error } = await supabase.functions.invoke('smart-orchestrator', {
        body: {
          userRequest: message,
          conversationId: projectId,
          currentCode: context.currentCode,
          conversationHistory: context.conversationHistory,
          autoRefine: true,
          autoLearn: autoLearn,
          context: {
            files: context.contextData,
            selectedFiles
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Smart orchestrator failed:', error);
      throw error;
    }
  }, [projectId, selectedFiles, autoLearn]);

  /**
   * Applies code fixes automatically
   */
  const applyCodeFix = useCallback(async (code: string, filePath: string, metadata?: any): Promise<boolean> => {
    if (!onCodeApply || !autoApply) return false;

    try {
      await onCodeApply(code, filePath);
      
      // Submit feedback if this was from error teacher
      if (metadata?.patternId) {
        const user = await supabase.auth.getUser();
        if (user.data.user) {
          await supabase.from('error_fix_feedback').insert({
            pattern_id: metadata.patternId,
            user_id: user.data.user.id,
            project_id: projectId,
            fix_worked: true,
            error_context: { message: lastUserMessageRef.current, selectedFiles },
            applied_solution: { code, filePath }
          });
        }
      }

      toast.success(`✅ Applied fix to ${filePath}`);
      return true;
    } catch (error) {
      console.error('Failed to apply code fix:', error);
      toast.error('Failed to apply fix - please check file permissions');
      
      // Submit failure feedback
      if (metadata?.patternId) {
        const user = await supabase.auth.getUser();
        if (user.data.user) {
          await supabase.from('error_fix_feedback').insert({
            pattern_id: metadata.patternId,
            user_id: user.data.user.id,
            project_id: projectId,
            fix_worked: false,
            error_context: { message: lastUserMessageRef.current, selectedFiles },
            applied_solution: { code, filePath },
            user_feedback: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return false;
    }
  }, [onCodeApply, autoApply, projectId, selectedFiles]);

  /**
   * Processes the AI response and formats the message
   */
  const processResponse = useCallback(async (
    data: any,
    routedTo: 'error-teacher' | 'orchestrator'
  ): Promise<Message> => {
    let content = '';
    let codeBlock: Message['codeBlock'] = undefined;
    let metadata: Message['metadata'] = { routedTo };

    if (routedTo === 'error-teacher' && data) {
      const { solution, diagnosis, category, confidence, isKnown, patternId } = data;
      
      metadata = {
        ...metadata,
        category,
        confidence,
        isKnown,
        patternId
      };

      if (solution?.files && solution.files.length > 0) {
        const file = solution.files[0];
        const applied = await applyCodeFix(file.content, file.path, metadata);

        content = `✅ **${category?.toUpperCase() || 'ERROR'} Fixed!**\n\n` +
          `**Diagnosis:** ${diagnosis}\n\n` +
          `**Applied Changes:**\n` +
          solution.files.map((f: any, i: number) => 
            `${i + 1}. ${applied ? '✅' : '📝'} ${f.action} \`${f.path}\`\n   ${f.explanation}`
          ).join('\n') +
          (solution.steps ? `\n\n**Next Steps:**\n${solution.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}` : '') +
          (data.preventionTips?.length > 0 
            ? `\n\n**💡 Prevention:**\n${data.preventionTips.map((t: string) => `• ${t}`).join('\n')}` 
            : '');

        codeBlock = {
          language: file.path.endsWith('.json') ? 'json' : 'typescript',
          code: file.content,
          filePath: file.path
        };
      } else if (solution?.codeChanges) {
        content = `🔧 **${category?.toUpperCase() || 'ERROR'} Analysis**\n\n` +
          `**Diagnosis:** ${diagnosis}\n\n` +
          solution.codeChanges.map((c: any) => 
            `**${c.file}**\n${c.changes}\n\`\`\`typescript\n${c.after}\n\`\`\``
          ).join('\n\n');
      }
    } else if (routedTo === 'orchestrator' && data) {
      // Handle orchestrator response
      if (data.finalCode && typeof data.finalCode === 'string') {
        const filePath = selectedFiles.length === 1 ? selectedFiles[0] : 'generated-file';
        await applyCodeFix(data.finalCode, filePath, metadata);

        content = `${data.explanation || data.message || 'Code generated successfully'}\n\n` +
          `Applied to: \`${filePath}\``;

        codeBlock = {
          language: 'typescript',
          code: data.finalCode,
          filePath
        };
      } else {
        content = data.message || data.explanation || 'Request processed successfully';
      }
    }

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: content || 'I processed your request.',
      timestamp: new Date().toISOString(),
      codeBlock,
      metadata
    };
  }, [applyCodeFix, selectedFiles]);

  /**
   * Main message sending function with smart routing
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    lastUserMessageRef.current = message;
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      contextFiles: selectedFiles
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const context = buildContext();
      const isError = detectError(message);

      let response: any = null;
      let routedTo: 'error-teacher' | 'orchestrator' = 'orchestrator';

      // Smart Routing Decision
      if (isError) {
        console.log('🔍 Error detected - trying Universal Error Teacher first');
        response = await routeToErrorTeacher(message, context);
        
        if (response && response.solution) {
          routedTo = 'error-teacher';
          toast.success(response.isKnown 
            ? `✅ Known ${response.category} error - applying fix` 
            : `🎓 Learning new ${response.category} pattern`
          );
        } else {
          console.log('⚠️ Error teacher no solution - falling back to orchestrator');
        }
      }

      // Fallback or direct routing to orchestrator
      if (!response) {
        response = await routeToOrchestrator(message, context);
        routedTo = 'orchestrator';
      }

      // Process and add assistant response
      const assistantMessage = await processResponse(response, routedTo);
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process message';
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMsg));
      }

      toast.error(errorMsg);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ **Error**\n\n${errorMsg}\n\n**What to try:**\n• Simplify your request\n• Check file selections\n• Try again in a moment`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    isLoading,
    selectedFiles,
    buildContext,
    detectError,
    routeToErrorTeacher,
    routeToOrchestrator,
    processResponse,
    onError
  ]);

  /**
   * Clears all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Retries the last user message
   */
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  /**
   * Stops the current generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      toast.info('Generation stopped');
    }
  }, []);

  /**
   * Adds a system message
   */
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    retryLastMessage,
    stopGeneration,
    addSystemMessage
  };
}