import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Clock, Database, Zap, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";

export function EnterpriseMonitoringDashboard({ credentialId }: { credentialId?: string }) {
  const [healthData, setHealthData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [retries, setRetries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (credentialId) {
      loadMonitoringData();
    }
  }, [credentialId]);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // Load health history
      const { data: health } = await supabase
        .from('database_connection_health')
        .select('*')
        .eq('credential_id', credentialId)
        .order('check_timestamp', { ascending: false })
        .limit(20);

      // Load performance metrics
      const { data: perf } = await supabase
        .from('database_performance_metrics')
        .select('*')
        .eq('credential_id', credentialId)
        .order('metric_date', { ascending: false })
        .limit(7);

      // Load retry history
      const { data: retry } = await supabase
        .from('database_connection_retries')
        .select('*')
        .eq('credential_id', credentialId)
        .order('attempted_at', { ascending: false })
        .limit(10);

      // Get credential info for provider
      const { data: cred } = await supabase
        .from('database_credentials')
        .select('provider')
        .eq('id', credentialId)
        .single();

      if (cred) {
        // Load relevant knowledge
        const { data: knowledgeData } = await supabase
          .from('database_knowledge_base')
          .select('*')
          .eq('provider', cred.provider)
          .order('confidence_score', { ascending: false })
          .limit(5);

        setKnowledge(knowledgeData || []);
      }

      setHealthData(health || []);
      setMetrics(perf || []);
      setRetries(retry || []);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      toast.info('Running health check...');
      await supabase.functions.invoke('proactive-health-monitor');
      await loadMonitoringData();
      toast.success('Health check complete');
    } catch (error) {
      toast.error('Health check failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const latestHealth = healthData[0];
  const uptime = metrics?.[0]?.uptime_percentage || 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Enterprise Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time health, performance metrics, and intelligent insights
          </p>
        </div>
        <Button onClick={runHealthCheck}>
          <Activity className="h-4 w-4 mr-2" />
          Run Health Check
        </Button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(latestHealth?.status)}`} />
              <span className="text-2xl font-bold capitalize">
                {latestHealth?.status || 'Unknown'}
              </span>
            </div>
            {latestHealth && (
              <p className="text-xs text-muted-foreground mt-2">
                Last checked: {new Date(latestHealth.check_timestamp).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Uptime (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{uptime.toFixed(2)}%</p>
              <Progress value={uptime} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {metrics?.[0]?.avg_response_time_ms || 0}
              </p>
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Range: {metrics?.[0]?.min_response_time_ms}-{metrics?.[0]?.max_response_time_ms}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics?.[0] && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">
                    {((metrics[0].successful_requests / metrics[0].total_requests) * 100).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics?.[0]?.successful_requests || 0} / {metrics?.[0]?.total_requests || 0} requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="retries">Retry Analytics</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Check History</CardTitle>
              <CardDescription>Recent connection health status over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={healthData.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="check_timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="response_time_ms" 
                    stroke="#8884d8" 
                    name="Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {healthData.slice(0, 5).map((health, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(health.status)}`} />
                      <div>
                        <p className="font-medium capitalize">{health.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(health.check_timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{health.response_time_ms}ms</p>
                      {health.error_message && (
                        <p className="text-xs text-destructive">{health.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics (Last 7 Days)</CardTitle>
              <CardDescription>Daily performance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric_date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_response_time_ms" fill="#8884d8" name="Avg Response (ms)" />
                  <Bar dataKey="uptime_percentage" fill="#82ca9d" name="Uptime %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retries">
          <Card>
            <CardHeader>
              <CardTitle>Intelligent Retry History</CardTitle>
              <CardDescription>Connection retry attempts and strategies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {retries.map((retry, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Attempt #{retry.attempt_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(retry.attempted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={retry.success ? 'default' : 'destructive'}>
                      {retry.success ? 'Success' : 'Failed'}
                    </Badge>
                    {retry.backoff_delay_ms && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Backoff: {retry.backoff_delay_ms}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Learned solutions and best practices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {knowledge.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      <h4 className="font-semibold">{item.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {item.confidence_score}% confidence
                      </Badge>
                      <Badge variant="outline">
                        {item.success_rate.toFixed(0)}% success
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Solution:</p>
                    <p className="text-muted-foreground">{item.solution}</p>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-2">
                      {item.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Used {item.usage_count} times • {item.category}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
