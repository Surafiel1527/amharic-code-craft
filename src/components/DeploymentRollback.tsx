import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Undo2, CheckCircle2, Clock, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface DeploymentRollbackProps {
  deploymentId: string;
}

interface Rollback {
  id: string;
  from_deployment_id: string;
  to_deployment_id: string | null;
  reason: string;
  triggered_by: string;
  rollback_status: string;
  created_at: string;
  completed_at: string | null;
}

export const DeploymentRollback = ({ deploymentId }: DeploymentRollbackProps) => {
  const { data: rollbacks, isLoading } = useQuery({
    queryKey: ['deployment-rollbacks', deploymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_rollbacks' as any)
        .select('*')
        .eq('from_deployment_id', deploymentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) as Rollback[];
    },
    refetchInterval: 5000,
  });

  const { data: availableVersions } = useQuery({
    queryKey: ['rollback-versions', deploymentId],
    queryFn: async () => {
      // Get all previous successful deployments
      const { data: currentDeployment, error: currentError } = await supabase
        .from('vercel_deployments' as any)
        .select('user_id, created_at')
        .eq('id', deploymentId)
        .single();

      if (currentError || !currentDeployment) return [];

      const userIdValue = (currentDeployment as any).user_id;
      const createdAtValue = (currentDeployment as any).created_at;

      const { data, error } = await supabase
        .from('vercel_deployments' as any)
        .select('id, deployment_url, created_at, vercel_deployment_id')
        .eq('user_id', userIdValue)
        .eq('status', 'ready')
        .lt('created_at', createdAtValue)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const triggerManualRollback = async (toDeploymentId: string) => {
    try {
      const { error } = await supabase
        .from('deployment_rollbacks' as any)
        .insert({
          from_deployment_id: deploymentId,
          to_deployment_id: toDeploymentId,
          reason: 'Manual rollback requested by user',
          triggered_by: 'manual',
          rollback_status: 'pending'
        } as any);

      if (error) throw error;

      toast.success('Rollback initiated');
    } catch (error) {
      toast.error('Failed to initiate rollback');
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'pending':
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Activity className="h-6 w-6 animate-spin text-primary mr-2" />
          <p className="text-muted-foreground">Loading rollback data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rollback History */}
      <Card>
        <CardHeader>
          <CardTitle>Rollback History</CardTitle>
          <CardDescription>Previous rollback attempts for this deployment</CardDescription>
        </CardHeader>
        <CardContent>
          {!rollbacks || rollbacks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No rollbacks recorded</p>
          ) : (
            <div className="space-y-3">
              {rollbacks.map((rollback) => (
                <div key={rollback.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(rollback.rollback_status)}
                      <span className="font-medium capitalize">{rollback.rollback_status.replace('_', ' ')}</span>
                    </div>
                    <Badge variant="outline">
                      {rollback.triggered_by.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rollback.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(rollback.created_at), 'PPp')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Rollback */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Rollback</CardTitle>
          <CardDescription>
            Roll back to a previous successful deployment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!availableVersions || availableVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Undo2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No previous deployments available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableVersions.map((version: any, index: number) => (
                <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Version {availableVersions.length - index}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(version.created_at), 'PPp')}
                    </p>
                    {version.deployment_url && (
                      <code className="text-xs text-muted-foreground">{version.deployment_url}</code>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerManualRollback(version.id)}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Rollback
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
