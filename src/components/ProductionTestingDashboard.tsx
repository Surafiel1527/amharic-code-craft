/**
 * Production Testing Dashboard
 * Shows auto-generated tests, failure patterns, and test health
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle,
  Play, RefreshCw, Eye, Activity 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Test {
  id: string;
  test_name: string;
  test_type: string;
  test_prompt: string;
  framework: string;
  confidence_score: number;
  run_count: number;
  pass_count: number;
  fail_count: number;
  last_run_at: string | null;
  is_active: boolean;
  tags: string[];
}

interface Failure {
  id: string;
  error_type: string;
  error_message: string;
  severity: string;
  failure_category: string;
  occurrence_count: number;
  test_generated: boolean;
  created_at: string;
}

export function ProductionTestingDashboard() {
  const [tests, setTests] = useState<Test[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load tests
      const { data: testsData, error: testsError } = await supabase
        .from('auto_generated_tests')
        .select('*')
        .order('confidence_score', { ascending: false });

      if (testsError) throw testsError;
      setTests(testsData || []);

      // Load recent failures
      const { data: failuresData, error: failuresError } = await supabase
        .from('generation_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (failuresError) throw failuresError;
      setFailures(failuresData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load testing data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (testId: string) => {
    try {
      setRunningTest(testId);
      
      const { data, error } = await supabase.functions.invoke('auto-test-runner', {
        body: { testId, environment: 'development' }
      });

      if (error) throw error;

      toast({
        title: data.results[0].passed ? "✅ Test Passed" : "❌ Test Failed",
        description: `Duration: ${data.results[0].duration_ms}ms`
      });

      loadData(); // Reload to show updated stats

    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: "Error",
        description: "Failed to run test",
        variant: "destructive"
      });
    } finally {
      setRunningTest(null);
    }
  };

  const runAllTests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('auto-test-runner', {
        body: { runAll: true, environment: 'development' }
      });

      if (error) throw error;

      toast({
        title: "Tests Complete",
        description: `${data.passed}/${data.total} tests passed`,
      });

      loadData();

    } catch (error) {
      console.error('Error running tests:', error);
      toast({
        title: "Error",
        description: "Failed to run tests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return 'destructive';
    if (severity === 'high') return 'default';
    if (severity === 'medium') return 'secondary';
    return 'outline';
  };

  if (loading && tests.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading test data...</p>
        </div>
      </div>
    );
  }

  const totalTests = tests.length;
  const activeTests = tests.filter(t => t.is_active).length;
  const highConfidence = tests.filter(t => t.confidence_score >= 80).length;
  const recentFailures = failures.filter(f => {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return new Date(f.created_at) > dayAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Production Testing</h2>
          <p className="text-muted-foreground">
            Auto-generated tests from production failures
          </p>
        </div>
        <Button onClick={runAllTests} disabled={loading}>
          <Play className="h-4 w-4 mr-2" />
          Run All Tests
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold">{totalTests}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Tests</p>
              <p className="text-2xl font-bold">{activeTests}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">High Confidence</p>
              <p className="text-2xl font-bold">{highConfidence}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Recent Failures</p>
              <p className="text-2xl font-bold">{recentFailures}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Auto-Generated Tests */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Auto-Generated Tests</h3>
        {tests.length === 0 ? (
          <Alert>
            <AlertDescription>
              No tests generated yet. Tests are automatically created when production failures occur 3+ times.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {tests.map(test => (
              <Card key={test.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{test.test_name}</h4>
                      <Badge variant="outline">{test.test_type}</Badge>
                      <Badge variant="secondary">{test.framework}</Badge>
                      {test.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {test.test_prompt.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${getConfidenceColor(test.confidence_score)}`}>
                        <TrendingUp className="h-4 w-4" />
                        {test.confidence_score}% confidence
                      </span>
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        {test.pass_count} passed
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-4 w-4" />
                        {test.fail_count} failed
                      </span>
                      {test.last_run_at && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(test.last_run_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runTest(test.id)}
                    disabled={runningTest === test.id}
                  >
                    {runningTest === test.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Failures */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Recent Production Failures</h3>
        {failures.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No failures recorded yet. The system monitors all generation errors.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {failures.slice(0, 10).map(failure => (
              <div key={failure.id} className="flex items-start justify-between border-b pb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{failure.error_type}</span>
                    <Badge variant={getSeverityColor(failure.severity)}>
                      {failure.severity}
                    </Badge>
                    <Badge variant="outline">{failure.failure_category}</Badge>
                    {failure.test_generated && (
                      <Badge variant="default" className="bg-green-500">
                        Test Generated
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {failure.error_message}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Occurred {failure.occurrence_count} times</span>
                    <span>{new Date(failure.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
