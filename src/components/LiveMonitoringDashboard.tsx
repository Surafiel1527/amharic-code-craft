import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp, Database } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SystemMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  recorded_at: string;
  metadata: any;
}

interface AlertNotification {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  sent_at: string;
  acknowledged: boolean;
}

interface CircuitBreakerState {
  service_name: string;
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  success_count: number;
  last_failure_at: string | null;
  updated_at: string;
}

export const LiveMonitoringDashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    
    // Subscribe to real-time updates
    const metricsChannel = supabase
      .channel('metrics-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_metrics'
      }, () => loadMetrics())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_notifications'
      }, () => loadAlerts())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(metricsChannel);
    };
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    await Promise.all([loadMetrics(), loadAlerts(), loadCircuitBreakers()]);
    setLoading(false);
  };

  const loadMetrics = async () => {
    const { data, error } = await supabase
      .from('system_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading metrics:', error);
      return;
    }

    setMetrics(data || []);
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('alert_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading alerts:', error);
      return;
    }

    setAlerts(data || []);
  };

  const loadCircuitBreakers = async () => {
    const { data, error } = await supabase
      .from('circuit_breaker_state')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading circuit breakers:', error);
      return;
    }

    setCircuitBreakers(data || []);
  };

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('alert_notifications')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to acknowledge alert');
      return;
    }

    toast.success('Alert acknowledged');
    loadAlerts();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'default';
      default: return 'secondary';
    }
  };

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'closed': return 'text-success';
      case 'open': return 'text-destructive';
      case 'half_open': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'closed': return <CheckCircle2 className="h-4 w-4" />;
      case 'open': return <XCircle className="h-4 w-4" />;
      case 'half_open': return <Clock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Prepare chart data
  const errorRateData = metrics
    .filter(m => m.metric_type === 'error_rate')
    .slice(0, 20)
    .reverse()
    .map(m => ({
      time: new Date(m.recorded_at).toLocaleTimeString(),
      rate: m.metric_value
    }));

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(a => a.severity === 'critical');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live System Monitoring</h1>
          <p className="text-muted-foreground">Real-time health metrics and alerts</p>
        </div>
        <Button onClick={loadMonitoringData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex justify-between items-center p-3 bg-background rounded-lg">
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
                <Button onClick={() => acknowledgeAlert(alert.id)} size="sm">
                  Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unacknowledgedAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">Healthy</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unacknowledgedAlerts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {criticalAlerts.length} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Circuit Breakers</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {circuitBreakers.filter(cb => cb.state === 'closed').length}/{circuitBreakers.length}
                </div>
                <p className="text-xs text-muted-foreground">Closed (healthy)</p>
              </CardContent>
            </Card>
          </div>

          {/* Error Rate Chart */}
          {errorRateData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Error Rate Trend</CardTitle>
                <CardDescription>Last 20 measurements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={errorRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--destructive))" name="Error Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                <p className="text-lg font-medium">No alerts</p>
                <p className="text-sm text-muted-foreground">Everything is running smoothly</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map(alert => (
              <Card key={alert.id} className={alert.acknowledged ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{alert.title}</CardTitle>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {alert.acknowledged && <Badge variant="outline">Acknowledged</Badge>}
                      </div>
                      <CardDescription>{alert.alert_type}</CardDescription>
                    </div>
                    {!alert.acknowledged && (
                      <Button onClick={() => acknowledgeAlert(alert.id)} size="sm">
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.sent_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Circuit Breakers Tab */}
        <TabsContent value="circuit-breakers" className="space-y-4">
          {circuitBreakers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No circuit breakers configured</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circuitBreakers.map(cb => (
                <Card key={cb.service_name}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{cb.service_name}</CardTitle>
                        <CardDescription>Circuit Breaker Status</CardDescription>
                      </div>
                      <div className={`flex items-center gap-2 ${getCircuitBreakerColor(cb.state)}`}>
                        {getCircuitBreakerIcon(cb.state)}
                        <span className="font-semibold uppercase">{cb.state}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Success Count:</span>
                      <span className="font-medium">{cb.success_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Failure Count:</span>
                      <span className="font-medium text-destructive">{cb.failure_count}</span>
                    </div>
                    {cb.last_failure_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Failure:</span>
                        <span className="font-medium">{new Date(cb.last_failure_at).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">{new Date(cb.updated_at).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Metrics</CardTitle>
              <CardDescription>Last 100 recorded metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.slice(0, 20).map(metric => (
                  <div key={metric.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{metric.metric_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(metric.recorded_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{metric.metric_value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
