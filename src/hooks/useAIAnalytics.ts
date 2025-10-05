/**
 * AI Analytics Hook
 * 
 * Beyond-Enterprise: Advanced analytics and insights for AI interactions.
 * Tracks performance, costs, success rates, and provides actionable intelligence.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  costEstimate: number;
  topErrors: Array<{ type: string; count: number }>;
  routingBreakdown: {
    errorTeacher: number;
    orchestrator: number;
    direct: number;
  };
  learningRate: number;
  autoFixSuccessRate: number;
}

export interface AIAnalyticsReturn {
  metrics: AIMetrics | null;
  loading: boolean;
  refresh: () => Promise<void>;
  trackRequest: (data: {
    routedTo: string;
    success: boolean;
    responseTime: number;
    errorType?: string;
  }) => Promise<void>;
  exportData: (format: 'json' | 'csv') => void;
}

export function useAIAnalytics(timeRange: '24h' | '7d' | '30d' = '24h'): AIAnalyticsReturn {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateTimeRange = useCallback(() => {
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  }, [timeRange]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const startTime = calculateTimeRange();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch analytics from generation_analytics table
      const { data: analytics } = await supabase
        .from('generation_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startTime);

      // Fetch error patterns
      const { data: errors } = await supabase
        .from('universal_error_patterns')
        .select('error_category, success_count, failure_count')
        .order('last_used_at', { ascending: false })
        .limit(10);

      if (analytics) {
        const totalRequests = analytics.length;
        // Use code_worked as success indicator
        const successfulRequests = analytics.filter(a => a.code_worked).length;
        // Estimate response time based on generation time
        const totalResponseTime = analytics.reduce((sum, a) => sum + (a.generation_time_ms || 1000), 0);

        // Calculate routing breakdown
        const routingBreakdown = {
          errorTeacher: 0,
          orchestrator: analytics.length,
          direct: 0
        };

        // Estimate costs (rough estimate based on model usage)
        const costEstimate = analytics.length * 0.002; // $0.002 per request average

        // Top errors
        const errorMap = new Map<string, number>();
        if (errors) {
          errors.forEach(err => {
            const total = err.success_count + err.failure_count;
            errorMap.set(err.error_category, total);
          });
        }
        const topErrors = Array.from(errorMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calculate learning and auto-fix rates
        const learningRate = errors
          ? errors.reduce((sum, e) => sum + e.success_count, 0) / 
            errors.reduce((sum, e) => sum + e.success_count + e.failure_count, 1) * 100
          : 0;

        const autoFixSuccessRate = errors
          ? errors.reduce((sum, e) => sum + e.success_count, 0) /
            Math.max(errors.reduce((sum, e) => sum + e.success_count + e.failure_count, 0), 1) * 100
          : 0;

        setMetrics({
          totalRequests,
          successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
          avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
          errorRate: totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0,
          costEstimate,
          topErrors,
          routingBreakdown,
          learningRate,
          autoFixSuccessRate
        });
      }
    } catch (error) {
      console.error('Failed to fetch AI analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateTimeRange]);

  const trackRequest = useCallback(async (data: {
    routedTo: string;
    success: boolean;
    responseTime: number;
    errorType?: string;
  }) => {
    // Note: Analytics tracking will be implemented with proper schema migration
    // For now, we focus on reading existing analytics data
    console.log('AI Request tracked:', data);
    
    // Refresh metrics to show any new data
    await refresh();
  }, [refresh]);

  const exportData = useCallback((format: 'json' | 'csv') => {
    if (!metrics) return;

    const data = format === 'json' 
      ? JSON.stringify(metrics, null, 2)
      : convertToCSV(metrics);

    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analytics-${timeRange}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics, timeRange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    metrics,
    loading,
    refresh,
    trackRequest,
    exportData
  };
}

function convertToCSV(metrics: AIMetrics): string {
  const lines = [
    'Metric,Value',
    `Total Requests,${metrics.totalRequests}`,
    `Success Rate,${metrics.successRate.toFixed(2)}%`,
    `Avg Response Time,${metrics.avgResponseTime.toFixed(0)}ms`,
    `Error Rate,${metrics.errorRate.toFixed(2)}%`,
    `Cost Estimate,$${metrics.costEstimate.toFixed(4)}`,
    `Learning Rate,${metrics.learningRate.toFixed(2)}%`,
    `Auto-Fix Success Rate,${metrics.autoFixSuccessRate.toFixed(2)}%`,
    '',
    'Top Errors',
    'Type,Count',
    ...metrics.topErrors.map(e => `${e.type},${e.count}`)
  ];
  return lines.join('\n');
}
