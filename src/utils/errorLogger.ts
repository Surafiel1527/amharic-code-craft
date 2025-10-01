import { supabase } from "@/integrations/supabase/client";

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorSource = 'frontend' | 'database' | 'api' | 'authentication' | 'network';

interface LogErrorParams {
  errorType: string;
  errorMessage: string;
  source: ErrorSource;
  severity?: ErrorSeverity;
  filePath?: string;
  functionName?: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

/**
 * Log error to self-healing system with detailed context
 * Automatically reports errors to the auto-fix engine
 */
export const logError = async (params: LogErrorParams): Promise<void> => {
  const {
    errorType,
    errorMessage,
    source,
    severity = 'medium',
    filePath,
    functionName,
    stackTrace,
    context = {}
  } = params;

  // Log to console with emoji for easy identification
  const emoji = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '🚨'
  }[severity];

  console.error(`${emoji} [${severity.toUpperCase()}] ${errorType}:`, {
    message: errorMessage,
    source,
    file: filePath,
    function: functionName,
    context
  });

  // Report to self-healing system (non-blocking)
  try {
    await supabase.functions.invoke('report-error', {
      body: {
        errorType,
        errorMessage,
        source,
        severity,
        filePath,
        functionName,
        stackTrace,
        context: {
          ...context,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      }
    });
  } catch (reportError) {
    // Silently fail - don't throw errors while reporting errors
    console.error('Failed to report error to self-healing system:', reportError);
  }
};

/**
 * Wrap async functions with automatic error logging
 */
export const withErrorLogging = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  metadata: {
    filePath: string;
    functionName: string;
    source: ErrorSource;
    severity?: ErrorSeverity;
  }
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await logError({
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        ...metadata,
        context: {
          functionArgs: args.map((arg, i) => ({
            index: i,
            type: typeof arg,
            value: typeof arg === 'object' ? '[Object]' : String(arg)
          }))
        }
      });
      throw error;
    }
  }) as T;
};

/**
 * Log successful operations for monitoring (info level)
 */
export const logSuccess = (operation: string, context?: Record<string, any>): void => {
  console.log(`✅ ${operation}`, context);
};

/**
 * Log warnings that don't require error reporting
 */
export const logWarning = (message: string, context?: Record<string, any>): void => {
  console.warn(`⚠️ ${message}`, context);
};

/**
 * Log info for debugging
 */
export const logInfo = (message: string, context?: Record<string, any>): void => {
  console.log(`ℹ️ ${message}`, context);
};