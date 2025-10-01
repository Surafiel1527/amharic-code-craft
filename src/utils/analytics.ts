// Simple analytics utility for tracking user actions
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${event}`, properties);
      return;
    }
    
    // In production, you could integrate with analytics services
    // like Google Analytics, Mixpanel, Amplitude, etc.
    try {
      // Example: window.gtag?.('event', event, properties);
      console.log(`[Analytics] ${event}`, properties);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  },
  
  page: (pageName: string, properties?: Record<string, any>) => {
    analytics.track('page_view', { page: pageName, ...properties });
  },
  
  error: (errorMessage: string, errorStack?: string) => {
    analytics.track('error', { message: errorMessage, stack: errorStack });
  },
};