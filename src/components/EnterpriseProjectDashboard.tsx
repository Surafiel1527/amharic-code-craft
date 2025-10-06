import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Package,
  Rocket,
  Shield,
  TestTube,
  TrendingUp,
  Zap,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

export const EnterpriseProjectDashboard = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [buildOptimizations, setBuildOptimizations] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Real-time updates
    const channel = supabase
      .channel('enterprise-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictive_alerts' }, loadPredictions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'build_optimizations' }, loadOptimizations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadPredictions(),
        loadOptimizations(),
        loadDeployments(),
        loadSystemHealth()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    const { data } = await supabase
      .from('predictive_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    setPredictions(data || []);
  };

  const loadOptimizations = async () => {
    const { data } = await supabase
      .from('build_optimizations')
      .select('*')
      .eq('auto_apply', true)
      .order('confidence_score', { ascending: false })
      .limit(5);

    setBuildOptimizations(data || []);
  };

  const loadDeployments = async () => {
    const { data } = await supabase
      .from('deployment_pipelines')
      .select('*')
      .eq('is_active', true)
      .order('last_run_at', { ascending: false })
      .limit(5);

    setDeployments(data || []);
  };

  const loadSystemHealth = async () => {
    // Get various system metrics
    const [jobs, errors, packages, tests] = await Promise.all([
      supabase.from('ai_generation_jobs').select('status', { count: 'exact', head: true }),
      supabase.from('detected_errors').select('severity', { count: 'exact', head: true }),
      supabase.from('package_operations').select('status', { count: 'exact', head: true }),
      supabase.from('test_runs').select('status', { count: 'exact', head: true })
    ]);

    setSystemHealth({
      jobs: jobs.count || 0,
      errors: errors.count || 0,
      packages: packages.count || 0,
      tests: tests.count || 0
    });
  };

  const runPredictiveAnalysis = async () => {
    toast.loading("Running predictive analysis...");
    
    try {
      await supabase.functions.invoke('predictive-alert-engine');
      toast.success("Predictive analysis complete!");
      loadPredictions();
    } catch (error) {
      toast.error("Failed to run analysis");
      console.error(error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            Enterprise Intelligence Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Predictive analytics, smart builds, and autonomous deployments
          </p>
        </div>
        <Button onClick={runPredictiveAnalysis} className="gap-2">
          <Zap className="h-4 w-4" />
          Run Prediction
        </Button>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{systemHealth.jobs}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Errors</p>
                  <p className="text-2xl font-bold">{systemHealth.errors}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Packages</p>
                  <p className="text-2xl font-bold">{systemHealth.packages}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Test Runs</p>
                  <p className="text-2xl font-bold">{systemHealth.tests}</p>
                </div>
                <TestTube className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">Predictive Alerts</TabsTrigger>
          <TabsTrigger value="builds">Smart Builds</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
        </TabsList>

        {/* Predictive Alerts */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Predictive Failure Alerts
              </CardTitle>
              <CardDescription>
                AI-predicted failures before they occur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {predictions.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    No predicted failures. System is healthy!
                  </AlertDescription>
                </Alert>
              ) : (
                predictions.map((pred) => (
                  <Alert key={pred.id} variant={pred.severity === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{pred.alert_type}</span>
                        <Badge variant={getSeverityColor(pred.severity) as any}>
                          {pred.prediction_confidence}% confidence
                        </Badge>
                      </div>
                      {pred.predicted_failure_time && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Predicted: {new Date(pred.predicted_failure_time).toLocaleString()}
                        </div>
                      )}
                      <div className="mt-2">
                        <p className="text-sm font-medium">Recommended Actions:</p>
                        <ul className="text-sm list-disc list-inside">
                          {(pred.recommended_actions || []).map((action: string, idx: number) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Builds */}
        <TabsContent value="builds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Build Optimizations
              </CardTitle>
              <CardDescription>
                Learned optimizations ready to auto-apply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {buildOptimizations.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    No optimizations available yet. System is learning...
                  </AlertDescription>
                </Alert>
              ) : (
                buildOptimizations.map((opt) => (
                  <div key={opt.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{opt.optimization_name}</h4>
                      <Badge variant="secondary">
                        {opt.improvement_percentage}% faster
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Type: {opt.optimization_type} • Confidence: {opt.confidence_score}%
                    </p>
                    <p className="text-sm">
                      Applied {opt.applied_count || 0} times • {opt.success_rate}% success rate
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deployments */}
        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Active Deployment Pipelines
              </CardTitle>
              <CardDescription>
                Automated deployment with health monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deployments.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    No active pipelines. Create one to enable auto-deployment.
                  </AlertDescription>
                </Alert>
              ) : (
                deployments.map((dep) => (
                  <div key={dep.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{dep.pipeline_name}</h4>
                      {dep.auto_deploy && (
                        <Badge variant="secondary" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Auto-Deploy
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {dep.success_count || 0} successes
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        {dep.failure_count || 0} failures
                      </span>
                      {dep.auto_rollback && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-blue-500" />
                          Auto-rollback enabled
                        </span>
                      )}
                    </div>
                    {dep.last_run_at && (
                      <p className="text-xs text-muted-foreground">
                        Last run: {new Date(dep.last_run_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};