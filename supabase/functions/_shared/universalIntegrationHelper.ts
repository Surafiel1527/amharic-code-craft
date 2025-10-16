/**
 * Universal Integration Helper
 * 
 * Provides utilities to integrate resilientDb and circuit breakers
 * into ALL edge functions with minimal code changes.
 * 
 * Usage in any edge function:
 * ```typescript
 * import { initializeEnterpriseInfrastructure } from '../_shared/universalIntegrationHelper.ts';
 * 
 * serve(async (req) => {
 *   const { supabase, resilientDb, protectedCall, performanceMonitor } = 
 *     await initializeEnterpriseInfrastructure(req);
 *   
 *   // Use resilientDb instead of supabase for database operations
 *   const result = await resilientDb.insert('table', data);
 *   
 *   // Use protectedCall for AI operations
 *   const aiResult = await protectedCall('ai-service', () => callAI());
 * });
 * ```
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createResilientDb, ResilientDbWrapper } from './resilientDbWrapper.ts';
import { protectedAICall, protectedDatabaseCall, protectedExternalAPI } from './circuitBreakerIntegration.ts';
import { createPerformanceMonitor, PerformanceMonitor } from './performanceMonitor.ts';

interface EnterpriseInfrastructure {
  supabase: SupabaseClient;
  resilientDb: ResilientDbWrapper;
  performanceMonitor: PerformanceMonitor;
  protectedCall: <T>(serviceName: string, operation: () => Promise<T>) => Promise<T>;
  protectedAI: <T>(modelName: string, operation: () => Promise<T>) => Promise<T>;
  protectedDB: <T>(operation: () => Promise<T>) => Promise<T>;
  protectedAPI: <T>(apiName: string, operation: () => Promise<T>) => Promise<T>;
}

/**
 * Initialize all enterprise infrastructure in one call
 * This should be the first thing called in every edge function
 */
export async function initializeEnterpriseInfrastructure(
  req: Request
): Promise<EnterpriseInfrastructure> {
  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Initialize resilient database wrapper
  const resilientDb = createResilientDb(supabase, lovableApiKey);

  // Initialize performance monitoring
  const performanceMonitor = createPerformanceMonitor(supabase);

  // Create protected operation helpers
  const infrastructure: EnterpriseInfrastructure = {
    supabase,
    resilientDb,
    performanceMonitor,
    
    // Generic protected call with custom service name
    protectedCall: async <T>(serviceName: string, operation: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await operation();
        performanceMonitor.recordOperation(
          serviceName,
          Date.now() - startTime,
          true,
          'direct'
        );
        return result;
      } catch (error) {
        performanceMonitor.recordOperation(
          serviceName,
          Date.now() - startTime,
          false,
          'direct'
        );
        throw error;
      }
    },

    // Protected AI call
    protectedAI: async <T>(modelName: string, operation: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await protectedAICall(modelName, operation);
        performanceMonitor.recordOperation(
          `ai-${modelName}`,
          Date.now() - startTime,
          true,
          'ai'
        );
        return result;
      } catch (error) {
        performanceMonitor.recordOperation(
          `ai-${modelName}`,
          Date.now() - startTime,
          false,
          'ai'
        );
        throw error;
      }
    },

    // Protected database call
    protectedDB: async <T>(operation: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await protectedDatabaseCall(operation);
        performanceMonitor.recordOperation(
          'database',
          Date.now() - startTime,
          true,
          'direct'
        );
        return result;
      } catch (error) {
        performanceMonitor.recordOperation(
          'database',
          Date.now() - startTime,
          false,
          'direct'
        );
        throw error;
      }
    },

    // Protected external API call
    protectedAPI: async <T>(apiName: string, operation: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await protectedExternalAPI(apiName, operation);
        performanceMonitor.recordOperation(
          `api-${apiName}`,
          Date.now() - startTime,
          true,
          'direct'
        );
        return result;
      } catch (error) {
        performanceMonitor.recordOperation(
          `api-${apiName}`,
          Date.now() - startTime,
          false,
          'direct'
        );
        throw error;
      }
    }
  };

  return infrastructure;
}

/**
 * Wrap any function with comprehensive error handling and fallbacks
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  fallback: T,
  operationName: string = 'operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`❌ [GracefulDegradation] ${operationName} failed:`, error);
    console.log(`🔄 [GracefulDegradation] Using fallback for ${operationName}`);
    return fallback;
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        console.error(`❌ [Retry] ${operationName} failed after ${maxAttempts} attempts`);
        throw lastError;
      }
      
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ [Retry] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Execute operations in parallel with graceful failure handling
 */
export async function executeInParallel<T>(
  operations: Array<() => Promise<T>>,
  operationNames: string[]
): Promise<Array<T | null>> {
  const promises = operations.map((op, index) => 
    withGracefulDegradation(op, null, operationNames[index])
  );
  
  return await Promise.all(promises);
}
