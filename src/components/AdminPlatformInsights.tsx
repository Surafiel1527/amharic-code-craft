/**
 * Admin Platform Insights
 * Enterprise-level admin dashboard for platform monitoring
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Server, 
  TrendingUp, 
  HardDrive, 
  Clock, 
  FileCode,
  Shield,
  AlertTriangle,
  Activity
} from "lucide-react";
import { usePlatformStatistics } from "@/hooks/usePlatformMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const AdminPlatformInsights = () => {
  const { data: stats, isLoading, error } = usePlatformStatistics();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error.message === 'Admin access required' 
            ? 'You need administrator privileges to view platform insights.'
            : 'Failed to load platform statistics. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const healthScore = calculateHealthScore(stats!);
  const storageWarning = (stats?.totalStorageGb || 0) > 10; // Alert if over 10GB

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Platform Insights
          </h2>
          <p className="text-muted-foreground">
            Enterprise-level monitoring and analytics
          </p>
        </div>
        <Badge 
          variant={healthScore >= 80 ? "default" : healthScore >= 60 ? "secondary" : "destructive"}
          className="text-lg px-4 py-2"
        >
          Health: {healthScore}%
        </Badge>
      </div>

      {/* Warnings */}
      {storageWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Platform storage has exceeded 10GB. Consider implementing cleanup strategies.
          </AlertDescription>
        </Alert>
      )}

      {/* Platform Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGenerations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {(stats?.totalGenerations / (stats?.totalUsers || 1)).toFixed(1)} avg per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Platform reliability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStorageGb.toFixed(3)} GB</div>
            <p className="text-xs text-muted-foreground">
              {((stats?.totalStorageGb || 0) / (stats?.totalUsers || 1) * 1024).toFixed(1)} MB per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Platform performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Avg Generation Time</p>
                <p className="text-2xl font-bold">{stats?.avgGenerationTimeSec.toFixed(2)}s</p>
              </div>
              <Badge variant={
                (stats?.avgGenerationTimeSec || 0) < 30 ? "default" : 
                (stats?.avgGenerationTimeSec || 0) < 60 ? "secondary" : 
                "destructive"
              }>
                {(stats?.avgGenerationTimeSec || 0) < 30 ? "Fast" : 
                 (stats?.avgGenerationTimeSec || 0) < 60 ? "Normal" : 
                 "Slow"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Total Files Generated</p>
                <p className="text-2xl font-bold">{stats?.totalFilesGenerated.toLocaleString()}</p>
              </div>
              <Badge variant="outline">
                {((stats?.totalFilesGenerated || 0) / (stats?.totalGenerations || 1)).toFixed(1)} per gen
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Most Popular Framework</p>
                <p className="text-2xl font-bold capitalize">{stats?.mostPopularFramework}</p>
              </div>
              <FileCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Platform health indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthIndicator 
              label="Success Rate" 
              value={stats?.successRate || 0} 
              threshold={80}
              format="percentage"
            />
            <HealthIndicator 
              label="Avg Performance" 
              value={100 - Math.min((stats?.avgGenerationTimeSec || 0) / 60 * 100, 100)} 
              threshold={70}
              format="score"
            />
            <HealthIndicator 
              label="Storage Efficiency" 
              value={calculateStorageEfficiency(stats!)} 
              threshold={75}
              format="percentage"
            />
            <HealthIndicator 
              label="User Engagement" 
              value={calculateUserEngagement(stats!)} 
              threshold={60}
              format="score"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Platform Statistics</CardTitle>
          <CardDescription>Comprehensive platform metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatItem label="Total Users" value={stats?.totalUsers.toLocaleString()} />
            <StatItem label="Total Generations" value={stats?.totalGenerations.toLocaleString()} />
            <StatItem label="Success Rate" value={`${stats?.successRate.toFixed(2)}%`} />
            <StatItem label="Total Storage" value={`${stats?.totalStorageGb.toFixed(3)} GB`} />
            <StatItem label="Avg Gen Time" value={`${stats?.avgGenerationTimeSec.toFixed(2)}s`} />
            <StatItem label="Total Files" value={stats?.totalFilesGenerated.toLocaleString()} />
            <StatItem label="Files/Generation" value={(stats?.totalFilesGenerated / (stats?.totalGenerations || 1)).toFixed(1)} />
            <StatItem label="Storage/User" value={`${((stats?.totalStorageGb || 0) / (stats?.totalUsers || 1) * 1024).toFixed(1)} MB`} />
            <StatItem label="Top Framework" value={stats?.mostPopularFramework || 'N/A'} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const HealthIndicator = ({ 
  label, 
  value, 
  threshold,
  format = "percentage"
}: { 
  label: string; 
  value: number; 
  threshold: number;
  format?: "percentage" | "score";
}) => {
  const status = value >= threshold ? "healthy" : value >= threshold * 0.7 ? "warning" : "critical";
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <Badge variant={
          status === "healthy" ? "default" : 
          status === "warning" ? "secondary" : 
          "destructive"
        }>
          {format === "percentage" ? `${value.toFixed(1)}%` : value.toFixed(0)}
        </Badge>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            status === "healthy" ? "bg-green-500" : 
            status === "warning" ? "bg-yellow-500" : 
            "bg-red-500"
          }`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
};

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="p-4 bg-muted rounded-lg">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-24 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map(i => <Skeleton key={i} className="h-96" />)}
    </div>
  </div>
);

// Helper functions
function calculateHealthScore(stats: any): number {
  if (!stats) return 0;
  
  const successScore = stats.successRate;
  const performanceScore = Math.max(0, 100 - (stats.avgGenerationTimeSec / 60 * 100));
  const engagementScore = Math.min(100, (stats.totalGenerations / Math.max(stats.totalUsers, 1)) * 10);
  
  return Math.round((successScore + performanceScore + engagementScore) / 3);
}

function calculateStorageEfficiency(stats: any): number {
  if (!stats || !stats.totalGenerations) return 0;
  
  const avgStoragePerGen = (stats.totalStorageGb * 1024) / stats.totalGenerations; // MB per generation
  // Efficient if under 5MB per generation
  return Math.min(100, Math.max(0, (1 - avgStoragePerGen / 5) * 100));
}

function calculateUserEngagement(stats: any): number {
  if (!stats || !stats.totalUsers) return 0;
  
  const generationsPerUser = stats.totalGenerations / stats.totalUsers;
  // Good engagement if 5+ generations per user
  return Math.min(100, (generationsPerUser / 5) * 100);
}
