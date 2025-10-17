/**
 * UNIVERSAL ERROR CAPTURE SYSTEM
 * 
 * Automatically captures and logs ALL types of errors to detected_errors table:
 * - Runtime errors (window.onerror)
 * - Unhandled promise rejections
 * - React component errors
 * - Network failures
 * - Performance issues (slow operations, memory)
 * - Build errors (via console capture)
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ErrorContext {
  userAgent: string;
  url: string;
  timestamp: string;
  screenResolution: string;
  memoryUsage?: any;
}

class UniversalErrorCapture {
  private errorQueue: any[] = [];
  private flushInterval: number | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  initialize() {
    this.setupWindowErrorHandlers();
    this.setupPerformanceMonitoring();
    this.setupConsoleErrorCapture();
    this.setupNetworkMonitoring();
    this.startFlushInterval();
  }

  private setupWindowErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        error_type: 'runtime_error',
        error_message: event.message,
        severity: 'high',
        file_path: event.filename,
        line_number: event.lineno,
        stack_trace: event.error?.stack,
        context: this.getContext(),
      });
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        error_type: 'unhandled_promise',
        error_message: event.reason?.message || String(event.reason),
        severity: 'high',
        stack_trace: event.reason?.stack,
        context: this.getContext(),
      });
    });
  }

  private setupPerformanceMonitoring() {
    // Monitor long tasks (tasks > 50ms)
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.captureError({
                error_type: 'performance_issue',
                error_message: `Long task detected: ${entry.duration}ms`,
                severity: entry.duration > 200 ? 'high' : 'medium',
                context: {
                  ...this.getContext(),
                  duration_ms: entry.duration,
                  entry_type: entry.entryType,
                  entry_name: entry.name,
                },
              });
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }

    // Memory monitoring (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (usagePercent > 90) {
          this.captureError({
            error_type: 'memory_leak',
            error_message: `High memory usage: ${usagePercent.toFixed(2)}%`,
            severity: 'critical',
            context: {
              ...this.getContext(),
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
              usagePercent,
            },
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private setupConsoleErrorCapture() {
    // Capture console.error calls (useful for build errors)
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);

      // Extract error info
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      // Only log if it looks like a real error (not warnings)
      if (errorMessage.toLowerCase().includes('error') || 
          errorMessage.toLowerCase().includes('failed')) {
        this.captureError({
          error_type: 'console_error',
          error_message: errorMessage.substring(0, 1000), // Limit length
          severity: 'medium',
          context: this.getContext(),
        });
      }
    };

    // Capture console.warn for potential issues
    const originalWarn = console.warn;
    console.warn = (...args) => {
      originalWarn.apply(console, args);

      const warnMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      // Only log significant warnings
      if (warnMessage.toLowerCase().includes('deprecated') ||
          warnMessage.toLowerCase().includes('invalid') ||
          warnMessage.toLowerCase().includes('failed')) {
        this.captureError({
          error_type: 'console_warning',
          error_message: warnMessage.substring(0, 1000),
          severity: 'low',
          context: this.getContext(),
        });
      }
    };
  }

  private setupNetworkMonitoring() {
    // Monitor failed fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch.apply(window, args);
        const duration = Date.now() - startTime;

        // Log slow requests
        if (duration > 5000) {
          const requestUrl = typeof args[0] === 'string' 
            ? args[0] 
            : args[0] instanceof Request 
              ? args[0].url 
              : String(args[0]);
              
          this.captureError({
            error_type: 'slow_query',
            error_message: `Slow network request: ${duration}ms`,
            severity: 'medium',
            context: {
              ...this.getContext(),
              url: requestUrl,
              duration_ms: duration,
            },
          });
        }

        // Log failed requests
        if (!response.ok) {
          this.captureError({
            error_type: 'network_error',
            error_message: `HTTP ${response.status}: ${response.statusText}`,
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              ...this.getContext(),
              url: response.url,
              status: response.status,
              statusText: response.statusText,
            },
          });
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const requestUrl = typeof args[0] === 'string' 
          ? args[0] 
          : args[0] instanceof Request 
            ? args[0].url 
            : String(args[0]);
            
        this.captureError({
          error_type: 'network_error',
          error_message: `Network request failed: ${error instanceof Error ? error.message : 'Unknown'}`,
          severity: 'high',
          stack_trace: error instanceof Error ? error.stack : undefined,
          context: {
            ...this.getContext(),
            url: requestUrl,
            duration_ms: duration,
          },
        });
        throw error;
      }
    };
  }

  private getContext(): ErrorContext {
    const context: ErrorContext = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    // Add memory info if available
    if ('memory' in performance) {
      context.memoryUsage = (performance as any).memory;
    }

    return context;
  }

  private captureError(errorData: any) {
    // Add to queue
    this.errorQueue.push({
      ...errorData,
      project_id: this.getProjectId(),
      user_id: this.getUserId(),
      created_at: new Date().toISOString(),
    });

    // If queue is large, flush immediately
    if (this.errorQueue.length >= 10) {
      this.flushErrors();
    }
  }

  private getProjectId(): string | null {
    // Try to extract from URL or localStorage
    const urlMatch = window.location.pathname.match(/\/workspace\/([^/]+)/);
    if (urlMatch) return urlMatch[1];
    return localStorage.getItem('currentProjectId');
  }

  private getUserId(): string | null {
    // Will be set by auth system
    return localStorage.getItem('userId');
  }

  private startFlushInterval() {
    // Flush errors every 5 seconds
    this.flushInterval = window.setInterval(() => {
      if (this.errorQueue.length > 0) {
        this.flushErrors();
      }
    }, 5000);
  }

  private async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // Batch insert to detected_errors
      const { error } = await supabase
        .from('detected_errors')
        .insert(errorsToSend);

      if (error) {
        console.warn('[UniversalErrorCapture] Failed to log errors:', error);
        // Put failed errors back in queue
        this.errorQueue.push(...errorsToSend);
      } else {
        console.info(`[UniversalErrorCapture] Logged ${errorsToSend.length} errors`);
      }
    } catch (e) {
      console.warn('[UniversalErrorCapture] Error logging failed:', e);
      // Put failed errors back in queue
      this.errorQueue.push(...errorsToSend);
    }
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    // Flush remaining errors
    if (this.errorQueue.length > 0) {
      this.flushErrors();
    }
  }
}

// Singleton instance
let errorCaptureInstance: UniversalErrorCapture | null = null;

export const useUniversalErrorCapture = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize error capture
    if (!errorCaptureInstance) {
      errorCaptureInstance = new UniversalErrorCapture();
      errorCaptureInstance.initialize();
    }

    // Cleanup on unmount
    return () => {
      if (errorCaptureInstance) {
        errorCaptureInstance.cleanup();
      }
    };
  }, []);
};
