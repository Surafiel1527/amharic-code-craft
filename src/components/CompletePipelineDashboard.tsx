import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Rocket,
  FileCheck,
  Package,
  Hammer,
  TestTube,
  Heart,
  ExternalLink
} from "lucide-react";

interface PipelineStage {
  id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  output_logs: string | null;
  error_message: string | null;
}

interface DeploymentCheck {
  check_name: string;
  passed: boolean;
  message: string;
}

interface CompletePipelineDashboardProps {
  projectId: string;
  projectName: string;
  projectFiles: Record<string, string>;
  envVariables?: Record<string, string>;
}

const stageIcons: Record<string, any> = {
  'Pre-flight Checks': FileCheck,
  'Dependency Analysis': Package,
  'Build': Hammer,
  'Tests': TestTube,
  'Deploy to Vercel': Rocket,
  'Health Check': Heart,
};

export const CompletePipelineDashboard = ({
  projectId,
  projectName,
  projectFiles,
  envVariables,
}: CompletePipelineDashboardProps) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [checks, setChecks] = useState<DeploymentCheck[]>([]);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentDeploymentId) return;

    const fetchPipelineData = async () => {
      const { data: stagesData } = await supabase
        .from('deployment_pipeline_stages')
        .select('*')
        .eq('deployment_id', currentDeploymentId)
        .order('stage_order', { ascending: true });

      if (stagesData) {
        setStages(stagesData as PipelineStage[]);
      }

      const { data: checksData } = await supabase
        .from('deployment_checks')
        .select('*')
        .eq('deployment_id', currentDeploymentId);

      if (checksData) {
        setChecks(checksData);
      }

      const { data: deployment } = await supabase
        .from('vercel_deployments')
        .select('deployment_url, status')
        .eq('id', currentDeploymentId)
        .single();

      if (deployment) {
        setDeploymentUrl(deployment.deployment_url);
        if (['ready', 'error', 'canceled'].includes(deployment.status)) {
          setIsDeploying(false);
        }
      }
    };

    fetchPipelineData();

    const channel = supabase
      .channel(`pipeline-${currentDeploymentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployment_pipeline_stages',
          filter: `deployment_id=eq.${currentDeploymentId}`,
        },
        () => {
          fetchPipelineData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDeploymentId]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setStages([]);
    setChecks([]);
    setDeploymentUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('complete-vercel-pipeline', {
        body: {
          projectId,
          projectName,
          files: projectFiles,
          envVariables,
          runTests: true,
          runBuild: true,
        },
      });

      if (error) throw error;

      setCurrentDeploymentId(data.deploymentId);
      toast.success('Deployment pipeline started!');
    } catch (error: any) {
      toast.error(`Deployment failed: ${error.message}`);
      setIsDeploying(false);
    }
  };

  const getStageIcon = (stageName: string) => {
    const Icon = stageIcons[stageName] || Clock;
    return Icon;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      running: 'default',
      completed: 'success',
      failed: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = stages.length;
  const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Deployment Pipeline</CardTitle>
          <CardDescription>
            Full JS/TS/React → Vercel deployment with build, test, and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="w-full"
            size="lg"
          >
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Start Deployment Pipeline
              </>
            )}
          </Button>

          {stages.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Pipeline Progress</span>
                  <span>{completedStages}/{totalStages} stages</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-3">
                {stages.map((stage) => {
                  const Icon = getStageIcon(stage.stage_name);
                  return (
                    <div
                      key={stage.id}
                      className="flex items-start gap-3 p-4 border rounded-lg"
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{stage.stage_name}</span>
                          <div className="flex items-center gap-2">
                            {stage.duration_ms && (
                              <span className="text-xs text-muted-foreground">
                                {(stage.duration_ms / 1000).toFixed(1)}s
                              </span>
                            )}
                            {getStatusIcon(stage.status)}
                          </div>
                        </div>
                        {stage.output_logs && (
                          <p className="text-sm text-muted-foreground">{stage.output_logs}</p>
                        )}
                        {stage.error_message && (
                          <p className="text-sm text-red-500">{stage.error_message}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {checks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Pre-flight Checks</h4>
              <div className="grid grid-cols-2 gap-2">
                {checks.map((check, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm p-2 border rounded"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{check.check_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deploymentUrl && (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Deployment Successful!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {deploymentUrl}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://${deploymentUrl}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
