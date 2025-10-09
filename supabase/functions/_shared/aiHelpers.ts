/**
 * AI Integration Helpers
 * Reusable functions for calling Lovable AI with fallback support
 */

export interface AIResponse {
  content: string;
  parsed?: any;
}

export interface AICallOptions {
  systemPrompt?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call Lovable AI with automatic fallback to Gemini
 */
export async function callAIWithFallback(
  messages: any[],
  options: AICallOptions = {}
): Promise<{ data: any; modelUsed: string; wasFallback: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
    throw new Error('No AI API keys configured');
  }

  const {
    systemPrompt,
    preferredModel = 'google/gemini-2.5-flash',
    temperature = 0.7,
    maxTokens = 4000
  } = options;

  // Add system prompt if provided
  const fullMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  // Try Lovable AI first
  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: preferredModel,
          messages: fullMessages,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (response.status === 402) {
        console.warn('⚠️ Lovable AI credits depleted, falling back to Gemini API');
      } else if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Lovable AI error:', response.status, errorText);
      } else {
        const data = await response.json();
        return { data, modelUsed: preferredModel, wasFallback: false };
      }
    } catch (error) {
      console.error('❌ Lovable AI call failed:', error);
    }
  }

  // Fallback to direct Gemini API
  if (GEMINI_API_KEY) {
    console.log('🔄 Using fallback: Direct Gemini API');
    try {
      const geminiModel = 'gemini-2.0-flash-exp';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: fullMessages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            })),
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const geminiData = await response.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Convert to OpenAI format
      const data = {
        choices: [{
          message: { content, role: 'assistant' },
          finish_reason: 'stop'
        }]
      };

      return { data, modelUsed: geminiModel, wasFallback: true };
    } catch (error) {
      console.error('❌ Gemini fallback failed:', error);
      throw error;
    }
  }

  throw new Error('All AI services failed');
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
