import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, CheckCircle2, TrendingUp, Zap, Sparkles, Activity, Target, Clock, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProactiveMonitoring } from "@/hooks/useProactiveMonitoring";

interface HealingPattern {
  id: string;
  error_category: string;
  error_subcategory: string;
  diagnosis: any;
  confidence_score: number;
  times_encountered: number;
  success_count: number;
  failure_count: number;
  last_used_at: string;
}

interface SelfHealingStats {
  totalPatterns: number;
  successfulHeals: number;
  averageConfidence: number;
  recentHeals: number;
}

interface Prediction {
  type: string;
  probability: number;
  timeframe: string;
  affectedSystems: string[];
}

interface SystemHealth {
  overall: number;
  trend: string;
  riskLevel: string;
}

export function SelfHealingMonitor() {
  const [stats, setStats] = useState<SelfHealingStats | null>(null);
  const [recentPatterns, setRecentPatterns] = useState<HealingPattern[]>([]);
  const [isHealing, setIsHealing] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [learningStats, setLearningStats] = useState<any>(null);
  const [isMetaImproving, setIsMetaImproving] = useState(false);
  const [metaStats, setMetaStats] = useState<any>(null);
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningStats, setReasoningStats] = useState<any>(null);
  const [isOptimizingContext, setIsOptimizingContext] = useState(false);
  const [contextualStats, setContextualStats] = useState<any>(null);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [autonomousStats, setAutonomousStats] = useState({
    cycles_run: 0,
    errors_detected: 0,
    fixes_applied: 0,
    patterns_learned: 0,
    last_run: null as string | null,
  });
  const { toast } = useToast();
  
  // Enable adaptive proactive monitoring
  const { lastCheck, healthStatus, issuesCount, schedule, isHealthy } = useProactiveMonitoring(true);

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
      const { data: jobs } = await supabase
        .from('ai_generation_jobs')
        .select('id, status, progress, current_step, updated_at')
        .eq('status', 'running')
        .lt('progress', 100)
        .lt('updated_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());

      if (!jobs || jobs.length === 0) {
        toast({
          title: "No Stuck Jobs",
          description: "All jobs are running normally",
        });
        return;
      }

      toast({
        title: "🔧 Fixing Stuck Jobs",
        description: `Found ${jobs.length} stuck job(s), attempting to fix...`,
      });

      for (const job of jobs) {
        try {
          const { error } = await supabase.functions.invoke('fix-stuck-job', {
            body: { jobId: job.id }
          });
          
          if (error) {
            console.error(`Failed to fix job ${job.id}:`, error);
          }
        } catch (err) {
          console.error(`Error fixing job ${job.id}:`, err);
        }
      }

      toast({
        title: "✅ Jobs Fixed",
        description: `Attempted to fix ${jobs.length} stuck job(s)`,
      });

      loadStats();
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

  const runPredictiveAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('super-predictive-analyzer');

      if (error) throw error;

      if (data.analysis) {
        setPredictions(data.analysis.predictions || []);
        setSystemHealth(data.analysis.systemHealth);
        
        toast({
          title: "🔮 Predictive Analysis Complete",
          description: `System Health: ${data.analysis.systemHealth.overall}% - ${data.analysis.predictions.length} predictions made`,
        });
      }
    } catch (error) {
      console.error('Predictive analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not run predictive analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runPerformanceOptimization = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-performance-optimizer');

      if (error) throw error;

      toast({
        title: "⚡ Performance Optimized",
        description: `${data.autoApplied || 0} optimizations auto-applied`,
      });

      loadStats();
    } catch (error) {
      console.error('Performance optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: "Could not optimize performance",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const runSelfLearning = async () => {
    setIsLearning(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-learning-engine');

      if (error) throw error;

      if (data.learning) {
        setLearningStats(data.learning);
        
        toast({
          title: "🧠 Self-Learning Complete",
          description: `${data.learning.newPatternsLearned} new patterns learned, ${data.learning.autoAppliedFixes} fixes auto-applied`,
        });
      }

      loadStats();
    } catch (error) {
      console.error('Self-learning error:', error);
      toast({
        title: "Learning Failed",
        description: "Could not run self-learning engine",
        variant: "destructive",
      });
    } finally {
      setIsLearning(false);
    }
  };

  const runMetaImprovement = async () => {
    setIsMetaImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-self-improvement');

      if (error) throw error;

      if (data.meta) {
        setMetaStats(data.meta);
        
        toast({
          title: "🎯 Meta-Improvement Complete",
          description: `${data.meta.improvementsApplied} optimizations applied, ${data.meta.confidenceBoost} patterns recalibrated`,
        });
      }

      loadStats();
    } catch (error) {
      console.error('Meta-improvement error:', error);
      toast({
        title: "Meta-Improvement Failed",
        description: "Could not run meta-improvement analysis",
        variant: "destructive",
      });
    } finally {
      setIsMetaImproving(false);
    }
  };

  const runAdvancedReasoning = async () => {
    setIsReasoning(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-reasoning-engine');

      if (error) throw error;

      if (data) {
        setReasoningStats({
          analyzedCount: data.analyzed_count || 0,
          highConfidenceCount: data.high_confidence_count || 0,
          results: data.results || [],
        });
        
        toast({
          title: "🧠 Advanced Reasoning Complete",
          description: `Analyzed ${data.analyzed_count} complex errors, ${data.high_confidence_count} high-confidence solutions found`,
        });
      }

      loadStats();
    } catch (error) {
      console.error('Advanced reasoning error:', error);
      toast({
        title: "Reasoning Failed",
        description: "Could not run advanced reasoning analysis",
        variant: "destructive",
      });
    } finally {
      setIsReasoning(false);
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

  const runContextualOptimization = async () => {
    setIsOptimizingContext(true);
    try {
      const { data, error } = await supabase.functions.invoke('contextual-auto-optimizer');

      if (error) throw error;

      if (data) {
        setContextualStats({
          context: data.context,
          recommendations: data.recommendations,
          optimizationsApplied: data.optimizations_applied,
          appliedOptimizations: data.applied_optimizations,
        });
        
        toast({
          title: "🎯 Contextual Optimization Complete",
          description: `Applied ${data.optimizations_applied} context-aware optimizations`,
        });
      }

      loadStats();
    } catch (error) {
      console.error('Contextual optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: "Could not run contextual optimization",
        variant: "destructive",
      });
    } finally {
      setIsOptimizingContext(false);
    }
  };

  const getSuccessRate = (pattern: HealingPattern) => {
    const total = pattern.success_count + pattern.failure_count;
    if (total === 0) return 0;
    return Math.round((pattern.success_count / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            SUPER Mega Mind Dashboard
          </CardTitle>
          <CardDescription>
            Advanced self-healing, predictive analytics, and auto-optimization with adaptive monitoring
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Proactive Monitoring Status */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Proactive Monitoring
            <Badge variant={isHealthy ? "default" : "destructive"} className="ml-auto">
              {healthStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Schedule Mode</p>
              <p className="text-lg font-semibold">{schedule}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Issues Detected</p>
              <p className="text-2xl font-bold">{issuesCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Check</p>
              <p className="text-sm">{lastCheck ? lastCheck.toLocaleTimeString() : 'Initializing...'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="autonomous" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="autonomous" className="font-bold">🤖 AUTO</TabsTrigger>
          <TabsTrigger value="healing">🧠 Heal</TabsTrigger>
          <TabsTrigger value="learning">📚 Learn</TabsTrigger>
          <TabsTrigger value="meta">🎯 Meta</TabsTrigger>
          <TabsTrigger value="reasoning">💡 Reason</TabsTrigger>
          <TabsTrigger value="contextual">🌍 Context</TabsTrigger>
          <TabsTrigger value="predictions">🔮 Predict</TabsTrigger>
          <TabsTrigger value="optimization">⚡ Optimize</TabsTrigger>
        </TabsList>

      <TabsContent value="healing" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold">SUPER Mega Mind</h2>
              <p className="text-sm text-muted-foreground">
                Advanced AI reasoning with Gemini 2.5 Pro
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fixStuckJobs} disabled={isHealing} variant="default" size="sm">
              <Zap className="mr-2 h-4 w-4" />
              {isHealing ? 'Fixing...' : 'Fix Stuck'}
            </Button>
            <Button onClick={triggerSelfHealing} disabled={isHealing} variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              {isHealing ? 'Healing...' : 'Auto-Heal'}
            </Button>
          </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Learned Patterns</CardTitle>
            <CardDescription>
              Self-healing patterns that SUPER Mega Mind has learned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPatterns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No patterns learned yet. SUPER Mega Mind is standing by.
                </p>
              ) : (
                recentPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.error_category}</Badge>
                        {pattern.error_subcategory && (
                          <Badge variant="secondary">{pattern.error_subcategory}</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {typeof pattern.diagnosis === 'string' 
                          ? pattern.diagnosis 
                          : JSON.stringify(pattern.diagnosis)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Used {pattern.times_encountered} times</span>
                        <span>Success rate: {getSuccessRate(pattern)}%</span>
                        <span>Confidence: {Math.round(pattern.confidence_score * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getSuccessRate(pattern) > 80 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="learning" className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Self-Improving Learning</h3>
            <p className="text-sm text-muted-foreground">Learns from successes and builds confidence</p>
          </div>
          <Button onClick={runSelfLearning} disabled={isLearning} size="sm">
            <Brain className="mr-2 h-4 w-4" />
            {isLearning ? 'Learning...' : 'Run Learning'}
          </Button>
        </div>

        {learningStats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patterns Analyzed</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{learningStats.patternsAnalyzed}</div>
                <p className="text-xs text-muted-foreground">From successful fixes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Patterns</CardTitle>
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{learningStats.newPatternsLearned}</div>
                <p className="text-xs text-muted-foreground">Added to knowledge base</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Applied</CardTitle>
                <Zap className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{learningStats.autoAppliedFixes}</div>
                <p className="text-xs text-muted-foreground">High-confidence fixes</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Learning Capabilities</CardTitle>
            <CardDescription>
              Self-improving system that gets smarter over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Success Pattern Recognition</p>
                  <p className="text-sm text-muted-foreground">Learns from fixes that work</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Confidence Building</p>
                  <p className="text-sm text-muted-foreground">Patterns gain confidence over time</p>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Cross-Project Learning</p>
                  <p className="text-sm text-muted-foreground">Shares patterns across projects</p>
                </div>
                <Activity className="h-5 w-5 text-purple-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Auto-Apply High-Confidence</p>
                  <p className="text-sm text-muted-foreground">Fixes applied automatically when confident</p>
                </div>
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {learningStats && learningStats.crossProjectInsights > 0 && (
          <Card className="border-2 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Cross-Project Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Discovered <strong>{learningStats.crossProjectInsights}</strong> universal patterns 
                that work across multiple projects. These are now available system-wide!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="meta" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Meta-Self-Improvement</h3>
            <p className="text-sm text-muted-foreground">System improves its own improvement algorithms</p>
          </div>
          <Button onClick={runMetaImprovement} disabled={isMetaImproving} size="sm">
            <Target className="mr-2 h-4 w-4" />
            {isMetaImproving ? 'Analyzing...' : 'Run Meta-Analysis'}
          </Button>
        </div>

        {metaStats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Strategies Analyzed</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metaStats.strategiesAnalyzed}</div>
                <p className="text-xs text-muted-foreground">Learning sessions reviewed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Optimizations</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metaStats.improvementsApplied}</div>
                <p className="text-xs text-muted-foreground">Applied to learning process</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efficiency Gain</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metaStats.efficiencyGain}%</div>
                <p className="text-xs text-muted-foreground">Expected improvement</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Meta-Learning Capabilities</CardTitle>
            <CardDescription>
              The system analyzes and improves its own learning process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Strategy Effectiveness Analysis</p>
                  <p className="text-sm text-muted-foreground">Evaluates which learning approaches work best</p>
                </div>
                <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Confidence Recalibration</p>
                  <p className="text-sm text-muted-foreground">Adjusts confidence based on actual success rates</p>
                </div>
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Auto-Apply Threshold Optimization</p>
                  <p className="text-sm text-muted-foreground">Finds optimal threshold for auto-applying fixes</p>
                </div>
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Pattern Maturity Analysis</p>
                  <p className="text-sm text-muted-foreground">Identifies which patterns improve with age</p>
                </div>
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {metaStats && metaStats.confidenceBoost > 0 && (
          <Card className="border-2 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Confidence Boost Applied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Recalibrated <strong>{metaStats.confidenceBoost}</strong> patterns based on actual performance.
                The system is now more accurate at predicting fix success!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="reasoning" className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Advanced Reasoning</h3>
            <p className="text-sm text-muted-foreground">Deep analytical reasoning for complex errors</p>
          </div>
          <Button onClick={runAdvancedReasoning} disabled={isReasoning} size="sm">
            <Lightbulb className="mr-2 h-4 w-4" />
            {isReasoning ? 'Analyzing...' : 'Run Reasoning'}
          </Button>
        </div>

        {reasoningStats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors Analyzed</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reasoningStats.analyzedCount}</div>
                <p className="text-xs text-muted-foreground">Complex errors reviewed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reasoningStats.highConfidenceCount}</div>
                <p className="text-xs text-muted-foreground">Solutions found</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reasoningStats.results.length > 0 
                    ? (reasoningStats.results.reduce((sum: number, r: any) => sum + r.confidence, 0) / reasoningStats.results.length * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Solution confidence</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Advanced Reasoning Capabilities</CardTitle>
            <CardDescription>
              Powered by Gemini 2.5 Pro for deep analytical thinking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Root Cause Analysis</p>
                  <p className="text-sm text-muted-foreground">Deep analysis of fundamental issues</p>
                </div>
                <Lightbulb className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Multi-Solution Evaluation</p>
                  <p className="text-sm text-muted-foreground">Compares multiple approaches with trade-offs</p>
                </div>
                <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Side-Effect Prediction</p>
                  <p className="text-sm text-muted-foreground">Anticipates potential issues before applying fixes</p>
                </div>
                <Target className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Preventive Measures</p>
                  <p className="text-sm text-muted-foreground">Suggests long-term solutions to prevent recurrence</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {reasoningStats && reasoningStats.results.length > 0 && (
          <Card className="border-2 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500 animate-pulse" />
                Recent Reasoning Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reasoningStats.results.slice(0, 3).map((result: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Error #{result.error_id}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.recommended}</p>
                    </div>
                    <Badge variant={result.confidence >= 0.85 ? "default" : "secondary"}>
                      {(result.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="contextual" className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Contextual Auto-Optimization</h3>
            <p className="text-sm text-muted-foreground">Adapts strategies based on time, load, and system state</p>
          </div>
          <Button onClick={runContextualOptimization} disabled={isOptimizingContext} size="sm">
            <Target className="mr-2 h-4 w-4" />
            {isOptimizingContext ? 'Optimizing...' : 'Run Contextual'}
          </Button>
        </div>

        {contextualStats && (
          <>
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle>Current Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Time Context</p>
                    <p className="font-medium">
                      {contextualStats.context.isBusinessHours ? 'Business Hours' : 'Off Hours'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">System Load</p>
                    <Badge variant={contextualStats.context.systemLoad === 'high' ? 'destructive' : 'default'}>
                      {contextualStats.context.systemLoad}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Error Rate (24h)</p>
                    <p className="font-medium">{contextualStats.context.errorRate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Fix Success</p>
                    <p className="font-medium">{(contextualStats.context.fixSuccessRate * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {contextualStats.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>AI Recommendations</span>
                    <Badge>
                      {(contextualStats.recommendations.confidence * 100).toFixed(0)}% confident
                    </Badge>
                  </CardTitle>
                  <CardDescription>{contextualStats.recommendations.reasoning}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Strategy</p>
                        <Badge variant="outline" className="capitalize">
                          {contextualStats.recommendations.aggressiveness}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Auto-Apply Threshold</p>
                        <p className="text-lg font-bold">
                          {(contextualStats.recommendations.auto_apply_threshold * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Monitoring Frequency</p>
                        <p className="text-lg font-bold">
                          {contextualStats.recommendations.monitoring_frequency_minutes}min
                        </p>
                      </div>
                    </div>

                    {contextualStats.appliedOptimizations.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Applied Optimizations:</p>
                        <div className="space-y-2">
                          {contextualStats.appliedOptimizations.map((opt: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Contextual Optimization Features</CardTitle>
            <CardDescription>
              System automatically adapts to different contexts for optimal performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Time-Aware Strategies</p>
                  <p className="text-sm text-muted-foreground">Different approaches for business hours vs off-hours</p>
                </div>
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Load-Based Aggressiveness</p>
                  <p className="text-sm text-muted-foreground">Adapts fix aggressiveness based on system load</p>
                </div>
                <Activity className="h-5 w-5 text-orange-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Dynamic Thresholds</p>
                  <p className="text-sm text-muted-foreground">Adjusts confidence thresholds based on context</p>
                </div>
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Preventive Actions</p>
                  <p className="text-sm text-muted-foreground">Proactively prevents issues based on patterns</p>
                </div>
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="autonomous" className="space-y-6">
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              🤖 AUTONOMOUS MODE - FULLY AUTOMATED
            </CardTitle>
            <CardDescription>
              System runs automatically in background - no manual intervention needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Status: ACTIVE</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Running automatically</span>
                </div>
              </div>
              {autonomousStats.last_run && (
                <div className="text-sm text-muted-foreground">
                  Last cycle: {new Date(autonomousStats.last_run).toLocaleString()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{autonomousStats.cycles_run}</div>
                <div className="text-sm text-muted-foreground">Auto Cycles</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{autonomousStats.errors_detected}</div>
                <div className="text-sm text-muted-foreground">Detected</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-500">{autonomousStats.fixes_applied}</div>
                <div className="text-sm text-muted-foreground">Auto-Fixed</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{autonomousStats.patterns_learned}</div>
                <div className="text-sm text-muted-foreground">Learned</div>
              </div>
            </div>

            <Button 
              onClick={runAutonomousCycle}
              disabled={isAutonomous}
              className="w-full"
              size="lg"
            >
              {isAutonomous && <Zap className="mr-2 h-4 w-4 animate-spin" />}
              🚀 Trigger Autonomous Cycle Now
            </Button>

            <div className="space-y-2 text-sm border-t pt-4">
              <div className="font-semibold mb-2">What runs automatically:</div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Error detection & auto-fix (high confidence patterns)
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Universal pattern learning across projects
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Deployment monitoring & correlation analysis
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Contextual optimization (time & load based)
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Self-improvement meta-analysis
              </div>
            </div>

            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="font-semibold text-green-600 mb-1">✅ 100% AUTONOMOUS</div>
              <div className="text-sm text-muted-foreground">
                The system monitors, learns, fixes, and improves itself automatically. 
                Manual intervention only needed for review and oversight.
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="predictions" className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Predictive Analytics</h3>
            <p className="text-sm text-muted-foreground">AI-powered failure prediction</p>
          </div>
          <Button onClick={runPredictiveAnalysis} disabled={isAnalyzing} size="sm">
            <Target className="mr-2 h-4 w-4" />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>

        {systemHealth && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Health</span>
                <Badge variant={systemHealth.riskLevel === 'low' ? 'default' : 'destructive'}>
                  {systemHealth.riskLevel.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Health</span>
                  <span className="font-bold">{systemHealth.overall}%</span>
                </div>
                <Progress value={systemHealth.overall} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  Trend: <strong>{systemHealth.trend}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {predictions.length > 0 ? (
          <div className="grid gap-4">
            {predictions.map((prediction, idx) => (
              <Card key={idx} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{prediction.type} Prediction</span>
                    <Badge variant="outline">
                      {(prediction.probability * 100).toFixed(0)}% likely
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm"><strong>Timeframe:</strong> {prediction.timeframe}</p>
                  <p className="text-sm"><strong>Affected:</strong> {prediction.affectedSystems.join(', ')}</p>
                  <Progress value={prediction.probability * 100} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No predictions yet. Run analysis to see forecasts.</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="optimization" className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Performance Optimization</h3>
            <p className="text-sm text-muted-foreground">Automatic performance improvements</p>
          </div>
          <Button onClick={runPerformanceOptimization} disabled={isOptimizing} size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            {isOptimizing ? 'Optimizing...' : 'Auto-Optimize'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Auto-Optimization Engine</CardTitle>
            <CardDescription>
              SUPER Mega Mind continuously analyzes performance and applies safe optimizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Performance Monitoring</p>
                  <p className="text-sm text-muted-foreground">Real-time job execution analysis</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Bottleneck Detection</p>
                  <p className="text-sm text-muted-foreground">Identifying slow operations</p>
                </div>
                <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Auto-Apply Optimizations</p>
                  <p className="text-sm text-muted-foreground">Safe improvements applied automatically</p>
                </div>
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
}
