/**
 * Prompt Evolution Dashboard
 * Phase 4B: Monitor and manage prompt improvements
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Sparkles,
  RefreshCw,
  BarChart3,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PromptMetric {
  id: string;
  prompt_text: string;
  prompt_type: string;
  success_rate: number;
  avg_quality_score: number;
  times_used: number;
  user_satisfaction: number;
  last_used_at: string;
  created_at: string;
}

interface EvolutionHistory {
  id: string;
  created_at: string;
  metadata: any;
  status: string;
}

export const PromptEvolutionDashboard = () => {
  const [prompts, setPrompts] = useState<PromptMetric[]>([]);
  const [evolutionHistory, setEvolutionHistory] = useState<EvolutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('prompt-evolution')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_approval_queue'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch prompt metrics
      const { data: promptData, error: promptError } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('times_used', { ascending: false });

      if (promptError) throw promptError;

      // Fetch evolution history
      const { data: historyData, error: historyError } = await supabase
        .from('admin_approval_queue')
        .select('*')
        .eq('item_type', 'prompt_improvement')
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyError) throw historyError;

      setPrompts((promptData || []) as any);
      setEvolutionHistory((historyData || []) as any);
    } catch (error: any) {
      toast({
        title: "Error Loading Data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runEvolutionCycle = async () => {
    try {
      setRunning(true);
      toast({
        title: "🧬 Evolution Cycle Starting",
        description: "Analyzing prompts and generating improvements..."
      });

      const { data, error } = await supabase.functions.invoke('prompt-evolution-engine');

      if (error) throw error;

      toast({
        title: "✅ Evolution Cycle Complete",
        description: `Generated ${data.results.improvements_generated} improvements, ${data.results.submitted_for_approval} submitted for review`
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Evolution Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRunning(false);
    }
  };

  // Calculate dashboard metrics
  const avgSuccessRate = prompts.length > 0
    ? prompts.reduce((sum, p) => sum + (p.success_rate || 0), 0) / prompts.length
    : 0;

  const avgQualityScore = prompts.length > 0
    ? prompts.reduce((sum, p) => sum + (p.avg_quality_score || 0), 0) / prompts.length
    : 0;

  const totalUsage = prompts.reduce((sum, p) => sum + (p.times_used || 0), 0);

  const needsImprovement = prompts.filter(p => p.success_rate < 70 && p.times_used > 5).length;

  const pendingApprovals = evolutionHistory.filter(h => h.status === 'pending').length;

  // Prepare chart data
  const performanceData = prompts
    .sort((a, b) => b.times_used - a.times_used)
    .slice(0, 10)
    .map(p => ({
      name: p.prompt_type,
      success: p.success_rate,
      quality: p.avg_quality_score,
      usage: p.times_used
    }));

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Prompt Evolution Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered prompt improvement and optimization
          </p>
        </div>
        <Button 
          onClick={runEvolutionCycle} 
          disabled={running}
          size="lg"
        >
          {running ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Run Evolution Cycle
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Avg Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <Progress value={avgSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Avg Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgQualityScore.toFixed(1)}/100</div>
            <Progress value={avgQualityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Total Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2">All prompts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-500" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{needsImprovement}</div>
            {pendingApprovals > 0 && (
              <Badge variant="secondary" className="mt-2">
                {pendingApprovals} pending approval
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompts">All Prompts</TabsTrigger>
          <TabsTrigger value="performance">Performance Chart</TabsTrigger>
          <TabsTrigger value="history">Evolution History</TabsTrigger>
        </TabsList>

        {/* All Prompts Tab */}
        <TabsContent value="prompts" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Loading prompts...</p>
              </CardContent>
            </Card>
          ) : prompts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No prompts found</p>
              </CardContent>
            </Card>
          ) : (
            prompts.map(prompt => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {prompt.prompt_type}
                        {prompt.success_rate < 70 && prompt.times_used > 5 && (
                          <Badge variant="destructive">Needs Improvement</Badge>
                        )}
                        {prompt.success_rate >= 90 && (
                          <Badge variant="default">High Performer</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {prompt.prompt_text}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(prompt.success_rate)}`}>
                        {prompt.success_rate?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quality Score</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(prompt.avg_quality_score)}`}>
                        {prompt.avg_quality_score?.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Times Used</p>
                      <p className="text-2xl font-bold">{prompt.times_used}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Satisfaction</p>
                      <p className="text-2xl font-bold">
                        {prompt.user_satisfaction?.toFixed(1)}/10
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Performance Chart Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Prompts Performance</CardTitle>
              <CardDescription>Success rate and quality scores by usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" fill="hsl(var(--primary))" name="Success Rate %" />
                  <Bar dataKey="quality" fill="hsl(var(--secondary))" name="Quality Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolution History Tab */}
        <TabsContent value="history" className="space-y-4">
          {evolutionHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No evolution history yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Run an evolution cycle to see improvements
                </p>
              </CardContent>
            </Card>
          ) : (
            evolutionHistory.map(item => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Prompt Improvement
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(item.status)}>
                        {item.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.metadata && (
                    <div className="space-y-2 text-sm">
                      <p><strong>Changes:</strong> {item.metadata.changes?.length || 0} improvements</p>
                      <p><strong>Expected Impact:</strong> +{item.metadata.impact?.metrics?.expected_success_rate || 0}% success rate</p>
                      {item.metadata.reasoning && (
                        <p className="text-muted-foreground">{item.metadata.reasoning}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
