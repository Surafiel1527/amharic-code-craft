import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

interface DeploymentHealthProps {
  deploymentId: string;
  deploymentUrl?: string;
}

interface HealthCheck {
  id: string;
  check_type: string;
  status: string;
  response_time_ms: number;
  checked_at: string;
  error_details?: any;
}

export const DeploymentHealth = ({ deploymentId, deploymentUrl }: DeploymentHealthProps) => {
  const { data: healthChecks, isLoading, refetch } = useQuery({
    queryKey: ['deployment-health', deploymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_health_checks' as any)
        .select('*')
        .eq('deployment_id', deploymentId)
        .order('checked_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as any) as HealthCheck[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'degraded': return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'degraded': return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  // Prepare chart data for response time
  const responseTimeData = healthChecks
    ?.filter(h => h.check_type === 'response_time' && h.response_time_ms)
    ?.slice(0, 20)
    ?.reverse()
    ?.map(h => ({
      time: format(new Date(h.checked_at), 'HH:mm'),
      responseTime: h.response_time_ms,
    })) || [];

  // Get latest checks by type
  const latestChecks = healthChecks?.reduce((acc, check) => {
    if (!acc[check.check_type] || new Date(check.checked_at) > new Date(acc[check.check_type].checked_at)) {
      acc[check.check_type] = check;
    }
    return acc;
  }, {} as Record<string, HealthCheck>);

  // Calculate uptime percentage (last 24 hours)
  const last24Hours = healthChecks?.filter(h => 
    new Date(h.checked_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ) || [];
  const healthyChecks = last24Hours.filter(h => h.status === 'healthy').length;
  const uptimePercentage = last24Hours.length > 0 
    ? ((healthyChecks / last24Hours.length) * 100).toFixed(2)
    : '0.00';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Activity className="h-6 w-6 animate-spin text-primary mr-2" />
          <p className="text-muted-foreground">Loading health data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Uptime (24h)</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
              {uptimePercentage}%
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {healthyChecks}/{last24Hours.length} checks healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-bold">
              {responseTimeData.length > 0
                ? Math.round(responseTimeData.reduce((sum, d) => sum + d.responseTime, 0) / responseTimeData.length)
                : 0}
              <span className="text-lg">ms</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Last 20 checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              {latestChecks?.uptime && getStatusIcon(latestChecks.uptime.status)}
              <h3 className={`text-2xl font-bold capitalize ${latestChecks?.uptime ? getStatusColor(latestChecks.uptime.status) : ''}`}>
                {latestChecks?.uptime?.status || 'Unknown'}
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 w-full">
              Check Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Chart */}
      {responseTimeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trend</CardTitle>
            <CardDescription>Last 20 health checks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="hsl(var(--primary))" 
                  name="Response Time (ms)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Health Checks by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check Status</CardTitle>
          <CardDescription>Current status of all health checks</CardDescription>
        </CardHeader>
        <CardContent>
          {!latestChecks || Object.keys(latestChecks).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No health checks recorded yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(latestChecks).map(([type, check]) => (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(check.checked_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.response_time_ms !== null && (
                      <span className="text-sm text-muted-foreground">{check.response_time_ms}ms</span>
                    )}
                    <Badge variant={check.status === 'healthy' ? 'default' : check.status === 'degraded' ? 'secondary' : 'destructive'}>
                      {check.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {deploymentUrl && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => window.open(deploymentUrl, '_blank')}
            className="w-full md:w-auto"
          >
            Visit Deployment
          </Button>
        </div>
      )}
    </div>
  );
};
