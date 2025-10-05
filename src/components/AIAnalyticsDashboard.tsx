/**
 * AI Analytics Dashboard
 * 
 * Beyond-Enterprise: Comprehensive analytics and insights dashboard.
 * Real-time monitoring, cost tracking, and performance optimization.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, DollarSign, Zap, 
  CheckCircle2, XCircle, Download, RefreshCw,
  Brain, Target, Activity
} from "lucide-react";
import { useAIAnalytics } from "@/hooks/useAIAnalytics";

export function AIAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const { metrics, loading, refresh, exportData } = useAIAnalytics(timeRange);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Real-time insights into your AI interactions
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl">{metrics.totalRequests}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>AI interactions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {metrics.successRate.toFixed(1)}%
              {metrics.successRate >= 90 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-orange-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.successRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.avgResponseTime.toFixed(0)}
              <span className="text-lg text-muted-foreground ml-1">ms</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Processing speed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost Estimate</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-1">
              <DollarSign className="h-6 w-6" />
              {metrics.costEstimate.toFixed(4)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Estimated usage cost</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Routing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Smart Orchestrator</span>
                <Badge variant="default">{metrics.routingBreakdown.orchestrator}</Badge>
              </div>
              <Progress 
                value={(metrics.routingBreakdown.orchestrator / metrics.totalRequests) * 100} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Teacher</span>
                <Badge variant="secondary">{metrics.routingBreakdown.errorTeacher}</Badge>
              </div>
              <Progress 
                value={(metrics.routingBreakdown.errorTeacher / metrics.totalRequests) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning & Auto-Fix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Learning Rate</span>
                <Badge variant="default">{metrics.learningRate.toFixed(1)}%</Badge>
              </div>
              <Progress value={metrics.learningRate} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto-Fix Success</span>
                <Badge variant="default">{metrics.autoFixSuccessRate.toFixed(1)}%</Badge>
              </div>
              <Progress value={metrics.autoFixSuccessRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Error Categories</CardTitle>
          <CardDescription>Most frequently encountered issues</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.topErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No errors detected! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.topErrors.map((error, index) => (
                <div key={error.type} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{error.type}</span>
                  </div>
                  <Badge variant="destructive">{error.count} occurrences</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
