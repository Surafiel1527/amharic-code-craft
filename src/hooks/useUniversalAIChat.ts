import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { retryWithBackoff, formatErrorMessage, logMetrics } from '@/utils/orchestrationHelpers';

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
  plan?: {
    summary: string;
    approach: string;
    codebaseAnalysis: any;
    implementationPlan: any;
    formattedPlan: string;
    requiresApproval: boolean;
    approved?: boolean;
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
  mode?: 'generate' | 'enhance'; // NEW: distinguish between generating new vs enhancing existing
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
    conversationId: externalConversationId,
    contextFiles = [],
    selectedFiles = [],
    onCodeApply,
    onError,
    maxContextLength = 1000,
    autoLearn = true,
    autoApply = true,
    persistMessages = false,
    onConversationChange,
    enableStreaming = false,
    enableTools = false,
    projectContext,
    mode = 'enhance' // Default to enhance mode for workspace
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(externalConversationId || null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');
  
  // Update conversation ID when external one changes
  useEffect(() => {
    if (externalConversationId && externalConversationId !== conversationId) {
      setConversationId(externalConversationId);
    }
  }, [externalConversationId]);

  /**
   * Load conversation messages from database
   */
  const loadConversation = useCallback(async (convId: string) => {
    if (!persistMessages) return;

    logger.info('Loading conversation', { conversationId: convId });
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
      logger.success('Loaded messages', { count: typedMessages.length });
    } catch (error) {
      logger.error('Failed to load conversation', error);
      toast.error('Failed to load conversation history');
    }
  }, [persistMessages]);

  /**
   * Create new conversation
   */
  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!persistMessages) return null;

    logger.info('Creating new conversation');
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

      logger.success('Created conversation', { conversationId: data.id });
      setConversationId(data.id);
      if (onConversationChange) {
        onConversationChange(data.id);
      }
      return data.id;
    } catch (error) {
      logger.error('Failed to create conversation', error);
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
   * Initialize conversation on mount and when conversationId changes
   */
  useEffect(() => {
    if (externalConversationId && persistMessages) {
      logger.info('🔄 Conversation ID changed, loading messages', { conversationId: externalConversationId });
      loadConversation(externalConversationId);
      setConversationId(externalConversationId);
    }
  }, [externalConversationId, persistMessages]);

  // Reload conversation when it's set
  useEffect(() => {
    if (conversationId && persistMessages) {
      logger.info('📨 Loading conversation messages', { conversationId });
      loadConversation(conversationId);
    }
  }, [conversationId, persistMessages]);

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
   * Routes the message to Error Healing Engine
   */
  const routeToErrorTeacher = useCallback(async (message: string, context: any): Promise<any> => {
    logger.info('Routing to Unified Healing Engine');

    try {
      // Use unified-healing-engine instead of non-existent universal-error-teacher
      const { data, error } = await supabase.functions.invoke('unified-healing-engine', {
        body: {
          operation: 'diagnose-and-fix',
          errorMessage: message,
          errorContext: {
            selectedFiles,
            conversationHistory: context.conversationHistory,
            timestamp: new Date().toISOString(),
            currentCode: context.currentCode
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
      logger.warn('Healing engine failed, fallback to orchestrator', { error });
      return null;
    }
  }, [projectId, selectedFiles]);

  /**
   * Routes the message to Smart Orchestrator
   */
  const routeToOrchestrator = useCallback(async (message: string, context: any): Promise<any> => {
    logger.info(`Routing to Mega Mind Orchestrator (${mode} mode)`);

    const startTime = Date.now();
    try {
      // CRITICAL: Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated - user ID required');
      }

      // Use retry logic for reliability
      const data = await retryWithBackoff(async () => {
        const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
          body: {
            // CRITICAL: Pass userId and conversationId at TOP LEVEL
            userId: currentUser.id,
            conversationId: conversationId || projectId,
            request: message,
            requestType: 'code-update',
            mode, // Pass mode to orchestrator
            context: {
              projectId: projectId,
              currentCode: context.currentCode,
              conversationHistory: context.conversationHistory,
              files: context.contextData,
              selectedFiles,
              autoRefine: true,
              autoLearn: autoLearn,
              // CRITICAL: Pass framework and any other project context
              ...projectContext
            }
          }
        });

        if (error) {
          console.error('❌ Mega-mind orchestrator error:', error);
          throw error;
        }
        
        return data;
      }, {
        maxRetries: 2,
        initialDelay: 2000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        timeout: 300000 // 5 minutes
      });

      // Log success
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await logMetrics(user.data.user.id, {
          operation: 'orchestrator_call',
          duration: Date.now() - startTime,
          success: true,
          metadata: { messageLength: message.length }
        });
      }

      return data;
    } catch (error) {
      logger.error('Mega-mind orchestrator failed', error);
      
      // Log failure
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await logMetrics(user.data.user.id, {
          operation: 'orchestrator_call',
          duration: Date.now() - startTime,
          success: false,
          errorType: error instanceof Error ? error.message : 'unknown',
          metadata: { messageLength: message.length }
        });
      }
      
      throw error;
    }
  }, [projectId, selectedFiles, autoLearn, mode, projectContext]);

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
    let plan: Message['plan'] = undefined;

    // Check if response contains implementation plan
    if (data && data.plan) {
      logger.info('📋 Implementation plan received');
      plan = {
        summary: data.plan.summary,
        approach: data.plan.approach,
        codebaseAnalysis: data.plan.codebaseAnalysis,
        implementationPlan: data.plan.implementationPlan,
        formattedPlan: data.plan.formattedPlan,
        requiresApproval: true,
        approved: false
      };
      
      content = `📋 **Implementation Plan Ready**\n\n${data.plan.summary}\n\n**Approach:** ${data.plan.approach}\n\n---\n\nReview the detailed plan below and approve to proceed with implementation.`;
      
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        metadata,
        plan
      };
    }

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

        // Don't show code blocks in chat - code is applied directly
        codeBlock = undefined;
      } else if (solution?.codeChanges) {
        content = `🔧 **${category?.toUpperCase() || 'ERROR'} Analysis**\n\n` +
          `**Diagnosis:** ${diagnosis}\n\n` +
          solution.codeChanges.map((c: any) => 
            `**${c.file}**\n${c.changes}\n\`\`\`typescript\n${c.after}\n\`\`\``
          ).join('\n\n');
      }
    } else if (routedTo === 'orchestrator' && data) {
      // Handle orchestrator response - check for generatedCode, html, or finalCode
      const code = data.generatedCode || data.html || data.finalCode;
      const explanation = data.message || data.explanation || data.summary;
      
      if (code && typeof code === 'string') {
        const filePath = selectedFiles.length === 1 ? selectedFiles[0] : 'main-project';
        const applied = await applyCodeFix(code, filePath, metadata);

        // Create a descriptive message about what was done
        let changeDescription = explanation || 'Your changes have been applied.';
        if (!explanation && data.requestType) {
          changeDescription = `Applied ${data.requestType} update`;
        }

        content = `✨ **Code Updated!**\n\n${changeDescription}\n\n` +
                 `${applied ? '✅' : '📝'} Applied to: \`${filePath}\`\n\n` +
                 `**What I did:**\n${explanation || 'Updated your code based on your request.'}`;

        // Don't show code blocks in chat - code is applied directly to project
        codeBlock = undefined;
      } else if (data.result?.generatedCode) {
        // Handle nested result structure
        const code = data.result.generatedCode;
        const filePath = selectedFiles.length === 1 ? selectedFiles[0] : 'main-project';
        const applied = await applyCodeFix(code, filePath, metadata);

        content = `✨ **Code Updated!**\n\n${data.result.explanation || data.message || 'Your changes have been applied.'}\n\n` +
                 `${applied ? '✅' : '📝'} Applied to: \`${filePath}\``;

        // Don't show code blocks in chat - code is applied directly
        codeBlock = undefined;
      } else if (explanation && explanation !== 'Generation started') {
        // Only show message if it's meaningful (not just the start acknowledgment)
        // Real-time thinking steps will show progress instead
        content = `💡 ${explanation}`;
      } else {
        // Skip adding a message for "Generation started" - thinking steps will show progress
        return null as any; // Signal to skip adding this message
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
        logger.info('Error detected - trying Universal Error Teacher');
        response = await routeToErrorTeacher(message, context);
        
        if (response && response.solution) {
          routedTo = 'error-teacher';
          toast.success(response.isKnown 
            ? `✅ Known ${response.category} error - applying fix` 
            : `🎓 Learning new ${response.category} pattern`
          );
        } else {
          logger.warn('Error teacher no solution - falling back to orchestrator');
        }
      }

      // Route to orchestrator if no error teacher solution
      if (!response) {
        // Full orchestration with progress tracking
        logger.info('Routing to Mega Mind Orchestrator');
        const phases = ['Analyzing', 'Planning', 'Generating', 'Refining', 'Verifying'];
        let currentPhaseIdx = 0;
        
        const progressInterval = setInterval(() => {
          if (currentPhaseIdx < phases.length) {
            setCurrentPhase(phases[currentPhaseIdx]);
            setProgress((currentPhaseIdx + 1) * 20);
            currentPhaseIdx++;
          }
        }, 1000);

        try {
          response = await routeToOrchestrator(message, context);
          routedTo = 'orchestrator';
        } finally {
          clearInterval(progressInterval);
          setProgress(100);
          setCurrentPhase('Complete');
        }
      }

      // Process and add assistant response
      const assistantMessage = await processResponse(response, routedTo);
      
      // Only add message if it's not null (null means skip it - e.g., "Generation started")
      if (assistantMessage) {
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Save assistant message (only if it exists - skip for "Generation started")
      if (persistMessages && activeConvId && assistantMessage) {
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
      const errorMsg = formatErrorMessage(error);
      
      // Handle specific error types
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        toast.error("Too many requests. Please wait a moment.");
      } else if (errorMsg.includes('payment') || errorMsg.includes('credits') || errorMsg.includes('402')) {
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
        content: `❌ **Error**\n\n${errorMsg}\n\n**What to try:**\n• Simplify your request\n• Check file selections\n• Try again in a moment\n• Break complex requests into smaller steps`,
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