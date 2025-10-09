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
 * Load recent conversation history using existing conversation_context_log table
 */
export async function loadConversationHistory(
  supabase: any,
  conversationId: string,
  limit: number = 5
): Promise<ConversationContext> {
  const { data: turns, error } = await supabase
    .from('conversation_context_log')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

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
