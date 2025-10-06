import { describe, it, expect, beforeEach } from 'vitest';
import { errorTracker } from '../monitoring/errorTracking';
import { performanceMonitor } from '../monitoring/performance';
import { analytics } from '../monitoring/analytics';

describe('Error Tracking', () => {
  beforeEach(() => {
    errorTracker.clearErrors();
  });

  it('should capture errors', () => {
    const error = new Error('Test error');
    errorTracker.captureError(error, 'low');
    
    const errors = errorTracker.getRecentErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error');
    expect(errors[0].severity).toBe('low');
  });

  it('should limit stored errors', () => {
    for (let i = 0; i < 150; i++) {
      errorTracker.captureError(new Error(`Error ${i}`), 'low');
    }
    
    const errors = errorTracker.getRecentErrors(200);
    expect(errors.length).toBeLessThanOrEqual(100);
  });

  it('should provide error statistics', () => {
    errorTracker.captureError(new Error('Low error'), 'low');
    errorTracker.captureError(new Error('High error'), 'high');
    
    const stats = errorTracker.getErrorStats();
    expect(stats.total).toBe(2);
    expect(stats.bySeverity.low).toBe(1);
    expect(stats.bySeverity.high).toBe(1);
  });
});

describe('Performance Monitoring', () => {
  it('should record metrics', () => {
    performanceMonitor.recordMetric('custom-metric', 100);
    
    const metrics = performanceMonitor.getMetrics();
    const customMetric = metrics.find(m => m.name === 'custom-metric');
    
    expect(customMetric).toBeDefined();
    expect(customMetric?.value).toBe(100);
  });

  it('should measure sync operations', () => {
    const result = performanceMonitor.measureSync('test-sync', () => {
      return 42;
    });
    
    expect(result).toBe(42);
    const avg = performanceMonitor.getAverageMetric('test-sync');
    expect(avg).toBeGreaterThan(0);
  });

  it('should measure async operations', async () => {
    const result = await performanceMonitor.measureAsync('test-async', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'done';
    });
    
    expect(result).toBe('done');
    const avg = performanceMonitor.getAverageMetric('test-async');
    expect(avg).toBeGreaterThan(0);
  });
});

describe('Analytics', () => {
  it('should track events', () => {
    analytics.track('test_event', { prop1: 'value1' });
    
    const summary = analytics.getSessionSummary();
    expect(summary.eventCount).toBeGreaterThan(0);
  });

  it('should track page views', () => {
    analytics.page('/test-page', { source: 'test' });
    
    const summary = analytics.getSessionSummary();
    const pageEvent = summary.events.find(e => e.name === 'page_view');
    
    expect(pageEvent).toBeDefined();
    expect(pageEvent?.properties?.page).toBe('/test-page');
  });

  it('should track feature usage', () => {
    analytics.feature('code-builder', 'generate', { language: 'typescript' });
    
    const summary = analytics.getSessionSummary();
    const featureEvent = summary.events.find(e => e.name === 'feature_used');
    
    expect(featureEvent).toBeDefined();
    expect(featureEvent?.properties?.feature).toBe('code-builder');
  });

  it('should set user ID', () => {
    analytics.setUserId('user-123');
    analytics.track('test');
    
    const summary = analytics.getSessionSummary();
    expect(summary.userId).toBe('user-123');
  });
});
