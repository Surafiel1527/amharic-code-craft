/**
 * EDGE FUNCTION ERROR CAPTURE MIDDLEWARE
 * 
 * Automatically captures and logs all edge function errors to detected_errors table
 * 
 * Usage:
 * ```typescript
 * import { withErrorCapture } from '../_shared/errorCaptureMiddleware.ts';
 * 
 * serve(withErrorCapture(async (req) => {
 *   // Your handler code
 * }));
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ErrorCaptureOptions {
  functionName: string;
  supabase: SupabaseClient;
  capturePerformance?: boolean;
}

export function withErrorCapture(
  handler: (req: Request) => Promise<Response>,
  options: ErrorCaptureOptions
) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    
    try {
      const response = await handler(req);
      const duration = Date.now() - startTime;

      // Log slow operations
      if (options.capturePerformance && duration > 5000) {
        await logError(options.supabase, {
          error_type: 'edge_function_slow',
          error_message: `Function ${options.functionName} took ${duration}ms`,
          severity: 'medium',
          function_name: options.functionName,
          context: {
            duration_ms: duration,
            method: req.method,
            url: req.url,
          },
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the error
      await logError(options.supabase, {
        error_type: 'edge_function_error',
        error_message: error instanceof Error ? error.message : String(error),
        severity: 'critical',
        stack_trace: error instanceof Error ? error.stack : undefined,
        function_name: options.functionName,
        context: {
          duration_ms: duration,
          method: req.method,
          url: req.url,
          timestamp: new Date().toISOString(),
        },
      });

      // Re-throw the error
      throw error;
    }
  };
}

async function logError(supabase: SupabaseClient, errorData: any) {
  try {
    await supabase.from('detected_errors').insert({
      ...errorData,
      created_at: new Date().toISOString(),
      status: 'new',
    });
    console.log('[ErrorCapture] Logged error:', errorData.error_type);
  } catch (e) {
    console.error('[ErrorCapture] Failed to log error:', e);
  }
}
