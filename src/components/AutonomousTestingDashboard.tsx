import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, CheckCircle2, XCircle, Clock, Zap, TestTube, Play, RefreshCw, TrendingUp } from "lucide-react";

export const AutonomousTestingDashboard = () => {
  const [suites, setSuites] = useState<any[]>([]);
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [suitesRes, runsRes, metricsRes] = await Promise.all([
        supabase.from('test_suites').select('*').order('created_at', { ascending: false }),
        supabase.from('test_runs').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('quality_metrics').select('*').eq('metric_type', 'test_coverage').order('recorded_at', { ascending: false }).limit(1)
      ]);

      if (suitesRes.data) setSuites(suitesRes.data);
      if (runsRes.data) setTestRuns(runsRes.data);
      if (metricsRes.data) setQualityMetrics(metricsRes.data);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching test data:', error);
    }
  };

  const toggleSuite = async (suiteId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('test_suites')
        .update({ is_active: !currentState } as any)
        .eq('id', suiteId);

      if (error) throw error;

      toast({
        title: !currentState ? "Suite Enabled" : "Suite Disabled",
        description: !currentState ? "Tests will run automatically" : "Automatic testing paused"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleAutoRun = async (suiteId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('test_suites')
        .update({ auto_run_enabled: !currentState } as any)
        .eq('id', suiteId);

      if (error) throw error;

      toast({
        title: !currentState ? "Auto-Run Enabled" : "Auto-Run Disabled",
        description: !currentState ? "Tests will run automatically" : "Tests require manual trigger"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const runTests = async (suiteId?: string) => {
    try {
      const { error } = await supabase.functions.invoke('ai-test-auto-runner', {
        body: { suiteId }
      });

      if (error) throw error;

      toast({
        title: "Tests Running",
        description: "Test execution started"
      });

      setTimeout(fetchData, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const totalTests = suites.reduce((sum, s) => sum + (s.total_tests || 0), 0);
  const passingTests = suites.reduce((sum, s) => sum + (s.passing_tests || 0), 0);
  const failingTests = suites.reduce((sum, s) => sum + (s.failing_tests || 0), 0);
  const passRate = totalTests > 0 ? Math.round((passingTests / totalTests) * 100) : 0;
  const coverage = qualityMetrics[0]?.metric_value || 0;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading test data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
            <Progress value={passRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {passingTests}/{totalTests} tests passing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverage.toFixed(1)}%</div>
            <Progress value={coverage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Code coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suites</CardTitle>
            <TestTube className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suites.filter(s => s.is_active).length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {suites.length} total suites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failing Tests</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failingTests}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suites">
        <TabsList>
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Suites</CardTitle>
                  <CardDescription>
                    Automated test suites running continuously
                  </CardDescription>
                </div>
                <Button onClick={() => runTests()}>
                  <Play className="w-4 h-4 mr-2" />
                  Run All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No test suites configured</p>
                ) : (
                  suites.map((suite) => (
                    <div key={suite.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <TestTube className="w-5 h-5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{suite.suite_name}</p>
                            <Badge variant="outline" className="capitalize">{suite.suite_type}</Badge>
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{suite.passing_tests}/{suite.total_tests} passing</span>
                            <span>{suite.coverage_percentage}% coverage</span>
                            {suite.last_run_at && (
                              <span>Last run: {new Date(suite.last_run_at).toLocaleTimeString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Auto-Run</span>
                          <Switch
                            checked={suite.auto_run_enabled}
                            onCheckedChange={() => toggleAutoRun(suite.id, suite.auto_run_enabled)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Active</span>
                          <Switch
                            checked={suite.is_active}
                            onCheckedChange={() => toggleSuite(suite.id, suite.is_active)}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTests(suite.id)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Runs</CardTitle>
              <CardDescription>
                Latest automated test executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <p className="font-medium capitalize">{run.run_type} Run</p>
                        <p className="text-sm text-muted-foreground">
                          {run.passed_tests}/{run.total_tests} passed · {run.duration_ms}ms
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>
                        {run.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.created_at).toLocaleTimeString()}
                      </span>
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