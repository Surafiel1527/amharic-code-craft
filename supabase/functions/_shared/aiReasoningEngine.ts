/**
 * AI REASONING ENGINE
 * Dynamic AI-powered decision making and code generation
 * No hardcoded patterns - uses real AI models
 */

import { callAIWithFallback } from './aiHelpers.ts';

export interface ReasoningContext {
  userRequest: string;
  projectContext: any;
  conversationHistory: any[];
  searchResults?: any;
  constraints?: string[];
}

export interface ReasoningResult {
  decision: string;
  confidence: number;
  reasoning: string[];
  suggestedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
  risks: string[];
  alternatives: string[];
}

/**
 * Use AI to reason about what to do
 */
export async function reasonAboutRequest(
  context: ReasoningContext
): Promise<ReasoningResult> {
  
  const prompt = buildReasoningPrompt(context);
  
  try {
    const response = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are an expert software architect and developer. Provide deep, structured reasoning about development requests.',
        preferredModel: 'google/gemini-2.5-pro', // Use most powerful model
        maxTokens: 2000
      }
    );

    const reasoning = response.data.choices[0].message.content;
    return parseReasoningResponse(reasoning);

  } catch (error) {
    console.error('AI reasoning error:', error);
    return {
      decision: 'proceed_cautiously',
      confidence: 0.5,
      reasoning: ['AI reasoning unavailable, using conservative approach'],
      suggestedActions: [],
      risks: ['Unknown complexity'],
      alternatives: []
    };
  }
}

/**
 * Build comprehensive reasoning prompt
 */
function buildReasoningPrompt(context: ReasoningContext): string {
  return `Analyze this development request and provide structured reasoning:

USER REQUEST: "${context.userRequest}"

PROJECT CONTEXT:
${JSON.stringify(context.projectContext, null, 2)}

${context.searchResults ? `
WEB RESEARCH RESULTS:
${JSON.stringify(context.searchResults, null, 2)}
` : ''}

${context.constraints && context.constraints.length > 0 ? `
CONSTRAINTS:
${context.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''}

Provide your analysis in this JSON structure:
{
  "decision": "implement|research_first|clarify|reject",
  "confidence": 0.0-1.0,
  "reasoning": ["step 1", "step 2", "..."],
  "suggestedActions": [
    {
      "action": "specific action to take",
      "priority": "high|medium|low",
      "reasoning": "why this action"
    }
  ],
  "risks": ["potential risk 1", "potential risk 2"],
  "alternatives": ["alternative approach 1", "alternative approach 2"]
}

Think step by step. Be specific and actionable.`;
}

/**
 * Parse AI reasoning response
 */
function parseReasoningResponse(response: string): ReasoningResult {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        decision: parsed.decision || 'proceed_cautiously',
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || [],
        suggestedActions: parsed.suggestedActions || [],
        risks: parsed.risks || [],
        alternatives: parsed.alternatives || []
      };
    }
  } catch (error) {
    console.error('Failed to parse reasoning response:', error);
  }

  // Fallback: extract insights from text
  return {
    decision: 'proceed_cautiously',
    confidence: 0.6,
    reasoning: [response.slice(0, 200)],
    suggestedActions: [],
    risks: [],
    alternatives: []
  };
}

/**
 * Generate code using AI reasoning
 */
export async function generateCodeWithReasoning(
  requirements: {
    functionality: string;
    framework: string;
    constraints: string[];
    context: any;
  }
): Promise<{
  code: string;
  explanation: string;
  reasoning: string[];
}> {
  
  const prompt = `Generate production-ready code for this requirement:

FUNCTIONALITY: ${requirements.functionality}
FRAMEWORK: ${requirements.framework}

CONSTRAINTS:
${requirements.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

PROJECT CONTEXT:
${JSON.stringify(requirements.context, null, 2)}

Generate:
1. Complete, working code
2. Inline comments explaining key decisions
3. Error handling
4. TypeScript types where applicable

Return JSON:
{
  "code": "complete code here",
  "explanation": "what this code does and why",
  "reasoning": ["design decision 1", "design decision 2", "..."]
}`;

  try {
    const response = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are an expert developer. Write clean, production-ready code with clear reasoning.',
        preferredModel: 'google/gemini-2.5-flash',
        maxTokens: 4000
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        code: parsed.code || '',
        explanation: parsed.explanation || '',
        reasoning: parsed.reasoning || []
      };
    }

    // Fallback: treat entire response as code
    return {
      code: content,
      explanation: 'Generated code',
      reasoning: []
    };

  } catch (error) {
    console.error('Code generation error:', error);
    throw error;
  }
}

/**
 * Analyze errors using AI
 */
export async function analyzeErrorWithAI(
  error: string,
  code: string,
  context: any
): Promise<{
  diagnosis: string;
  rootCause: string;
  suggestedFixes: Array<{
    fix: string;
    confidence: number;
    reasoning: string;
  }>;
}> {
  
  const prompt = `Analyze this error and suggest fixes:

ERROR: ${error}

CODE:
\`\`\`
${code.slice(0, 1000)}
\`\`\`

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON:
{
  "diagnosis": "what's wrong",
  "rootCause": "underlying cause",
  "suggestedFixes": [
    {
      "fix": "specific fix to apply",
      "confidence": 0.0-1.0,
      "reasoning": "why this will work"
    }
  ]
}`;

  try {
    const response = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are a debugging expert. Identify root causes and provide precise fixes.',
        preferredModel: 'google/gemini-2.5-flash',
        maxTokens: 2000
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      diagnosis: content,
      rootCause: 'Unknown',
      suggestedFixes: []
    };

  } catch (error) {
    console.error('Error analysis failed:', error);
    throw error;
  }
}
