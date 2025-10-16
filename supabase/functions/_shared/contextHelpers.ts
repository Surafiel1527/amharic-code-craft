/**
 * Context Loading Utilities
 * Helpers for loading and managing conversation context
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ConversationContext {
  previousMessages: any[];
  projectState: ProjectState;
  generatedComponents: any[];
  generatedFeatures: string[];
}

export interface ProjectState {
  has_auth: boolean;
  has_profiles: boolean;
  has_rls: boolean;
  protected_routes: string[];
  generated_features: string[];
}

const DEFAULT_PROJECT_STATE: ProjectState = {
  has_auth: false,
  has_profiles: false,
  has_rls: false,
  protected_routes: [],
  generated_features: []
};

/**
 * Load full conversation context including messages, project state, and generated code
 */
export async function loadConversationContext(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  projectId?: string
): Promise<ConversationContext> {
  // Get conversation history
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get project state
  const { data: projectContext } = await supabase
    .from('project_intelligence_context')
    .select('*')
    .eq('project_id', projectId || conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  // Get generated files from project_files (correct table)
  const { data: projectFiles } = await supabase
    .from('project_files')
    .select('file_path, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    previousMessages: messages || [],
    projectState: projectContext || DEFAULT_PROJECT_STATE,
    generatedComponents: projectFiles || [],
    generatedFeatures: extractFeaturesFromFiles(projectFiles || [])
  };
}

/**
 * Extract feature names from generated files
 */
export function extractFeaturesFromFiles(files: any[]): string[] {
  const features = new Set<string>();
  
  files.forEach(file => {
    const path = file.file_path?.toLowerCase() || '';
    
    if (path.includes('todo')) features.add('todos');
    if (path.includes('auth')) features.add('auth');
    if (path.includes('profile')) features.add('profiles');
    if (path.includes('note')) features.add('notes');
    if (path.includes('post')) features.add('posts');
    if (path.includes('comment')) features.add('comments');
    if (path.includes('settings')) features.add('settings');
  });
  
  return Array.from(features);
}

/**
 * Update conversation context with new understanding
 */
export async function updateConversationContext(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  update: {
    last_request: string;
    intent: any;
    execution_plan: any;
    timestamp: string;
  }
): Promise<void> {
  await supabase
    .from('conversation_context_log')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      request: update.last_request,
      intent: update.intent,
      execution_plan: update.execution_plan,
      created_at: update.timestamp
    });
}
