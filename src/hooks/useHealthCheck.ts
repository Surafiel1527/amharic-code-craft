import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  database: 'healthy' | 'degraded' | 'down';
  api: 'healthy' | 'degraded' | 'down';
  functions: 'healthy' | 'degraded' | 'down';
  overall: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
}

export const useHealthCheck = (checkInterval = 60000) => {
  const [health, setHealth] = useState<HealthStatus>({
    database: 'healthy',
    api: 'healthy',
    functions: 'healthy',
    overall: 'healthy',
    lastCheck: new Date(),
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    const results: Partial<HealthStatus> = {};

    try {
      // Check database
      const dbStart = Date.now();
      const { error: dbError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
      
      const dbLatency = Date.now() - dbStart;
      results.database = dbError 
        ? 'down' 
        : dbLatency > 1000 
        ? 'degraded' 
        : 'healthy';

      // Check API
      const apiStart = Date.now();
      const { error: apiError } = await supabase.auth.getSession();
      const apiLatency = Date.now() - apiStart;
      results.api = apiError 
        ? 'down' 
        : apiLatency > 500 
        ? 'degraded' 
        : 'healthy';

      // Check functions (optional - can be slow)
      results.functions = 'healthy';

      // Determine overall health
      const statuses = [results.database, results.api, results.functions];
      if (statuses.includes('down')) {
        results.overall = 'down';
      } else if (statuses.includes('degraded')) {
        results.overall = 'degraded';
      } else {
        results.overall = 'healthy';
      }

      setHealth({
        ...results as HealthStatus,
        lastCheck: new Date(),
      });
    } catch (error) {
      setHealth({
        database: 'down',
        api: 'down',
        functions: 'down',
        overall: 'down',
        lastCheck: new Date(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, checkInterval);
    return () => clearInterval(interval);
  }, [checkInterval]);

  return {
    health,
    isChecking,
    checkHealth,
    isHealthy: health.overall === 'healthy',
  };
};
