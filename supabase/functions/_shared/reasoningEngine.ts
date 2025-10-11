/**
 * Reasoning Engine - Mimics explicit step-by-step thinking
 * This module adds pre-classification reasoning similar to AI assistant thinking blocks
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface ReasoningStep {
  step: string;
  thought: string;
  confidence: number;
  alternatives?: string[];
  concerns?: string[];
}

export interface ReasoningOutput {
  understanding: {
    what_user_wants: string;
    why_they_want_it: string;
    implicit_requirements: string[];
  };
  breakdown: {
    main_goal: string;
    sub_goals: string[];
    dependencies: string[];
  };
  analysis: {
    complexity_reasoning: string;
    estimated_complexity: 'simple' | 'moderate' | 'complex';
    edge_cases: string[];
    potential_issues: string[];
  };
  planning: {
    approach: string;
    alternatives: Array<{ approach: string; pros: string[]; cons: string[] }>;
    recommended: string;
    reasoning: string;
  };
  clarifications: Array<{
    question: string;
    why_asking: string;
    impact_if_unclear: string;
  }>;
  reasoning_steps: ReasoningStep[];
  confidence_in_understanding: number;
  needs_clarification: boolean;
}

/**
 * Deep reasoning before classification - mimics human-like thinking
 */
export async function performDeepReasoning(
  supabase: SupabaseClient,
  request: string,
  context: {
    conversationHistory?: any[];
    projectState?: any;
    learnedPatterns?: any[];
  }
): Promise<ReasoningOutput> {
  console.log('🧠 Starting deep reasoning process...');

  const reasoningSteps: ReasoningStep[] = [];

  // Step 1: Understanding Phase
  const understandingStep = await reasonAboutUnderstanding(request, context);
  reasoningSteps.push(understandingStep);

  // Step 2: Breakdown Phase
  const breakdownStep = await reasonAboutBreakdown(request, understandingStep);
  reasoningSteps.push(breakdownStep);

  // Step 3: Analysis Phase
  const analysisStep = await reasonAboutComplexity(request, breakdownStep);
  reasoningSteps.push(analysisStep);

  // Step 4: Planning Phase
  const planningStep = await reasonAboutApproach(request, analysisStep, context);
  reasoningSteps.push(planningStep);

  // Step 5: Clarification Check
  const clarificationStep = await reasonAboutClarifications(request, context, reasoningSteps);

  // Build comprehensive reasoning output
  const reasoning: ReasoningOutput = {
    understanding: {
      what_user_wants: understandingStep.thought,
      why_they_want_it: extractIntent(request, context),
      implicit_requirements: extractImplicitRequirements(request, context)
    },
    breakdown: {
      main_goal: breakdownStep.thought,
      sub_goals: extractSubGoals(breakdownStep),
      dependencies: extractDependencies(breakdownStep)
    },
    analysis: {
      complexity_reasoning: analysisStep.thought,
      estimated_complexity: analysisStep.confidence > 0.7 ? 'complex' : analysisStep.confidence > 0.4 ? 'moderate' : 'simple',
      edge_cases: analysisStep.concerns || [],
      potential_issues: analysisStep.alternatives || []
    },
    planning: {
      approach: planningStep.thought,
      alternatives: extractAlternatives(planningStep),
      recommended: planningStep.thought,
      reasoning: planningStep.thought
    },
    clarifications: clarificationStep.clarifications,
    reasoning_steps: reasoningSteps,
    confidence_in_understanding: calculateOverallConfidence(reasoningSteps),
    needs_clarification: clarificationStep.needsClarification
  };

  // Store reasoning for learning
  await storeReasoningTrace(supabase, request, reasoning);

  console.log('🧠 Deep reasoning complete:', {
    confidence: reasoning.confidence_in_understanding,
    needs_clarification: reasoning.needs_clarification,
    complexity: reasoning.analysis.estimated_complexity
  });

  return reasoning;
}

/**
 * Step 1: Reason about what the user actually wants
 */
