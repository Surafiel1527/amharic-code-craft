/**
 * Platform Storage Analytics - User Dashboard
 * Shows storage usage, generation stats, and personal metrics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  FileText, 
  HardDrive, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  BarChart3
} from "lucide-react";
import { 
  useStorageSummary, 
  useGenerationStats, 
  useRecentStorageMetrics,
  useStorageGrowth
} from "@/hooks/usePlatformMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const PlatformStorageAnalytics = () => {
  const { data: storage, isLoading: storageLoading } = useStorageSummary();
  const { data: genStats, isLoading: statsLoading } = useGenerationStats();
  const { data: recentMetrics, isLoading: metricsLoading } = useRecentStorageMetrics(5);
  const { data: growthData, isLoading: growthLoading } = useStorageGrowth(30);

  if (storageLoading || statsLoading) {
    return <LoadingSkeleton />;
  }

  const chartData = growthData?.map((item, index) => ({
    name: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    storage: (item.total_size_bytes / 1024 / 1024).toFixed(2) // Convert to MB
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Platform Usage</h2>
        <p className="text-muted-foreground">
          Track your storage, generations, and platform activity
        </p>
      </div>

      {/* Storage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storage?.totalStorageMb.toFixed(2)} MB</div>
            <p className="text-xs text-muted-foreground">
              Across {storage?.totalProjects} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storage?.totalFiles.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg {storage?.avgGenerationSizeKb.toFixed(1)} KB per generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{genStats?.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {genStats?.successfulGenerations} / {genStats?.totalGenerations} generations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{genStats?.avgGenerationTimeSec.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Complexity score: {genStats?.avgComplexityScore.toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Generation Statistics
            </CardTitle>
            <CardDescription>Your code generation performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Successful
                </span>
                <span className="font-medium">{genStats?.successfulGenerations}</span>
              </div>
              <Progress value={(genStats?.successfulGenerations / (genStats?.totalGenerations || 1)) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Failed
                </span>
                <span className="font-medium">{genStats?.failedGenerations}</span>
              </div>
              <Progress 
                value={(genStats?.failedGenerations / (genStats?.totalGenerations || 1)) * 100} 
                className="h-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Lines Generated</span>
                <Badge variant="secondary">
                  {genStats?.totalLinesGenerated.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage Growth
            </CardTitle>
            <CardDescription>Your storage usage over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {growthLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="storage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No storage data yet. Start generating projects!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Generations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recent Generations
          </CardTitle>
          <CardDescription>Your latest code generation activities</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : recentMetrics && recentMetrics.length > 0 ? (
            <div className="space-y-3">
              {recentMetrics.map((metric: any) => (
                <div 
                  key={metric.id} 
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {metric.file_count} files • {(metric.total_size_bytes / 1024).toFixed(2)} KB
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(metric.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{metric.framework}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No generations yet. Create your first project!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-20 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map(i => <Skeleton key={i} className="h-80" />)}
    </div>
  </div>
);
