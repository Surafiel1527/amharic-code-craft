import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logInfo, logError, logWarning } from '@/utils/errorLogger';

interface MonitoringResult {
  overall_health: 'healthy' | 'fair' | 'degraded' | 'critical';
  issues_detected: number;
  issues: any[];
  recommendations: any[];
}

/**
 * useProactiveMonitoring - Periodically checks system health
 * Runs proactive monitoring in the background
 */
export const useProactiveMonitoring = (intervalMinutes: number = 60) => {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('unknown');
  const [issuesCount, setIssuesCount] = useState<number>(0);

  useEffect(() => {
    logInfo('Proactive Monitoring: Initialized', { intervalMinutes });

    const runMonitoring = async () => {
      try {
        logInfo('Proactive Monitoring: Running system health check...');

        const { data, error } = await supabase.functions.invoke('proactive-monitor');

        if (error) {
          throw error;
        }

        const result = data as MonitoringResult;

        logInfo('Proactive Monitoring: Check complete', {
          health: result.overall_health,
          issues: result.issues_detected,
          recommendations: result.recommendations?.length || 0
        });

        setLastCheck(new Date());
        setHealthStatus(result.overall_health);
        setIssuesCount(result.issues_detected);

        // Warn about degraded health
        if (result.overall_health === 'degraded' || result.overall_health === 'critical') {
          logWarning('System health is degraded!', {
            status: result.overall_health,
            issues: result.issues
          });
        }

      } catch (error) {
        await logError({
          errorType: 'ProactiveMonitoringFailed',
          errorMessage: error instanceof Error ? error.message : 'Monitoring check failed',
          source: 'frontend',
          severity: 'medium',
          filePath: 'hooks/useProactiveMonitoring.ts',
          functionName: 'runMonitoring',
          context: { intervalMinutes }
        });
      }
    };

    // Run immediately on mount
    runMonitoring();

    // Set up interval
    const intervalId = setInterval(runMonitoring, intervalMinutes * 60 * 1000);

    return () => {
      logInfo('Proactive Monitoring: Cleaning up');
      clearInterval(intervalId);
    };
  }, [intervalMinutes]);

  return {
    lastCheck,
    healthStatus,
    issuesCount,
    isHealthy: healthStatus === 'healthy'
  };
};