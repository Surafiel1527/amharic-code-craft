import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Sparkles, CheckCircle2, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HealingPattern {
  id: string;
  error_category: string;
  confidence_score: number;
  success_count: number;
  failure_count: number;
  last_used_at: string;
}

interface HealingStats {
  totalPatterns: number;
  successfulHeals: number;
  averageConfidence: number;
  recentHeals: number;
}

export function HealingActionsPanel() {
  const [stats, setStats] = useState<HealingStats | null>(null);
  const [recentPatterns, setRecentPatterns] = useState<HealingPattern[]>([]);
  const [isHealing, setIsHealing] = useState(false);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [autonomousStats, setAutonomousStats] = useState({
    cycles_run: 0,
    errors_detected: 0,
    fixes_applied: 0,
    patterns_learned: 0,
    last_run: null as string | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
    loadRecentPatterns();

    const interval = setInterval(() => {
      loadStats();
      loadRecentPatterns();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const { data: patterns } = await supabase
      .from('universal_error_patterns')
      .select('confidence_score, success_count, failure_count, times_encountered');

    if (patterns) {
      const totalSuccess = patterns.reduce((sum, p) => sum + (p.success_count || 0), 0);
      const avgConfidence = patterns.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / patterns.length;
      const recentHeals = patterns.filter(p => p.success_count > 0).length;

      setStats({
        totalPatterns: patterns.length,
        successfulHeals: totalSuccess,
        averageConfidence: avgConfidence || 0,
        recentHeals,
      });
    }
  };

  const loadRecentPatterns = async () => {
    const { data: patterns } = await supabase
      .from('universal_error_patterns')
      .select('*')
      .order('last_used_at', { ascending: false })
      .limit(5);

    if (patterns) {
      setRecentPatterns(patterns);
    }
  };

  const triggerSelfHealing = async () => {
    setIsHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mega-mind-self-healer', {
        body: { mode: 'auto' }
      });

      if (error) throw error;

      toast({
        title: "🧠 Mega Mind Activated",
        description: `${data.stats.totalIssues} issues detected, ${data.stats.fixedAutomatically} fixed automatically`,
      });

      loadStats();
      loadRecentPatterns();
    } catch (error) {
      console.error('Self-healing error:', error);
      toast({
        title: "Self-Healing Failed",
        description: "Could not trigger self-healing system",
        variant: "destructive",
      });
    } finally {
      setIsHealing(false);
    }
  };

  const fixStuckJobs = async () => {
    setIsHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mega-mind-self-healer', {
        body: { mode: 'auto', focusStuckJobs: true }
      });

      if (error) throw error;

      toast({
        title: "🧠 Stuck Jobs Fixed",
        description: `${data.stats.totalIssues} stuck jobs detected, ${data.stats.fixedAutomatically} fixed automatically`,
      });

      loadStats();
      loadRecentPatterns();
    } catch (error) {
      console.error('Error fixing stuck jobs:', error);
      toast({
        title: "Fix Failed",
        description: "Could not fix stuck jobs",
        variant: "destructive",
      });
    } finally {
      setIsHealing(false);
    }
  };

  const runAutonomousCycle = async () => {
    setIsAutonomous(true);
    try {
      const { data, error } = await supabase.functions.invoke('autonomous-healing-engine');
      
      if (error) throw error;
      
      if (data?.results) {
        setAutonomousStats({
          cycles_run: data.results.cycles_run,
          errors_detected: data.results.errors_detected,
          fixes_applied: data.results.fixes_applied,
          patterns_learned: data.results.patterns_learned,
          last_run: new Date().toISOString(),
        });
        
        toast({
          title: "🤖 Autonomous Cycle Complete",
          description: `${data.results.fixes_applied} fixes applied automatically`,
        });
      }

      loadStats();
    } catch (error: any) {
      console.error('Autonomous cycle error:', error);
      toast({
        title: "Autonomous Cycle Failed",
        description: "Could not run autonomous cycle",
        variant: "destructive",
      });
    } finally {
      setIsAutonomous(false);
    }
  };

  const getSuccessRate = (pattern: HealingPattern) => {
    const total = pattern.success_count + pattern.failure_count;
    if (total === 0) return 0;
    return Math.round((pattern.success_count / total) * 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Self-Healing Actions
          </CardTitle>
          <CardDescription>
            Trigger autonomous healing, fix stuck jobs, and run healing cycles
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="autonomous" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="autonomous">🤖 Autonomous</TabsTrigger>
          <TabsTrigger value="healing">🧠 Healing</TabsTrigger>
          <TabsTrigger value="patterns">📊 Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="autonomous" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Autonomous Healing Engine</CardTitle>
              <CardDescription>Fully autonomous error detection and fixing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runAutonomousCycle} 
                disabled={isAutonomous}
                className="w-full"
                size="lg"
              >
                <Activity className="mr-2 h-5 w-5" />
                {isAutonomous ? 'Running Cycle...' : 'Run Autonomous Cycle'}
              </Button>

              {autonomousStats.last_run && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{autonomousStats.fixes_applied}</div>
                      <p className="text-xs text-muted-foreground">Fixes Applied</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{autonomousStats.patterns_learned}</div>
                      <p className="text-xs text-muted-foreground">Patterns Learned</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="healing" className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={fixStuckJobs} disabled={isHealing} variant="default" className="flex-1">
              <Zap className="mr-2 h-4 w-4" />
              {isHealing ? 'Fixing...' : 'Fix Stuck Jobs'}
            </Button>
            <Button onClick={triggerSelfHealing} disabled={isHealing} variant="outline" className="flex-1">
              <Sparkles className="mr-2 h-4 w-4" />
              {isHealing ? 'Healing...' : 'Auto-Heal'}
            </Button>
          </div>

          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Learned Patterns</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPatterns}</div>
                  <p className="text-xs text-muted-foreground">Error patterns learned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful Heals</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.successfulHeals}</div>
                  <p className="text-xs text-muted-foreground">Automatically fixed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats.averageConfidence * 100)}%</div>
                  <p className="text-xs text-muted-foreground">Solution accuracy</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Patterns</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recentHeals}</div>
                  <p className="text-xs text-muted-foreground">Recently used</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Learned Patterns</CardTitle>
              <CardDescription>
                Self-healing patterns that Mega Mind has learned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPatterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No patterns learned yet. Mega Mind is standing by.
                  </p>
                ) : (
                  recentPatterns.map((pattern) => (
                    <Card key={pattern.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{pattern.error_category}</h4>
                          <Badge variant={getSuccessRate(pattern) > 70 ? "default" : "secondary"}>
                            {getSuccessRate(pattern)}% success
                          </Badge>
                        </div>
                        <Progress value={pattern.confidence_score * 100} className="h-2 mb-2" />
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>Confidence: {Math.round(pattern.confidence_score * 100)}%</span>
                          <span>Success: {pattern.success_count} / Failed: {pattern.failure_count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
