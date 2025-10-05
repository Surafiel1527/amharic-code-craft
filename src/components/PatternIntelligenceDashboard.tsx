import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, TrendingUp, Target, Zap, 
  CheckCircle2, XCircle, BarChart3 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PatternIntelligenceDashboardProps {
  userId: string;
}

interface Analytics {
  totalPatterns: number;
  avgConfidence: number;
  successRate: number;
  topCategories: { category: string; count: number }[];
  modelPerformance: { model: string; successRate: number; avgTime: number }[];
  recentActivity: { date: string; generations: number; success: number }[];
}

export function PatternIntelligenceDashboard({ userId }: PatternIntelligenceDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      // Load pattern analytics
      const { data: patterns } = await supabase
        .from('cross_project_patterns')
        .select('*')
        .eq('user_id', userId);

      // Load generation analytics
      const { data: generations } = await supabase
        .from('generation_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (patterns && generations) {
        // Calculate metrics
        const totalPatterns = patterns.length;
        const avgConfidence = patterns.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / totalPatterns || 0;
        const successRate = (generations.filter(g => g.code_worked).length / generations.length) * 100 || 0;

        // Top categories
        const categoryCount: Record<string, number> = {};
        patterns.forEach(p => {
          categoryCount[p.pattern_type] = (categoryCount[p.pattern_type] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCount)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Model performance
        const modelStats: Record<string, { total: number; success: number; totalTime: number }> = {};
        generations.forEach(g => {
          if (!modelStats[g.model_used]) {
            modelStats[g.model_used] = { total: 0, success: 0, totalTime: 0 };
          }
          modelStats[g.model_used].total++;
          if (g.code_worked) modelStats[g.model_used].success++;
          modelStats[g.model_used].totalTime += g.generation_time_ms || 0;
        });

        const modelPerformance = Object.entries(modelStats).map(([model, stats]) => ({
          model,
          successRate: (stats.success / stats.total) * 100,
          avgTime: stats.totalTime / stats.total
        }));

        // Recent activity (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const recentActivity = last7Days.map(date => {
          const dayGenerations = generations.filter(g => 
            g.created_at?.startsWith(date)
          );
          return {
            date,
            generations: dayGenerations.length,
            success: dayGenerations.filter(g => g.code_worked).length
          };
        });

        setAnalytics({
          totalPatterns,
          avgConfidence,
          successRate,
          topCategories,
          modelPerformance,
          recentActivity
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-center py-8 text-sm text-muted-foreground">
          Loading analytics...
        </div>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-4">
        <div className="text-center py-8 text-sm text-muted-foreground">
          No analytics data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <h3 className="font-semibold">Pattern Intelligence</h3>
        </div>
        <Badge variant="secondary">
          <BarChart3 className="w-3 h-3 mr-1" />
          Analytics
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 bg-blue-500/10 rounded">
          <div className="text-2xl font-bold text-blue-600">{analytics.totalPatterns}</div>
          <div className="text-[10px] text-muted-foreground">Patterns Learned</div>
        </div>
        <div className="text-center p-3 bg-green-500/10 rounded">
          <div className="text-2xl font-bold text-green-600">{analytics.successRate.toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">Success Rate</div>
        </div>
        <div className="text-center p-3 bg-purple-500/10 rounded">
          <div className="text-2xl font-bold text-purple-600">{analytics.avgConfidence.toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">Avg Confidence</div>
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-3">
          <h4 className="text-sm font-medium">Top Pattern Categories</h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {analytics.topCategories.map((cat, idx) => {
                const percentage = (cat.count / analytics.totalPatterns) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{cat.category}</span>
                      <Badge variant="outline">{cat.count}</Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <h4 className="text-sm font-medium">Model Performance</h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {analytics.modelPerformance.map((model, idx) => (
                <Card key={idx} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{model.model}</span>
                    <Badge 
                      variant={model.successRate > 80 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {model.successRate.toFixed(0)}% success
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Success Rate</span>
                      <span>{model.successRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={model.successRate} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avg Time</span>
                    <span className="font-medium">{(model.avgTime / 1000).toFixed(2)}s</span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          <h4 className="text-sm font-medium">Last 7 Days Activity</h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {analytics.recentActivity.map((day, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <Badge variant="outline">{day.generations} gens</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span>{day.success} success</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <span>{day.generations - day.success} failed</span>
                    </div>
                  </div>
                  {day.generations > 0 && (
                    <Progress 
                      value={(day.success / day.generations) * 100} 
                      className="h-1 mt-2" 
                    />
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card className="p-3 bg-muted/50">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Target className="w-4 h-4" />
          AI Insights
        </h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          {analytics.successRate > 90 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span>Excellent success rate! Your patterns are highly effective.</span>
            </div>
          )}
          {analytics.avgConfidence > 80 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-blue-500" />
              <span>High confidence patterns indicate strong learning.</span>
            </div>
          )}
          {analytics.totalPatterns > 50 && (
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-purple-500" />
              <span>Large pattern library enables better code generation.</span>
            </div>
          )}
        </div>
      </Card>
    </Card>
  );
}
