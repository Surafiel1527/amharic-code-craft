import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface PendingAction {
  id: string;
  error_id: string;
  fix_type: string;
  status: string;
  created_at: string;
  metadata?: any;
  ai_confidence: number;
  explanation: string;
}

interface AutonomousMetric {
  total_fixes: number;
  successful_fixes: number;
  failed_fixes: number;
  pending_approvals: number;
  avg_confidence: number;
  patterns_learned: number;
}

export default function AutonomousDashboard() {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [metrics, setMetrics] = useState<AutonomousMetric | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('autonomous-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_fixes'
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load pending actions
      const { data: actions } = await supabase
        .from('auto_fixes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingActions(actions || []);

      // Calculate metrics
      const { data: allFixes } = await supabase
        .from('auto_fixes')
        .select('*');

      if (allFixes) {
        const totalFixes = allFixes.length;
        const successful = allFixes.filter(f => f.status === 'applied').length;
        const failed = allFixes.filter(f => f.status === 'failed').length;
        const pending = allFixes.filter(f => f.status === 'pending').length;
        const avgConfidence = allFixes.reduce((sum, f) => sum + (f.ai_confidence || 0), 0) / totalFixes;

        const { count: patternsCount } = await supabase
          .from('universal_error_patterns')
          .select('*', { count: 'exact', head: true });

        setMetrics({
          total_fixes: totalFixes,
          successful_fixes: successful,
          failed_fixes: failed,
          pending_approvals: pending,
          avg_confidence: avgConfidence,
          patterns_learned: patternsCount || 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('auto_fixes')
        .update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq('id', actionId);

      if (error) throw error;

      toast.success('Action approved and executed');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to approve action');
      console.error(error);
    }
  };

  const rejectAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('auto_fixes')
        .update({ status: 'rolled_back', rolled_back_at: new Date().toISOString() })
        .eq('id', actionId);

      if (error) throw error;

      toast.success('Action rejected and rolled back');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to reject action');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Autonomous System Dashboard</h1>
          <p className="text-muted-foreground">Monitor and control AI-powered autonomous improvements</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Zap className="mr-2 h-4 w-4" />
          Autonomous Mode Active
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Fixes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_fixes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics?.successful_fixes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics?.failed_fixes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{metrics?.pending_approvals || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {metrics?.avg_confidence ? `${(metrics.avg_confidence * 100).toFixed(0)}%` : '0%'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patterns Learned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.patterns_learned || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Autonomous Actions</CardTitle>
          <CardDescription>Review and approve AI-suggested improvements</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending actions. All systems running smoothly!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <div key={action.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{action.fix_type}</h4>
                      <p className="text-sm text-muted-foreground">{action.explanation}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          Confidence: {(action.ai_confidence * 100).toFixed(0)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(action.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveAction(action.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectAction(action.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  {action.metadata && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        View technical details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(action.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
