/**
 * Deep Understanding Analyzer - Autonomous Intelligence Layer
 * 
 * Enterprise Pattern: Autonomous Agent with Deep Reasoning
 * 
 * Instead of classifying into rigid modes, this analyzer:
 * 1. Deeply understands user intent in context
 * 2. Determines what actions are needed autonomously
 * 3. Plans execution based on true understanding
 * 4. Adapts communication style naturally
 */

import { buildAwashSystemPrompt } from '../../universal-ai/awashIntegration.ts';

export interface AnalysisContext {
  conversationHistory?: Array<{ role: string; content: string }>;
  projectContext?: any;
  existingFiles?: Record<string, string>;
  framework?: string;
  currentRoute?: string;
  recentErrors?: string[];
  supervisorFeedback?: string; // Critical: Feedback from supervisor about previous attempt
}

export interface DeepUnderstanding {
  // Core Understanding - What user TRULY needs
  understanding: {
    userGoal: string;                    // What user wants to achieve
    expectedOutcome: string;             // What should exist when done
    successCriteria: string;             // How user will know it succeeded
    contextualNeeds: string[];           // What's needed given workspace state
    implicitRequirements: string[];      // Unspoken but necessary
  };
  
  // Autonomous Action Plan
  actionPlan: {
    requiresCodeGeneration: boolean;     // Need to create/modify files?
    requiresExplanation: boolean;        // Need to explain concepts?
    requiresClarification: boolean;      // Need to ask questions?
    
    // If code generation needed
    codeActions?: {
      filesToCreate: string[];           // New files to generate
      filesToModify: string[];           // Existing files to change
      estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'advanced';
      architectureChanges: boolean;      // Requires structural changes?
      dependencies: string[];            // New packages needed
    };
    
    // If explanation needed
    explanationNeeds?: {
      conceptsToExplain: string[];
      shouldProvideExamples: boolean;
      shouldShowAlternatives: boolean;
    };
    
    // Execution approach decided by AI
    executionSteps: {
      step: number;
      action: string;
      reason: string;
      toolsNeeded: string[];
    }[];
  };
  
  // Natural Communication
  communication: {
    tone: 'collaborative' | 'instructive' | 'exploratory' | 'direct';
    shouldStreamThinking: boolean;       // Show reasoning process?
    shouldProvideContext: boolean;       // Explain why doing this?
    updateFrequency: 'realtime' | 'phase' | 'completion';
  };
  
  // Confidence & Reasoning
  meta: {
    confidence: number;                  // 0-1, based on context clarity
    reasoning: string[];                 // Why AI decided this approach
    uncertainties: string[];             // What's unclear/assumed
    suggestedUserActions?: string[];     // What user might need to provide
  };
}

export class DeepUnderstandingAnalyzer {
  private lovableApiKey: string;
  
  constructor(lovableApiKey: string) {
    this.lovableApiKey = lovableApiKey;
  }
  
