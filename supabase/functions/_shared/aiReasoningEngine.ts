/**
 * AI REASONING ENGINE
 * Dynamic AI-powered decision making and code generation
 * No hardcoded patterns - uses real AI models
 */

import { callAIWithFallback } from './aiHelpers.ts';
import { logger } from './logger.ts';
import { retryWithBackoff, withTimeout, TimeoutError } from './errorHandler.ts';
import { validateString, validateObject } from './validation.ts';

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
  // Validate inputs
  const requestValidation = validateString(context.userRequest, { 
    minLength: 1, 
    maxLength: 50000 
  });
  if (!requestValidation.success) {
    logger.error('Invalid user request for reasoning', requestValidation.error);
    throw new Error(`Invalid user request: ${requestValidation.error}`);
  }

  const contextValidation = validateObject(context.projectContext);
  if (!contextValidation.success) {
    logger.error('Invalid project context', contextValidation.error);
    throw new Error(`Invalid project context: ${contextValidation.error}`);
  }

  logger.info('Starting AI reasoning', { 
    requestLength: context.userRequest.length,
    hasSearchResults: !!context.searchResults
  });
  
  const prompt = buildReasoningPrompt(context);
  
  try {
    const response = await retryWithBackoff(
      () => withTimeout(
        () => callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are an expert software architect and developer. Provide deep, structured reasoning about development requests.',
            preferredModel: 'google/gemini-2.5-pro',
            maxTokens: 2000
          }
        ),
        30000 // 30 second timeout
      ),
      { 
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          logger.warn(`AI reasoning retry attempt ${attempt}`, { error: error.message });
        }
      }
    );

    const reasoning = response.data.choices[0].message.content;
    const result = parseReasoningResponse(reasoning);
    
    logger.info('AI reasoning completed', { 
      decision: result.decision, 
      confidence: result.confidence 
    });
    
    return result;

  } catch (error) {
    logger.error('AI reasoning failed', error);
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
  // Validate inputs
  const funcValidation = validateString(requirements.functionality, { 
    minLength: 1, 
    maxLength: 10000 
  });
  if (!funcValidation.success) {
    throw new Error(`Invalid functionality: ${funcValidation.error}`);
  }

  const frameworkValidation = validateString(requirements.framework, { 
    minLength: 1, 
    maxLength: 100 
  });
  if (!frameworkValidation.success) {
    throw new Error(`Invalid framework: ${frameworkValidation.error}`);
  }

  logger.info('Starting code generation with reasoning', { 
    framework: requirements.framework,
    constraintCount: requirements.constraints.length 
  });
  
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
    const response = await retryWithBackoff(
      () => withTimeout(
        () => callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are an expert developer. Write clean, production-ready code with clear reasoning.',
            preferredModel: 'google/gemini-2.5-flash',
            maxTokens: 4000
          }
        ),
        45000 // 45 second timeout for code generation
      ),
      { 
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          logger.warn(`Code generation retry attempt ${attempt}`, { error: error.message });
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = {
        code: parsed.code || '',
        explanation: parsed.explanation || '',
        reasoning: parsed.reasoning || []
      };
      
      logger.info('Code generation completed', { 
        codeLength: result.code.length,
        hasExplanation: !!result.explanation 
      });
      
      return result;
    }

    // Fallback: treat entire response as code
    logger.warn('Could not parse structured response, using raw content');
    return {
      code: content,
      explanation: 'Generated code',
      reasoning: []
    };

  } catch (error) {
    logger.error('Code generation failed', error);
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
  // Validate inputs
  const errorValidation = validateString(error, { minLength: 1, maxLength: 10000 });
  if (!errorValidation.success) {
    throw new Error(`Invalid error string: ${errorValidation.error}`);
  }

  const codeValidation = validateString(code, { minLength: 0, maxLength: 50000 });
  if (!codeValidation.success) {
    throw new Error(`Invalid code string: ${codeValidation.error}`);
  }

  logger.info('Starting error analysis', { 
    errorLength: error.length,
    codeLength: code.length 
  });
  
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
    const response = await retryWithBackoff(
      () => withTimeout(
        () => callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are a debugging expert. Identify root causes and provide precise fixes.',
            preferredModel: 'google/gemini-2.5-flash',
            maxTokens: 2000
          }
        ),
        30000 // 30 second timeout
      ),
      { 
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          logger.warn(`Error analysis retry attempt ${attempt}`, { error: error.message });
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      logger.info('Error analysis completed', { 
        fixCount: result.suggestedFixes?.length || 0 
      });
      return result;
    }

    logger.warn('Could not parse structured error analysis response');
    return {
      diagnosis: content,
      rootCause: 'Unknown',
      suggestedFixes: []
    };

  } catch (error) {
    logger.error('Error analysis failed', error);
    throw error;
  }
}
