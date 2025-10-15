/**
 * Meta-Cognitive Analyzer - Universal Intelligence Layer
 * 
 * This module uses AI to analyze user queries and determine:
 * - What the user truly wants (semantic intent)
 * - How complex the task is (computational complexity)
 * - What execution strategy to use (routing decision)
 * - How to communicate progress (natural language)
 * 
 * Enterprise Pattern: Self-Aware AI Orchestration
 */

export interface QueryAnalysis {
  // Semantic Understanding
  userIntent: {
    primaryGoal: string;
    secondaryGoals: string[];
    implicitNeeds: string[];
    specificRequirements: string[];  // Added for executor compatibility
  };
  
  // Complexity Assessment
  complexity: {
    level: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    estimatedPhases: number;
    estimatedDuration: string;
    requiresPlanning: boolean;
    requiresValidation: boolean;
  };
  
  // Execution Strategy
  executionStrategy: {
    primaryApproach: 'instant' | 'progressive' | 'conversational' | 'hybrid';  // For orchestrator compatibility
    mode: 'instant' | 'progressive' | 'conversational' | 'hybrid';
    shouldThink: boolean;
    shouldPlan: boolean;
    shouldValidate: boolean;
    shouldIterate: boolean;
    maxIterations?: number;
  };
  
  // Communication Style
  communicationStyle: {
    tone: 'friendly' | 'professional' | 'technical' | 'casual';
    verbosity: 'concise' | 'detailed' | 'verbose';
    shouldExplain: boolean;
    shouldSummarize: boolean;
  };
  
  // Technical Requirements (added for executor compatibility)
  technicalRequirements: {
    framework: string;
    dependencies?: string[];
    integrations?: string[];
  };
  
  // Metadata
  confidence: number;
  reasoning: string[];
  suggestedApproach: string;
}

export class MetaCognitiveAnalyzer {
  private lovableApiKey: string;
  
  constructor(lovableApiKey: string) {
    this.lovableApiKey = lovableApiKey;
  }
  
  /**
   * Analyze user query with AI to determine execution strategy
   */
  async analyzeQuery(
    userQuery: string,
    context: {
      conversationHistory?: any[];
      projectContext?: any;
      existingFiles?: Record<string, string>;
      framework?: string;
    }
  ): Promise<QueryAnalysis> {
    console.log('🧠 Meta-Cognitive Analyzer: Starting deep analysis...');
    
    const systemPrompt = this.buildAnalysisPrompt(context);
    
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
              name: 'analyze_query',
              description: 'Analyze user query and determine execution strategy',
              parameters: {
                type: 'object',
                properties: {
                  userIntent: {
                    type: 'object',
                    properties: {
                      primaryGoal: { type: 'string' },
                      secondaryGoals: { type: 'array', items: { type: 'string' } },
                      implicitNeeds: { type: 'array', items: { type: 'string' } },
                      specificRequirements: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['primaryGoal', 'secondaryGoals', 'implicitNeeds', 'specificRequirements']
                  },
                  complexity: {
                    type: 'object',
                    properties: {
                      level: { 
                        type: 'string', 
                        enum: ['trivial', 'simple', 'moderate', 'complex', 'expert'] 
                      },
                      estimatedPhases: { type: 'number' },
                      estimatedDuration: { type: 'string' },
                      requiresPlanning: { type: 'boolean' },
                      requiresValidation: { type: 'boolean' }
                    },
                    required: ['level', 'estimatedPhases', 'estimatedDuration', 'requiresPlanning', 'requiresValidation']
                  },
                  executionStrategy: {
                    type: 'object',
                    properties: {
                      primaryApproach: { 
                        type: 'string', 
                        enum: ['instant', 'progressive', 'conversational', 'hybrid'] 
                      },
                      mode: { 
                        type: 'string', 
                        enum: ['instant', 'progressive', 'conversational', 'hybrid'] 
                      },
                      shouldThink: { type: 'boolean' },
                      shouldPlan: { type: 'boolean' },
                      shouldValidate: { type: 'boolean' },
                      shouldIterate: { type: 'boolean' },
                      maxIterations: { type: 'number' }
                    },
                    required: ['primaryApproach', 'mode', 'shouldThink', 'shouldPlan', 'shouldValidate', 'shouldIterate']
                  },
                  communicationStyle: {
                    type: 'object',
                    properties: {
                      tone: { 
                        type: 'string', 
                        enum: ['friendly', 'professional', 'technical', 'casual'] 
                      },
                      verbosity: { 
                        type: 'string', 
                        enum: ['concise', 'detailed', 'verbose'] 
                      },
                      shouldExplain: { type: 'boolean' },
                      shouldSummarize: { type: 'boolean' }
                    },
                    required: ['tone', 'verbosity', 'shouldExplain', 'shouldSummarize']
                  },
                  technicalRequirements: {
                    type: 'object',
                    properties: {
                      framework: { type: 'string' },
                      dependencies: { type: 'array', items: { type: 'string' } },
                      integrations: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['framework']
                  },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  reasoning: { type: 'array', items: { type: 'string' } },
                  suggestedApproach: { type: 'string' }
                },
                required: ['userIntent', 'complexity', 'executionStrategy', 'communicationStyle', 'technicalRequirements', 'confidence', 'reasoning', 'suggestedApproach']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'analyze_query' } }
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
      
      const analysis: QueryAnalysis = JSON.parse(toolCall.function.arguments);
      
      // Ensure primaryApproach and mode are synced
      if (!analysis.executionStrategy.primaryApproach) {
        analysis.executionStrategy.primaryApproach = analysis.executionStrategy.mode;
      }
      if (!analysis.executionStrategy.mode) {
        analysis.executionStrategy.mode = analysis.executionStrategy.primaryApproach;
      }
      
      console.log('✅ Meta-Cognitive Analysis Complete:', {
        intent: analysis.userIntent.primaryGoal,
        complexity: analysis.complexity.level,
        mode: analysis.executionStrategy.mode,
        confidence: analysis.confidence
      });
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Meta-Cognitive Analyzer error:', error);
      
      // Fallback to heuristic analysis
      return this.fallbackAnalysis(userQuery, context);
    }
  }
  
  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(context: any): string {
    return `You are a Meta-Cognitive Analyzer for an AI-powered development platform.

Your role is to deeply understand user queries and determine the optimal execution strategy.

CONTEXT:
- Framework: ${context.framework || 'Unknown'}
- Has existing project: ${context.existingFiles ? 'Yes' : 'No'}
- Conversation history: ${context.conversationHistory?.length || 0} messages

ANALYSIS GUIDELINES:

1. USER INTENT - What does the user TRULY want?
   - Primary goal (the main objective)
   - Secondary goals (implied or related needs)
   - Implicit needs (things not stated but needed)

2. COMPLEXITY ASSESSMENT:
   - Trivial: Single word/color change, typo fix
   - Simple: Add/remove small feature, style tweak
   - Moderate: Multiple file changes, new component
   - Complex: Architecture changes, new feature with multiple components
   - Expert: Full system refactor, complex integrations

3. EXECUTION STRATEGY:
   - instant: Direct execution, no planning needed
   - progressive: Multi-phase build with validation
   - conversational: Discussion only, no code
   - hybrid: Explain + implement

4. COGNITIVE NEEDS:
   - shouldThink: Complex problems requiring reasoning
   - shouldPlan: Multi-step tasks needing coordination
   - shouldValidate: Critical changes needing verification
   - shouldIterate: Likely to need refinement

5. COMMUNICATION STYLE:
   - Match user's tone (friendly, professional, technical, casual)
   - Adjust verbosity based on query complexity
   - Explain when teaching, summarize when executing

IMPORTANT:
- Be honest about complexity - don't oversimplify
- Choose execution mode that matches task nature
- High confidence (>0.8) only for clear, simple queries
- Provide detailed reasoning for your decisions

Analyze the user's query and return a comprehensive strategy.`;
  }
  
