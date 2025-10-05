import { useState, useCallback, useRef, useEffect } from 'react';
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
    orchestration?: {
      phases: string[];
      duration: number;
      qualityScore?: number;
    };
    toolUsed?: string;
    toolResult?: any;
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
  persistMessages?: boolean;
  conversationId?: string;
  onConversationChange?: (id: string) => void;
  enableStreaming?: boolean;
  enableTools?: boolean;
  projectContext?: any;
}

export interface UniversalAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  stopGeneration: () => void;
  addSystemMessage: (content: string) => void;
  conversationId: string | null;
  currentPhase: string;
  progress: number;
  loadConversation: (convId: string) => Promise<void>;
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
    autoApply = true,
    persistMessages = false,
    conversationId: externalConversationId,
    onConversationChange,
    enableStreaming = false,
    enableTools = false,
    projectContext
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(externalConversationId || null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');

  /**
   * Load conversation messages from database
   */
  const loadConversation = useCallback(async (convId: string) => {
    if (!persistMessages) return;

    console.log('💬 Loading conversation:', convId);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const typedMessages: Message[] = (data || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
          codeBlock: m.generated_code ? {
            language: 'typescript',
            code: m.generated_code,
            filePath: undefined
          } : undefined
        }));

      setMessages(typedMessages);
      console.log('✅ Loaded', typedMessages.length, 'messages');
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation history');
    }
  }, [persistMessages]);

  /**
   * Create new conversation
   */
  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!persistMessages) return null;

    console.log('💬 Creating new conversation');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .insert({ 
          title: 'Universal AI Chat',
          user_id: user.id,
          project_id: projectId
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Created conversation:', data.id);
      setConversationId(data.id);
      if (onConversationChange) {
        onConversationChange(data.id);
      }
      return data.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  }, [persistMessages, projectId, onConversationChange]);

  /**
   * Save message to database
   */
  const saveMessage = useCallback(async (
    message: Message,
    convId: string | null,
    generatedCode?: string
  ) => {
    if (!persistMessages || !convId) return;

    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        generated_code: generatedCode || message.codeBlock?.code
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, [persistMessages]);

  /**
   * Initialize conversation on mount
   */
  useEffect(() => {
    if (externalConversationId && persistMessages) {
      loadConversation(externalConversationId);
      setConversationId(externalConversationId);
    }
  }, [externalConversationId, persistMessages, loadConversation]);

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
    setProgress(0);
    setCurrentPhase('');

    // Create or get conversation ID
    let activeConvId = conversationId;
    if (persistMessages && !activeConvId) {
      activeConvId = await createConversation();
    }

    // Save user message
    if (persistMessages && activeConvId) {
      await saveMessage(userMessage, activeConvId);
    }

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
        // Detect if simple modification for fast path
        const isSimpleChange = context.currentCode && message.toLowerCase().match(/\b(change|update|modify|fix|adjust|set|make)\b.*\b(color|style|text|size|font|background)\b/i);
        
        if (isSimpleChange) {
          console.log('🚀 Using fast smart-diff-update');
          setCurrentPhase('Analyzing changes');
          setProgress(50);
          
          const { data: diffData, error: diffError } = await supabase.functions.invoke("smart-diff-update", {
            body: {
              userRequest: message,
              currentCode: context.currentCode,
            },
          });
          
          if (!diffError && diffData) {
            response = diffData;
            routedTo = 'orchestrator';
            setProgress(100);
          }
        } else {
          // Full orchestration with progress tracking
          console.log('🎯 Using full smart orchestration');
          const phases = ['Planning', 'Analyzing', 'Generating', 'Refining', 'Learning'];
          let currentPhaseIdx = 0;
          
          const progressInterval = setInterval(() => {
            if (currentPhaseIdx < phases.length) {
              setCurrentPhase(phases[currentPhaseIdx]);
              setProgress((currentPhaseIdx + 1) * 20);
              currentPhaseIdx++;
            }
          }, 800);

          try {
            response = await routeToOrchestrator(message, context);
            routedTo = 'orchestrator';
          } finally {
            clearInterval(progressInterval);
            setProgress(100);
          }
        }
      }

      // Process and add assistant response
      const assistantMessage = await processResponse(response, routedTo);
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      if (persistMessages && activeConvId) {
        await saveMessage(assistantMessage, activeConvId, assistantMessage.codeBlock?.code);
      }

      // Update conversation timestamp
      if (persistMessages && activeConvId) {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeConvId);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process message';
      
      // Handle specific error types
      if (errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
        toast.error("Too many requests. Please wait a moment.");
      } else if (errorMsg.includes('payment_required') || errorMsg.includes('402')) {
        toast.error("Credits needed. Please add credits to your workspace.");
      } else {
        toast.error(errorMsg);
      }

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMsg));
      }

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ **Error**\n\n${errorMsg}\n\n**What to try:**\n• Simplify your request\n• Check file selections\n• Try again in a moment`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentPhase('');
      setProgress(0);
      abortControllerRef.current = null;
    }
  }, [
    isLoading,
    conversationId,
    persistMessages,
    selectedFiles,
    buildContext,
    detectError,
    routeToErrorTeacher,
    routeToOrchestrator,
    processResponse,
    onError,
    createConversation,
    saveMessage
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
    addSystemMessage,
    conversationId,
    currentPhase,
    progress,
    loadConversation
  };
}