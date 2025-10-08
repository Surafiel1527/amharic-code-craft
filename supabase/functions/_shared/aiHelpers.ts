/**
 * AI Integration Helpers
 * Reusable functions for calling Lovable AI
 */

import { AI_MODEL_CONFIG } from './aiPrompts.ts';

export interface AIResponse {
  content: string;
  parsed?: any;
}

/**
 * Call Lovable AI with a system prompt and user message
 */
export async function callLovableAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<AIResponse> {
  const response = await fetch(AI_MODEL_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: AI_MODEL_CONFIG.temperature
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  return { content };
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseAIJsonResponse(content: string, fallback: any = {}): any {
  try {
    // Try to extract JSON from markdown code blocks or raw content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Call AI and parse JSON response
 */
export async function callLovableAIWithJson(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  fallback: any = {}
): Promise<any> {
  const response = await callLovableAI(apiKey, systemPrompt, userMessage);
  return parseAIJsonResponse(response.content, fallback);
}
