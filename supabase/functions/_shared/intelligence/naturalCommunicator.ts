/**
 * Natural Communicator - AI-Generated Status & Responses
 * 
 * This module generates ALL user-facing communication dynamically using AI.
 * No hardcoded messages - the AI decides what to say and how to say it.
 * 
 * Enterprise Pattern: Adaptive Natural Language Generation
 */

import { QueryAnalysis } from './metaCognitiveAnalyzer.ts';

export interface CommunicationContext {
  phase: 'starting' | 'analyzing' | 'planning' | 'building' | 'validating' | 'completing' | 'error';
  taskDescription: string;
  progress?: number;
  currentAction?: string;
  filesAffected?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface GeneratedMessage {
  type: 'status' | 'progress' | 'completion' | 'error' | 'question' | 'explanation';
  content: string;
  emoji?: string;
  actions?: string[];
  timestamp: Date;
}

export class NaturalCommunicator {
  private lovableApiKey: string;
  private conversationContext: any[] = [];
  
  constructor(lovableApiKey: string) {
    this.lovableApiKey = lovableApiKey;
  }
  
  /**
   * Generate natural status update based on current execution phase
   */
  async generateStatusUpdate(
    context: CommunicationContext,
    analysis: QueryAnalysis
  ): Promise<GeneratedMessage> {
    console.log('💬 Natural Communicator: Generating status for phase:', context.phase);
    
    const systemPrompt = this.buildCommunicatorPrompt(analysis);
    const userPrompt = this.buildContextPrompt(context);
    
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationContext,
            { role: 'user', content: userPrompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'generate_message',
              description: 'Generate natural language message for user',
              parameters: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['status', 'progress', 'completion', 'error', 'question', 'explanation']
                  },
                  content: { 
                    type: 'string',
                    description: 'The natural language message to show the user'
                  },
                  emoji: { 
                    type: 'string',
                    description: 'Optional emoji to make message more engaging'
                  },
                  actions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Suggested next actions for the user'
                  }
                },
                required: ['type', 'content']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'generate_message' } }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI communication failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const toolCall = data.choices[0].message.tool_calls?.[0];
      
      if (!toolCall) {
        throw new Error('No tool call in AI response');
      }
      
      const message = JSON.parse(toolCall.function.arguments);
      
      // Store in conversation context
      this.conversationContext.push(
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: message.content }
      );
      
      // Keep context window reasonable
      if (this.conversationContext.length > 10) {
        this.conversationContext = this.conversationContext.slice(-10);
      }
      
      return {
        ...message,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('❌ Natural Communicator error:', error);
      
      // Fallback to template-based message
      return this.fallbackMessage(context);
    }
  }
  
  /**
   * Generate completion summary with what was accomplished
   */
  async generateCompletionSummary(
    taskDescription: string,
    filesChanged: string[],
    duration: number,
    analysis: QueryAnalysis
  ): Promise<GeneratedMessage> {
    const context: CommunicationContext = {
      phase: 'completing',
      taskDescription,
      filesAffected: filesChanged,
      metadata: {
        duration,
        complexity: analysis.complexity.level
      }
    };
    
    return this.generateStatusUpdate(context, analysis);
  }
  
  /**
   * Generate error explanation and recovery suggestions
   */
  async generateErrorResponse(
    error: Error,
    context: CommunicationContext,
    analysis: QueryAnalysis
  ): Promise<GeneratedMessage> {
    const errorContext: CommunicationContext = {
      ...context,
      phase: 'error',
      errors: [error.message]
    };
    
    return this.generateStatusUpdate(errorContext, analysis);
  }
  
  /**
   * Build communicator system prompt
   */
  private buildCommunicatorPrompt(analysis: QueryAnalysis): string {
    return `You are the Natural Communicator for an AI development platform.

Your role is to generate friendly, helpful, and contextually appropriate messages for users.

COMMUNICATION STYLE GUIDELINES:
- Tone: ${analysis.communication.tone}
- Technical Level: ${analysis.communication.technicalLevel || 'balanced'}
- Should Stream Thinking: ${analysis.communication.shouldStreamThinking}
- Should Provide Context: ${analysis.communication.shouldProvideContext}

TASK CONTEXT:
- User's primary goal: ${analysis.understanding.userGoal}
${analysis.actionPlan.requiresCodeGeneration && analysis.actionPlan.codeActions?.estimatedComplexity 
  ? `- This is a ${analysis.actionPlan.codeActions.estimatedComplexity} code generation task`
  : analysis.actionPlan.requiresExplanation 
    ? '- This is more of a discussion/explanation' 
    : '- This is a clarification conversation'}
- Requires Code: ${analysis.actionPlan.requiresCodeGeneration}
- Requires Explanation: ${analysis.actionPlan.requiresExplanation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 COMPRESSION & QUALITY BALANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORE PRINCIPLE: Maximum insight, minimum words.
Use exactly the length needed - no more, no less.

OUTPUT STYLE BY MESSAGE TYPE:

1. STATUS UPDATES (Brief but clear):
   ✅ "Analyzing your authentication requirements..."
   ❌ "I am currently in the process of analyzing the various authentication requirements that your application needs, including user login, session management, and security considerations."
   
   Guideline: Say what's happening RIGHT NOW in the clearest, briefest way

2. PROGRESS UPDATES (Action-focused):
   ✅ "Building login form with email/password validation"
   ❌ "I am now creating a comprehensive login form component that includes email and password input fields with proper validation logic."
   
   Guideline: Lead with the action verb, skip process details

3. COMPLETION SUMMARIES (Outcome + next step):
   ✅ "Done! Added secure auth system with login/signup pages. Users can now create accounts safely. Try logging in!"
   ❌ "I have successfully completed the implementation of a comprehensive authentication system that includes fully functional login and signup pages with proper security measures and validation."
   
   Guideline: Celebrate briefly, summarize WHAT was built (not how), suggest next action

4. ERROR MESSAGES (Problem + solution):
   ✅ "Database connection failed - table doesn't exist. Want me to create it?"
   ❌ "I encountered an error when attempting to establish a connection to the database. The issue appears to be related to the fact that the required table structure has not yet been created in the database schema."
   
   Guideline: State problem clearly, offer immediate solution

5. EXPLANATIONS (When explicitly requested):
   ✅ "OAuth uses tokens instead of passwords. Safer because tokens expire automatically and can't be reused. Want to add Google sign-in?"
   ❌ "OAuth is an authorization protocol that provides applications the ability to obtain limited access to user accounts on an HTTP service through the use of access tokens which provide a more secure authentication mechanism compared to traditional password-based systems."
   
   Guideline: Answer first, explain why briefly, suggest next step. Use as much length as needed to be clear, but no fluff.

COMPRESSION TECHNIQUES TO APPLY:
• Remove filler words: "currently", "in order to", "that will allow"
• Use active voice: "Building X" not "X is being built"
• Lead with action/outcome, not process
• One idea per sentence (but use as many sentences as needed)
• Prefer verbs over nouns: "analyze" not "analysis of"
• Skip obvious context user already knows

DYNAMIC LENGTH SELECTION:
Choose the appropriate length based on:

- **Information Density**: How much the user needs to know
  Simple status → Brief
  Complex proposal → Whatever length makes it clear

- **User's Likely Question**: "What's happening?" vs "How does this work?"
  Status check → Short
  Explanation request → As long as needed to explain properly

- **Context Complexity**: 
  Routine action → Minimal
  Architectural decision → Enough to convey reasoning

- **Actionability**: 
  No user action needed → Brief confirmation
  User needs to decide → Provide enough info to decide

QUALITY OVER BREVITY:
Don't sacrifice clarity for word count. If it takes 50 words to be clear and actionable, use 50 words.
If it can be clear in 5 words, use 5 words.
The goal is NOT short messages - it's EFFICIENT communication.

MESSAGING RULES:
1. Be natural and conversational - you're a helpful assistant, not a robot
2. Match the user's energy and communication style
3. Use emojis sparingly but appropriately to add warmth (max 1-2 per message)
4. For status updates: Be clear about what's happening RIGHT NOW
5. For progress: Show meaningful progress, not generic "working on it"
6. For completion: Celebrate success and summarize OUTCOME (not process)
7. For errors: Be empathetic, explain root cause briefly, suggest solution
8. For questions: Provide helpful follow-up suggestions

AVOID:
- Robotic phrases like "Processing request..." or "Task completed successfully"
- Overly technical jargon unless the user is technical
- Generic messages that could apply to anything
- False promises or uncertain claims
- Verbose descriptions of process ("I will now...", "Let me proceed to...")
- Redundant information user already knows

EXAMPLES:

Status: "Analyzing auth requirements 🔐"
Progress: "Creating secure login form..."
Completion: "Auth system ready! Users can sign up and log in securely. Test it out?"
Error: "Database table missing. Create it now?"
Explanation (when asked): "OAuth uses tokens instead of passwords. Safer because tokens expire automatically and can't be reused. Want to add Google sign-in?"

Generate messages that are: natural, concise, actionable, and contextually appropriate.`;

  }
  
  /**
   * Build context-specific prompt for current phase
   */
  private buildContextPrompt(context: CommunicationContext): string {
    let prompt = `Current phase: ${context.phase}\n`;
    prompt += `Task: ${context.taskDescription}\n`;
    
    if (context.progress !== undefined) {
      prompt += `Progress: ${context.progress}%\n`;
    }
    
    if (context.currentAction) {
      prompt += `Current action: ${context.currentAction}\n`;
    }
    
    if (context.filesAffected?.length) {
      prompt += `Files being modified: ${context.filesAffected.join(', ')}\n`;
    }
    
    if (context.errors?.length) {
      prompt += `Errors encountered: ${context.errors.join('; ')}\n`;
    }
    
    if (context.metadata) {
      prompt += `Additional context: ${JSON.stringify(context.metadata)}\n`;
    }
    
    prompt += '\nGenerate an appropriate message for the user based on this context.';
    
    return prompt;
  }
  
  /**
   * Minimal fallback when AI generation fails (should rarely happen)
   */
  private fallbackMessage(context: CommunicationContext): GeneratedMessage {
    // Minimal autonomous fallback - uses context intelligently
    const action = context.currentAction || `${context.phase} your project`;
    const emoji = context.phase === 'error' ? '⚠️' : 
                  context.phase === 'completing' ? '✅' : 
                  context.phase === 'building' ? '⚙️' : '🔄';
    
    return {
      type: context.phase === 'error' ? 'error' : 
            context.phase === 'completing' ? 'completion' : 'status',
      content: context.errors?.[0] || action,
      emoji,
      timestamp: new Date()
    };
  }
  
  /**
   * Reset conversation context (for new task)
   */
  resetContext(): void {
    this.conversationContext = [];
  }
}