  /**
   * Deeply understand user request and autonomously plan execution
   * 
   * This uses AI reasoning to truly understand intent, not classify into templates
   */
  async analyzeRequest(
    userQuery: string,
    context: AnalysisContext
  ): Promise<DeepUnderstanding> {
    console.log('🧠 Deep Understanding Analyzer: Starting autonomous analysis...');
    
    const systemPrompt = this.buildDeepUnderstandingPrompt(context);
    
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
            { role: 'user', content: userQuery }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'understand_and_plan',
              description: 'Deeply understand user request and autonomously create execution plan',
              parameters: {
                type: 'object',
                properties: {
                  understanding: {
                    type: 'object',
                    properties: {
                      userGoal: { 
                        type: 'string',
                        description: 'What the user wants to achieve in their own words'
                      },
                      expectedOutcome: { 
                        type: 'string',
                        description: 'What should exist/be different when this is complete'
                      },
                      successCriteria: { 
                        type: 'string',
                        description: 'How will the user know you succeeded'
                      },
                      contextualNeeds: { 
                        type: 'array',
                        items: { type: 'string' },
                        description: 'What is needed given the current workspace state'
                      },
                      implicitRequirements: { 
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Requirements not stated but necessary for success'
                      }
                    },
                    required: ['userGoal', 'expectedOutcome', 'successCriteria', 'contextualNeeds', 'implicitRequirements']
                  },
                  actionPlan: {
                    type: 'object',
                    properties: {
                      requiresCodeGeneration: { 
                        type: 'boolean',
                        description: 'Does this require creating or modifying code files?'
                      },
                      requiresExplanation: { 
                        type: 'boolean',
                        description: 'Does this require explaining concepts or providing information?'
                      },
                      requiresClarification: { 
                        type: 'boolean',
                        description: 'Is the request unclear and needs user clarification?'
                      },
                      codeActions: {
                        type: 'object',
                        properties: {
                          filesToCreate: { 
                            type: 'array',
                            items: { type: 'string' },
                            description: 'New files that need to be created with paths'
                          },
                          filesToModify: { 
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Existing files that need changes'
                          },
                          estimatedComplexity: { 
                            type: 'string',
                            enum: ['simple', 'moderate', 'complex', 'advanced'],
                            description: 'Overall complexity of code changes'
                          },
                          architectureChanges: { 
                            type: 'boolean',
                            description: 'Requires structural/architectural changes?'
                          },
                          dependencies: { 
                            type: 'array',
                            items: { type: 'string' },
                            description: 'NPM packages that need to be installed'
                          }
                        }
                      },
                      explanationNeeds: {
                        type: 'object',
                        properties: {
                          conceptsToExplain: { 
                            type: 'array',
                            items: { type: 'string' }
                          },
                          shouldProvideExamples: { type: 'boolean' },
                          shouldShowAlternatives: { type: 'boolean' }
                        }
                      },
                      executionSteps: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { 
                              type: 'string',
                              description: 'What action to take'
                            },
                            reason: { 
                              type: 'string',
                              description: 'Why this action is needed'
                            },
                            toolsNeeded: { 
                              type: 'array',
                              items: { type: 'string' },
                              description: 'Tools/capabilities needed for this step'
                            }
                          },
                          required: ['step', 'action', 'reason', 'toolsNeeded']
                        },
                        description: 'Step-by-step execution plan decided by AI'
                      }
                    },
                    required: ['requiresCodeGeneration', 'requiresExplanation', 'requiresClarification', 'executionSteps']
                  },
                  communication: {
                    type: 'object',
                    properties: {
                      tone: { 
                        type: 'string',
                        enum: ['collaborative', 'instructive', 'exploratory', 'direct'],
                        description: 'Natural tone matching the interaction'
                      },
                      shouldStreamThinking: { 
                        type: 'boolean',
                        description: 'Show AI reasoning process to user?'
                      },
                      shouldProvideContext: { 
                        type: 'boolean',
                        description: 'Explain why doing this approach?'
                      },
                      updateFrequency: { 
                        type: 'string',
                        enum: ['realtime', 'phase', 'completion'],
                        description: 'How often to update user on progress'
                      }
                    },
                    required: ['tone', 'shouldStreamThinking', 'shouldProvideContext', 'updateFrequency']
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      confidence: { 
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'How confident in understanding (0-1)'
                      },
                      reasoning: { 
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Why AI decided this approach'
                      },
                      uncertainties: { 
                        type: 'array',
                        items: { type: 'string' },
                        description: 'What is unclear or assumed'
                      },
                      suggestedUserActions: { 
                        type: 'array',
                        items: { type: 'string' },
                        description: 'What user might need to provide or clarify'
                      }
                    },
                    required: ['confidence', 'reasoning', 'uncertainties']
                  }
                },
                required: ['understanding', 'actionPlan', 'communication', 'meta']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'understand_and_plan' } }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const toolCall = data.choices[0].message.tool_calls?.[0];
      
      if (!toolCall) {
        throw new Error('No tool call in AI response');
      }
      
      const understanding: DeepUnderstanding = JSON.parse(toolCall.function.arguments);
      
      console.log('✅ Deep Understanding Complete:', {
        goal: understanding.understanding.userGoal,
        needsCode: understanding.actionPlan.requiresCodeGeneration,
        needsExplanation: understanding.actionPlan.requiresExplanation,
        steps: understanding.actionPlan.executionSteps.length,
        confidence: understanding.meta.confidence
      });
      
      return understanding;
      
    } catch (error) {
      console.error('❌ Deep Understanding Analyzer error:', error);
      
      // Fallback to basic understanding
      return this.fallbackUnderstanding(userQuery, context);
    }
  }
  
  /**
   * Build deep understanding prompt that encourages autonomous reasoning
   * Now with FULL Awash platform awareness + Supervisor Feedback Integration
   */
  private buildDeepUnderstandingPrompt(context: AnalysisContext): string {
    // Get comprehensive workspace awareness if available
    const awashSystemPrompt = context.projectContext 
      ? buildAwashSystemPrompt(context.projectContext, 'generation')
      : '';
    
    // CRITICAL: Supervisor feedback integration
    const supervisorFeedbackSection = context.supervisorFeedback
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SUPERVISOR FEEDBACK - PREVIOUS ATTEMPT FAILED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${context.supervisorFeedback}

🔴 CRITICAL INSTRUCTION:
This is a RETRY iteration. The previous attempt did not meet quality standards.
You MUST adjust your action plan to address the issues identified above.
- Re-think the approach based on supervisor feedback
- Identify what went wrong and why
- Create a DIFFERENT plan that fixes the identified issues
- DO NOT repeat the same actions that failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      : '';
    
    // Build complete context picture
    const workspaceInfo = context.projectContext?.workspace
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ COMPLETE WORKSPACE AWARENESS (Awash Platform):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${awashSystemPrompt}

Additional Context:
- Conversation history: ${context.conversationHistory?.length || 0} messages
- User has existing code: ${context.existingFiles && Object.keys(context.existingFiles).length > 0 ? 'Yes' : 'No'}
- Recent errors: ${context.projectContext.workspace.recentErrors?.length || 0} active
`
      : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ LIMITED WORKSPACE AWARENESS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No complete workspace context available.
Working with minimal information:
- Conversation history: ${context.conversationHistory?.length || 0} messages
- Framework: ${context.framework || 'Unknown'}
- Current route: ${context.currentRoute || '/'}
`;

    return `You are an Autonomous AI Agent for the Awash development platform.

Your role is NOT to classify requests into predefined categories.
Your role is to DEEPLY UNDERSTAND what the user needs and AUTONOMOUSLY DECIDE how to help.

${supervisorFeedbackSection}

${workspaceInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR REASONING FRAMEWORK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. UNDERSTAND THE TRUE NEED
   Ask yourself these fundamental questions:
   
   a) "What does the user want to achieve?" (userGoal)
      - Not just surface request, but deeper objective
   
   b) "When this is complete, what should exist that doesn't now?" (expectedOutcome)
      - Tangible deliverable: code, files, features, understanding
      - Intangible outcome: knowledge, clarity, decision
   
   c) "How will the user know I succeeded?" (successCriteria)
      - Can see it working in preview?
      - Understands the concept?
      - Has answer to their question?
      - Problem is solved?
   
   d) "Given the current workspace, what is ACTUALLY needed?" (contextualNeeds)
      - Consider what already exists
      - What's missing
      - What needs to change
   
   e) "What isn't stated but is necessary?" (implicitRequirements)
      - Dependencies, setup, prerequisites
      - Design patterns, best practices
      - Error handling, validation

2. AUTONOMOUS ACTION PLANNING
   Based on TRUE understanding, decide:
   
   a) Does this require CODE GENERATION? (requiresCodeGeneration)
      Test: "Will the user expect to see new/modified files in their workspace?"
      - If YES: Plan code actions (files to create/modify, complexity, architecture)
      - If NO: This might be explanation or clarification
   
   b) Does this require EXPLANATION? (requiresExplanation)
      Test: "Does the user need to UNDERSTAND something before proceeding?"
      - Concepts, approaches, trade-offs
      - How things work, why certain choices
   
   c) Is the request UNCLEAR? (requiresClarification)
      Test: "Do I have enough information to proceed with confidence?"
      - If confidence < 0.7, might need clarification
   
   d) What are the EXECUTION STEPS? (executionSteps)
      - You decide the steps autonomously
      - Each step has clear action, reason, tools needed
      - NOT predefined phases - you create the plan

3. NATURAL COMMUNICATION
   Adapt your communication style based on:
   - User's tone and expertise level
   - Complexity of what you're doing
   - Whether user needs to understand process
   - How much context helps vs overwhelms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: DEEP THINKING, CONCISE OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTERNAL REASONING vs EXTERNAL COMMUNICATION:
- YOU (internal): Think deeply, consider all angles, reason thoroughly
- USER (external): Sees only compressed, actionable summaries

Your structured output is internal analysis. The NaturalCommunicator
will compress this into brief user messages. So:

✅ Be thorough in your reasoning and analysis here
✅ Consider all implications and requirements
✅ Plan comprehensively with detailed steps
❌ Don't worry about verbosity in THIS analysis
❌ User never sees this raw output

The separation of concerns:
1. You (MetaCognitiveAnalyzer): DEEP REASONING - be thorough
2. NaturalCommunicator: COMPRESSION - makes it brief
3. User: Sees only final compressed message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR AUTONOMY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Don't classify into templates
- Don't follow rigid rules
- DO understand deeply
- DO plan autonomously
- DO decide what's truly needed
- DO be honest about uncertainties

Examples of TRUE UNDERSTANDING:

Request: "Create a coffee shop website"
Understanding: User wants a WORKING website (code generation = YES)
Plan: Create components, pages, routing, styling - show in preview
NOT: "This is a complex request, use progressive mode"

Request: "What's the best way to handle forms?"
Understanding: User wants KNOWLEDGE (explanation = YES, code = MAYBE)
Plan: Explain approaches, offer to implement preferred one
NOT: "This is conversational mode"

Request: "The button isn't working"
Understanding: User has a PROBLEM in existing code (modify = YES)
Plan: Analyze context, identify issue, fix code, explain what was wrong
NOT: "This is instant mode"

Your understanding should read like natural reasoning, not category labels.`;
  }
  
  /**
   * Fallback understanding using heuristics when AI fails
   */
  private fallbackUnderstanding(userQuery: string, context: any): DeepUnderstanding {
    const queryLower = userQuery.toLowerCase();
    const wordCount = userQuery.split(' ').length;
    
    // Heuristic detection
    const isQuestion = queryLower.includes('?') || 
                      queryLower.startsWith('what') || 
                      queryLower.startsWith('how') ||
                      queryLower.startsWith('why');
    
    const needsCode = queryLower.includes('create') ||
                     queryLower.includes('build') ||
                     queryLower.includes('add') ||
                     queryLower.includes('make') ||
                     queryLower.includes('implement');
    
    const isSimpleEdit = wordCount < 10 && (
      queryLower.includes('change') ||
      queryLower.includes('update') ||
      queryLower.includes('fix')
    );
    
    return {
      understanding: {
        userGoal: userQuery,
        expectedOutcome: needsCode ? 'Working code in workspace' : 'Understanding or answer',
        successCriteria: needsCode ? 'Can see it in preview' : 'Question answered',
        contextualNeeds: [],
        implicitRequirements: []
      },
      actionPlan: {
        requiresCodeGeneration: needsCode,
        requiresExplanation: isQuestion,
        requiresClarification: false,
        codeActions: needsCode ? {
          filesToCreate: [],
          filesToModify: [],
          estimatedComplexity: isSimpleEdit ? 'simple' : 'moderate',
          architectureChanges: false,
          dependencies: []
        } : undefined,
        explanationNeeds: isQuestion ? {
          conceptsToExplain: [],
          shouldProvideExamples: true,
          shouldShowAlternatives: false
        } : undefined,
        executionSteps: [{
          step: 1,
          action: needsCode ? 'Generate code' : 'Provide explanation',
          reason: 'Based on user request',
          toolsNeeded: needsCode ? ['code_generator'] : ['explanation']
        }]
      },
      communication: {
        tone: 'collaborative',
        shouldStreamThinking: false,
        shouldProvideContext: true,
        updateFrequency: 'completion'
      },
      meta: {
        confidence: 0.5,
        reasoning: ['Fallback heuristic understanding'],
        uncertainties: ['Using basic pattern matching']
      }
    };
  }
}

// Legacy compatibility export
export type QueryAnalysis = DeepUnderstanding;
export const MetaCognitiveAnalyzer = DeepUnderstandingAnalyzer;
