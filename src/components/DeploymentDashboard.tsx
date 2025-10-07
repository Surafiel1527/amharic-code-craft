import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeployment } from "@/hooks/useDeployment";
import { DeploymentAnalysis } from "./DeploymentAnalysis";
import { DeploymentHealth } from "./DeploymentHealth";
import { DeploymentRollback } from "./DeploymentRollback";
import { 
  Rocket, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Globe,
  Settings,
  AlertCircle,
  Brain,
  Activity,
  Undo2
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeploymentDashboardProps {
  projectId: string;
  projectName: string;
  projectFiles: Array<{ path: string; content: string }>;
}

export const DeploymentDashboard = ({ 
  projectId, 
  projectName,
  projectFiles 
}: DeploymentDashboardProps) => {
  const { deployments, isLoading, isDeploying, deploy, cancelDeployment, latestDeployment } = useDeployment(projectId);
  const [customDomain, setCustomDomain] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const handleDeploy = async () => {
    // First run AI analysis
    toast.info('Running AI pre-deployment analysis...');
    
    try {
      const filesObject = projectFiles.reduce((acc, file) => {
        acc[file.path] = file.content;
        return acc;
      }, {} as Record<string, string>);

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('unified-deployment', {
        body: {
          deploymentId: 'temp-' + Date.now(),
          projectFiles: filesObject,
          envVariables: envVars,
        },
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        toast.warning('AI analysis unavailable, proceeding with deployment');
      } else if (analysisData?.analysis?.criticalIssues > 0) {
        toast.error(`Found ${analysisData.analysis.criticalIssues} critical issues. Review analysis before deploying.`);
        return;
      } else {
        toast.success('Pre-deployment analysis passed!');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.warning('AI analysis failed, proceeding with deployment');
    }

    // Proceed with deployment
    deploy({
      projectId,
      projectName,
      files: projectFiles,
      envVariables: Object.keys(envVars).length > 0 ? envVars : undefined,
      customDomain: customDomain || undefined,
    });
  };

  const addEnvVariable = () => {
    if (newEnvKey && newEnvValue) {
      setEnvVars({ ...envVars, [newEnvKey]: newEnvValue });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const removeEnvVariable = (key: string) => {
    const newVars = { ...envVars };
    delete newVars[key];
    setEnvVars(newVars);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'pending':
      case 'building':
      case 'deploying':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 animate-spin" />;
      case 'canceled':
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ready: 'default',
      error: 'destructive',
      pending: 'secondary',
      building: 'secondary',
      deploying: 'secondary',
      canceled: 'outline',
    };
    return variants[status] || 'outline';
  };

  const getDeploymentProgress = (status: string) => {
    switch (status) {
      case 'pending':
        return 25;
      case 'building':
        return 50;
      case 'deploying':
        return 75;
      case 'ready':
        return 100;
      case 'error':
      case 'canceled':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Latest Deployment Status */}
      {latestDeployment && (
        <Card className={latestDeployment.status === 'error' ? 'border-destructive' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(latestDeployment.status)}
                <div>
                  <CardTitle className="text-lg">Latest Deployment</CardTitle>
                  <CardDescription>
                    {format(new Date(latestDeployment.created_at), 'PPp')}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={getStatusBadge(latestDeployment.status)}>
                {latestDeployment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {['pending', 'building', 'deploying'].includes(latestDeployment.status) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{getDeploymentProgress(latestDeployment.status)}%</span>
                </div>
                <Progress value={getDeploymentProgress(latestDeployment.status)} />
              </div>
            )}

            {latestDeployment.deployment_url && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(latestDeployment.deployment_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Deployment
                </Button>
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                  {latestDeployment.deployment_url}
                </code>
              </div>
            )}

            {latestDeployment.error_message && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm font-medium text-destructive mb-1">Error</p>
                <p className="text-sm text-muted-foreground">{latestDeployment.error_message}</p>
              </div>
            )}

            {['pending', 'building', 'deploying'].includes(latestDeployment.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelDeployment(latestDeployment.id)}
              >
                Cancel Deployment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="deploy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deploy">
            <Rocket className="h-4 w-4 mr-2" />
            Deploy
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="health">
            <Activity className="h-4 w-4 mr-2" />
            Health
          </TabsTrigger>
          <TabsTrigger value="rollback">
            <Undo2 className="h-4 w-4 mr-2" />
            Rollback
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Deploy Tab */}
        <TabsContent value="deploy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deploy to Vercel</CardTitle>
              <CardDescription>
                Deploy your project to Vercel with custom domain and environment variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || isLoading}
                  size="lg"
                  className="w-full"
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  {isDeploying ? 'Deploying...' : 'Deploy Now'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Project Name</p>
                  <code className="block px-3 py-2 bg-muted rounded text-sm">
                    {projectName}
                  </code>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Files Ready</p>
                  <p className="text-sm text-muted-foreground">
                    {projectFiles.length} files ready for deployment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {latestDeployment ? (
            <DeploymentAnalysis deploymentId={latestDeployment.id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium">No Deployment Yet</p>
                <p className="text-sm text-muted-foreground">Deploy your project to see AI analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          {latestDeployment && latestDeployment.status === 'ready' ? (
            <DeploymentHealth 
              deploymentId={latestDeployment.id}
              deploymentUrl={latestDeployment.deployment_url || undefined}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium">No Active Deployment</p>
                <p className="text-sm text-muted-foreground">Deploy your project to monitor health</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rollback Tab */}
        <TabsContent value="rollback" className="space-y-4">
          {latestDeployment ? (
            <DeploymentRollback deploymentId={latestDeployment.id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Undo2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium">No Deployment Yet</p>
                <p className="text-sm text-muted-foreground">Deploy your project to enable rollback</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
              <CardDescription>
                Configure a custom domain for your deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="yourdomain.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                You'll need to configure DNS records after deployment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Add environment variables for your deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="KEY"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                />
                <Input
                  placeholder="VALUE"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  type="password"
                />
                <Button onClick={addEnvVariable} variant="outline">
                  Add
                </Button>
              </div>

              {Object.entries(envVars).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <code className="text-sm">{key}</code>
                        <span className="text-muted-foreground">=</span>
                        <code className="text-sm text-muted-foreground">••••••</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnvVariable(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment History</CardTitle>
              <CardDescription>
                View all previous deployments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deployments || deployments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Rocket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No deployments yet</p>
                  <p className="text-sm">Deploy your project to see history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deployment.status)}
                        <div>
                          <p className="font-medium">
                            {format(new Date(deployment.created_at), 'PPp')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {deployment.deployment_url || 'No URL yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadge(deployment.status)}>
                          {deployment.status}
                        </Badge>
                        {deployment.deployment_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(deployment.deployment_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
