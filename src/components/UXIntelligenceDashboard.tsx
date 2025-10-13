import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface UXSignal {
  id: string;
  signal_type: string;
  signal_value: number;
  signal_data: any;
  created_at: string;
  generation_id?: string;
}

interface QualityMetric {
  id: string;
  quality_score: number;
  framework_complete: boolean;
  preview_renderable: boolean;
  issues_found: number;
  quality_healed: boolean;
  created_at: string;
}

interface FrustrationScore {
  timestamp: string;
  score: number;
  signalCount: number;
}

export const UXIntelligenceDashboard = () => {
  const [uxSignals, setUxSignals] = useState<UXSignal[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [frustrationData, setFrustrationData] = useState<FrustrationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Setup realtime subscriptions
    const signalsChannel = supabase
      .channel('ux-signals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ux_quality_signals'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      signalsChannel.unsubscribe();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch UX signals
      const { data: signals, error: signalsError } = await supabase
        .from('ux_quality_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (signalsError) throw signalsError;

      // Fetch quality metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('generation_quality_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (metricsError) throw metricsError;

      setUxSignals(signals || []);
      setQualityMetrics(metrics || []);
      
      // Calculate frustration scores over time
      calculateFrustrationTrend(signals || []);
    } catch (error: any) {
      toast({
        title: 'Error loading dashboard data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateFrustrationTrend = (signals: UXSignal[]) => {
    const grouped = signals.reduce((acc, signal) => {
      const hour = new Date(signal.created_at).toISOString().slice(0, 13);
      if (!acc[hour]) {
        acc[hour] = { signals: [], totalScore: 0 };
      }
      acc[hour].signals.push(signal);
      acc[hour].totalScore += calculateSignalScore(signal);
      return acc;
    }, {} as Record<string, { signals: UXSignal[], totalScore: number }>);

    const trend = Object.entries(grouped).map(([timestamp, data]) => ({
      timestamp: new Date(timestamp + ':00:00').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: Math.min(100, data.totalScore),
      signalCount: data.signals.length
    }));

    setFrustrationData(trend.reverse());
  };

  const calculateSignalScore = (signal: UXSignal): number => {
    const weights = {
      'code_error': 15,
      'generation_retry': 10,
      'long_generation_time': 5,
      'quality_issue_detected': 8,
      'generation_complete': -5
    };
    return weights[signal.signal_type as keyof typeof weights] || 0;
  };

  const avgQualityScore = qualityMetrics.length > 0
    ? Math.round(qualityMetrics.reduce((sum, m) => sum + m.quality_score, 0) / qualityMetrics.length)
    : 0;

  const healingRate = qualityMetrics.length > 0
    ? Math.round((qualityMetrics.filter(m => m.quality_healed).length / qualityMetrics.length) * 100)
    : 0;

  const currentFrustration = frustrationData.length > 0 
    ? frustrationData[frustrationData.length - 1].score 
    : 0;

  const recentInterventions = uxSignals.filter(s => 
    s.signal_data?.intervention_triggered && 
    new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">UX Intelligence Dashboard</h1>
          <p className="text-muted-foreground">Real-time user experience monitoring and quality assurance</p>
        </div>
        <Badge variant={currentFrustration > 50 ? 'destructive' : 'default'}>
          {currentFrustration > 50 ? 'High Frustration' : 'System Healthy'}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgQualityScore}%</div>
            <Progress value={avgQualityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healing Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healingRate}%</div>
            <Progress value={healingRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frustration Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(currentFrustration)}</div>
            <Progress 
              value={currentFrustration} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions (24h)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentInterventions}</div>
            <p className="text-xs text-muted-foreground mt-2">Proactive fixes</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="frustration">Frustration Trend</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="signals">Recent Signals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>Real-time monitoring of user experience and quality</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={frustrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" name="Frustration Score" />
                  <Line type="monotone" dataKey="signalCount" stroke="hsl(var(--secondary))" name="Signal Count" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frustration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frustration Score Trend</CardTitle>
              <CardDescription>Tracking user frustration signals over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={frustrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="hsl(var(--primary))" name="Frustration Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qualityMetrics.slice(0, 10).map(metric => (
              <Card key={metric.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Quality Report</CardTitle>
                    {metric.quality_healed && (
                      <Badge variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Healed
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {new Date(metric.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Quality Score</span>
                    <span className="font-bold">{metric.quality_score}%</span>
                  </div>
                  <Progress value={metric.quality_score} />
                  
                  <div className="flex gap-2 mt-2">
                    <Badge variant={metric.framework_complete ? 'default' : 'secondary'}>
                      Framework: {metric.framework_complete ? 'Complete' : 'Incomplete'}
                    </Badge>
                    <Badge variant={metric.preview_renderable ? 'default' : 'secondary'}>
                      Preview: {metric.preview_renderable ? 'Ready' : 'Not Ready'}
                    </Badge>
                  </div>
                  
                  {metric.issues_found > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{metric.issues_found} issues found</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent UX Signals</CardTitle>
              <CardDescription>Live stream of user experience events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uxSignals.map(signal => (
                  <div key={signal.id} className="flex items-start justify-between border-b pb-2">
                    <div className="flex items-start gap-3">
                      <Brain className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{signal.signal_type.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-muted-foreground">
                          Value: {signal.signal_value}
                        </div>
                        {signal.signal_data?.intervention_triggered && (
                          <Badge variant="outline" className="mt-1">
                            <Zap className="h-3 w-3 mr-1" />
                            Intervention Triggered
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(signal.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
