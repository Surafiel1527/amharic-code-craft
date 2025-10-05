/**
 * Robust AI Fallback System with 3 layers of resilience:
 * Layer 1: Lovable Gateway Primary Model (google/gemini-2.5-pro)
 * Layer 2: Lovable Gateway Backup Model (google/gemini-2.5-flash)
 * Layer 3: Direct Gemini API Emergency Fallback (gemini-2.0-flash-exp)
 */

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
  } = {}
): Promise<AIResponse> {
  const {
    preferredModel,
    temperature = 0.7,
    maxRetries = 2,
    enableEmergencyFallback = true
  } = options;

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
        console.log(
          `${isBackup ? '🔄 Layer 2 (Backup)' : '🚀 Layer 1 (Primary)'} - ` +
          `Model: ${model}${isRetry ? ` (Retry ${retry}/${maxRetries})` : ''}`
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
          console.warn(`⚠️ Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry same model
        }

        // Handle payment required
        if (response.status === 402) {
          console.error('💳 Payment required - Lovable AI credits exhausted');
          throw new Error('Payment required: Lovable AI credits exhausted. Add credits or use emergency fallback.');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Lovable Gateway error (${response.status}): ${errorText}`);
          throw new Error(`Lovable Gateway error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const totalLatency = Date.now() - startTime;
        
        console.log(
          `✅ SUCCESS via Lovable Gateway ${isBackup ? '(backup)' : '(primary)'} - ` +
          `Model: ${model}, Attempts: ${totalAttempts}, Latency: ${totalLatency}ms`
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
        console.error(
          `❌ Attempt ${totalAttempts} failed - ${isBackup ? 'Backup' : 'Primary'} ${model}: ${error.message}`
        );
        
        // If not last retry for this model, wait and retry
        if (retry < maxRetries) {
          const backoffTime = calculateBackoff(retry);
          console.log(`⏳ Backing off ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        // If not last model, move to next model
        if (modelIndex < models.length - 1) {
          console.log(`⏭️ Moving to backup model...`);
          break;
        }
      }
    }
  }

  // ============ PHASE 3: Emergency Direct Gemini Fallback ============
  if (!enableEmergencyFallback) {
    throw new Error(
      `All Lovable Gateway attempts exhausted after ${totalAttempts} attempts. ` +
      `Last error: ${lastError?.message}. Emergency fallback disabled.`
    );
  }

  console.log('🆘 Layer 3 (Emergency) - All Lovable Gateway attempts failed. Activating direct Gemini API fallback...');
  
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    const errorMsg = 
      `⚠️ CRITICAL: All AI layers failed!\n` +
      `Lovable Gateway: ${lastError?.message}\n` +
      `Emergency Fallback: GEMINI_API_KEY not configured.\n` +
      `Total attempts: ${totalAttempts}\n\n` +
      `To enable emergency fallback, add GEMINI_API_KEY in your secrets.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Retry logic for emergency fallback
  for (let retry = 0; retry <= maxRetries; retry++) {
    totalAttempts++;
    
    try {
      const backoffTime = calculateBackoff(retry);
      if (retry > 0) {
        console.log(`⏳ Emergency retry ${retry}/${maxRetries} - waiting ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
      
      // Convert OpenAI-style messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      console.log(`🔧 Emergency attempt ${totalAttempts} - Calling direct Gemini API (gemini-2.0-flash-exp)...`);
      
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
        console.warn(`⚠️ Gemini rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`❌ Direct Gemini API error (${geminiResponse.status}): ${errorText}`);
        throw new Error(`Direct Gemini API error (${geminiResponse.status}): ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!content) {
        throw new Error('Gemini API returned empty response');
      }

      const totalLatency = Date.now() - startTime;
      
      console.log(
        `🎉 EMERGENCY SUCCESS via direct Gemini API! ` +
        `Attempts: ${totalAttempts}, Latency: ${totalLatency}ms`
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
      console.error(`❌ Emergency attempt ${totalAttempts} failed: ${error.message}`);
      
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
      
      console.error(finalError);
      throw new Error(finalError);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Unexpected error in AI fallback system');
}