async function reasonAboutUnderstanding(
  request: string,
  context: any
): Promise<ReasoningStep> {
  // Simulate deep thinking about the request
  const thoughts = [
    'What is the user literally asking for?',
    'What might they actually need (reading between the lines)?',
    'What related things might they want but havent mentioned?',
    'Does this build on previous conversation?'
  ];

  // Analyze request patterns
  const isAddingFeature = /add|create|make|build|implement/i.test(request);
  const isFixing = /fix|error|bug|issue|problem|wrong/i.test(request);
  const isModifying = /change|update|modify|edit|adjust/i.test(request);
  const isAsking = /how|what|why|explain|tell|show/i.test(request);

  let understanding = '';
  let confidence = 0.5;

  if (isAsking) {
    understanding = 'User is asking for information or explanation, not requesting code generation';
    confidence = 0.9;
  } else if (isFixing) {
    understanding = 'User wants to fix something that is broken or not working as expected';
    confidence = 0.8;
  } else if (isModifying) {
    understanding = 'User wants to modify existing functionality';
    confidence = 0.8;
  } else if (isAddingFeature) {
    understanding = 'User wants to add new functionality';
    confidence = 0.7;
  } else {
    understanding = 'User intent is ambiguous - might need clarification';
    confidence = 0.3;
  }

  return {
    step: 'Understanding',
    thought: understanding,
    confidence,
    concerns: confidence < 0.5 ? ['User intent is unclear'] : []
  };
}

/**
 * Step 2: Break down the problem
 */
async function reasonAboutBreakdown(
  request: string,
  understandingStep: ReasoningStep
): Promise<ReasoningStep> {
  // Think about how to break this down
  const hasAuth = /auth|login|signup|user/i.test(request);
  const hasDatabase = /data|save|store|database|table/i.test(request);
  const hasUI = /ui|interface|design|page|component|button|form/i.test(request);
  const hasAPI = /api|endpoint|fetch|call/i.test(request);

  const components: string[] = [];
  if (hasAuth) components.push('authentication');
  if (hasDatabase) components.push('database');
  if (hasUI) components.push('user interface');
  if (hasAPI) components.push('API integration');

  const breakdown = components.length > 0 
    ? `This requires: ${components.join(', ')}`
    : 'This is a simple, focused task';

  return {
    step: 'Breakdown',
    thought: breakdown,
    confidence: components.length > 0 ? 0.8 : 0.6,
    alternatives: components
  };
}

/**
 * Step 3: Analyze complexity
 */
async function reasonAboutComplexity(
  request: string,
  breakdownStep: ReasoningStep
): Promise<ReasoningStep> {
  const componentCount = breakdownStep.alternatives?.length || 0;
  const requestLength = request.length;
  
  // More components = more complex
  // Longer request = usually more complex
  const complexityScore = (componentCount * 0.3) + (Math.min(requestLength / 1000, 1) * 0.3);

  let complexity: 'simple' | 'moderate' | 'complex';
  let reasoning: string;
  const concerns: string[] = [];

  if (complexityScore > 0.6) {
    complexity = 'complex';
    reasoning = 'This is a complex multi-system request that will need careful orchestration';
    concerns.push('Multiple systems need to work together');
    concerns.push('Integration points need careful handling');
  } else if (complexityScore > 0.3) {
    complexity = 'moderate';
    reasoning = 'This is moderately complex and will need some planning';
    concerns.push('Some integration needed');
  } else {
    complexity = 'simple';
    reasoning = 'This is straightforward and can be done directly';
  }

  return {
    step: 'Complexity Analysis',
    thought: reasoning,
    confidence: complexityScore,
    concerns
  };
}

/**
 * Step 4: Reason about approach
 */
