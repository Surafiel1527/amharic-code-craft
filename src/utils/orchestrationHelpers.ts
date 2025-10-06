/**
 * Enterprise Orchestration Helpers
 * 
 * Provides robust utilities for mega-mind orchestration including:
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Progress persistence
 * - Error recovery
 */

import { supabase } from "@/integrations/supabase/client";

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeout?: number;
}

export interface OrchestrationProgress {
  jobId: string;
  progress: number;
  currentStep: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  outputData?: any;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    timeout: 300000 // 5 minutes default
  }
): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Add timeout to the function call
      const result = await withTimeout(fn(), options.timeout);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on specific errors
      if (
        lastError.message.includes('429') || // Rate limit
        lastError.message.includes('402') || // Payment required
        lastError.message.includes('cancelled') // User cancelled
      ) {
        throw lastError;
      }

      // If this was the last attempt, throw the error
      if (attempt === options.maxRetries) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      console.log(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms`);
      await sleep(delay);
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Add timeout to a promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) return promise;

  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save orchestration progress to database for persistence
 */
export async function saveProgress(
  userId: string,
  data: {
    currentRequest?: string;
    jobId?: string;
    progress?: number;
    currentStep?: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_orchestration_state' as any)
      .upsert({
        user_id: userId,
        last_request: data.currentRequest || null,
        current_job_id: data.jobId || null,
        progress: data.progress || 0,
        current_step: data.currentStep || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save progress:', error);
    // Don't throw - progress saving is not critical
  }
}

/**
 * Load last orchestration progress from database
 */
export async function loadProgress(userId: string): Promise<OrchestrationProgress | null> {
  try {
    const { data, error } = await supabase
      .from('user_orchestration_state' as any)
      .select('current_job_id, progress, current_step')
      .eq('user_id', userId)
      .single();

    if (error || !data || !(data as any).current_job_id) return null;

    const stateData = data as any;

    // Fetch the actual job to get latest status
    const { data: job, error: jobError } = await supabase
      .from('ai_generation_jobs')
      .select('id, status, progress, current_step, error_message, output_data')
      .eq('id', stateData.current_job_id)
      .single();

    if (jobError || !job) return null;

    return {
      jobId: job.id,
      progress: job.progress || 0,
      currentStep: job.current_step || 'Processing...',
      status: job.status as 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
      error: job.error_message || undefined,
      outputData: job.output_data as any
    };
  } catch (error) {
    console.error('Failed to load progress:', error);
    return null;
  }
}

/**
 * Validate orchestration request
 */
export function validateRequest(request: string): { valid: boolean; error?: string } {
  if (!request || typeof request !== 'string') {
    return { valid: false, error: 'Request must be a non-empty string' };
  }

  if (request.trim().length === 0) {
    return { valid: false, error: 'Request cannot be empty' };
  }

  if (request.length > 10000) {
    return { valid: false, error: 'Request is too long (max 10,000 characters)' };
  }

  // Check for malicious content patterns
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(request)) {
      return { valid: false, error: 'Request contains potentially malicious content' };
    }
  }

  return { valid: true };
}

/**
 * Calculate estimated time remaining
 */
export function estimateTimeRemaining(
  startTime: number,
  currentProgress: number
): { minutes: number; seconds: number } | null {
  if (currentProgress <= 0 || currentProgress >= 100) return null;

  const elapsedMs = Date.now() - startTime;
  const estimatedTotalMs = (elapsedMs / currentProgress) * 100;
  const remainingMs = estimatedTotalMs - elapsedMs;

  return {
    minutes: Math.floor(remainingMs / 60000),
    seconds: Math.floor((remainingMs % 60000) / 1000)
  };
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  const errorMessage = error.message || String(error);

  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    '429': 'Too many requests. Please wait a moment before trying again.',
    '402': 'Credits required. Please add credits to your workspace to continue.',
    'timeout': 'The operation took too long. Try breaking your request into smaller parts.',
    'network': 'Network error. Please check your internet connection and try again.',
    'not found': 'The requested resource was not found.',
    'unauthorized': 'You need to be logged in to perform this action.',
    'forbidden': 'You don\'t have permission to perform this action.'
  };

  for (const [key, message] of Object.entries(errorMappings)) {
    if (errorMessage.toLowerCase().includes(key)) {
      return message;
    }
  }

  return errorMessage;
}

/**
 * Log orchestration metrics
 */
export async function logMetrics(
  userId: string,
  metrics: {
    operation: string;
    duration: number;
    success: boolean;
    errorType?: string;
    metadata?: any;
  }
): Promise<void> {
  try {
    await supabase.from('orchestration_metrics' as any).insert({
      user_id: userId,
      operation: metrics.operation,
      duration_ms: metrics.duration,
      success: metrics.success,
      error_type: metrics.errorType || null,
      metadata: metrics.metadata || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log metrics:', error);
    // Don't throw - metrics logging is not critical
  }
}
