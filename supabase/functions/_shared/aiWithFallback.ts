/**
 * Robust AI Fallback System with 3 layers of resilience:
 * Layer 1: Lovable Gateway Primary Model (google/gemini-2.5-pro)
 * Layer 2: Lovable Gateway Backup Model (google/gemini-2.5-flash)
 * Layer 3: Direct Gemini API Emergency Fallback (gemini-2.0-flash-exp)
 */

import { createLogger, type LogContext } from './logger.ts';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  data: {
    choices: Array<{
      message: {
        role: string;
        content: string;
      };
    }>;
  };
  modelUsed: string;
  wasBackup: boolean;
  gateway: 'lovable' | 'direct-gemini-emergency';
  attempts: number;
  totalLatency: number;
}

export const PRIMARY_MODEL = "google/gemini-2.5-pro";
export const BACKUP_MODEL = "google/gemini-2.5-flash";

/**
 * Exponential backoff with jitter
 */
function calculateBackoff(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 1000; // Add up to 1s random jitter
  return exponentialDelay + jitter;
}

/**
 * Call AI with automatic 3-layer fallback system
 */
export async function callAIWithFallback(
  LOVABLE_API_KEY: string,
  messages: AIMessage[],
  options: {
    preferredModel?: string;
    temperature?: number;
    maxRetries?: number;
    enableEmergencyFallback?: boolean;
    logContext?: LogContext;
  } = {}
): Promise<AIResponse> {
  const {
    preferredModel,
    temperature = 0.7,
    maxRetries = 2,
    enableEmergencyFallback = true,
    logContext
  } = options;

  const logger = createLogger(logContext);
  
  const models = preferredModel 
    ? [preferredModel, preferredModel === PRIMARY_MODEL ? BACKUP_MODEL : PRIMARY_MODEL]
    : [PRIMARY_MODEL, BACKUP_MODEL];
  
  let lastError: Error | null = null;
  let totalAttempts = 0;
  const startTime = Date.now();

  // ============ PHASE 1 & 2: Lovable AI Gateway ============
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    const isBackup = modelIndex > 0;
    
    // Retry logic for each model
    for (let retry = 0; retry <= maxRetries; retry++) {
      totalAttempts++;
      const isRetry = retry > 0;
      
      try {
        logger.info(
          `${isBackup ? '🔄 Layer 2 (Backup)' : '🚀 Layer 1 (Primary)'} - ` +
          `Model: ${model}${isRetry ? ` (Retry ${retry}/${maxRetries})` : ''}`,
          { model, isBackup, isRetry, attempt: totalAttempts }
        );
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
          }),
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : calculateBackoff(retry);
          logger.warn('Rate limited. Waiting before retry...', { waitTime, retry });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry same model
        }

        // Handle payment required
        if (response.status === 402) {
          logger.error('Payment required - Lovable AI credits exhausted', undefined, { status: 402 });
          throw new Error('Payment required: Lovable AI credits exhausted. Add credits or use emergency fallback.');
        }

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('Lovable Gateway error', undefined, { status: response.status, errorText });
          throw new Error(`Lovable Gateway error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const totalLatency = Date.now() - startTime;
        
        logger.success(
          `SUCCESS via Lovable Gateway ${isBackup ? '(backup)' : '(primary)'}`,
          { model, totalAttempts, totalLatency, gateway: 'lovable', wasBackup: isBackup }
        );
        
        return {
          success: true,
          data,
          modelUsed: model,
          wasBackup: isBackup,
          gateway: 'lovable',
          attempts: totalAttempts,
          totalLatency
        };
      } catch (error: any) {
        lastError = error;
        logger.error(
          `Attempt ${totalAttempts} failed - ${isBackup ? 'Backup' : 'Primary'} ${model}`,
          error,
          { attempt: totalAttempts, isBackup, model }
        );
        
        // If not last retry for this model, wait and retry
        if (retry < maxRetries) {
          const backoffTime = calculateBackoff(retry);
          logger.info('Backing off before retry...', { backoffTime, retry });
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        // If not last model, move to next model
        if (modelIndex < models.length - 1) {
          logger.info('Moving to backup model...');
          break;
        }
      }
    }
  }

  // ============ PHASE 3: Emergency Direct Gemini Fallback (OPTIONAL) ============
  if (!enableEmergencyFallback) {
    const errorMsg = 
      `All Lovable Gateway attempts exhausted after ${totalAttempts} attempts.\n` +
      `Last error: ${lastError?.message}\n` +
      `Emergency fallback is disabled.`;
    logger.error('All gateway attempts exhausted', lastError, { totalAttempts });
    throw new Error(errorMsg);
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    const errorMsg = 
      `⚠️ All Lovable Gateway attempts failed after ${totalAttempts} tries.\n` +
      `Last error: ${lastError?.message}\n\n` +
      `Note: Emergency Gemini fallback is not configured (optional).\n` +
      `The system works perfectly with just Lovable AI.\n` +
      `To add emergency fallback, configure GEMINI_API_KEY in secrets.`;
    logger.warn('Emergency fallback not configured', { totalAttempts, lastError: lastError?.message });
    throw new Error(errorMsg);
  }

  logger.info('Layer 3 (Emergency) - Attempting direct Gemini API fallback...');

  // Retry logic for emergency fallback
  for (let retry = 0; retry <= maxRetries; retry++) {
    totalAttempts++;
    
    try {
      const backoffTime = calculateBackoff(retry);
      if (retry > 0) {
        logger.info('Emergency retry - waiting before attempt...', { retry, maxRetries, backoffTime });
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
      
      // Convert OpenAI-style messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      logger.info('Emergency attempt - Calling direct Gemini API...', { totalAttempts, model: 'gemini-2.0-flash-exp' });
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: temperature,
              maxOutputTokens: 8000,
            }
          })
        }
      );

      // Handle Gemini rate limiting
      if (geminiResponse.status === 429) {
        const retryAfter = geminiResponse.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : calculateBackoff(retry + 2);
        logger.warn('Gemini rate limited. Waiting before retry...', { waitTime, retry });
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        logger.error('Direct Gemini API error', undefined, { status: geminiResponse.status, errorText });
        throw new Error(`Direct Gemini API error (${geminiResponse.status}): ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!content) {
        throw new Error('Gemini API returned empty response');
      }

      const totalLatency = Date.now() - startTime;
      
      logger.success(
        'EMERGENCY SUCCESS via direct Gemini API!',
        { totalAttempts, totalLatency, gateway: 'direct-gemini-emergency' }
      );
      
      // Convert Gemini response to OpenAI-compatible format
      return {
        success: true,
        data: {
          choices: [{
            message: {
              role: 'assistant',
              content: content
            }
          }]
        },
        modelUsed: 'gemini-2.0-flash-exp',
        wasBackup: true,
        gateway: 'direct-gemini-emergency',
        attempts: totalAttempts,
        totalLatency
      };
    } catch (error: any) {
      logger.error('Emergency attempt failed', error, { totalAttempts });
      
      if (retry < maxRetries) {
        continue; // Retry emergency fallback
      }
      
      // All attempts exhausted
      const totalLatency = Date.now() - startTime;
      const finalError = 
        `🚨 CATASTROPHIC FAILURE - All ${totalAttempts} AI attempts failed across all layers!\n` +
        `Layer 1 (Lovable Primary): Failed\n` +
        `Layer 2 (Lovable Backup): Failed\n` +
        `Layer 3 (Direct Gemini Emergency): Failed\n\n` +
        `Lovable Gateway Error: ${lastError?.message}\n` +
        `Gemini Direct Error: ${error.message}\n` +
        `Total Latency: ${totalLatency}ms\n\n` +
        `Possible causes:\n` +
        `- Network connectivity issues\n` +
        `- All AI services down\n` +
        `- Invalid API keys\n` +
        `- Rate limits exceeded on all providers`;
      
      logger.error('CATASTROPHIC FAILURE - All AI layers failed', error, { 
        totalAttempts, 
        totalLatency,
        lovableError: lastError?.message,
        geminiError: error.message
      });
      throw new Error(finalError);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Unexpected error in AI fallback system');
}
