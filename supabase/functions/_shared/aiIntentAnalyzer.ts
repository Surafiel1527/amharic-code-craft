/**
 * AI-Powered Intent Analyzer
 * AI analyzes user requests to determine true intent and execution strategy
 * NO hardcoded patterns - pure AI reasoning
 */

import { callAIWithFallback } from './aiWithFallback.ts';

export interface AIIntentAnalysis {
  // What the user actually wants (AI interpretation)
  trueIntent: string;
  
  // Complexity assessment
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'enterprise';
  
  // Recommended execution strategy
  executionStrategy: 'instant_edit' | 'surgical_change' | 'feature_build' | 'conversation' | 'deep_analysis';
  
  // Communication style to use
  communicationStyle: 'brief' | 'detailed' | 'encouraging' | 'technical';
  
  // Confidence in this analysis
  confidence: number;
  
  // Reasoning behind the decision
  reasoning: string;
  
  // Suggested status updates
  statusUpdates: {
    initial: string;
    progress: string[];
    completion: string;
  };
}

/**
 * Use AI to analyze user intent and determine execution strategy
 * This replaces ALL regex pattern matching
 */
export async function analyzeUserIntent(
  userRequest: string,
  conversationHistory: string[],
  projectContext?: {
    hasFiles: boolean;
    fileCount: number;
    lastChange?: string;
    recentErrors?: string[];
  }
): Promise<AIIntentAnalysis> {
  const systemPrompt = `You are an expert at understanding developer intent and determining optimal execution strategies.

Analyze the user's request and determine:
1. What they REALLY want (beyond surface keywords)
2. True complexity level
3. Best execution approach
4. Appropriate communication style
5. Natural status updates

Return JSON with this structure:
{
  "trueIntent": "concise description of what user actually wants",
  "complexity": "trivial|simple|moderate|complex|enterprise",
  "executionStrategy": "instant_edit|surgical_change|feature_build|conversation|deep_analysis",
  "communicationStyle": "brief|detailed|encouraging|technical",
  "confidence": 0.0-1.0,
  "reasoning": "why you chose this strategy",
  "statusUpdates": {
    "initial": "natural first status message",
    "progress": ["natural progress updates"],
    "completion": "natural completion message"
  }
}

EXECUTION STRATEGIES:
- instant_edit: Single property change (color, text) - <2s
- surgical_change: Focused code edit - <5s  
- feature_build: New functionality - 10-30s
- conversation: Question/discussion - no code
- deep_analysis: Complex planning needed - 30-60s

COMPLEXITY GUIDELINES:
- trivial: "change color to blue" - one-line edit
- simple: "update button text" - few lines
- moderate: "add login form" - new component
- complex: "implement auth system" - multiple files
- enterprise: "build e-commerce platform" - full architecture

COMMUNICATION STYLE:
- brief: Experienced devs who want results fast
- detailed: Users who need explanation
- encouraging: New users or facing errors
- technical: Deep technical discussions

Be smart - detect things like:
- "Please update background to gray" = trivial instant_edit
- "Add a todo list" = moderate feature_build  
- "How does auth work?" = conversation
- "Build Instagram clone" = enterprise deep_analysis`;

  const userPrompt = `Request: "${userRequest}"

Recent conversation:
${conversationHistory.slice(-3).join('\n')}

Project context:
- Has files: ${projectContext?.hasFiles || false}
- File count: ${projectContext?.fileCount || 0}
- Recent errors: ${projectContext?.recentErrors?.length || 0}

Analyze this request and return your analysis as JSON.`;

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await callAIWithFallback(
      LOVABLE_API_KEY,
      [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ],
      {
        preferredModel: 'google/gemini-2.5-flash',
        temperature: 0.7
      }
    );

    // Parse AI response
    const aiContent = response.data.choices[0].message.content;
    const parsed = JSON.parse(aiContent);
    
    return {
      trueIntent: parsed.trueIntent || 'Unknown intent',
      complexity: parsed.complexity || 'moderate',
      executionStrategy: parsed.executionStrategy || 'feature_build',
      communicationStyle: parsed.communicationStyle || 'brief',
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || 'AI analysis completed',
      statusUpdates: parsed.statusUpdates || {
        initial: 'Processing your request...',
        progress: ['Working on it...'],
        completion: 'Done!'
      }
    };
  } catch (error) {
    console.error('AI intent analysis failed:', error);
    
    // Minimal fallback - still smarter than pure regex
    return {
      trueIntent: userRequest,
      complexity: 'moderate',
      executionStrategy: 'feature_build',
      communicationStyle: 'brief',
      confidence: 0.3,
      reasoning: 'Fallback analysis due to AI error',
      statusUpdates: {
        initial: 'Analyzing your request...',
        progress: ['Processing...'],
        completion: 'Complete!'
      }
    };
  }
}

/**
 * Generate dynamic status update using AI
 * Every status message is AI-generated based on current context
 */
export async function generateStatusUpdate(
  context: {
    action: string;
    progress: number;
    userRequest: string;
    filesInvolved?: string[];
    currentPhase?: string;
  }
): Promise<string> {
  const systemPrompt = `Generate a brief, natural status update for a code generation system.

Rules:
- Keep it conversational and natural
- Be specific to what's actually happening
- No generic templates like "Processing..." or "Working on it..."
- Max 1-2 sentences
- Show progress when relevant
- Use appropriate technical terms`;

  const userPrompt = `Current action: ${context.action}
Progress: ${context.progress}%
User requested: "${context.userRequest}"
${context.filesInvolved ? `Files: ${context.filesInvolved.join(', ')}` : ''}
${context.currentPhase ? `Phase: ${context.currentPhase}` : ''}

Generate a natural status update message.`;

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await callAIWithFallback(
      LOVABLE_API_KEY,
      [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ],
      {
        preferredModel: 'google/gemini-2.5-flash',
        temperature: 0.7
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    // Fallback with context
    return `${context.action}... (${context.progress}%)`;
  }
}
