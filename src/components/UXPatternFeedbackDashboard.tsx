/**
 * UX-Pattern Feedback Loop Dashboard
 * Visualizes how user frustration impacts pattern confidence
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from "recharts";
import { 
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle, 
  Activity, Zap, RefreshCw, Brain
} from "lucide-react";

interface PatternConfidenceHistory {
  id: string;
  pattern_id: string;
  pattern_name: string;
  old_confidence: number;
  new_confidence: number;
  frustration_score: number;
  reason: string;
  created_at: string;
}

interface PatternIntervention {
  id: string;
  pattern_name: string;
  frustration_score: number;
  failure_count: number;
  suggested_alternative: string | null;
  status: string;
  created_at: string;
}

interface FeedbackLoopMetrics {
  total_adjustments: number;
  avg_frustration_impact: number;
  patterns_improved: number;
  patterns_degraded: number;
  interventions_triggered: number;
}

export const UXPatternFeedbackDashboard = () => {
  const { toast } = useToast();
  const [confidenceHistory, setConfidenceHistory] = useState<PatternConfidenceHistory[]>([]);
  const [interventions, setInterventions] = useState<PatternIntervention[]>([]);
  const [metrics, setMetrics] = useState<FeedbackLoopMetrics>({
    total_adjustments: 0,
    avg_frustration_impact: 0,
    patterns_improved: 0,
    patterns_degraded: 0,
    interventions_triggered: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('ux-pattern-feedback')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pattern_confidence_history'
      }, () => {
        loadData();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pattern_interventions'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load confidence history
      const { data: historyData, error: historyError } = await supabase
        .from('pattern_confidence_history')
        .select(`
          *,
          learned_patterns!inner(pattern_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) throw historyError;

      const formattedHistory = (historyData || []).map(item => ({
        id: item.id,
        pattern_id: item.pattern_id,
        pattern_name: (item as any).learned_patterns?.pattern_name || 'Unknown',
        old_confidence: item.old_confidence,
        new_confidence: item.new_confidence,
        frustration_score: item.frustration_score,
        reason: item.reason,
        created_at: item.created_at
      }));

      setConfidenceHistory(formattedHistory);

      // Load interventions
      const { data: interventionsData, error: interventionsError } = await supabase
        .from('pattern_interventions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (interventionsError) throw interventionsError;
      setInterventions(interventionsData || []);

      // Calculate metrics
      const improved = formattedHistory.filter(h => h.new_confidence > h.old_confidence).length;
      const degraded = formattedHistory.filter(h => h.new_confidence < h.old_confidence).length;
      const avgFrustration = formattedHistory.length > 0
        ? formattedHistory.reduce((sum, h) => sum + h.frustration_score, 0) / formattedHistory.length
        : 0;

      setMetrics({
        total_adjustments: formattedHistory.length,
        avg_frustration_impact: avgFrustration,
        patterns_improved: improved,
        patterns_degraded: degraded,
        interventions_triggered: interventionsData?.length || 0
      });

    } catch (error) {
      console.error('Error loading UX-Pattern feedback data:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback loop data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runIntegrationCycle = async () => {
    try {
      setIsRunning(true);
      
      const { data, error } = await supabase.functions.invoke('ux-pattern-integration');
      
      if (error) throw error;

      toast({
        title: "Integration Cycle Complete",
        description: `Processed ${data.results.correlations_processed} correlations, updated ${data.results.patterns_updated} patterns`,
      });

      loadData();
    } catch (error) {
      console.error('Error running integration cycle:', error);
      toast({
        title: "Error",
        description: "Failed to run integration cycle",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleIntervention = async (interventionId: string, action: 'apply' | 'dismiss') => {
    try {
      const { error } = await supabase
        .from('pattern_interventions')
        .update({ status: action === 'apply' ? 'applied' : 'dismissed' })
        .eq('id', interventionId);

      if (error) throw error;

      toast({
        title: action === 'apply' ? "Intervention Applied" : "Intervention Dismissed",
        description: `Alternative pattern ${action === 'apply' ? 'will be used' : 'suggestion dismissed'}`,
      });

      loadData();
    } catch (error) {
      console.error('Error handling intervention:', error);
      toast({
        title: "Error",
        description: "Failed to update intervention",
        variant: "destructive"
      });
    }
  };

  // Prepare chart data
  const confidenceTrendData = confidenceHistory
    .slice(0, 20)
    .reverse()
    .map((item, index) => ({
      index: index + 1,
      confidence: item.new_confidence * 100,
      frustration: item.frustration_score,
      pattern: item.pattern_name.substring(0, 15)
    }));

  const frustrationImpactData = confidenceHistory
    .map(item => ({
      frustration: item.frustration_score,
      confidenceChange: (item.new_confidence - item.old_confidence) * 100
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            UX-Pattern Feedback Loop
          </h1>
          <p className="text-muted-foreground mt-1">
            Watch how user frustration shapes AI learning in real-time
          </p>
        </div>
        <Button 
          onClick={runIntegrationCycle}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Integration Cycle
            </>
          )}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_adjustments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Activity className="w-3 h-3 inline mr-1" />
              Pattern updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Frustration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avg_frustration_impact.toFixed(1)}</div>
            <Progress value={metrics.avg_frustration_impact} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Improved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              {metrics.patterns_improved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Patterns boosted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Degraded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 flex items-center gap-1">
              <TrendingDown className="w-5 h-5" />
              {metrics.patterns_degraded}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Patterns lowered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-5 h-5" />
              {metrics.interventions_triggered}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Alerts triggered</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Confidence Timeline</TabsTrigger>
          <TabsTrigger value="impact">Frustration Impact</TabsTrigger>
          <TabsTrigger value="interventions">Active Interventions</TabsTrigger>
          <TabsTrigger value="history">Full History</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Confidence Over Time</CardTitle>
              <CardDescription>
                See how confidence evolves based on user frustration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={confidenceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pattern" />
                  <YAxis yAxisId="left" label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Frustration', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    name="Confidence %" 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="frustration" 
                    stroke="hsl(var(--destructive))" 
                    name="Frustration Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact">
          <Card>
            <CardHeader>
              <CardTitle>Frustration Impact Analysis</CardTitle>
              <CardDescription>
                Correlation between user frustration and confidence changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frustration" name="Frustration Score" label={{ value: 'Frustration Score', position: 'bottom' }} />
                  <YAxis dataKey="confidenceChange" name="Confidence Change %" label={{ value: 'Confidence Change %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    data={frustrationImpactData} 
                    fill="hsl(var(--primary))" 
                    opacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Insight:</strong> Higher frustration scores correlate with decreased pattern confidence, 
                  while low frustration boosts confidence. This creates a self-correcting feedback loop.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card>
            <CardHeader>
              <CardTitle>Active Pattern Interventions</CardTitle>
              <CardDescription>
                Patterns causing high frustration with suggested alternatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interventions.filter(i => i.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No active interventions - all patterns performing well!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interventions.filter(i => i.status === 'pending').map(intervention => (
                    <div key={intervention.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{intervention.pattern_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {intervention.failure_count} recent failures
                          </p>
                        </div>
                        <Badge variant="destructive">
                          {intervention.frustration_score.toFixed(0)} frustration
                        </Badge>
                      </div>
                      
                      {intervention.suggested_alternative && (
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">
                            Suggested Alternative:
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {intervention.suggested_alternative}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleIntervention(intervention.id, 'apply')}
                          className="flex-1"
                        >
                          Apply Alternative
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleIntervention(intervention.id, 'dismiss')}
                          className="flex-1"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Confidence Adjustment History</CardTitle>
              <CardDescription>Complete log of all pattern confidence changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {confidenceHistory.map(item => {
                  const change = item.new_confidence - item.old_confidence;
                  const isPositive = change > 0;
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.pattern_name}</span>
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                          {isPositive ? '+' : ''}{(change * 100).toFixed(1)}%
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Frustration: {item.frustration_score.toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
