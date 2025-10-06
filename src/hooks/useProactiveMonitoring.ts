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
export const useProactiveMonitoring = (enableAdaptive: boolean = true) => {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('unknown');
  const [issuesCount, setIssuesCount] = useState<number>(0);
  const [schedule, setSchedule] = useState<string>('adaptive');

  useEffect(() => {
    logInfo('Proactive Monitoring: Initialized', { enableAdaptive });

    const getIntervalMinutes = () => {
      if (!enableAdaptive) return 5; // Default 5 minutes if not adaptive
      
      const hour = new Date().getHours();
      // After midnight (00:00) until morning (06:00) = 30 minutes
      // Active hours = 5 minutes
      if (hour >= 0 && hour < 6) {
        setSchedule('night-mode (30min)');
        return 30;
      }
      setSchedule('active-mode (5min)');
      return 5;
    };

    const runMonitoring = async () => {
      try {
        logInfo('Proactive Monitoring: Running system health check...', { schedule });

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
          context: { enableAdaptive, schedule }
        });
      }
    };

    // Run immediately on mount
    runMonitoring();

    // Set up adaptive interval that recalculates every hour
    let intervalId: NodeJS.Timeout;
    
    const setupInterval = () => {
      const intervalMinutes = getIntervalMinutes();
      logInfo('Proactive Monitoring: Setting interval', { intervalMinutes, schedule });
      
      intervalId = setInterval(runMonitoring, intervalMinutes * 60 * 1000);
    };

    setupInterval();

    // Recalculate interval every hour to adapt to time changes
    const hourlyCheckId = setInterval(() => {
      clearInterval(intervalId);
      setupInterval();
    }, 60 * 60 * 1000); // Every hour

    return () => {
      logInfo('Proactive Monitoring: Cleaning up');
      clearInterval(intervalId);
      clearInterval(hourlyCheckId);
    };
  }, [enableAdaptive]);

  return {
    lastCheck,
    healthStatus,
    issuesCount,
    schedule,
    isHealthy: healthStatus === 'healthy'
  };
};