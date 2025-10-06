/**
 * Performance Monitoring
 * Tracks Core Web Vitals and custom metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.observeWebVitals();
    }
  }

  private observeWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
          this.recordMetric('CLS', clsScore);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  recordMetric(name: string, value: number) {
    const rating = this.getRating(name, value);
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      rating,
    };

    this.metrics.push(metric);

    if (import.meta.env.DEV) {
      console.log(`Performance: ${name}`, { value, rating });
    }
  }

  private getRating(name: string, value: number): PerformanceMetric['rating'] {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    });
  }

  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getAverageMetric(name: string): number | null {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return null;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  getSummary() {
    const summary: Record<string, { avg: number; rating: string }> = {};
    
    ['LCP', 'FID', 'CLS'].forEach(metric => {
      const avg = this.getAverageMetric(metric);
      if (avg !== null) {
        summary[metric] = {
          avg,
          rating: this.getRating(metric, avg),
        };
      }
    });

    return summary;
  }
}

export const performanceMonitor = new PerformanceMonitor();
