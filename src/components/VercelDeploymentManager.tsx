import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, CheckCircle, XCircle, Clock, Plug, AlertCircle } from "lucide-react";
import { EnvironmentVariablesManager } from "./EnvironmentVariablesManager";
import { DeploymentLogsViewer } from "./DeploymentLogsViewer";

interface Deployment {
  id: string;
  vercel_deployment_id: string;
  vercel_url: string;
  status: string;
  environment: string;
  created_at: string;
  ready_at?: string;
  error_message?: string;
}

export const VercelDeploymentManager = ({ projectId, projectName }: { projectId: string; projectName: string }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [connectionEmail, setConnectionEmail] = useState("");
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    loadDeployments();
  }, [projectId]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('vercel_connections')
        .select('user_email')
        .single();

      if (data && !error) {
        setIsConnected(true);
        setConnectionEmail(data.user_email || '');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const loadDeployments = async () => {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setDeployments(data);
      }
    } catch (error) {
      console.error('Error loading deployments:', error);
    }
  };

  const connectToVercel = async () => {
    if (!accessToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Vercel access token",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vercel-integration', {
        body: { action: 'connect', accessToken },
      });

      if (error) throw error;

      if (data.success) {
        setIsConnected(true);
        setConnectionEmail(data.connection.email);
        setAccessToken("");
        toast({
          title: "Connected!",
          description: `Successfully connected to Vercel as ${data.connection.email}`,
        });
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const deployToVercel = async () => {
    setIsDeploying(true);
    try {
      // Get environment variables
      const { data: envVars } = await supabase
        .from('project_environment_variables')
        .select('key, value, target')
        .eq('project_id', projectId);

      // Get project code
      const { data: project } = await supabase
        .from('projects')
        .select('html_code')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Prepare files for deployment
      const files = [
        {
          file: 'index.html',
          data: project.html_code || '<html><body>Hello World</body></html>',
        },
        {
          file: 'package.json',
          data: JSON.stringify({
            name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            version: '1.0.0',
            scripts: {
              build: 'echo "Build complete"',
            },
          }),
        },
      ];

      const { data, error } = await supabase.functions.invoke('vercel-integration', {
        body: {
          action: 'deploy',
          projectId,
          projectName,
          files,
          environmentVariables: envVars || [],
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Deployed!",
          description: `Your project is deploying to ${data.deployment.url}`,
        });
        loadDeployments();
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'BUILDING':
      case 'QUEUED':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ERROR':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'BUILDING':
      case 'QUEUED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connect to Vercel
          </CardTitle>
          <CardDescription>
            Connect your Vercel account to enable one-click deployments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Vercel Access Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Enter your Vercel access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get your token from{" "}
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Vercel Account Settings
              </a>
            </p>
          </div>
          <Button onClick={connectToVercel} disabled={isConnecting}>
            {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Vercel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deploy to Vercel</CardTitle>
          <CardDescription>
            Connected as {connectionEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={deployToVercel} disabled={isDeploying} className="flex-1">
              {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deploy to Production
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Manage Env Variables</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Environment Variables</DialogTitle>
                  <DialogDescription>
                    Manage environment variables for this project
                  </DialogDescription>
                </DialogHeader>
                <EnvironmentVariablesManager projectId={projectId} />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>
            View and manage your deployments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <Card key={deployment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deployment.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(deployment.status)}>
                              {deployment.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(deployment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <a
                            href={`https://${deployment.vercel_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            {deployment.vercel_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDeployment(deployment.id)}
                          >
                            View Logs
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Deployment Logs</DialogTitle>
                            <DialogDescription>
                              Build and deployment logs for {deployment.vercel_url}
                            </DialogDescription>
                          </DialogHeader>
                          <DeploymentLogsViewer deploymentId={deployment.id} />
                        </DialogContent>
                      </Dialog>
                    </div>
                    {deployment.error_message && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                        {deployment.error_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {deployments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No deployments yet. Click "Deploy to Production" to get started!
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};