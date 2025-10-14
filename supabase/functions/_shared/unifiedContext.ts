/**
 * 🏗️ Unified Context - Enterprise Context Object
 * 
 * Flows through ALL layers of the system providing:
 * - Request tracking
 * - Event broadcasting
 * - Autonomous decision logging
 * - Learning integration
 */

export interface UnifiedContext {
  // Request Information
  userId: string;
  conversationId: string;
  projectId: string | null;
  userRequest: string;
  
  // Model & Strategy Selection
  selectedModel?: string;
  selectedStrategy?: string;
  
  // Quality & Performance Metrics
  qualityMetrics?: {
    completeness: number;
    codeQuality: number;
    functionality: number;
    performance: number;
    overall: number;
  };
  
  // Conversation Context
  conversationHistory?: Array<{ role: string; content: string }>;
  projectMemory?: any;
  
  // Autonomous Decision Tracking
  decisions?: Array<{
    layer: 'routing' | 'orchestration' | 'generation' | 'validation';
    decision: string;
    confidence: number;
    reasoning: string;
    timestamp: string;
  }>;
  
  // Event Broadcasting Function
  broadcast: (eventType: string, data: any) => Promise<void>;
  
  // Supabase Clients
  supabase: any;
  platformSupabase?: any;
  
  // Timestamps for metrics
  startTime: number;
  
  // Learning Integration
  learnedPatterns?: any[];
  appliedFixes?: any[];
}

/**
 * Create a unified context object
 */
export function createUnifiedContext(params: {
  userId: string;
  conversationId: string;
  projectId: string | null;
  userRequest: string;
  supabase: any;
  platformSupabase?: any;
  conversationHistory?: any[];
  projectMemory?: any;
}): UnifiedContext {
  
  const { 
    userId, 
    conversationId, 
    projectId, 
    userRequest, 
    supabase,
    platformSupabase,
    conversationHistory,
    projectMemory 
  } = params;
  
  // Create broadcast function that sends to all relevant channels
  const broadcast = async (eventType: string, data: any) => {
    const channelId = projectId || conversationId;
    if (!channelId) return;
    
    const timestamp = new Date().toISOString();
    
    // Broadcast to project channel
    if (projectId) {
      await supabase.channel(`ai-project-${projectId}`)
        .send({
          type: 'broadcast',
          event: eventType,
          payload: { ...data, timestamp, projectId }
        });
    }
    
    // Broadcast to conversation channel
    await supabase.channel(`ai-conversation-${conversationId}`)
      .send({
        type: 'broadcast',
        event: eventType,
        payload: { ...data, timestamp, conversationId }
      });
    
    // Log to console for debugging
    console.log(`📡 [${eventType}]`, data);
  };
  
  return {
    userId,
    conversationId,
    projectId,
    userRequest,
    conversationHistory: conversationHistory || [],
    projectMemory,
    decisions: [],
    broadcast,
    supabase,
    platformSupabase: platformSupabase || supabase,
    startTime: Date.now()
  };
}

/**
 * Add an autonomous decision to the context
 */
export function logContextDecision(
  context: UnifiedContext,
  layer: 'routing' | 'orchestration' | 'generation' | 'validation',
  decision: string,
  confidence: number,
  reasoning: string
): void {
  if (!context.decisions) {
    context.decisions = [];
  }
  
  context.decisions.push({
    layer,
    decision,
    confidence,
    reasoning,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🤖 [${layer.toUpperCase()}] Decision: ${decision} (${(confidence * 100).toFixed(0)}% confidence)`);
  console.log(`   Reasoning: ${reasoning}`);
}

/**
 * Get decision summary for learning
 */
export function getDecisionSummary(context: UnifiedContext): any {
  return {
    totalDecisions: context.decisions?.length || 0,
    avgConfidence: context.decisions?.length 
      ? context.decisions.reduce((sum, d) => sum + d.confidence, 0) / context.decisions.length
      : 0,
    decisions: context.decisions || [],
    duration: Date.now() - context.startTime,
    selectedModel: context.selectedModel,
    selectedStrategy: context.selectedStrategy,
    qualityScore: context.qualityMetrics?.overall
  };
}
