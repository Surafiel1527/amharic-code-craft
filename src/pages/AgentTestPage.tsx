/**
 * AGENT TESTING PAGE
 * 
 * Interactive page to test and validate the autonomous agent system
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FlaskConical, 
  Activity, 
  Brain, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  ArrowRight
} from 'lucide-react';
import { runAllAgentTests } from '@/test-error-detection';
import { useNavigate } from 'react-router-dom';

export default function AgentTestPage() {
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const runErrorDetectionTest = async () => {
    setTestRunning(true);
    toast({
      title: '🧪 Running Error Detection Tests',
      description: 'Intentionally creating errors for agent to detect...'
    });

    try {
      await runAllAgentTests();
      
      // Wait a bit then check detected errors
      setTimeout(async () => {
        const { data, error } = await supabase
          .from('detected_errors')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setTestResults({
            errorsDetected: data.length,
            errors: data
          });
          
          toast({
            title: '✅ Error Detection Working',
            description: `Detected ${data.length} test errors. Check agent dashboard for healing results.`
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTestRunning(false);
    }
  };

  const testDecisionEngine = async () => {
    toast({
      title: '🤔 Testing Decision Engine',
      description: 'Making an autonomous decision...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('intelligent-decision', {
        body: {
          options: [
            {
              id: 'opt_caching',
              name: 'Implement Caching Strategy',
              description: 'Add Redis cache layer for frequently accessed data',
              pros: ['Faster response times', 'Reduced database load', 'Better UX'],
              cons: ['Cache invalidation complexity', 'Additional infrastructure'],
              estimatedEffort: 'medium',
              riskLevel: 'low'
            },
            {
              id: 'opt_optimization',
              name: 'Database Query Optimization',
              description: 'Optimize slow queries with indexes and query refactoring',
              pros: ['No new infrastructure', 'Immediate improvements', 'Lower costs'],
              cons: ['May not scale long-term', 'Requires careful analysis'],
              estimatedEffort: 'low',
              riskLevel: 'low'
            },
            {
              id: 'opt_scaling',
              name: 'Horizontal Scaling',
              description: 'Add read replicas and load balancers',
              pros: ['Handles high traffic', 'Fault tolerance', 'Future-proof'],
              cons: ['High cost', 'Complex setup', 'Data consistency challenges'],
              estimatedEffort: 'high',
              riskLevel: 'high'
            }
          ],
          context: {
            scenario: 'Performance optimization for growing application',
            userGoal: 'Improve response times while managing costs',
            constraints: {
              time: 'normal',
              budget: 'medium',
              complexity: 'moderate'
            },
            userPreferences: {
              preferredApproach: 'balanced',
              riskTolerance: 'medium',
              speedVsQuality: 'quality'
            }
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '✅ Decision Made',
          description: `Recommended: ${data.decision.bestOption.name} with ${Math.round(data.decision.confidence * 100)}% confidence`
        });
        
        setTestResults({
          ...testResults,
          decision: data.decision
        });
      }
    } catch (error: any) {
      toast({
        title: 'Decision Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const checkAgentHealth = async () => {
    toast({
      title: '🏥 Checking Agent Health',
      description: 'Querying all subsystems...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('agent-health');

      if (error) throw error;

      if (data.success) {
        setTestResults({
          ...testResults,
          health: data.health
        });
        
        toast({
          title: '✅ Health Check Complete',
          description: `Overall Score: ${data.health.overallScore}% - Status: ${data.health.status.toUpperCase()}`
        });
      }
    } catch (error: any) {
      toast({
        title: 'Health Check Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <FlaskConical className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold">Agent System Testing</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Interactive tests to validate all autonomous agent capabilities
          </p>
        </div>

        {/* Test Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Test 1: Error Detection */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-lg">Error Detection</h3>
                <p className="text-sm text-muted-foreground">Test universal error capture</p>
              </div>
            </div>
            
            <Button 
              onClick={runErrorDetectionTest}
              disabled={testRunning}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Error Tests
            </Button>
            
            {testResults?.errorsDetected !== undefined && (
              <div className="pt-3 border-t space-y-2">
                <Badge variant="default">
                  {testResults.errorsDetected} Errors Detected
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Autonomous healing will process these in next cron cycle (5 min) or via manual trigger
                </p>
              </div>
            )}
          </Card>

          {/* Test 2: Decision Engine */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold text-lg">Decision Engine</h3>
                <p className="text-sm text-muted-foreground">Test intelligent decisions</p>
              </div>
            </div>
            
            <Button 
              onClick={testDecisionEngine}
              variant="secondary"
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Decision
            </Button>
            
            {testResults?.decision && (
              <div className="pt-3 border-t space-y-2">
                <Badge variant="default">
                  {testResults.decision.bestOption.name}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {Math.round(testResults.decision.confidence * 100)}% confidence
                </p>
              </div>
            )}
          </Card>

          {/* Test 3: Agent Health */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">Health Monitor</h3>
                <p className="text-sm text-muted-foreground">Check system status</p>
              </div>
            </div>
            
            <Button 
              onClick={checkAgentHealth}
              variant="outline"
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Check Health
            </Button>
            
            {testResults?.health && (
              <div className="pt-3 border-t space-y-2">
                <Badge 
                  variant={
                    testResults.health.status === 'healthy' ? 'default' :
                    testResults.health.status === 'degraded' ? 'secondary' : 'destructive'
                  }
                >
                  {testResults.health.overallScore}% - {testResults.health.status}
                </Badge>
              </div>
            )}
          </Card>
        </div>

        {/* Results Summary */}
        {testResults && (
          <Card className="p-8 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Test Results Summary
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {testResults.errorsDetected !== undefined && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Error Detection</h3>
                  <p className="text-3xl font-bold text-green-600">{testResults.errorsDetected}</p>
                  <p className="text-sm text-muted-foreground">Errors captured</p>
                </div>
              )}
              
              {testResults.decision && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Decision Made</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round(testResults.decision.confidence * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Confidence score</p>
                </div>
              )}
              
              {testResults.health && (
                <div className="space-y-2">
                  <h3 className="font-semibold">System Health</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {testResults.health.overallScore}
                  </p>
                  <p className="text-sm text-muted-foreground">Overall score</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <Button 
            size="lg"
            onClick={() => navigate('/agent-status')}
          >
            <Zap className="w-5 h-5 mr-2" />
            View Agent Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-3">📋 Testing Instructions</h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Run "Error Detection" test to create intentional errors</li>
            <li>Check console logs to see errors being captured in real-time</li>
            <li>Wait 5 minutes for cron job OR click "Trigger Healing" on agent dashboard</li>
            <li>Run "Decision Engine" test to see autonomous decision-making</li>
            <li>Run "Health Monitor" to see overall system status</li>
            <li>Navigate to /agent-status to see the full monitoring dashboard</li>
            <li>Check database tables: detected_errors, auto_fixes, decision_logs</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
