/**
 * Circuit Breaker Integration
 * 
 * Wraps critical operations with circuit breaker protection
 */

import { CircuitBreaker } from './circuitBreaker.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Wrap AI generation calls with circuit breaker
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  operation: () => Promise<T>,
  config?: {
    failureThreshold?: number;
    timeout?: number;
    resetTimeout?: number;
  }
): Promise<T> {
  return CircuitBreaker.wrap(
    serviceName,
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    operation,
    config
  );
}

/**
 * Wrap AI model calls with circuit breaker
 */
export async function protectedAICall<T>(
  modelName: string,
  operation: () => Promise<T>
): Promise<T> {
  return withCircuitBreaker(
    `ai-model-${modelName}`,
    operation,
    {
      failureThreshold: 3, // Open circuit after 3 failures for AI calls
      timeout: 60000, // 60 seconds for AI calls
      resetTimeout: 60000 // Try again after 1 minute
    }
  );
}

/**
 * Wrap database operations with circuit breaker
 */
export async function protectedDatabaseCall<T>(
  operation: () => Promise<T>,
  serviceName: string = 'database'
): Promise<T> {
  return withCircuitBreaker(
    serviceName,
    operation,
    {
      failureThreshold: 5,
      timeout: 10000, // 10 seconds for DB calls
      resetTimeout: 30000 // Try again after 30 seconds
    }
  );
}

/**
 * Wrap code validation with circuit breaker
 */
export async function protectedValidation<T>(
  operation: () => Promise<T>
): Promise<T> {
  return withCircuitBreaker(
    'code-validation',
    operation,
    {
      failureThreshold: 10, // Higher threshold for validation
      timeout: 30000, // 30 seconds
      resetTimeout: 60000
    }
  );
}

/**
 * Wrap external API calls with circuit breaker
 */
export async function protectedExternalAPI<T>(
  apiName: string,
  operation: () => Promise<T>
): Promise<T> {
  return withCircuitBreaker(
    `external-api-${apiName}`,
    operation,
    {
      failureThreshold: 3,
      timeout: 30000,
      resetTimeout: 120000 // Wait longer for external APIs (2 minutes)
    }
  );
}
