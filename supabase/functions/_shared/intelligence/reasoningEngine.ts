/**
 * Reasoning Engine - Core AI Reasoning System
 * 
 * This replaces template-based routing with FREE-FORM AI REASONING.
 * The AI receives FULL CONTEXT and decides everything:
 * - What the user wants
 * - What approach to take
 * - Which capabilities to use (if any)
 * - How to respond
 */

export interface TranscendentContext {
  projectKnowledge: ProjectKnowledge;
  relevantContext: RelevantContext;
  userRequest: string;
  capabilityArsenal: CapabilityDescription[];
  proactiveInsights: ProactiveInsights;
  conversationHistory?: any[];
  existingFiles?: Record<string, string>;
}

export interface ProjectKnowledge {
  files: Record<string, string>;
  fileCount: number;
  totalLines: number;
  components: any[];
  routes: string[];
  dependencies: string[];
  framework: string;
  hasBackend: boolean;
  hasAuth: boolean;
  storageState: {
    totalFiles: number;
    healthScore: number;
    fileTypes: Record<string, number>;
  };
}

export interface RelevantContext {
  relevantFiles: string[];
  relevantComponents: any[];
  recentErrors: any[];
  conversationSummary?: string;
}

export interface ProactiveInsights {
  security_issues: string[];
  optimization_opportunities: string[];
  code_smells: string[];
  breaking_changes: string[];
}

export interface CapabilityDescription {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AIDecision {
  thought: string;  // AI's reasoning process
  actions: AIAction[];  // What AI decided to do
  messageToUser: string;  // Natural response
  requiresConfirmation: boolean;
  confidence: number;
}

export interface AIAction {
  capability: string;  // Which capability to invoke
  parameters: Record<string, any>;  // Parameters for capability
  reasoning: string;  // Why AI chose this
}

export class ReasoningEngine {
  constructor(private lovableApiKey: string) {}

  /**
   * Core reasoning function - AI decides EVERYTHING
   */
  async reason(context: TranscendentContext): Promise<AIDecision> {
    console.log('🧠 ReasoningEngine: Starting free-form reasoning...');
    console.log(`📊 Context: ${context.projectKnowledge.fileCount} files, ${context.proactiveInsights.security_issues.length} security issues`);

    // Build comprehensive reasoning prompt
    const prompt = this.buildReasoningPrompt(context);

    // Call AI with FULL CONTEXT (no predefined strategy)
    const aiResponse = await this.callLovableAI(prompt);

    // Parse AI's decision
    const decision = this.parseAIResponse(aiResponse, context);

    console.log('✅ ReasoningEngine: AI decided:', {
      actionsCount: decision.actions.length,
      requiresConfirmation: decision.requiresConfirmation,
      confidence: decision.confidence
    });

    return decision;
  }

  /**
   * Build comprehensive reasoning prompt with FULL CONTEXT
   */
  private buildReasoningPrompt(context: TranscendentContext): string {
    const { projectKnowledge, relevantContext, userRequest, capabilityArsenal, proactiveInsights } = context;

    return `You are an AI reasoning engine with complete project knowledge and full agency.

## OMNISCIENT KNOWLEDGE (What you know about the project):

**Project Overview:**
- Framework: ${projectKnowledge.framework}
- Files: ${projectKnowledge.fileCount} (${projectKnowledge.totalLines} lines)
- Components: ${projectKnowledge.components.length}
- Has Backend: ${projectKnowledge.hasBackend}
- Has Auth: ${projectKnowledge.hasAuth}
- Storage Health: ${projectKnowledge.storageState.healthScore}/100

**Existing Files:**
${Object.keys(projectKnowledge.files).slice(0, 20).join(', ')}
${projectKnowledge.files && Object.keys(projectKnowledge.files).length > 20 ? `...and ${Object.keys(projectKnowledge.files).length - 20} more` : ''}

## PROACTIVE INSIGHTS (Issues detected BEFORE user asked):

**Security Issues:**
${proactiveInsights.security_issues.length > 0 ? proactiveInsights.security_issues.map(i => `- ${i}`).join('\n') : '- None detected'}

**Optimization Opportunities:**
${proactiveInsights.optimization_opportunities.length > 0 ? proactiveInsights.optimization_opportunities.map(i => `- ${i}`).join('\n') : '- None detected'}

**Code Smells:**
${proactiveInsights.code_smells.length > 0 ? proactiveInsights.code_smells.map(i => `- ${i}`).join('\n') : '- None detected'}

## RELEVANT CONTEXT (For this specific request):

**Relevant Files:**
${relevantContext.relevantFiles.length > 0 ? relevantContext.relevantFiles.join(', ') : 'None specifically identified'}

**Recent Errors:**
${relevantContext.recentErrors.length > 0 ? relevantContext.recentErrors.map(e => `- ${e.error_type}: ${e.error_message}`).join('\n') : '- No recent errors'}

## USER REQUEST:
"${userRequest}"

## CAPABILITY ARSENAL (Tools you can invoke):

${capabilityArsenal.map(c => `- **${c.name}**: ${c.description}`).join('\n')}

**IMPORTANT**: You can:
- Use NO capabilities (just respond naturally)
- Use ONE capability
- Use MULTIPLE capabilities together
- Combine capabilities with natural explanation

## YOUR REASONING FRAMEWORK:

1. **Understand Deeply**: What does the user ACTUALLY want?
2. **Consider Context**: What do we know about the project?
3. **Be Proactive**: Should I mention the detected issues?
4. **Decide Freely**: What's the BEST approach? (Not limited to predefined strategies)
5. **Choose Tools**: Which capabilities make sense? (Can be none, one, or many)
6. **Respond Naturally**: Explain what I'm doing and why

## OUTPUT FORMAT (Respond as JSON):

\`\`\`json
{
  "thought": "Your step-by-step reasoning about the request",
  "actions": [
    {
      "capability": "capability_name",
      "parameters": { "key": "value" },
      "reasoning": "Why I chose this capability"
    }
  ],
  "messageToUser": "Natural friendly message explaining what you're doing",
  "requiresConfirmation": false,
  "confidence": 0.85
}
\`\`\`

**CRITICAL RULES:**
- You have FULL AGENCY - no templates, no routing, pure reasoning
- Think step-by-step about what makes sense
- Be proactive: mention detected issues if relevant
- Explain your reasoning naturally
- You can refuse, ask questions, or suggest alternatives
- Actions array can be EMPTY if you just want to respond

Now reason freely and decide what to do.`;
  }

  /**
   * Call Lovable AI for reasoning
   */
  private async callLovableAI(prompt: string): Promise<any> {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an AI reasoning engine. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lovable AI error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse AI's response into structured decision
   */
  private parseAIResponse(aiResponse: string, context: TranscendentContext): AIDecision {
    try {
      // Extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        thought: parsed.thought || 'AI reasoning not provided',
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        messageToUser: parsed.messageToUser || 'I can help you with that.',
        requiresConfirmation: parsed.requiresConfirmation ?? false,
        confidence: parsed.confidence ?? 0.7
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Fallback: treat as natural response
      return {
        thought: 'Failed to parse structured response',
        actions: [],
        messageToUser: aiResponse,
        requiresConfirmation: false,
        confidence: 0.5
      };
    }
  }
}
