/**
 * Analytics Tracking
 * User behavior and feature usage tracking
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId: string;
}

class Analytics {
  private sessionId: string;
  private events: AnalyticsEvent[] = [];
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    if (import.meta.env.DEV) {
      console.log('Analytics:', event);
    }

    // In production, batch and send to backend
    if (!import.meta.env.DEV && this.events.length >= 10) {
      this.flush();
    }
  }

  page(pageName: string, properties?: Record<string, any>) {
    this.track('page_view', {
      page: pageName,
      ...properties,
    });
  }

  feature(featureName: string, action: string, properties?: Record<string, any>) {
    this.track('feature_used', {
      feature: featureName,
      action,
      ...properties,
    });
  }

  error(errorMessage: string, severity: string, properties?: Record<string, any>) {
    this.track('error_occurred', {
      error: errorMessage,
      severity,
      ...properties,
    });
  }

  performance(metricName: string, value: number, properties?: Record<string, any>) {
    this.track('performance_metric', {
      metric: metricName,
      value,
      ...properties,
    });
  }

  private async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // Use Supabase SDK instead of direct fetch
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.functions.invoke('analytics-aggregator', {
        body: { events: eventsToSend }
      });
      
      if (error) {
        console.error('Failed to send analytics:', error);
      }
    } catch (err) {
      console.error('Failed to send analytics:', err);
      // Re-add events if send failed
      this.events.push(...eventsToSend);
    }
  }

  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventCount: this.events.length,
      events: this.events,
    };
  }
}

export const analytics = new Analytics();

// Track page views on route changes
if (typeof window !== 'undefined') {
  let lastPath = window.location.pathname;
  
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      analytics.page(currentPath);
      lastPath = currentPath;
    }
  }, 1000);
}
