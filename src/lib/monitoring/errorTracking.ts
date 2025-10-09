/**
 * Error Tracking & Monitoring
 * Captures and reports errors with context
 */

interface ErrorContext {
  userId?: string;
  route?: string;
  componentStack?: string;
  additionalInfo?: Record<string, any>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors = 100;

  captureError(
    error: Error,
    severity: ErrorReport['severity'] = 'medium',
    context: ErrorContext = {}
  ): void {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        route: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
      severity,
    };

    this.errors.push(report);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error captured:', report);
    }

    // In production, send to backend
    if (!import.meta.env.DEV && severity === 'critical') {
      this.sendToBackend(report);
    }
  }

  private async sendToBackend(report: ErrorReport): Promise<void> {
    try {
      // Use Supabase SDK instead of direct fetch
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.functions.invoke('report-error', {
        body: {
          errorType: 'frontend',
          errorMessage: report.message,
          stackTrace: report.stack,
          severity: report.severity,
          metadata: {
            route: report.context.route,
            userId: report.context.userId,
            timestamp: report.timestamp,
            ...report.context.additionalInfo
          }
        }
      });
      
      if (error) {
        console.error('Error sending report:', error);
      }
    } catch (err) {
      console.error('Failed to send error report:', err);
    }
  }

  getRecentErrors(limit = 10): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorStats() {
    const bySeverity = this.errors.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errors.length,
      bySeverity,
      recent: this.errors.slice(-5),
    };
  }
}

export const errorTracker = new ErrorTracker();

// Global error handler
window.addEventListener('error', (event) => {
  errorTracker.captureError(
    new Error(event.message),
    'high',
    {
      additionalInfo: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    }
  );
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorTracker.captureError(
    new Error(event.reason?.message || 'Unhandled Promise Rejection'),
    'high',
    {
      additionalInfo: {
        reason: event.reason,
      },
    }
  );
});
