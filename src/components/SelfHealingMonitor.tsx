import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function SelfHealingMonitor() {
  const [stats, setStats] = useState<SelfHealingStats | null>(null);
  const [recentPatterns, setRecentPatterns] = useState<HealingPattern[]>([]);
  const [isHealing, setIsHealing] = useState(false);
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
      // Get stuck jobs first
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

      // Fix each stuck job
      for (const job of jobs) {
        try {
          const { error } = await supabase.functions.invoke('fix-stuck-job', {
            body: { jobId: job.id }
          });
          
          if (error) {
            console.error(`Failed to fix job ${job.id}:`, error);
          } else {
            console.log(`✅ Fixed job ${job.id}`);
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

  const getSuccessRate = (pattern: HealingPattern) => {
    const total = pattern.success_count + pattern.failure_count;
    if (total === 0) return 0;
    return Math.round((pattern.success_count / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Mega Mind Self-Healing</h2>
            <p className="text-sm text-muted-foreground">
              Continuously learning and improving from errors
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fixStuckJobs} disabled={isHealing} variant="default">
            <Zap className="mr-2 h-4 w-4" />
            {isHealing ? 'Fixing...' : 'Fix Stuck Jobs'}
          </Button>
          <Button onClick={triggerSelfHealing} disabled={isHealing} variant="outline">
            <Brain className="mr-2 h-4 w-4" />
            {isHealing ? 'Healing...' : 'Auto-Heal All'}
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
    </div>
  );
}
