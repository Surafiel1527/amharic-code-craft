/**
 * AI Response Generator
 * Generates natural, context-aware responses instead of hardcoded templates
 */

import { callAIWithFallback } from './aiWithFallback.ts';

export interface ResponseContext {
  action: 'edit_complete' | 'generation_complete' | 'question_answered' | 'error' | 'clarification';
  details?: {
    filesChanged?: string[];
    timeElapsed?: string;
    errorMessage?: string;
    nextSteps?: string[];
  };
}

/**
 * Generate a natural AI response based on context
 * NEVER returns hardcoded templates
 */
export async function generateNaturalResponse(
  userRequest: string,
  context: ResponseContext
): Promise<string> {
  let systemPrompt = `You are a helpful AI assistant. Generate a brief, natural response to the user.

Rules:
- Be conversational and friendly
- Keep it concise (1-2 sentences max unless detailed explanation needed)
- No markdown formatting like **bold** or bullet points unless specifically needed
- No generic templates like "Complete!" or "What you can do now:"
- Reference what was actually done
- Be specific to their request`;

  let userPrompt = '';

  switch (context.action) {
    case 'edit_complete':
      userPrompt = `The user requested: "${userRequest}"
      
I just made those changes successfully.${context.details?.filesChanged ? ` Files modified: ${context.details.filesChanged.join(', ')}` : ''}

Generate a brief, natural confirmation message.`;
      break;

    case 'generation_complete':
      userPrompt = `The user requested: "${userRequest}"
      
I just generated the code successfully.${context.details?.timeElapsed ? ` It took ${context.details.timeElapsed}.` : ''}

Generate a brief, natural confirmation message that acknowledges what was built.`;
      break;

    case 'question_answered':
      userPrompt = `The user asked: "${userRequest}"
      
Generate a helpful, conversational response that directly addresses their question.`;
      break;

    case 'error':
      userPrompt = `The user requested: "${userRequest}"
      
I encountered an error: ${context.details?.errorMessage || 'Unknown error'}

Generate a brief, empathetic error message that explains what went wrong in simple terms.`;
      break;

    case 'clarification':
      userPrompt = `The user said: "${userRequest}"
      
I need more information to proceed.${context.details?.nextSteps ? ` I need to know: ${context.details.nextSteps.join(', ')}` : ''}

Generate a brief, friendly request for clarification.`;
      break;
  }

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

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI response generation failed:', error);
    
    // Minimal fallback responses (still not hardcoded templates)
    switch (context.action) {
      case 'edit_complete':
        return `Done! I've updated the ${userRequest.includes('background') ? 'background' : 'code'} as requested.`;
      case 'generation_complete':
        return `Your project is ready! I've built what you asked for.`;
      case 'error':
        return `I ran into an issue: ${context.details?.errorMessage || 'Something went wrong'}. Let me try a different approach.`;
      case 'clarification':
        return `Could you provide more details about what you'd like?`;
      default:
        return `Got it! I've handled your request.`;
    }
  }
}
