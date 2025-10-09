/**
 * Conversation Memory Management
 * Handles loading and storing conversation history for intelligent context
 */

export interface ConversationTurn {
  turn_number: number;
  user_request: string;
  ai_response?: string;
  code_changes: Array<{
    file_path: string;
    change_type: string;
    summary: string;
  }>;
  features_added: string[];
  files_modified: string[];
  context_used: any;
  created_at: string;
}

export interface ConversationContext {
  recentTurns: ConversationTurn[];
  allFeatures: string[];
  modifiedFiles: string[];
  totalTurns: number;
}

/**
 * Load recent conversation history for context
 */
export async function loadConversationHistory(
  supabase: any,
  conversationId: string,
  limit: number = 5
): Promise<ConversationContext> {
  const { data: turns, error } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('turn_number', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading conversation history:', error);
    return {
      recentTurns: [],
      allFeatures: [],
      modifiedFiles: [],
      totalTurns: 0
    };
  }

  // Aggregate all features and files across conversation
  const allFeatures = new Set<string>();
  const modifiedFiles = new Set<string>();

  turns?.forEach((turn: any) => {
    turn.features_added?.forEach((f: string) => allFeatures.add(f));
    turn.files_modified?.forEach((f: string) => modifiedFiles.add(f));
  });

  return {
    recentTurns: turns || [],
    allFeatures: Array.from(allFeatures),
    modifiedFiles: Array.from(modifiedFiles),
    totalTurns: turns?.length || 0
  };
}

/**
 * Store conversation turn after processing
 */
export async function storeConversationTurn(
  supabase: any,
  data: {
    conversationId: string;
    projectId?: string;
    turnNumber: number;
    userRequest: string;
    aiResponse?: string;
    codeChanges?: any[];
    featuresAdded?: string[];
    filesModified?: string[];
    contextUsed?: any;
  }
): Promise<void> {
  const { error } = await supabase
    .from('conversation_memory')
    .upsert({
      conversation_id: data.conversationId,
      project_id: data.projectId,
      turn_number: data.turnNumber,
      user_request: data.userRequest,
      ai_response: data.aiResponse,
      code_changes: data.codeChanges || [],
      features_added: data.featuresAdded || [],
      files_modified: data.filesModified || [],
      context_used: data.contextUsed || {}
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
    .map(t => `- ${t.user_request}`)
    .join('\n');

  return `
CONVERSATION HISTORY (${context.totalTurns} previous turns):

Recent Requests:
${recentRequests}

Features Built So Far: ${context.allFeatures.join(', ') || 'None'}
Files Previously Modified: ${context.modifiedFiles.slice(0, 10).join(', ') || 'None'}

IMPORTANT: User can reference "that component" or "the feature we built" - check the conversation history above to understand what they're referring to.
`.trim();
}
