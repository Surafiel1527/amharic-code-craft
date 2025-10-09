/**
 * Unified Intelligence Dashboard
 * Consolidates: AI Analytics, System Monitoring, Pattern Intelligence, Error Learning
 */
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Brain, Activity, Target, AlertTriangle,
  TrendingUp, Zap, Database, BarChart3
} from "lucide-react";
import { AIAnalyticsDashboard } from "./AIAnalyticsDashboard";
import { LiveMonitoringDashboard } from "./LiveMonitoringDashboard";
import { PatternIntelligenceDashboard } from "./PatternIntelligenceDashboard";
import { UniversalErrorLearningDashboard } from "./UniversalErrorLearningDashboard";
import { useAuth } from "@/hooks/useAuth";

export function IntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState("ai-analytics");
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8" />
          Intelligence Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive analytics and insights across all intelligence systems
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("ai-analytics")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">AI</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Analytics</div>
            <p className="text-xs text-muted-foreground">Performance & Costs</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("monitoring")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-xs text-muted-foreground">System</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Monitoring</div>
            <p className="text-xs text-muted-foreground">Health & Alerts</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("patterns")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Learning</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Patterns</div>
            <p className="text-xs text-muted-foreground">Intelligence & Reuse</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("errors")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Errors</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Learning</div>
            <p className="text-xs text-muted-foreground">Error Analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">AI Analytics</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Monitoring</span>
            <span className="sm:hidden">System</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Patterns</span>
            <span className="sm:hidden">Learn</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Errors</span>
            <span className="sm:hidden">Fix</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analytics" className="space-y-4">
          <AIAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <LiveMonitoringDashboard />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {user ? (
            <PatternIntelligenceDashboard userId={user.id} />
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Please log in to view pattern intelligence</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <UniversalErrorLearningDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
