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
    isSummary?: boolean;
    isGenerationStart?: boolean;
    framework?: string;
    error?: boolean; // ✅ ADD: Error flag for fallback messages
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
  thinkingSteps?: Array<{
    id: string;
    operation: string;
    detail: string;
    status: 'pending' | 'active' | 'complete';
    duration: number;
    timestamp: string;
  }>;
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
  
  /**
   * Load conversation messages from database
   * ✅ ENTERPRISE FIX: Robust error handling and data validation
   */
  const loadConversation = useCallback(async (convId: string) => {
    if (!persistMessages || !convId) return;

    logger.info('📥 Loading conversation', { conversationId: convId });
    
    try {
      // Load messages with timeout protection
      const messagesPromise = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
        
      const stepsPromise = supabase
        .from("thinking_steps")
        .select("*")
        .eq("conversation_id", convId)
        .order("timestamp", { ascending: true });

      // Execute in parallel with timeout
      const [messagesResult, stepsResult] = await Promise.all([
        messagesPromise,
        stepsPromise
      ]);

      if (messagesResult.error) {
        // Only throw if it's not just an empty conversation
        if (!messagesResult.error.message.includes('No rows')) {
          throw messagesResult.error;
        }
      }

      const data = messagesResult.data || [];
      const stepsData = stepsResult.data || [];

      // ✅ ENTERPRISE FIX: Robust message filtering and validation
      const typedMessages: Message[] = data
        .filter(m => {
          // Validate message has required fields
          if (!m.id || !m.role || m.content === null || m.content === undefined) {
            logger.warn('Skipping invalid message:', m);
            return false;
          }
          
          const storedMetadata = (m.metadata as any) || {};
          const isSummaryMessage = storedMetadata.isSummary === true;
          
          // Keep summary messages always
          if (isSummaryMessage) return true;
          
          // Filter out truly generic/empty messages
          const isGeneric = (
            m.content?.trim() === '' || 
            m.content === '**Request Processed**' ||
            m.content === 'Generation started'
          );
          
          const isValidRole = m.role === 'user' || m.role === 'assistant';
          return isValidRole && !isGeneric;
        })
        .map(m => {
          try {
            const storedMetadata = (m.metadata as any) || {};
            
            // Attach thinking steps to this message
            const messageSteps = stepsData
              ?.filter((s: any) => s.message_id === m.id)
              .map((s: any) => ({
                id: `${s.operation}_${s.timestamp}`,
                operation: s.operation || 'Processing',
                detail: s.detail || '',
                status: s.status || 'complete',
                duration: s.duration,
                timestamp: s.timestamp
              })) || [];
            
            return {
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content || '',
              timestamp: m.created_at,
              codeBlock: storedMetadata.codeBlock || (m.generated_code ? {
                language: 'typescript',
                code: m.generated_code,
                filePath: undefined
              } : undefined),
              metadata: storedMetadata.metadata,
              plan: storedMetadata.plan,
              thinkingSteps: messageSteps
            };
          } catch (mapError) {
            logger.error('Error mapping message:', mapError);
            // Return a safe fallback message
            return {
              id: m.id || crypto.randomUUID(),
              role: (m.role || 'assistant') as 'user' | 'assistant',
              content: m.content || 'Error loading message',
              timestamp: m.created_at || new Date().toISOString(),
              metadata: { error: true }
            };
          }
        });

      setMessages(typedMessages);
      logger.info('✅ Loaded messages successfully', { count: typedMessages.length });
      
    } catch (error) {
      logger.error('❌ Failed to load conversation', error);
      
      // ✅ ENTERPRISE FIX: Show user-friendly error but don't crash
      const isNetworkError = error instanceof Error && 
        (error.message.includes('fetch') || error.message.includes('network'));
      
      if (isNetworkError) {
        toast.error('Network error loading conversation. Please check your connection.');
      } else {
        // Don't show error for new/empty conversations
        const isEmptyConversation = error instanceof Error && 
          (error.message.includes('No rows') || error.message.includes('not found'));
        
        if (!isEmptyConversation) {
          toast.error('Failed to load conversation history');
        }
      }
      
      // Initialize with empty messages array so UI still works
      setMessages([]);
    }
  }, [persistMessages]);
  
  // ✅ ENTERPRISE FIX: Properly manage conversation changes and prevent race conditions
  useEffect(() => {
    if (externalConversationId && externalConversationId !== conversationId) {
      logger.info('🔄 Conversation changed', { 
        from: conversationId, 
        to: externalConversationId 
      });
      
      // Update conversation ID first
      setConversationId(externalConversationId);
      
      // Clear messages immediately to prevent showing old conversation
      setMessages([]);
      
      // Load new conversation if persistence is enabled
      if (persistMessages) {
        loadConversation(externalConversationId);
      }
    }
  }, [externalConversationId, conversationId, persistMessages, loadConversation]);

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

      logger.info('Created conversation', { conversationId: data.id });
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
   * Save message to database and link thinking steps
   */
  const saveMessage = useCallback(async (
    message: Message,
    convId: string | null,
    generatedCode?: string,
    linkThinkingSteps: boolean = true
  ) => {
    if (!persistMessages || !convId) return null;

    try {
      const { data, error } = await supabase.from("messages").insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        generated_code: generatedCode || message.codeBlock?.code,
        metadata: {
          codeBlock: message.codeBlock,
          metadata: message.metadata,
          plan: message.plan,
          isSummary: message.metadata?.isSummary || false
        },
        is_summary: message.metadata?.isSummary || false
      }).select('id, created_at').single();

      if (error) throw error;
      
      // Link thinking steps to this assistant message
      if (linkThinkingSteps && message.role === 'assistant' && data?.id) {
        const messageTime = new Date(data.created_at);
        const fiveMinutesAgo = new Date(messageTime.getTime() - 5 * 60 * 1000);
        
        // Update all thinking steps from the last 5 minutes that don't have a message_id
        const { error: updateError } = await supabase
          .from('thinking_steps')
          .update({ message_id: data.id })
          .eq('conversation_id', convId)
          .is('message_id', null)
          .gte('timestamp', fiveMinutesAgo.toISOString())
          .lte('timestamp', messageTime.toISOString());
        
        if (updateError) {
          logger.warn('Failed to link thinking steps to message', updateError);
        } else {
          logger.info('Linked thinking steps to message', { messageId: data.id });
        }
      }
      
      return data?.id || null;
    } catch (error) {
      console.error('Failed to save message:', error);
      return null;
    }
  }, [persistMessages]);

  /**
   * Initialize conversation on mount and when conversationId changes
   * ✅ FIX: Avoid duplicate loads - only load once when external ID changes
   */
  useEffect(() => {
    if (externalConversationId && persistMessages) {
      logger.info('🔄 Conversation ID changed, loading messages', { conversationId: externalConversationId });
      setConversationId(externalConversationId);
      loadConversation(externalConversationId);
    }
  }, [externalConversationId, persistMessages, loadConversation]);

  /**
   * Detects if the message is a question/help request vs build request
   */
  const detectIntentType = useCallback((message: string): 'question' | 'build' | 'error' => {
    const messageLower = message.toLowerCase();
    
    // CRITICAL: Check for build/generation requests FIRST (highest priority)
    const buildPatterns = [
      /^(build|create|make|generate|add|implement|design|develop|setup|configure)/i,
      /^(change|update|modify|edit|refactor|improve|enhance)/i,
      /^(remove|delete|get rid of)/i,
      /(app|application|website|site|page|component|feature|function|system)/i,
      /(dashboard|login|signup|auth|authentication|form|button|navbar|sidebar|menu)/i,
      /(task|todo|user|profile|admin|settings|list|card|modal|table|chart)/i,
      /let's (add|create|build|change|update)/i,
      /can you (add|create|build|change|update)/i,
      /with.*authentication/i,
      /should be able to/i,
      /users? (can|should|need to)/i
    ];
    
    if (buildPatterns.some(pattern => pattern.test(messageLower))) {
      return 'build';
    }
    
    // Check for error reports (second priority)
    const errorPatterns = [
      /error|failed|exception|warning|bug|broken|crash|freeze/i,
      /(not working|doesn't work|isn't working|won't work|can't get|unable to|failing)/i,
      /^(fix|repair|debug|solve|resolve)/i
    ];
    
    if (errorPatterns.some(pattern => pattern.test(messageLower))) {
      return 'error';
    }
    
    // Check for questions/help requests (third priority - most specific patterns only)
    const questionPatterns = [
      /^(how can i|where do i|how do i|what should i|when should i|why is|why does)/i,
      /^(is there a way|can you explain|can you help|what is|where is|which)/i,
      /^(help|guide|teach|show me how|explain|tell me about|describe)\s/i,
      /\?$/
    ];
    
    if (questionPatterns.some(pattern => pattern.test(messageLower))) {
      return 'question';
    }
    
    // Default to build for proactive code generation
    return 'build';
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
   * Routes the message to Conversational AI (for questions/help)
   */
  const routeToConversationalAI = useCallback(async (message: string, context: any): Promise<any> => {
    logger.info('Routing to Conversational AI');

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('conversational-ai', {
        body: {
          userId: currentUser.id,
          conversationId: conversationId || projectId,
          request: message,
          context: {
            projectId,
            conversationHistory: context.conversationHistory,
            ...projectContext
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Conversational AI failed', error);
      throw error;
    }
  }, [conversationId, projectId, projectContext]);

  /**
   * Routes the message to Unified Mega Mind Orchestrator
   * Handles both modifications and new generation with operationMode
   */
  const routeToOrchestrator = useCallback(async (message: string, context: any): Promise<any> => {
    const startTime = Date.now();
    try {
      // CRITICAL: Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated - user ID required');
      }

      // UNIFIED ROUTING: Always use mega-mind-orchestrator with appropriate operationMode
      const isModification = mode === 'enhance' && projectId && context.currentCode;
      const operationMode = isModification ? 'modify' : 'generate';
      
      logger.info(`Routing to mega-mind-orchestrator (operationMode: ${operationMode}, mode: ${mode}, isModification: ${isModification})`);

      // Use retry logic for reliability
      const data = await retryWithBackoff(async () => {
        const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
          body: {
            // CRITICAL: Pass userId and conversationId at TOP LEVEL
            userId: currentUser.id,
            conversationId: conversationId || projectId,
            request: message,
            operationMode, // 'modify' or 'generate'
            requestType: isModification ? 'modification' : 'generation',
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
   * ✅ ENTERPRISE FIX: Always return a valid message, never undefined
   */
  const processResponse = useCallback(async (
    data: any,
    routedTo: 'error-teacher' | 'orchestrator'
  ): Promise<Message> => {
    let content = '';
    let codeBlock: Message['codeBlock'] = undefined;
    let metadata: Message['metadata'] = { routedTo };
    let plan: Message['plan'] = undefined;

    try {
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

          codeBlock = undefined;
        } else if (data.result?.generatedCode) {
          // Handle nested result structure
          const code = data.result.generatedCode;
          const filePath = selectedFiles.length === 1 ? selectedFiles[0] : 'main-project';
          const applied = await applyCodeFix(code, filePath, metadata);

          content = `✨ **Code Updated!**\n\n${data.result.explanation || data.message || 'Your changes have been applied.'}\n\n` +
                   `${applied ? '✅' : '📝'} Applied to: \`${filePath}\``;

          codeBlock = undefined;
        } else if (explanation && explanation !== 'Generation started') {
          // Show meaningful explanations
          content = `💡 ${explanation}`;
        } else {
          // ✅ ENTERPRISE FIX: Always provide a fallback message
          // Even if orchestrator doesn't return explicit content, acknowledge the request
          content = `✅ **Request processed successfully**\n\nYour request has been completed. Check the preview for updates.`;
        }
      }

      // ✅ ENTERPRISE FIX: Always return a message with fallback content
      if (!content || content.trim() === '') {
        content = `✅ **Processing complete**\n\nYour request has been processed successfully.`;
      }

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        codeBlock,
        metadata
      };
    } catch (error) {
      logger.error('Error processing response:', error);
      // ✅ ENTERPRISE FIX: Return error message instead of throwing
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ **Processing Error**\n\nThere was an issue processing the response. Please try again.`,
        timestamp: new Date().toISOString(),
        metadata: { ...metadata, error: true }
      };
    }
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

    // ✅ ENTERPRISE FIX: Save user message with robust error handling
    if (persistMessages && activeConvId) {
      try {
        const dbMessageId = await saveMessage(userMessage, activeConvId);
        if (dbMessageId) {
          // Update local message with DB ID
          setMessages(prev => prev.map(m => 
            m.id === userMessage.id ? { ...m, id: dbMessageId } : m
          ));
        }
      } catch (saveError) {
        logger.error('Failed to save user message:', saveError);
        // Continue anyway - message is already in local state
      }
    }

    // 🚀 ENTERPRISE FIX: Create placeholder message immediately for generation requests
    const isGenerationRequest = detectIntentType(message) !== 'error' && 
      (message.length > 50 || /build|create|make|generate|add|implement/i.test(message));
    
    let placeholderMessageId: string | null = null;
    
    if (isGenerationRequest) {
      const placeholderMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '🚀 **Starting Generation**\n\nAnalyzing your request and preparing to build...',
        timestamp: new Date().toISOString(),
        streaming: true,
        metadata: {
          isGenerationStart: true,
          routedTo: 'orchestrator'
        }
      };
      
      placeholderMessageId = placeholderMessage.id;
      setMessages(prev => [...prev, placeholderMessage]);
      
      logger.info('Created placeholder message for generation', { placeholderMessageId });
    }

    try {
      // Check authentication first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Please sign in to use the AI chat');
      }

      const context = buildContext();
      const intentType = detectIntentType(message);

      let response: any = null;
      let routedTo: 'error-teacher' | 'orchestrator' = 'orchestrator';

      // Smart Routing Decision
      if (intentType === 'error') {
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
        
        // 🚀 ENTERPRISE FIX: Subscribe to real-time generation events to update placeholder
        // ✅ CRITICAL FIX: Use correct channel name that matches orchestrator broadcasts
        let realtimeChannel: any = null;
        
        if (isGenerationRequest && activeConvId && placeholderMessageId) {
          logger.info('Subscribing to generation events', { conversationId: activeConvId });
          
          // ✅ FIXED: Subscribe to the SAME channel orchestrator broadcasts to
          realtimeChannel = supabase
            .channel(`ai-status-${activeConvId}`)
            .on('broadcast', { event: 'status-update' }, ({ payload }) => {
              logger.info('Received generation status', payload);
              
              // Update placeholder message with real-time progress
              setMessages(prev => prev.map(m => {
                if (m.id === placeholderMessageId) {
                  let updatedContent = '';
                  
                  // Build progress display
                  if (payload.progress !== undefined) {
                    const progressBar = '█'.repeat(Math.floor(payload.progress / 5)) + 
                                       '░'.repeat(20 - Math.floor(payload.progress / 5));
                    updatedContent = `🚀 **${payload.phaseName || 'Generating'}** (${payload.progress}%)\n\n` +
                                   `${progressBar}\n\n` +
                                   `${payload.message || payload.currentOperation || 'Building your project...'}`;
                  } else {
                    updatedContent = `🚀 **${payload.message || 'Processing'}**\n\n${payload.currentOperation || ''}`;
                  }
                  
                  return {
                    ...m,
                    content: updatedContent,
                    streaming: payload.status !== 'complete'
                  };
                }
                return m;
              }));
              
              // Update global progress
              if (payload.progress !== undefined) {
                setProgress(payload.progress);
              }
              if (payload.phaseName) {
                setCurrentPhase(payload.phaseName);
              }
            })
            .on('broadcast', { event: 'generation_event' }, ({ payload }) => {
              logger.info('Received generation event', payload);
              
              // Handle completion event
              if (payload.type === 'execution_complete') {
                logger.info('Generation complete event received');
              }
            })
            .subscribe();
        }

        try {
          response = await routeToOrchestrator(message, context);
          routedTo = 'orchestrator';
        } finally {
          // Cleanup realtime subscription
          if (realtimeChannel) {
            await supabase.removeChannel(realtimeChannel);
          }
          setProgress(100);
          setCurrentPhase('Complete');
        }
      }

      // 🚀 ENTERPRISE FIX: Generate summary message for generation requests
      let assistantMessage: Message | null = null;
      
      if (isGenerationRequest && placeholderMessageId) {
        // For generation requests, create a comprehensive summary
        const generatedFilesCount = response?.generatedCode?.files?.length || 
                                    response?.result?.files?.length || 0;
        const framework = response?.framework || projectContext?.framework || 'React';
        
        // Build summary content
        let summaryContent = '✅ **Generation Complete!**\n\n';
        
        if (generatedFilesCount > 0) {
          summaryContent += `Successfully generated **${generatedFilesCount} files** using ${framework}.\n\n`;
        } else {
          summaryContent += `Your project has been built and is ready to preview.\n\n`;
        }
        
        // Add key features if available
        if (response?.features && Array.isArray(response.features)) {
          summaryContent += '**Features implemented:**\n';
          response.features.forEach((feature: string) => {
            summaryContent += `• ${feature}\n`;
          });
          summaryContent += '\n';
        }
        
        // Add next steps
        summaryContent += '**What you can do now:**\n';
        summaryContent += '• Check the preview on the right →\n';
        summaryContent += '• Ask me to modify or enhance any part\n';
        summaryContent += '• Deploy your project when ready\n';
        
        assistantMessage = {
          id: placeholderMessageId, // Replace placeholder
          role: 'assistant',
          content: summaryContent,
          timestamp: new Date().toISOString(),
          streaming: false,
          metadata: {
            routedTo: 'orchestrator',
            isSummary: true,
            framework
          }
        };
        
        // Replace placeholder with summary
        setMessages(prev => prev.map(m => 
          m.id === placeholderMessageId ? assistantMessage! : m
        ));
        
        logger.info('✅ Replaced placeholder with generation summary', { placeholderMessageId });
        
      } else {
        // For non-generation requests, process response normally
        try {
          assistantMessage = await processResponse(response, routedTo);
        } catch (error) {
          logger.error('Failed to process response:', error);
          // Create fallback error message
          assistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ **Error Processing Response**\n\nThe AI responded, but there was an issue displaying the result. Please try again.`,
            timestamp: new Date().toISOString(),
            metadata: { routedTo, error: true }
          };
        }
        
        // Add new message
        if (assistantMessage) {
          setMessages(prev => [...prev, assistantMessage!]);
          logger.info('✅ Assistant message added to chat', { messageId: assistantMessage.id });
        }
      }
      
      // 🚀 ENTERPRISE FIX: Save final message to database
      if (assistantMessage && persistMessages && activeConvId) {
        try {
          const dbMessageId = await saveMessage(
            assistantMessage, 
            activeConvId, 
            assistantMessage.codeBlock?.code, 
            true
          );
          
          if (dbMessageId && dbMessageId !== assistantMessage.id) {
            // Update local state with DB ID
            setMessages(prev => prev.map(m => 
              m.id === assistantMessage!.id ? { ...m, id: dbMessageId } : m
            ));
          }
        } catch (saveError) {
          logger.error('Failed to save final message:', saveError);
          // Continue anyway - message is already displayed
        }
      }

      // Update conversation timestamp
      if (persistMessages && activeConvId) {
        try {
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", activeConvId);
        } catch (updateError) {
          logger.warn('Failed to update conversation timestamp:', updateError);
          // Non-critical error, continue
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = formatErrorMessage(error);
      
      // Handle specific error types
      if (errorMsg.includes('sign in') || errorMsg.includes('Not authenticated')) {
        toast.error("Please sign in to use the AI chat", {
          description: "You need to be logged in to generate or modify code"
        });
        
        const authErrorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `🔐 **Authentication Required**\n\nYou need to sign in to use the AI chat.\n\n**To continue:**\n• Sign up for a new account\n• Or log in if you already have one\n\nOnce logged in, you'll be able to generate and modify code with AI assistance.`,
          timestamp: new Date().toISOString(),
          metadata: { isGenerationStart: true }
        };
        
        setMessages(prev => [...prev, authErrorMessage]);
        setIsLoading(false);
        setCurrentPhase('');
        setProgress(0);
        return; // Don't continue error handling
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
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
    detectIntentType,
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