  /**
   * Fallback analysis using heuristics when AI fails
   */
  private fallbackAnalysis(userQuery: string, context: any): QueryAnalysis {
    const queryLower = userQuery.toLowerCase();
    const wordCount = userQuery.split(' ').length;
    
    // Heuristic detection
    const isQuestion = queryLower.includes('?') || 
                      queryLower.startsWith('what') || 
                      queryLower.startsWith('how') ||
                      queryLower.startsWith('why');
    
    const isSimpleEdit = wordCount < 10 && (
      queryLower.includes('change') ||
      queryLower.includes('update') ||
      queryLower.includes('fix')
    );
    
    const isComplexFeature = wordCount > 20 || (
      queryLower.includes('add') && queryLower.includes('feature')
    );
    
    return {
      userIntent: {
        primaryGoal: isQuestion ? 'Get information' : 'Modify project',
        secondaryGoals: [],
        implicitNeeds: [],
        specificRequirements: []
      },
      complexity: {
        level: isComplexFeature ? 'complex' : isSimpleEdit ? 'simple' : 'moderate',
        estimatedPhases: isComplexFeature ? 3 : 1,
        estimatedDuration: isComplexFeature ? '2-3 minutes' : '30 seconds',
        requiresPlanning: isComplexFeature,
        requiresValidation: isComplexFeature
      },
      executionStrategy: {
        primaryApproach: isQuestion ? 'conversational' : isComplexFeature ? 'progressive' : 'instant',
        mode: isQuestion ? 'conversational' : isComplexFeature ? 'progressive' : 'instant',
        shouldThink: isComplexFeature,
        shouldPlan: isComplexFeature,
        shouldValidate: isComplexFeature,
        shouldIterate: false
      },
      communicationStyle: {
        tone: 'professional',
        verbosity: 'concise',
        shouldExplain: isQuestion,
        shouldSummarize: !isQuestion
      },
      technicalRequirements: {
        framework: context.framework || 'react',
        dependencies: [],
        integrations: []
      },
      confidence: 0.6,
      reasoning: ['Fallback heuristic analysis'],
      suggestedApproach: 'Using rule-based detection'
    };
  }
}
