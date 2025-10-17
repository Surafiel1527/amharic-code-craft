/**
 * AUTONOMOUS AGENT STATUS DASHBOARD
 * 
 * Real-time monitoring of the world-class autonomous agent system:
 * - Error detection and auto-healing
 * - Decision-making intelligence
 * - User context tracking
 * - Learning patterns and confidence
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Activity, Brain, Zap, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  overallScore: number;
  timestamp: string;
  errorDetection: {
    totalErrors24h: number;
    criticalErrors: number;
    resolvedErrors: number;
    resolutionRate: number;
    score: number;
  };
  autoHealing: {
    totalFixes24h: number;
    appliedFixes: number;
    successRate: number;
    score: number;
  };
  decisionMaking: {
    totalDecisions24h: number;
    avgConfidence: number;
    autonomousRate: number;
    score: number;
  };
  contextTracking: {
    activeSessions1h: number;
    status: string;
  };
  learning: {
    learnedPatterns: number;
    avgPatternConfidence: number;
    score: number;
  };
}

export default function AgentStatus() {
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchAgentHealth = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('agent-health');

      if (error) throw error;

      if (data.success) {
        setHealth(data.health);
        setRecommendations(data.recommendations || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch agent health:', error);
      toast({
        title: 'Health Check Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerHealing = async () => {
    try {
      toast({
        title: 'Healing Cycle Started',
        description: 'Running autonomous error detection and healing...'
      });

      const { data, error } = await supabase.functions.invoke('autonomous-healing', {
        body: { maxErrors: 10, autoApply: true }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Healing Complete',
          description: data.message,
          variant: data.errorsHealed > 0 ? 'default' : 'destructive'
        });
        fetchAgentHealth(); // Refresh health
      }
    } catch (error: any) {
      toast({
        title: 'Healing Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchAgentHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAgentHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !health) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading agent status...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-500';
    if (status === 'degraded') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Brain className="w-10 h-10 text-primary" />
              Autonomous Agent Status
            </h1>
            <p className="text-muted-foreground mt-2">
              World-class self-healing AI system monitoring
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={triggerHealing} variant="outline" size="lg">
              <Zap className="w-4 h-4 mr-2" />
              Trigger Healing
            </Button>
            <Button onClick={fetchAgentHealth} variant="ghost" size="icon">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Overall Health */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${health ? getStatusColor(health.status) : 'bg-gray-400'} animate-pulse`} />
              <div>
                <h2 className="text-2xl font-bold">System Status</h2>
                <p className="text-sm text-muted-foreground">
                  Last checked: {health ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-5xl font-bold ${health ? getScoreColor(health.overallScore) : ''}`}>
                {health?.overallScore || 0}
              </div>
              <p className="text-sm text-muted-foreground">Overall Health</p>
            </div>
          </div>
          
          <Progress value={health?.overallScore || 0} className="h-3" />
        </Card>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Error Detection */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <h3 className="font-semibold text-lg">Error Detection</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Errors (24h)</span>
                <Badge variant="outline">{health?.errorDetection.totalErrors24h || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Critical</span>
                <Badge variant={health?.errorDetection.criticalErrors ? 'destructive' : 'outline'}>
                  {health?.errorDetection.criticalErrors || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Resolved</span>
                <Badge variant="default">{health?.errorDetection.resolvedErrors || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Resolution Rate</span>
                <span className={`font-bold ${health ? getScoreColor(health.errorDetection.resolutionRate) : ''}`}>
                  {health?.errorDetection.resolutionRate || 0}%
                </span>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={`font-bold text-lg ${health ? getScoreColor(health.errorDetection.score) : ''}`}>
                  {health?.errorDetection.score || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Auto-Healing */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-blue-500" />
              <h3 className="font-semibold text-lg">Auto-Healing</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fixes Applied (24h)</span>
                <Badge variant="default">{health?.autoHealing.appliedFixes || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Attempts</span>
                <Badge variant="outline">{health?.autoHealing.totalFixes24h || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className={`font-bold ${health ? getScoreColor(health.autoHealing.successRate) : ''}`}>
                  {health?.autoHealing.successRate || 0}%
                </span>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={`font-bold text-lg ${health ? getScoreColor(health.autoHealing.score) : ''}`}>
                  {health?.autoHealing.score || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Decision Making */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-purple-500" />
              <h3 className="font-semibold text-lg">Decision Making</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Decisions (24h)</span>
                <Badge variant="outline">{health?.decisionMaking.totalDecisions24h || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Confidence</span>
                <span className={`font-bold ${health ? getScoreColor(health.decisionMaking.avgConfidence) : ''}`}>
                  {health?.decisionMaking.avgConfidence || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Autonomous</span>
                <span className={`font-bold ${health ? getScoreColor(health.decisionMaking.autonomousRate) : ''}`}>
                  {health?.decisionMaking.autonomousRate || 0}%
                </span>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={`font-bold text-lg ${health ? getScoreColor(health.decisionMaking.score) : ''}`}>
                  {health?.decisionMaking.score || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Context Tracking */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-green-500" />
              <h3 className="font-semibold text-lg">Context Tracking</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Sessions (1h)</span>
                <Badge variant="default">{health?.contextTracking.activeSessions1h || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={health?.contextTracking.status === 'active' ? 'default' : 'secondary'}>
                  {health?.contextTracking.status || 'idle'}
                </Badge>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                <span>Tracking user behavior patterns</span>
              </div>
            </div>
          </Card>

          {/* Pattern Learning */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-indigo-500" />
              <h3 className="font-semibold text-lg">Pattern Learning</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Learned Patterns</span>
                <Badge variant="default">{health?.learning.learnedPatterns || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Confidence</span>
                <span className={`font-bold ${health ? getScoreColor(health.learning.avgPatternConfidence) : ''}`}>
                  {health?.learning.avgPatternConfidence || 0}%
                </span>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={`font-bold text-lg ${health ? getScoreColor(health.learning.score) : ''}`}>
                  {health?.learning.score || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* System Capabilities */}
          <Card className="p-6 space-y-4 lg:col-span-1">
            <h3 className="font-semibold text-lg">Active Capabilities</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Universal Error Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Autonomous Healing (Cron: 5min)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Intelligent Decision Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">User Context Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Pattern Learning & Evolution</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">AI Recommendations</h3>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Activity className="w-5 h-5 mt-0.5 text-primary" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Real-time Error Feed */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
          <RecentActivity />
        </Card>
      </div>
    </div>
  );
}

function RecentActivity() {
  const [errors, setErrors] = useState<any[]>([]);
  const [fixes, setFixes] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      // Fetch recent errors
      const { data: errorData } = await supabase
        .from('detected_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent fixes
      const { data: fixData } = await supabase
        .from('auto_fixes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (errorData) setErrors(errorData);
      if (fixData) setFixes(fixData);
    };

    fetchRecentActivity();

    // Subscribe to realtime updates
    const errorChannel = supabase
      .channel('detected_errors_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'detected_errors' },
        () => fetchRecentActivity()
      )
      .subscribe();

    const fixChannel = supabase
      .channel('auto_fixes_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'auto_fixes' },
        () => fetchRecentActivity()
      )
      .subscribe();

    return () => {
      errorChannel.unsubscribe();
      fixChannel.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-3">
      {errors.length === 0 && fixes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No recent activity - system is healthy ✅
        </p>
      ) : (
        <>
          {errors.map((error) => (
            <div key={error.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="font-medium text-sm">{error.error_type}</p>
                <p className="text-xs text-muted-foreground">{error.error_message}</p>
              </div>
              <Badge variant={error.status === 'resolved' ? 'default' : 'secondary'}>
                {error.status}
              </Badge>
            </div>
          ))}
          
          {fixes.map((fix) => (
            <div key={fix.id} className="flex items-center gap-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-sm">{fix.fix_type}</p>
                <p className="text-xs text-muted-foreground">{fix.explanation}</p>
              </div>
              <Badge variant={fix.status === 'applied' ? 'default' : 'outline'}>
                {fix.status}
              </Badge>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
