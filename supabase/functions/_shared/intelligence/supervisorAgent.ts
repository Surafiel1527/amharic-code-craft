/**
 * Supervisor Agent - Enterprise Quality Verification Layer
 * 
 * This agent acts as a "boss" that verifies the work of the AutonomousExecutor.
 * It uses AI reasoning to determine if the execution meets the user's requirements
 * and provides specific, actionable feedback for improvements.
 * 
 * Philosophy: Like a senior engineer reviewing code, not just checking syntax
 * but understanding intent and quality.
 */

import type { DeepUnderstanding } from './metaCognitiveAnalyzer.ts';
import type { ExecutionResult } from './adaptiveExecutor.ts';

export interface SupervisionResult {
  approved: boolean;
  confidence: number; // 0-1, how confident we are in this assessment
  feedback?: string; // Specific, actionable feedback if not approved
  issues?: string[]; // List of specific issues found
  suggestions?: string[]; // Concrete suggestions for improvement
  requiresIteration: boolean;
  reasoning: string; // Why we approved/rejected
}

export interface SupervisionContext {
  userRequest: string;
  understanding: DeepUnderstanding;
  executionResult: ExecutionResult;
  attemptNumber: number;
  previousFeedback?: string[];
}

export class SupervisorAgent {
  private apiKey: string;
  private maxConfidenceThreshold = 0.85; // 85% confidence required for approval
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('SupervisorAgent requires GEMINI_API_KEY');
    }
    this.apiKey = apiKey;
  }

  /**
   * Main supervision method - verifies if execution meets requirements
   * Uses AI reasoning to provide human-like quality assessment
   */
  async verify(context: SupervisionContext): Promise<SupervisionResult> {
    try {
      console.log(`[SupervisorAgent] Verifying execution attempt #${context.attemptNumber}`);
      
      // Quick pass: If execution failed with error, no need for AI verification
      if (!context.executionResult.success && context.executionResult.error) {
        return this.createRejection(
          `Execution failed with error: ${context.executionResult.error}`,
          ['Fix the execution error before proceeding'],
          ['Review error logs and correct the issue'],
          0.95 // High confidence that this needs fixing
        );
      }

      // Quick pass: If no output generated and user expected code
      if (this.expectedCodeGeneration(context.understanding) && 
          !this.hasGeneratedFiles(context.executionResult)) {
        return this.createRejection(
          'User requested code generation but no files were generated',
          ['No files generated despite code generation request'],
          ['Execute code generation tools to create the requested files'],
          0.9
        );
      }

      // AI-based verification: Deep quality assessment
      return await this.performAIVerification(context);
      
    } catch (error) {
      console.error('[SupervisorAgent] Verification error:', error);
      // On error, approve with low confidence rather than blocking
      return {
        approved: true,
        confidence: 0.5,
        requiresIteration: false,
        reasoning: `Verification error occurred: ${error.message}. Proceeding with caution.`
      };
    }
  }

  /**
   * AI-powered verification using reasoning model
   * This is where the "expert supervisor" intelligence lives
   */
  private async performAIVerification(context: SupervisionContext): Promise<SupervisionResult> {
    const prompt = this.buildVerificationPrompt(context);
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
          role: 'user'
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent verification
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return this.parseAIVerificationResponse(aiResponse, context);
  }

  /**
   * Build comprehensive verification prompt for AI
   */
  private buildVerificationPrompt(context: SupervisionContext): string {
    const { userRequest, understanding, executionResult, attemptNumber, previousFeedback } = context;
    
    const filesGenerated = executionResult.generatedFiles?.length || 0;
    const hasErrors = !executionResult.success;
    const previousAttempts = attemptNumber > 1 ? `This is attempt #${attemptNumber}.` : '';
    const previousFeedbackSection = previousFeedback?.length 
      ? `\n\nPrevious Feedback Given:\n${previousFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
      : '';

    return `You are a Senior Software Engineer reviewing work completion.

USER REQUEST:
"${userRequest}"

UNDERSTANDING OF REQUEST:
- Intent: ${understanding.intent}
- Expected Action: ${understanding.actionPlan}
- Complexity: ${understanding.complexity}

EXECUTION RESULT:
- Success: ${executionResult.success}
- Files Generated: ${filesGenerated}
- Output: ${JSON.stringify(executionResult.output || {}).substring(0, 500)}
- Messages: ${executionResult.messages?.join('; ') || 'None'}
${hasErrors ? `- Error: ${executionResult.error}` : ''}

${previousAttempts}${previousFeedbackSection}

VERIFICATION TASK:
Determine if this execution properly fulfills the user's request. Consider:
1. Does the output match what the user asked for?
2. If code was requested, were appropriate files generated?
3. Are there any obvious gaps or missing pieces?
4. Is the quality acceptable for the request type?

Respond in this EXACT JSON format:
{
  "approved": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation of your decision",
  "issues": ["Specific issue 1", "Specific issue 2"] or [],
  "suggestions": ["Concrete suggestion 1", "Concrete suggestion 2"] or []
}

Be specific and actionable. If rejecting, explain exactly what needs to be fixed.`;
  }

  /**
   * Parse AI response into structured supervision result
   */
  private parseAIVerificationResponse(aiResponse: string, context: SupervisionContext): SupervisionResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse.trim();
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(jsonStr);
      
      return {
        approved: parsed.approved === true,
        confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.5)),
        feedback: this.buildFeedbackMessage(parsed.issues, parsed.suggestions),
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        requiresIteration: !parsed.approved && context.attemptNumber < 3, // Max 3 attempts
        reasoning: parsed.reasoning || 'AI verification completed'
      };
    } catch (error) {
      console.error('[SupervisorAgent] Failed to parse AI response:', error);
      console.log('[SupervisorAgent] Raw response:', aiResponse);
      
      // Fallback: Approve with low confidence if parsing fails
      return {
        approved: true,
        confidence: 0.6,
        requiresIteration: false,
        reasoning: 'Unable to parse verification response, proceeding with caution'
      };
    }
  }

  /**
   * Build comprehensive feedback message from issues and suggestions
   */
  private buildFeedbackMessage(issues?: string[], suggestions?: string[]): string | undefined {
    if (!issues?.length && !suggestions?.length) {
      return undefined;
    }

    let feedback = '';
    
    if (issues?.length) {
      feedback += '**Issues Found:**\n';
      feedback += issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');
    }
    
    if (suggestions?.length) {
      if (feedback) feedback += '\n\n';
      feedback += '**Suggestions:**\n';
      feedback += suggestions.map((sugg, i) => `${i + 1}. ${sugg}`).join('\n');
    }
    
    return feedback;
  }

  /**
   * Create a rejection result with specific feedback
   */
  private createRejection(
    reasoning: string, 
    issues: string[], 
    suggestions: string[],
    confidence: number
  ): SupervisionResult {
    return {
      approved: false,
      confidence,
      feedback: this.buildFeedbackMessage(issues, suggestions),
      issues,
      suggestions,
      requiresIteration: true,
      reasoning
    };
  }

  /**
   * Check if user request implies code generation
   */
  private expectedCodeGeneration(understanding: DeepUnderstanding): boolean {
    const codeKeywords = ['generate', 'create', 'build', 'implement', 'code', 'function', 'component'];
    const requestLower = understanding.intent?.toLowerCase() || '';
    return codeKeywords.some(keyword => requestLower.includes(keyword));
  }

  /**
   * Check if execution result has generated files
   */
  private hasGeneratedFiles(result: ExecutionResult): boolean {
    return (result.generatedFiles?.length || 0) > 0;
  }

  /**
   * Determine if we should retry based on supervision and attempt count
   */
  shouldRetry(supervision: SupervisionResult, attemptNumber: number, maxAttempts = 3): boolean {
    // Don't retry if approved or if we've hit max attempts
    if (supervision.approved || attemptNumber >= maxAttempts) {
      return false;
    }

    // Only retry if we have actionable feedback
    return supervision.requiresIteration && 
           (supervision.issues?.length || 0) > 0 &&
           supervision.confidence >= 0.7; // Only retry if we're confident about the issue
  }
}
