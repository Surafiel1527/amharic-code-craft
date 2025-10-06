import * as Sentry from "@sentry/react";

// Initialize Sentry for enterprise-grade error tracking
export const initErrorTracking = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN || "", // Add to env when ready
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        // Filter out non-critical errors
        if (event.level === 'info' || event.level === 'debug') {
          return null;
        }
        return event;
      },
    });
  }
};

// Track custom errors
export const trackError = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      contexts: { custom: context },
    });
  } else {
    console.error('[Error Tracking]:', error, context);
  }
};

// Track custom events
export const trackEvent = (eventName: string, data?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(eventName, {
      level: 'info',
      contexts: { custom: data },
    });
  }
};

// Set user context
export const setUserContext = (userId: string, email?: string) => {
  if (import.meta.env.PROD) {
    Sentry.setUser({ id: userId, email });
  }
};

// Clear user context on logout
export const clearUserContext = () => {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
};

// Performance monitoring - Using Sentry's browser tracing
export const startPerformanceSpan = (name: string, op: string) => {
  if (import.meta.env.PROD) {
    const span = Sentry.startSpan({ name, op }, (span) => span);
    return span;
  }
  return null;
};

export const finishPerformanceSpan = (span: any) => {
  if (span && import.meta.env.PROD) {
    span.end();
  }
};
