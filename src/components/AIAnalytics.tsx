import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Loader2, BarChart3, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIMetricsChart } from "@/components/AIMetricsChart";
import { AISystemDocs } from "@/components/AISystemDocs";
import { PromptVersionManager } from "@/components/PromptVersionManager";
import { useLanguage } from "@/contexts/LanguageContext";

export const AIAnalytics = () => {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [improving, setImproving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
    fetchImprovements();
    fetchPatterns();
  }, []);

  const fetchAnalytics = async () => {
    const { data } = await supabase
      .from('generation_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (data) setAnalytics(data);
    setLoading(false);
  };

  const fetchImprovements = async () => {
    const { data } = await supabase
      .from('ai_improvements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setImprovements(data);
  };

  const fetchPatterns = async () => {
    const { data } = await supabase
      .from('error_patterns')
      .select('*')
      .order('frequency', { ascending: false })
      .limit(20);
    
    if (data) setPatterns(data);
  };

  const triggerMetaImprovement = async () => {
    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-improve');
      
      if (error) throw error;

      toast({
        title: "AI Improved Itself! 🧠",
        description: `New version ${data.newVersion} created with ${data.improvements.length} improvements`,
      });

      fetchImprovements();
    } catch (error) {
      toast({
        title: "Improvement Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImproving(false);
    }
  };

  const calculateMetrics = () => {
    if (analytics.length === 0) return { successRate: 0, avgSatisfaction: 0, totalGenerations: 0 };

    const successful = analytics.filter(a => a.status === 'success').length;
    const totalSatisfaction = analytics
      .filter(a => a.user_satisfaction_score)
      .reduce((sum, a) => sum + a.user_satisfaction_score, 0);
    const satisfactionCount = analytics.filter(a => a.user_satisfaction_score).length;

    return {
      successRate: (successful / analytics.length * 100).toFixed(1),
      avgSatisfaction: satisfactionCount > 0 ? (totalSatisfaction / satisfactionCount).toFixed(1) : 0,
      totalGenerations: analytics.length
    };
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">{t("aiAnalytics.title")}</h2>
          <p className="text-muted-foreground">{t("aiAnalytics.subtitle")}</p>
        </div>
        <Button onClick={triggerMetaImprovement} disabled={improving}>
          {improving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("aiAnalytics.analyzing")}
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              {t("aiAnalytics.triggerImprovement")}
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("aiAnalytics.overview")}</TabsTrigger>
          <TabsTrigger value="charts">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t("aiAnalytics.charts")}
          </TabsTrigger>
          <TabsTrigger value="ab-testing">{t("aiAnalytics.abTesting")}</TabsTrigger>
          <TabsTrigger value="improvements">{t("aiAnalytics.improvements")}</TabsTrigger>
          <TabsTrigger value="patterns">{t("aiAnalytics.errorPatterns")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("aiAnalytics.recentGenerations")}</TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="h-4 w-4 mr-2" />
            {t("aiAnalytics.documentation")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("aiAnalytics.successRate")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.filter(a => a.status === 'success').length} {t("aiAnalytics.of")} {metrics.totalGenerations}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("aiAnalytics.userSatisfaction")}</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.avgSatisfaction}/5</div>
                <p className="text-xs text-muted-foreground">{t("aiAnalytics.averageRating")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("aiAnalytics.totalGenerations")}</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalGenerations}</div>
                <p className="text-xs text-muted-foreground">{t("aiAnalytics.allTime")}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts">
          <AIMetricsChart />
        </TabsContent>

        <TabsContent value="ab-testing">
          <PromptVersionManager />
        </TabsContent>

        <TabsContent value="improvements" className="space-y-4">
          {improvements.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No improvements yet. Click "Trigger Improvement" to let AI improve itself!
                </p>
              </CardContent>
            </Card>
          ) : (
            improvements.map((improvement) => (
              <Card key={improvement.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {improvement.old_version} → {improvement.new_version}
                      </CardTitle>
                      <CardDescription>{improvement.reason}</CardDescription>
                    </div>
                    <Badge variant={improvement.status === 'approved' ? 'default' : 'secondary'}>
                      {improvement.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {improvement.analysis?.improvements && (
                    <div className="space-y-2">
                      <p className="font-medium">Improvements Made:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {improvement.analysis.improvements.map((imp: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {patterns.map((pattern) => (
            <Card key={pattern.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{pattern.error_type}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Seen {pattern.frequency}x</Badge>
                    <Badge variant={pattern.resolution_status === 'solved' ? 'default' : 'secondary'}>
                      {pattern.resolution_status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{pattern.error_pattern}</p>
                {pattern.solution && (
                  <div className="bg-muted p-3 rounded-md mt-2">
                    <p className="text-sm font-medium mb-1">Solution:</p>
                    <p className="text-sm text-muted-foreground">{pattern.solution}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics.slice(0, 20).map((gen) => (
            <Card key={gen.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm line-clamp-1">{gen.user_prompt}</CardTitle>
                  <Badge variant={gen.status === 'success' ? 'default' : 'destructive'}>
                    {gen.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Model:</span> {gen.model_used}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span> {gen.generation_time_ms}ms
                  </div>
                  <div>
                    <span className="text-muted-foreground">Feedback:</span> {gen.feedback_type || 'None'}
                  </div>
                  {gen.user_satisfaction_score && (
                    <div>
                      <span className="text-muted-foreground">Rating:</span> {gen.user_satisfaction_score}/5
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="docs">
          <AISystemDocs />
        </TabsContent>
      </Tabs>
    </div>
  );
};