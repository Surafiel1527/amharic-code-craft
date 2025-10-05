import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Exponential backoff configuration
const RETRY_CONFIG = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1, // Add randomness to prevent thundering herd
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { credentialId, provider, credentials, userId } = await req.json();

    console.log(`🔄 Starting intelligent retry for credential ${credentialId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check recent retry history to avoid excessive retries
    const { data: recentRetries } = await supabase
      .from('database_connection_retries')
      .select('*')
      .eq('credential_id', credentialId)
      .gte('attempted_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('attempted_at', { ascending: false });

    const recentFailures = recentRetries?.filter(r => !r.success).length || 0;

    if (recentFailures >= 10) {
      console.log('⚠️ Too many recent failures, applying circuit breaker');
      
      await supabase
        .from('database_audit_log')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          action: 'retry',
          status: 'failure',
          details: {
            reason: 'circuit_breaker_open',
            recent_failures: recentFailures
          }
        });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Circuit breaker open: too many recent failures',
          retry_after: 3600 // Suggest retry after 1 hour
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Intelligent retry with exponential backoff
    let attemptNumber = 0;
    let lastError: string | null = null;
    let success = false;

    while (attemptNumber < RETRY_CONFIG.maxAttempts && !success) {
      attemptNumber++;
      
      const delay = calculateBackoffDelay(attemptNumber);
      
      if (attemptNumber > 1) {
        console.log(`⏳ Waiting ${delay}ms before attempt ${attemptNumber}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`🔄 Retry attempt ${attemptNumber}/${RETRY_CONFIG.maxAttempts}`);

      try {
        const startTime = Date.now();
        
        const testResponse = await fetch(`${supabaseUrl}/functions/v1/test-database-connection`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            credentials,
          }),
        });

        const responseTime = Date.now() - startTime;
        const result = await testResponse.json();

        // Record retry attempt
        await supabase
          .from('database_connection_retries')
          .insert({
            credential_id: credentialId,
            attempt_number: attemptNumber,
            success: result.success,
            error_message: result.error,
            retry_strategy: {
              backoff_type: 'exponential',
              delay_ms: delay,
              max_attempts: RETRY_CONFIG.maxAttempts
            },
            backoff_delay_ms: delay
          });

        if (result.success) {
          success = true;
          console.log(`✅ Connection successful on attempt ${attemptNumber}`);

          // Update credential status
          await supabase
            .from('database_credentials')
            .update({
              test_status: 'success',
              last_tested_at: new Date().toISOString()
            })
            .eq('id', credentialId);

          // Learn from successful retry
          await fetch(`${supabaseUrl}/functions/v1/learn-connection-knowledge`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'learn_from_success',
              data: {
                provider,
                credentials,
                connectionName: `credential-${credentialId}`,
                retriedSuccessfully: true,
                attemptsNeeded: attemptNumber
              }
            }),
          });

          // Audit log
          await supabase
            .from('database_audit_log')
            .insert({
              user_id: userId,
              credential_id: credentialId,
              action: 'retry',
              status: 'success',
              details: {
                attempts: attemptNumber,
                final_response_time_ms: responseTime,
                strategy: 'exponential_backoff'
              }
            });

          break;
        } else {
          lastError = result.error;
          console.log(`❌ Attempt ${attemptNumber} failed: ${lastError}`);

          // Analyze error to adjust strategy
          if (isTransientError(lastError)) {
            console.log('💡 Transient error detected, will retry');
          } else if (attemptNumber >= RETRY_CONFIG.maxAttempts) {
            console.log('⚠️ Non-transient error or max attempts reached');
            
            // Suggest AI analysis
            await fetch(`${supabaseUrl}/functions/v1/analyze-database-error`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                errorMessage: lastError,
                provider,
                credentials,
                credentialId
              }),
            });
          }
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Retry attempt ${attemptNumber} error:`, error);

        await supabase
          .from('database_connection_retries')
          .insert({
            credential_id: credentialId,
            attempt_number: attemptNumber,
            success: false,
            error_message: lastError,
            retry_strategy: {
              backoff_type: 'exponential',
              delay_ms: delay
            },
            backoff_delay_ms: delay
          });
      }
    }

    if (!success) {
      // Final failure - update credential and notify
      await supabase
        .from('database_credentials')
        .update({
          test_status: 'failed',
          last_tested_at: new Date().toISOString()
        })
        .eq('id', credentialId);

      await supabase
        .from('database_audit_log')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          action: 'retry',
          status: 'failure',
          details: {
            attempts: attemptNumber,
            last_error: lastError,
            strategy: 'exponential_backoff'
          }
        });
    }

    return new Response(
      JSON.stringify({
        success,
        attempts: attemptNumber,
        lastError,
        strategy: 'exponential_backoff_with_jitter'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Intelligent retry error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Retry failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateBackoffDelay(attemptNumber: number): number {
  const exponentialDelay = RETRY_CONFIG.initialDelayMs * 
    Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * RETRY_CONFIG.jitterFactor * (Math.random() - 0.5);
  
  return Math.round(cappedDelay + jitter);
}

function isTransientError(errorMessage: string | null): boolean {
  if (!errorMessage) return false;

  const transientErrors = [
    'timeout',
    'connection reset',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'network error',
    'temporarily unavailable',
    'too many connections',
    'connection pool exhausted'
  ];

  const lowerError = errorMessage.toLowerCase();
  return transientErrors.some(pattern => lowerError.includes(pattern));
}
