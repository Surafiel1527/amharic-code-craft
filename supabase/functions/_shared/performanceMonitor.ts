/**
 * Performance Monitoring System
 * 
 * Real-time tracking of system performance metrics with automatic
 * optimization triggers when thresholds are exceeded.
 * 
 * Features:
 * - Operation latency tracking
 * - Success rate monitoring
 * - Pattern effectiveness metrics
 * - Auto-optimization triggers
 * - Alert generation for anomalies
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PerformanceMetrics {
  // Database Operations
  avgInsertDuration: number;
  avgUpdateDuration: number;
  avgSelectDuration: number;
  
  // Healing System
  healingSuccessRate: number;
  avgHealingDuration: number;
  deterministicFixRate: number;
  aiFixRate: number;
  
  // Circuit Breakers
  circuitBreakerTrips: number;
  fallbackUsageRate: number;
  
  // Schema Changes
  schemaChangesDetected: number;
  cacheInvalidations: number;
}

interface MetricEntry {
  operation: string;
  duration: number;
  success: boolean;
  method: 'deterministic' | 'ai' | 'direct';
  timestamp: Date;
}

export class PerformanceMonitor {
  private supabase: SupabaseClient;
  private metrics: MetricEntry[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory
  private alertThresholds = {
    healingSuccessRate: 0.9,
    aiFixRate: 0.3,
    avgHealingDuration: 2000,
    circuitBreakerTrips: 10
  };

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Record a database operation metric
   */
  recordOperation(
    operation: string,
    duration: number,
    success: boolean,
    method: 'deterministic' | 'ai' | 'direct' = 'direct'
  ): void {
    const entry: MetricEntry = {
      operation,
      duration,
      success,
      method,
      timestamp: new Date()
    };

    this.metrics.push(entry);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Check if we should trigger optimization
    this.checkOptimizationTriggers();
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const last100 = this.metrics.slice(-100);
    
    if (last100.length === 0) {
      return this.getEmptyMetrics();
    }

    const inserts = last100.filter(m => m.operation === 'insert');
    const updates = last100.filter(m => m.operation === 'update');
    const selects = last100.filter(m => m.operation === 'select');
    const healing = last100.filter(m => m.operation === 'healing');
    
    const successfulHealing = healing.filter(m => m.success).length;
    const deterministicFixes = healing.filter(m => m.method === 'deterministic').length;
    const aiFixes = healing.filter(m => m.method === 'ai').length;

    return {
      avgInsertDuration: this.avg(inserts.map(m => m.duration)),
      avgUpdateDuration: this.avg(updates.map(m => m.duration)),
      avgSelectDuration: this.avg(selects.map(m => m.duration)),
      healingSuccessRate: healing.length > 0 ? successfulHealing / healing.length : 1,
      avgHealingDuration: this.avg(healing.map(m => m.duration)),
      deterministicFixRate: healing.length > 0 ? deterministicFixes / healing.length : 0,
      aiFixRate: healing.length > 0 ? aiFixes / healing.length : 0,
      circuitBreakerTrips: 0, // Will be populated from circuit breaker state
      fallbackUsageRate: 0,
      schemaChangesDetected: 0,
      cacheInvalidations: 0
    };
  }

  /**
   * Get metrics for a specific time window
   */
  async getWeeklyMetrics(): Promise<PerformanceMetrics> {
    // In production, this would query the database for historical metrics
    // For now, return current in-memory metrics
    return this.getMetrics();
  }

  /**
   * Check if optimization should be triggered
   */
  private checkOptimizationTriggers(): void {
    const metrics = this.getMetrics();

    // Trigger 1: Low healing success rate
    if (metrics.healingSuccessRate < this.alertThresholds.healingSuccessRate) {
      console.warn(`⚠️ [PerformanceMonitor] Low healing success rate: ${(metrics.healingSuccessRate * 100).toFixed(1)}%`);
      this.triggerOptimization('pattern_confidence_adjustment', {
        currentRate: metrics.healingSuccessRate,
        threshold: this.alertThresholds.healingSuccessRate
      });
    }

    // Trigger 2: High AI fix rate (should use more deterministic rules)
    if (metrics.aiFixRate > this.alertThresholds.aiFixRate) {
      console.warn(`⚠️ [PerformanceMonitor] High AI fix rate: ${(metrics.aiFixRate * 100).toFixed(1)}%`);
      this.triggerOptimization('add_deterministic_rules', {
        currentRate: metrics.aiFixRate,
        threshold: this.alertThresholds.aiFixRate
      });
    }

    // Trigger 3: Slow healing operations
    if (metrics.avgHealingDuration > this.alertThresholds.avgHealingDuration) {
      console.warn(`⚠️ [PerformanceMonitor] Slow healing operations: ${metrics.avgHealingDuration.toFixed(0)}ms`);
      this.triggerOptimization('optimize_healing_speed', {
        currentDuration: metrics.avgHealingDuration,
        threshold: this.alertThresholds.avgHealingDuration
      });
    }
  }

  /**
   * Trigger an optimization
   */
  private triggerOptimization(type: string, metadata: any): void {
    console.log(`🔧 [PerformanceMonitor] Triggering optimization: ${type}`, metadata);
    
    // In production, this would call the self-optimizer
    // For now, just log the trigger
  }

  /**
   * Helper: Calculate average
   */
  private avg(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Helper: Get empty metrics
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      avgInsertDuration: 0,
      avgUpdateDuration: 0,
      avgSelectDuration: 0,
      healingSuccessRate: 1,
      avgHealingDuration: 0,
      deterministicFixRate: 0,
      aiFixRate: 0,
      circuitBreakerTrips: 0,
      fallbackUsageRate: 0,
      schemaChangesDetected: 0,
      cacheInvalidations: 0
    };
  }

  /**
   * Log metrics to console (for debugging)
   */
  logMetrics(): void {
    const metrics = this.getMetrics();
    console.log('📊 [PerformanceMonitor] Current Metrics:', {
      'DB Operations': {
        'Insert Avg': `${metrics.avgInsertDuration.toFixed(0)}ms`,
        'Update Avg': `${metrics.avgUpdateDuration.toFixed(0)}ms`,
        'Select Avg': `${metrics.avgSelectDuration.toFixed(0)}ms`
      },
      'Healing System': {
        'Success Rate': `${(metrics.healingSuccessRate * 100).toFixed(1)}%`,
        'Avg Duration': `${metrics.avgHealingDuration.toFixed(0)}ms`,
        'Deterministic': `${(metrics.deterministicFixRate * 100).toFixed(1)}%`,
        'AI': `${(metrics.aiFixRate * 100).toFixed(1)}%`
      }
    });
  }
}

/**
 * Create a performance monitor instance
 */
export function createPerformanceMonitor(supabase: SupabaseClient): PerformanceMonitor {
  return new PerformanceMonitor(supabase);
}
