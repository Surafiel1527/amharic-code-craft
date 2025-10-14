/**
 * Router Metrics Dashboard - Phase 1 Monitoring
 * 
 * Displays real-time performance metrics for the Universal Router
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, MessageSquare, Code, RefreshCw } from 'lucide-react';

interface RouteMetrics {
  route: string;
  total_executions: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  success_rate: number;
}

interface RouteDecision {
  route: string;
  confidence: number;
  created_at: string;
  estimated_cost: string;
  estimated_time: string;
}

export function RouterMetricsDashboard() {
  const [metrics, setMetrics] = useState<RouteMetrics[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RouteDecision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadRecentDecisions();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadMetrics();
      loadRecentDecisions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_routing_metrics') as { 
        data: RouteMetrics[] | null, 
        error: any 
      };
      
      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('routing_decisions')
        .select('route, confidence, created_at, estimated_cost, estimated_time')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentDecisions(data || []);
    } catch (error) {
      console.error('Failed to load recent decisions:', error);
    }
  };

  const getRouteIcon = (route: string) => {
    switch (route) {
      case 'DIRECT_EDIT':
        return <Zap className="h-4 w-4" />;
      case 'META_CHAT':
        return <MessageSquare className="h-4 w-4" />;
      case 'FEATURE_BUILD':
        return <Code className="h-4 w-4" />;
      case 'REFACTOR':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getRouteColor = (route: string) => {
    switch (route) {
      case 'DIRECT_EDIT':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'META_CHAT':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'FEATURE_BUILD':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'REFACTOR':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Universal Router Metrics</h2>
          <p className="text-muted-foreground">Phase 1 Performance Dashboard</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Activity className="h-3 w-3" />
          Live Monitoring
        </Badge>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.route}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getRouteIcon(metric.route)}
                {metric.route.replace('_', ' ')}
              </CardTitle>
              <Badge className={getRouteColor(metric.route)}>
                {metric.success_rate.toFixed(1)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold">
                    {metric.avg_duration_ms.toFixed(0)}ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average Duration
                  </p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: {metric.min_duration_ms}ms</span>
                  <span>Max: {metric.max_duration_ms}ms</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {metric.total_executions} total executions
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Routing Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Routing Decisions</CardTitle>
          <CardDescription>
            Last 10 requests classified by the Universal Router
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDecisions.map((decision, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Badge className={getRouteColor(decision.route)}>
                    {decision.route.replace('_', ' ')}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">
                      Confidence: {(decision.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(decision.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {decision.estimated_time}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {decision.estimated_cost}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>
            Phase 1 impact analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Average Response Time
              </div>
              <div className="text-3xl font-bold">
                {metrics.length > 0
                  ? (
                      metrics.reduce((acc, m) => acc + m.avg_duration_ms, 0) /
                      metrics.length
                    ).toFixed(0)
                  : 0}
                ms
              </div>
              <div className="text-xs text-muted-foreground">
                Across all routes
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Overall Success Rate
              </div>
              <div className="text-3xl font-bold">
                {metrics.length > 0
                  ? (
                      metrics.reduce((acc, m) => acc + m.success_rate, 0) /
                      metrics.length
                    ).toFixed(1)
                  : 0}
                %
              </div>
              <div className="text-xs text-muted-foreground">
                Production reliability
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Total Requests
              </div>
              <div className="text-3xl font-bold">
                {metrics.reduce((acc, m) => acc + m.total_executions, 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Since Phase 1 launch
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