async function reasonAboutApproach(
  request: string,
  analysisStep: ReasoningStep,
  context: any
): Promise<ReasoningStep> {
  // Think about different approaches
  const approaches: Array<{ approach: string; pros: string[]; cons: string[] }> = [];

  // Consider learned patterns
  if (context.learnedPatterns?.length > 0) {
    approaches.push({
      approach: 'Use learned pattern',
      pros: ['Proven to work', 'Fast', 'High confidence'],
      cons: ['Might not fit exact use case']
    });
  }

  // Consider direct generation
  approaches.push({
    approach: 'Generate directly',
    pros: ['Tailored to request', 'Fresh approach'],
    cons: ['No proven pattern', 'Lower initial confidence']
  });

  // Consider asking for clarification
  if (analysisStep.confidence < 0.5) {
    approaches.push({
      approach: 'Ask for clarification first',
      pros: ['Avoid mistakes', 'Better outcome'],
      cons: ['Slower', 'Extra conversation turn']
    });
  }

  const recommended = approaches[0].approach;

  return {
    step: 'Approach Planning',
    thought: `I recommend: ${recommended}`,
    confidence: 0.7,
    alternatives: approaches.map(a => a.approach)
  };
}

/**
 * Step 5: Check if clarification is needed
 */
async function reasonAboutClarifications(
  request: string,
  context: any,
  steps: ReasoningStep[]
): Promise<{ clarifications: any[]; needsClarification: boolean }> {
  const clarifications: any[] = [];
  const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

  // Generate specific clarifying questions based on reasoning
  if (avgConfidence < 0.6) {
    clarifications.push({
      question: 'Could you provide more details about what you want to achieve?',
      why_asking: 'Your request has multiple possible interpretations',
      impact_if_unclear: 'I might build the wrong thing'
    });
  }

  const hasAmbiguousTerms = /it|that|this|the thing/i.test(request);
  if (hasAmbiguousTerms) {
    clarifications.push({
      question: 'What specific component or feature are you referring to?',
      why_asking: 'Your request contains ambiguous references',
      impact_if_unclear: 'I might modify the wrong part of the app'
    });
  }

  return {
    clarifications,
    needsClarification: clarifications.length > 0 && avgConfidence < 0.5
  };
}

// Helper functions
function extractIntent(request: string, context: any): string {
  // Infer why they want this based on patterns
  if (/dashboard|analytics|chart/i.test(request)) {
    return 'User wants to visualize data';
  }
  if (/auth|login/i.test(request)) {
    return 'User needs to protect their app';
  }
  return 'User wants to add functionality';
}

function extractImplicitRequirements(request: string, context: any): string[] {
  const implicit: string[] = [];
  
  if (/user|profile|account/i.test(request)) {
    implicit.push('Needs authentication');
    implicit.push('Needs user data storage');
  }
  
  if (/save|store|persist/i.test(request)) {
    implicit.push('Needs database');
  }
  
  return implicit;
}

function extractSubGoals(step: ReasoningStep): string[] {
  return step.alternatives || [];
}

function extractDependencies(step: ReasoningStep): string[] {
  const deps: string[] = [];
  step.alternatives?.forEach(alt => {
    if (alt.includes('auth')) deps.push('Authentication system');
    if (alt.includes('database')) deps.push('Database setup');
  });
  return deps;
}

function extractAlternatives(step: ReasoningStep): Array<{ approach: string; pros: string[]; cons: string[] }> {
  // This is populated in reasonAboutApproach
  return [];
}

function calculateOverallConfidence(steps: ReasoningStep[]): number {
  const avg = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
  return Math.round(avg * 100) / 100;
}

async function storeReasoningTrace(
  supabase: SupabaseClient,
  request: string,
  reasoning: ReasoningOutput
): Promise<void> {
  try {
    // Store in a new table for reasoning traces
    await supabase.from('reasoning_traces').insert({
      user_request: request,
      reasoning_output: reasoning,
      confidence: reasoning.confidence_in_understanding,
      needed_clarification: reasoning.needs_clarification,
      complexity: reasoning.analysis.estimated_complexity
    });
  } catch (error) {
    console.error('Failed to store reasoning trace:', error);
    // Don't fail the whole process if storage fails
  }
}
