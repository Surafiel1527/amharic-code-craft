import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ErrorReport {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  source: 'frontend' | 'edge_function' | 'database';
  filePath?: string;
  lineNumber?: number;
  context?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const useErrorMonitor = () => {
  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      reportError({
        errorType: event.error?.name || 'Error',
        errorMessage: event.message,
        stackTrace: event.error?.stack,
        source: 'frontend',
        filePath: event.filename,
        lineNumber: event.lineno,
        severity: 'high',
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    };

    // Unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      reportError({
        errorType: 'UnhandledRejection',
        errorMessage: event.reason?.message || String(event.reason),
        stackTrace: event.reason?.stack,
        source: 'frontend',
        severity: 'high',
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const reportError = async (errorData: ErrorReport) => {
    try {
      // Don't report in development if it's a minor error
      if (import.meta.env.DEV && errorData.severity === 'low') {
        logger.warn('Error detected but not reported in dev', errorData);
        return;
      }

      const { error } = await supabase.functions.invoke('unified-monitoring', {
        body: { operation: 'track-error', ...errorData }
      });

      if (error) {
        logger.error('Failed to report error', error);
      } else {
        logger.info('Error reported to auto-fix system');
      }
    } catch (err) {
      logger.error('Error reporting failed', err);
    }
  };

  return { reportError };
};
