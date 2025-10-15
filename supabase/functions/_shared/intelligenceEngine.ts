/**
 * Unified Intelligence Engine
 * Combines context intelligence and AGI decision-making
 * Provides autonomous, context-aware decisions for code generation and healing
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ContextAnalysis {
  userIntent: 'fix' | 'generate' | 'modify' | 'question' | 'explore';
  complexity: 'simple' | 'moderate' | 'complex';
  confidenceScore: number;
  projectState: {
    hasAuth: boolean;
    hasDatabase: boolean;
    recentErrors: number;
    successRate: number;
    generationHistory: string[];
  };
  patterns: {
    commonIssues: string[];
    userPreferences: string[];
    successfulApproaches: string[];
  };
  contextQuality: number; // 0-100
}

export interface IntelligentDecision {
  action: 'auto_fix' | 'suggest_fix' | 'ask_clarification' | 'provide_options';
  confidence: number;
  reasoning: string;
  suggestedApproach?: string;
  alternativeApproaches?: string[];
  requiresUserInput: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Analyze conversation context to understand user intent and project state
 */
export async function analyzeContext(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  currentRequest: string,
  projectId?: string
): Promise<ContextAnalysis> {
  // Fetch conversation history
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch project intelligence context
  const { data: projectContext } = await supabase
    .from('project_intelligence_context')
    .select('*')
    .eq('project_id', projectId || conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  // Fetch recent errors
  const { data: recentErrors } = await supabase
    .from('detected_errors')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch success patterns
  const { data: successPatterns } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .gte('confidence_score', 0.7)
    .order('success_count', { ascending: false })
    .limit(10);

  // Analyze user intent
  const intent = detectUserIntent(currentRequest, messages || []);
  
  // Calculate complexity
  const complexity = assessComplexity(currentRequest, messages || [], recentErrors || []);
  
  // Calculate confidence based on context quality
  const contextQuality = calculateContextQuality(messages || [], projectContext, recentErrors || []);
  const confidenceScore = calculateConfidence(intent, complexity, contextQuality, successPatterns || []);

  // Extract patterns
  const patterns = extractPatterns(messages || [], recentErrors || [], successPatterns || []);

  return {
    userIntent: intent,
    complexity,
    confidenceScore,
    projectState: {
      hasAuth: projectContext?.has_auth || false,
      hasDatabase: projectContext?.has_profiles || false,
      recentErrors: recentErrors?.length || 0,
      successRate: calculateSuccessRate(messages || []),
      generationHistory: projectContext?.generated_features || []
    },
    patterns,
    contextQuality
  };
}

/**
 * Make intelligent decision based on context analysis
 */
export function makeIntelligentDecision(
  context: ContextAnalysis,
  errorSeverity?: 'low' | 'medium' | 'high',
  hasLearnedPattern: boolean = false
): IntelligentDecision {
  const { confidenceScore, complexity, userIntent, projectState } = context;

  // High confidence + learned pattern = auto-fix
  if (confidenceScore >= 0.85 && hasLearnedPattern && errorSeverity !== 'high') {
    return {
      action: 'auto_fix',
      confidence: confidenceScore,
      reasoning: 'High confidence with proven solution pattern. Auto-applying fix.',
      requiresUserInput: false,
      estimatedComplexity: complexity === 'simple' ? 'low' : 'medium',
      riskLevel: 'low'
    };
  }

  // Moderate confidence + simple complexity = suggest with auto-apply option
  if (confidenceScore >= 0.7 && complexity === 'simple') {
    return {
      action: 'suggest_fix',
      confidence: confidenceScore,
      reasoning: 'Clear solution identified. Suggesting fix with option to auto-apply.',
      requiresUserInput: true,
      estimatedComplexity: 'low',
      riskLevel: 'low'
    };
  }

  // Complex or low confidence = provide options
  if (complexity === 'complex' || confidenceScore < 0.7) {
    return {
      action: 'provide_options',
      confidence: confidenceScore,
      reasoning: 'Multiple approaches possible. Presenting options for user decision.',
      requiresUserInput: true,
      estimatedComplexity: complexity === 'simple' ? 'medium' : 'high',
      riskLevel: complexity === 'complex' ? 'high' : 'medium',
      alternativeApproaches: generateAlternativeApproaches(context)
    };
  }

  // Question or exploration intent = ask clarification
  if (userIntent === 'question' || userIntent === 'explore') {
    return {
      action: 'ask_clarification',
      confidence: confidenceScore,
      reasoning: 'User exploring or asking questions. Providing guidance and clarification.',
      requiresUserInput: true,
      estimatedComplexity: 'low',
      riskLevel: 'low'
    };
  }

  // Default: suggest fix with explanation
  return {
    action: 'suggest_fix',
    confidence: confidenceScore,
    reasoning: 'Solution identified but requires user confirmation for safety.',
    requiresUserInput: true,
    estimatedComplexity: 'medium',
    riskLevel: 'medium'
  };
}

/**
 * Detect user intent from current request and conversation history
 * NOW WITH UNIVERSAL INSTRUCTION INTELLIGENCE
 */
function detectUserIntent(
  request: string,
  messages: any[]
): ContextAnalysis['userIntent'] {
  const lowerRequest = request.toLowerCase();
  
  // 🎯 UNIVERSAL INSTRUCTION PATTERNS
  
  // Fix intent - enhanced with universal patterns
  const fixPatterns = [
    /\b(fix|repair|solve|debug|error|issue|problem|broken|not working|doesn't work|can't)\b/,
    /\b(apply|implement|use)\s+(fix|solution|suggestion)\b/,
    // Universal: "make it work", "get it working", "resolve", "correct"
    /\b(make\s+it\s+work|get\s+it\s+working|make\s+this\s+work|resolve|correct)\b/,
    // User frustration: "still broken", "not fixed", "same error"
    /\b(still\s+(broken|not\s+working)|same\s+error|keeps\s+failing)\b/,
    // Completion request: "finish", "complete"
    /\b(finish|complete)\s+(this|the|it)\b/
  ];
  
  if (fixPatterns.some(pattern => lowerRequest.match(pattern))) {
    return 'fix';
  }

  // Generate intent - enhanced with universal patterns  
  const generatePatterns = [
    /\b(create|add|build|make|generate|implement|new|develop)\b/,
    // Universal: "I want", "I need", "can you", "let's"
    /\b(i\s+want|i\s+need|can\s+you|let'?s|could\s+you)\s+\w+/,
    // App cloning: "like X", "similar to X", "X clone"
    /\b(like|similar\s+to|clone\s+of|\w+\s+style)\s+(airbnb|twitter|facebook|instagram|uber|netflix)/,
    // Feature requests: "should have", "needs to", "must include"
    /\b(should\s+have|needs\s+to|must\s+include|has\s+to|supposed\s+to)\b/,
    // Universal actions: "users can", "allow users", "enable"
    /\b(users?\s+(can|should|need|able)|allow\s+users?|enable)\b/
  ];
  
  if (generatePatterns.some(pattern => lowerRequest.match(pattern)) &&
      !lowerRequest.match(/\b(fix|error|broken|issue)\b/)) {
    return 'generate';
  }

  // Modify intent - enhanced with universal patterns
  const modifyPatterns = [
    /\b(update|change|modify|edit|alter|adjust|improve)\b/,
    // Universal: "make it X", "turn it into", "convert to"
    /\b(make\s+it|turn\s+it\s+into|convert\s+to|transform)\b/,
    // Enhancement: "better", "enhance", "upgrade"
    /\b(better|enhance|upgrade|optimize|refine)\b/,
    // Removal: "remove", "delete", "take out"
    /\b(remove|delete|take\s+out|get\s+rid\s+of)\b/,
    // Color/style updates
    /\b(background|color|font|style|border|shadow)\b/
  ];
  
  if (modifyPatterns.some(pattern => lowerRequest.match(pattern)) &&
      !lowerRequest.match(/\b(create|add|build|new)\b/)) {
    return 'modify';
  }

  // Question intent - enhanced with universal patterns
  const questionPatterns = [
    /\b(what|why|how|when|where|who|explain|tell\s+me|show\s+me)\b/,
    // Universal: "can I", "is it", "does it"  
    /\b(can\s+i|is\s+it|does\s+it|will\s+it|would\s+it)\b/,
    // Understanding: "understand", "know", "see"
    /\b(understand|know|see|check|view|look\s+at)\b/,
    // Question marks
    /\?/
  ];
  
  if (questionPatterns.some(pattern => lowerRequest.match(pattern)) &&
      !lowerRequest.match(/\b(create|add|build|fix)\b/)) {
    return 'question';
  }

  // Explore intent - vague or open-ended
  const explorePatterns = [
    /\b(maybe|perhaps|possibly|what\s+if|thinking\s+about)\b/,
    // Universal: "ideas", "suggestions", "options"
    /\b(ideas?|suggestions?|options?|alternatives?)\b/,
    // Exploration: "explore", "try", "test"
    /\b(explore|try|test|experiment|play\s+with)\b/
  ];
  
  if (explorePatterns.some(pattern => lowerRequest.match(pattern))) {
    return 'explore';
  }

  // Default: treat as generate if creating something new
  return lowerRequest.length > 50 || lowerRequest.split(' ').length > 10 ? 'generate' : 'question';
}

/**
 * Assess complexity of the request
 */
function assessComplexity(
  request: string,
  messages: any[],
  recentErrors: any[]
): ContextAnalysis['complexity'] {
  let complexityScore = 0;

  // Check request length and technical terms
  const technicalTerms = request.match(/\b(database|authentication|api|integration|deployment|security|optimization)\b/gi);
  if (technicalTerms && technicalTerms.length > 2) complexityScore += 2;
  if (request.length > 200) complexityScore += 1;

  // Check recent error frequency
  if (recentErrors.length > 5) complexityScore += 2;
  if (recentErrors.length > 10) complexityScore += 3;

  // Check conversation back-and-forth (indicates complexity)
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length > 5) complexityScore += 1;
  if (userMessages.length > 10) complexityScore += 2;

  if (complexityScore >= 5) return 'complex';
  if (complexityScore >= 2) return 'moderate';
  return 'simple';
}

/**
 * Calculate context quality (0-100)
 */
function calculateContextQuality(
  messages: any[],
  projectContext: any,
  recentErrors: any[]
): number {
  let quality = 50; // Base quality

  // More messages = better context (up to a point)
  quality += Math.min(messages.length * 2, 20);

  // Project context available = +20
  if (projectContext) quality += 20;

  // Error patterns available = +10
  if (recentErrors.length > 0) quality += 10;

  return Math.min(quality, 100);
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  intent: ContextAnalysis['userIntent'],
  complexity: ContextAnalysis['complexity'],
  contextQuality: number,
  successPatterns: any[]
): number {
  let confidence = 0.5; // Base confidence

  // Intent-based adjustment
  if (intent === 'fix') confidence += 0.1;
  if (intent === 'question') confidence -= 0.1;

  // Complexity adjustment
  if (complexity === 'simple') confidence += 0.2;
  if (complexity === 'complex') confidence -= 0.2;

  // Context quality adjustment (normalized)
  confidence += (contextQuality / 100) * 0.2;

  // Success patterns boost confidence
  if (successPatterns.length > 0) {
    const avgSuccessRate = successPatterns.reduce((sum, p) => sum + (p.success_count / (p.success_count + p.failure_count)), 0) / successPatterns.length;
    confidence += avgSuccessRate * 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate success rate from conversation history
 */
function calculateSuccessRate(messages: any[]): number {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  if (assistantMessages.length === 0) return 0.5;

  const errorMessages = assistantMessages.filter(m => 
    m.content.toLowerCase().includes('error') || 
    m.content.toLowerCase().includes('failed')
  );

  return Math.max(0, 1 - (errorMessages.length / assistantMessages.length));
}

/**
 * Extract patterns from conversation and errors
 */
function extractPatterns(
  messages: any[],
  recentErrors: any[],
  successPatterns: any[]
): ContextAnalysis['patterns'] {
  const commonIssues = [...new Set(recentErrors.map(e => e.error_type))];
  
  const userPreferences = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .filter(c => c.includes('prefer') || c.includes('like') || c.includes('want'))
    .slice(0, 5);

  const successfulApproaches = successPatterns
    .filter(p => p.confidence_score >= 0.8)
    .map(p => p.pattern_name)
    .slice(0, 5);

  return {
    commonIssues,
    userPreferences,
    successfulApproaches
  };
}

/**
 * Generate alternative approaches based on context
 */
function generateAlternativeApproaches(context: ContextAnalysis): string[] {
  const approaches: string[] = [];

  if (context.userIntent === 'generate' || context.userIntent === 'modify') {
    approaches.push('Incremental approach: Build in small, testable steps');
    approaches.push('Component-based approach: Create reusable components first');
    if (context.projectState.hasDatabase) {
      approaches.push('Data-first approach: Design database schema, then UI');
    }
  }

  if (context.userIntent === 'fix') {
    approaches.push('Quick fix: Address immediate issue');
    approaches.push('Root cause fix: Investigate and fix underlying problem');
    approaches.push('Refactor approach: Restructure code for better maintainability');
  }

  return approaches.length > 0 ? approaches : [
    'Direct implementation',
    'Guided step-by-step approach',
    'Prototype first, then refine'
  ];
}
