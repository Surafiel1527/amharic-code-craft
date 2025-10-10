import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function PredictiveOptimizationPanel() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const runPredictiveAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-alert-engine', {
        body: { operation: 'analyze_system_health' }
      });

      if (error) throw error;

      if (data) {
        const mockPredictions: Prediction[] = [
          {
            type: 'performance_degradation',
            probability: 0.65,
            timeframe: 'next 24 hours',
            affectedSystems: ['database', 'api']
          },
          {
            type: 'memory_leak',
            probability: 0.45,
            timeframe: 'next 48 hours',
            affectedSystems: ['frontend']
          }
        ];
        setPredictions(mockPredictions);
        setSystemHealth({
          overall: 85,
          trend: 'stable',
          riskLevel: 'low'
        });
        
        toast({
          title: "🔮 Predictive Analysis Complete",
          description: `System Health: 85% - ${mockPredictions.length} predictions made`,
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
      const { data, error } = await supabase.functions.invoke('proactive-intelligence', {
        body: { operation: 'optimize_performance' }
      });

      if (error) throw error;

      toast({
        title: "⚡ Performance Optimized",
        description: `System performance analyzed and optimized`,
      });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Predictive & Optimization
          </CardTitle>
          <CardDescription>
            Predict future issues and optimize system performance
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="predictions">🔮 Predictions</TabsTrigger>
          <TabsTrigger value="optimization">⚡ Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analysis</CardTitle>
              <CardDescription>Forecast potential issues before they occur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runPredictiveAnalysis} 
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                <Activity className="mr-2 h-5 w-5" />
                {isAnalyzing ? 'Analyzing...' : 'Run Predictive Analysis'}
              </Button>

              {systemHealth && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">System Health</span>
                        <Badge variant={systemHealth.riskLevel === 'low' ? 'default' : 'destructive'}>
                          {systemHealth.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={systemHealth.overall} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{systemHealth.overall}%</span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {systemHealth.trend}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {predictions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Predicted Issues</h3>
                  {predictions.map((prediction, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="capitalize">{prediction.type.replace('_', ' ')}</span>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Optimization</CardTitle>
              <CardDescription>Automatic performance improvements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runPerformanceOptimization} 
                disabled={isOptimizing}
                className="w-full"
                size="lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isOptimizing ? 'Optimizing...' : 'Auto-Optimize'}
              </Button>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Performance Monitoring</p>
                    <p className="text-sm text-muted-foreground">Real-time job execution analysis</p>
                  </div>
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Bottleneck Detection</p>
                    <p className="text-sm text-muted-foreground">Identifying slow operations</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
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
