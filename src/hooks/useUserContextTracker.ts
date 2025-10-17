/**
 * USER CONTEXT TRACKER
 * 
 * Captures comprehensive user-specific context beyond basic error logging.
 * Tracks session behavior, preferences, and patterns to enable intelligent decisions.
 * 
 * This solves the "User-Specific Context" limitation.
 * 
 * Captures:
 * - Session behavior (clicks, navigation, time spent)
 * - Feature usage patterns
 * - User preferences (inferred from actions)
 * - Business logic understanding (from code patterns)
 * - Success/failure patterns
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserBehavior {
  sessionId: string;
  userId?: string;
  actions: UserAction[];
  preferences: UserPreferences;
  businessContext: BusinessContext;
}

interface UserAction {
  type: 'click' | 'navigation' | 'input' | 'error' | 'success' | 'scroll';
  target: string;
  timestamp: number;
  metadata?: any;
}

interface UserPreferences {
  preferredTheme?: 'light' | 'dark';
  preferredLanguage?: string;
  featureUsageFrequency: Record<string, number>;
  abandonedFeatures: string[];
  successfulPatterns: string[];
  errorProneAreas: string[];
}

interface BusinessContext {
  userRole?: string;
  currentWorkflow?: string;
  recentGoals: string[];
  blockers: string[];
  successMetrics: {
    tasksCompleted: number;
    errorsEncountered: number;
    timeToSuccess: number[];
  };
}

class UserContextCapture {
  private sessionId: string;
  private userId?: string;
  private behavior: UserBehavior;
  private actionBuffer: UserAction[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.behavior = {
      sessionId: this.sessionId,
      actions: [],
      preferences: {
        featureUsageFrequency: {},
        abandonedFeatures: [],
        successfulPatterns: [],
        errorProneAreas: []
      },
      businessContext: {
        recentGoals: [],
        blockers: [],
        successMetrics: {
          tasksCompleted: 0,
          errorsEncountered: 0,
          timeToSuccess: []
        }
      }
    };
  }

  async initialize() {
    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      this.userId = user.id;
      this.behavior.userId = user.id;
      await this.loadUserPreferences();
    }

    this.setupBehaviorTracking();
    this.startFlushInterval();
  }

  /**
   * Track all user interactions
   */
  private setupBehaviorTracking() {
    // Track clicks
    document.addEventListener('click', (e) => {
      const target = this.getElementDescriptor(e.target as HTMLElement);
      this.captureAction({
        type: 'click',
        target,
        timestamp: Date.now(),
        metadata: {
          x: (e as MouseEvent).clientX,
          y: (e as MouseEvent).clientY
        }
      });
    });

    // Track navigation
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      this.captureAction({
        type: 'navigation',
        target: args[2] as string || window.location.pathname,
        timestamp: Date.now()
      });
      return originalPushState.apply(history, args);
    };

    // Track input patterns
    document.addEventListener('input', (e) => {
      const target = this.getElementDescriptor(e.target as HTMLElement);
      this.captureAction({
        type: 'input',
        target,
        timestamp: Date.now(),
        metadata: {
          inputType: (e.target as HTMLInputElement).type,
          hasValue: !!(e.target as HTMLInputElement).value
        }
      });
    });

    // Track scroll behavior
    let scrollTimeout: number;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.captureAction({
          type: 'scroll',
          target: window.location.pathname,
          timestamp: Date.now(),
          metadata: {
            scrollY: window.scrollY,
            scrollPercentage: (window.scrollY / document.body.scrollHeight) * 100
          }
        });
      }, 500);
    });

    // Track errors (from error boundary or console)
    window.addEventListener('error', (event) => {
      this.captureAction({
        type: 'error',
        target: event.filename || window.location.pathname,
        timestamp: Date.now(),
        metadata: {
          message: event.message,
          lineno: event.lineno,
          colno: event.colno
        }
      });

      // Update error-prone areas
      const area = window.location.pathname;
      if (!this.behavior.preferences.errorProneAreas.includes(area)) {
        this.behavior.preferences.errorProneAreas.push(area);
      }

      this.behavior.businessContext.successMetrics.errorsEncountered++;
    });
  }

  /**
   * Capture individual action
   */
  private captureAction(action: UserAction) {
    this.actionBuffer.push(action);
    this.behavior.actions.push(action);

    // Keep only last 100 actions in memory
    if (this.behavior.actions.length > 100) {
      this.behavior.actions = this.behavior.actions.slice(-100);
    }

    // Update feature usage frequency
    const feature = this.extractFeature(action.target);
    if (feature) {
      this.behavior.preferences.featureUsageFrequency[feature] = 
        (this.behavior.preferences.featureUsageFrequency[feature] || 0) + 1;
    }

    // Detect abandoned features (clicked but no success action within 30s)
    if (action.type === 'click') {
      setTimeout(() => {
        const hasSuccess = this.behavior.actions
          .slice(-20)
          .some(a => a.type === 'success' && a.target === action.target);
        
        if (!hasSuccess && feature) {
          if (!this.behavior.preferences.abandonedFeatures.includes(feature)) {
            this.behavior.preferences.abandonedFeatures.push(feature);
          }
        }
      }, 30000);
    }
  }

  /**
   * Track successful pattern completion
   */
  trackSuccess(pattern: string, durationMs: number) {
    this.captureAction({
      type: 'success',
      target: pattern,
      timestamp: Date.now(),
      metadata: { durationMs }
    });

    if (!this.behavior.preferences.successfulPatterns.includes(pattern)) {
      this.behavior.preferences.successfulPatterns.push(pattern);
    }

    this.behavior.businessContext.successMetrics.tasksCompleted++;
    this.behavior.businessContext.successMetrics.timeToSuccess.push(durationMs);
  }

  /**
   * Infer user preferences from behavior
   */
  private async inferPreferences() {
    // Infer theme preference from time of day and previous usage
    const hour = new Date().getHours();
    const isDarkTime = hour < 7 || hour > 19;
    
    // Check if user has explicitly set theme
    const themeActions = this.behavior.actions.filter(a => 
      a.target.includes('theme') || a.target.includes('dark') || a.target.includes('light')
    );
    
    if (themeActions.length > 0) {
      const lastThemeAction = themeActions[themeActions.length - 1];
      this.behavior.preferences.preferredTheme = 
        lastThemeAction.target.includes('dark') ? 'dark' : 'light';
    } else if (isDarkTime) {
      this.behavior.preferences.preferredTheme = 'dark';
    }

    // Infer current workflow from recent actions
    const recentPages = this.behavior.actions
      .filter(a => a.type === 'navigation')
      .slice(-5)
      .map(a => a.target);

    if (recentPages.every(p => p.includes('/admin'))) {
      this.behavior.businessContext.userRole = 'admin';
      this.behavior.businessContext.currentWorkflow = 'administration';
    } else if (recentPages.every(p => p.includes('/dashboard'))) {
      this.behavior.businessContext.currentWorkflow = 'monitoring';
    }
  }

  /**
   * Get comprehensive user context
   */
  async getContext(): Promise<UserBehavior> {
    await this.inferPreferences();
    return { ...this.behavior };
  }

  /**
   * Flush behavior data to database
   */
  private async flushBehavior() {
    if (this.actionBuffer.length === 0) return;

    const actionsToFlush = [...this.actionBuffer];
    this.actionBuffer = [];

    try {
      const insertData: any = {
        session_id: this.sessionId,
        actions: actionsToFlush,
        preferences: this.behavior.preferences,
        business_context: this.behavior.businessContext,
        captured_at: new Date().toISOString()
      };
      
      // Only add user_id if it exists
      if (this.userId) {
        insertData.user_id = this.userId;
      }
      
      await supabase.from('user_behavior_analytics').insert(insertData);

      console.info(`[UserContext] Flushed ${actionsToFlush.length} actions`);
    } catch (error) {
      console.warn('[UserContext] Failed to flush behavior:', error);
      // Put failed actions back in buffer
      this.actionBuffer.unshift(...actionsToFlush);
    }
  }

  /**
   * Load user preferences from database
   */
  private async loadUserPreferences() {
    if (!this.userId) return;

    const { data } = await supabase
      .from('user_behavior_analytics')
      .select('preferences')
      .eq('user_id', this.userId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.preferences && typeof data.preferences === 'object') {
      this.behavior.preferences = {
        ...this.behavior.preferences,
        ...(data.preferences as any)
      };
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval() {
    this.flushInterval = window.setInterval(() => {
      if (this.actionBuffer.length > 0) {
        this.flushBehavior();
      }
    }, 10000); // Flush every 10 seconds
  }

  /**
   * Extract feature name from target
   */
  private extractFeature(target: string): string | null {
    if (target.includes('button')) return 'button_interaction';
    if (target.includes('form')) return 'form_usage';
    if (target.includes('modal')) return 'modal_interaction';
    if (target.includes('nav')) return 'navigation';
    return null;
  }

  /**
   * Get element descriptor for tracking
   */
  private getElementDescriptor(element: HTMLElement): string {
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const tag = element.tagName.toLowerCase();
    return `${tag}${id}${classes}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Final flush
    if (this.actionBuffer.length > 0) {
      this.flushBehavior();
    }
  }
}

// Singleton instance
let contextCaptureInstance: UserContextCapture | null = null;

export const useUserContextTracker = () => {
  const initialized = useRef(false);
  const [context, setContext] = useState<UserBehavior | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize context capture
    if (!contextCaptureInstance) {
      contextCaptureInstance = new UserContextCapture();
      contextCaptureInstance.initialize();
    }

    // Update context periodically
    const updateInterval = setInterval(async () => {
      if (contextCaptureInstance) {
        const currentContext = await contextCaptureInstance.getContext();
        setContext(currentContext);
      }
    }, 5000);

    // Cleanup on unmount
    return () => {
      clearInterval(updateInterval);
      if (contextCaptureInstance) {
        contextCaptureInstance.cleanup();
      }
    };
  }, []);

  return {
    context,
    trackSuccess: (pattern: string, durationMs: number) => {
      if (contextCaptureInstance) {
        contextCaptureInstance.trackSuccess(pattern, durationMs);
      }
    }
  };
};

export { UserContextCapture };
