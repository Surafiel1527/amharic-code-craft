import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Zap, Clock, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PerformanceMetric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  threshold_status: string | null;
  created_at: string;
}

interface PerformanceMonitorProps {
  projectId: string;
}

export const PerformanceMonitor = ({ projectId }: PerformanceMonitorProps) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const metricThresholds = {
    load_time: { good: 1000, warning: 3000, unit: "ms" },
    render_time: { good: 500, warning: 1500, unit: "ms" },
    api_latency: { good: 200, warning: 1000, unit: "ms" },
    bundle_size: { good: 200, warning: 500, unit: "KB" },
    memory_usage: { good: 50, warning: 100, unit: "MB" },
  };

  useEffect(() => {
    fetchMetrics();
    
    // Set up realtime subscription for new metrics
    const channel = supabase
      .channel(`performance:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'performance_metrics',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setMetrics((current) => [payload.new as PerformanceMetric, ...current].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("performance_metrics")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Failed to load performance metrics");
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case "load_time":
        return <Clock className="h-4 w-4" />;
      case "render_time":
        return <Activity className="h-4 w-4" />;
      case "api_latency":
        return <Zap className="h-4 w-4" />;
      case "bundle_size":
        return <Package className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "good":
        return (
          <Badge variant="outline" className="text-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Good
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="text-warning">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        );
      default:
        return null;
    }
  };

  const getThresholdProgress = (type: string, value: number) => {
    const threshold = metricThresholds[type as keyof typeof metricThresholds];
    if (!threshold) return 50;

    const percentage = Math.min((value / threshold.warning) * 100, 100);
    return percentage;
  };

  const getProgressColor = (status: string | null) => {
    switch (status) {
      case "good":
        return "bg-success";
      case "warning":
        return "bg-warning";
      case "critical":
        return "bg-destructive";
      default:
        return "bg-primary";
    }
  };

  // Group metrics by type and get latest
  const latestMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_type] || new Date(metric.created_at) > new Date(acc[metric.metric_type].created_at)) {
      acc[metric.metric_type] = metric;
    }
    return acc;
  }, {} as Record<string, PerformanceMetric>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Real-time monitoring of your application's performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(latestMetrics).map(([type, metric]) => (
              <Card key={type} className="border-2">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getMetricIcon(type)}
                        <div>
                          <div className="font-medium capitalize">
                            {type.replace(/_/g, " ")}
                          </div>
                          <div className="text-2xl font-bold">
                            {metric.value.toFixed(2)} {metric.unit}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(metric.threshold_status)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Performance</span>
                        <span className="text-muted-foreground">
                          {getThresholdProgress(type, metric.value).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={getThresholdProgress(type, metric.value)}
                        className={`h-2 ${getProgressColor(metric.threshold_status)}`}
                      />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(metric.created_at).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(latestMetrics).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No performance metrics recorded yet</p>
                <p className="text-sm mt-1">Metrics will appear here once your app is running</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Keep bundle size under 200KB for optimal load times</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>API calls should complete within 1 second</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Use code splitting to reduce initial load time</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Optimize images and use lazy loading</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
