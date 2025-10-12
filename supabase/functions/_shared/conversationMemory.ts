/**
 * Conversation Memory Management
 * Handles loading and storing conversation history for intelligent context
 */

// Uses existing conversation_context_log table
export interface ConversationTurn {
  id: string;
  conversation_id: string;
  user_id: string;
  request: string;
  intent: any;
  execution_plan: any;
  created_at: string;
}

export interface ConversationContext {
  recentTurns: ConversationTurn[];
  totalTurns: number;
}

/**
 * Load conversation history - supports both limited and full context
 */
export async function loadConversationHistory(
  supabase: any,
  conversationId: string,
  limit: number = 5,
  loadFullHistory: boolean = false
): Promise<ConversationContext> {
  
  // Gracefully handle undefined/null conversationId
  if (!conversationId || !supabase) {
    console.warn('⚠️ No conversationId or supabase client, returning empty context');
    return {
      recentTurns: [],
      totalTurns: 0
    };
  }
  
  // For intelligent Q&A, load full history (limited to last 50 for performance)
  const fetchLimit = loadFullHistory ? 50 : limit;
  
  const { data: turns, error } = await supabase
    .from('conversation_context_log')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (error) {
    console.error('Error loading conversation history:', error);
    return {
      recentTurns: [],
      totalTurns: 0
    };
  }

  return {
    recentTurns: turns || [],
    totalTurns: turns?.length || 0
  };
}

/**
 * Load complete messages for conversational AI
 */
export async function loadFullConversationMessages(
  supabase: any,
  conversationId: string
): Promise<Array<{ role: string; content: string }>> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading messages:', error);
    return [];
  }

  return messages || [];
}

/**
 * Store conversation turn using existing conversation_context_log table
 */
export async function storeConversationTurn(
  supabase: any,
  data: {
    conversationId: string;
    userId: string;
    userRequest: string;
    intent?: any;
    executionPlan?: any;
  }
): Promise<void> {
  // Gracefully handle undefined/null values
  if (!data.conversationId || !data.userId || !supabase) {
    console.warn('⚠️ Missing required fields for conversation turn, skipping storage');
    return;
  }

  const { error } = await supabase
    .from('conversation_context_log')
    .insert({
      conversation_id: data.conversationId,
      user_id: data.userId,
      request: data.userRequest,
      intent: data.intent || {},
      execution_plan: data.executionPlan || {}
    });

  if (error) {
    console.error('Error storing conversation turn:', error);
  }
}

/**
 * Load cross-conversation memory for a project
 * Gets recent messages from ALL conversations in the project
 */
export async function loadProjectConversationMemory(
  supabase: any,
  projectId: string,
  limit: number = 15
): Promise<{
  recentMessages: Array<{ conversation_id: string; role: string; content: string; created_at: string }>;
  conversationCount: number;
}> {
  if (!projectId || !supabase) {
    console.warn('⚠️ No projectId or supabase client, returning empty project memory');
    return { recentMessages: [], conversationCount: 0 };
  }

  try {
    // Get all conversations for this project
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (convError) throw convError;

    const conversationIds = (conversations || []).map((c: any) => c.id);
    
    if (conversationIds.length === 0) {
      return { recentMessages: [], conversationCount: 0 };
    }

    // Load recent messages from all conversations
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('conversation_id, role, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (msgError) throw msgError;

    console.log(`📚 Loaded ${messages?.length || 0} messages from ${conversationIds.length} conversations`);

    return {
      recentMessages: messages || [],
      conversationCount: conversationIds.length
    };
  } catch (error) {
    console.error('Error loading project conversation memory:', error);
    return { recentMessages: [], conversationCount: 0 };
  }
}

/**
 * Build conversation summary for AI context
 */
export function buildConversationSummary(context: ConversationContext): string {
  if (context.totalTurns === 0) {
    return "This is the first interaction in this conversation.";
  }

  const recentRequests = context.recentTurns
    .slice(0, 3)
    .map(t => `- ${t.request}`)
    .join('\n');

  return `
CONVERSATION HISTORY (${context.totalTurns} previous turns):

Recent Requests:
${recentRequests}

IMPORTANT: User can reference "that component" or "the feature we built" - check the conversation history above to understand what they're referring to.
`.trim();
}

/**
 * Build cross-conversation memory summary for AI context
 */
export function buildProjectMemorySummary(projectMemory: {
  recentMessages: Array<{ conversation_id: string; role: string; content: string; created_at: string }>;
  conversationCount: number;
}): string {
  if (projectMemory.recentMessages.length === 0) {
    return "";
  }

  const messageSummary = projectMemory.recentMessages
    .slice(0, 10) // Show most recent 10 messages
    .map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
    .join('\n');

  return `
CROSS-CONVERSATION MEMORY (${projectMemory.conversationCount} conversations, showing recent context):

${messageSummary}

CONTEXT: These are recent interactions from other conversations in this project. Use this to understand what has been built/fixed previously.
`.trim();
}
