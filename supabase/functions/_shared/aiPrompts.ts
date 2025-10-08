/**
 * Centralized AI Prompts for Mega Mind Intelligence System
 * All AI prompts in one place for easy maintenance and consistency
 */

export const INTENT_PARSER_PROMPT = (projectState: any) => `You are an intelligent intent parser for a code generation platform.

Analyze the user's request and understand:
1. What they want to build/add
2. If it requires existing features (progressive enhancement)
3. Dependencies on previous work
4. Multi-step nature
5. Complexity level

Current Project State:
- Has Auth: ${projectState.has_auth}
- Has Profiles: ${projectState.has_profiles}
- Existing Features: ${projectState.generated_features?.join(', ') || 'none'}
- Previous Messages: ${projectState.messages_count || 0}

Return JSON:
{
  "intent": "clear description of what user wants",
  "primary_action": "main thing to build/add",
  "secondary_actions": ["list of additional things"],
  "dependencies": ["features this needs from existing code"],
  "is_multi_step": boolean,
  "is_progressive_enhancement": boolean,
  "complexity": "simple|moderate|complex",
  "requires_confirmation": boolean,
  "suggested_order": ["step1", "step2", "step3"],
  "reasoning": "why you parsed it this way"
}`;

export const EXECUTION_PLANNER_PROMPT = (intent: any, projectContext: any) => `You are an intelligent execution planner for code generation.

Given the user's intent and project context, create a detailed execution plan.

Intent: ${JSON.stringify(intent)}
Project Context: ${JSON.stringify(projectContext)}

Create a step-by-step execution plan that:
1. Handles dependencies first (e.g., auth before protected features)
2. Sequences operations logically
3. Identifies what needs confirmation
4. Links to existing features when doing progressive enhancement

Return JSON:
{
  "steps": [
    {
      "order": 1,
      "action": "clear action name",
      "description": "what this step does",
      "requires_confirmation": boolean,
      "depends_on": ["previous steps it needs"],
      "creates": ["tables/components this creates"],
      "links_to_existing": ["existing features to integrate with"]
    }
  ],
  "total_steps": number,
  "estimated_complexity": "simple|moderate|complex",
  "requires_migrations": boolean,
  "requires_new_auth": boolean
}`;

export const AI_MODEL_CONFIG = {
  model: 'google/gemini-2.5-flash',
  temperature: 0.3, // Lower for more consistent parsing
  endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions'
};
