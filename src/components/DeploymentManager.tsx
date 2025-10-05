import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Rocket, Globe, Server, GitBranch, Sparkles,
  CheckCircle2, XCircle, Clock, RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface Deployment {
  id: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolled-back';
  timestamp: Date;
  url?: string;
  duration?: number;
}

export function DeploymentManager() {
  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: '1',
      environment: 'production',
      version: 'v1.2.0',
      status: 'success',
      timestamp: new Date(Date.now() - 86400000),
      url: 'https://myapp.com',
      duration: 245
    },
    {
      id: '2',
      environment: 'staging',
      version: 'v1.3.0-beta',
      status: 'success',
      timestamp: new Date(Date.now() - 3600000),
      url: 'https://staging.myapp.com',
      duration: 187
    }
  ]);

  const [deploying, setDeploying] = useState<string | null>(null);

  const deploy = async (environment: Deployment['environment']) => {
    const version = `v1.${deployments.length}.0`;
    const newDeployment: Deployment = {
      id: crypto.randomUUID(),
      environment,
      version,
      status: 'deploying',
      timestamp: new Date()
    };

    setDeployments(prev => [newDeployment, ...prev]);
    setDeploying(newDeployment.id);

    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 3000));

    setDeployments(prev => prev.map(d => 
      d.id === newDeployment.id
        ? {
            ...d,
            status: 'success',
            duration: Math.floor(Math.random() * 200) + 100,
            url: environment === 'production' 
              ? 'https://myapp.com' 
              : `https://${environment}.myapp.com`
          }
        : d
    ));

    setDeploying(null);
    toast.success(`Deployed ${version} to ${environment}!`);
  };

  const rollback = async (deploymentId: string) => {
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) return;

    setDeployments(prev => prev.map(d => 
      d.id === deploymentId ? { ...d, status: 'rolled-back' as const } : d
    ));

    toast.success(`Rolled back ${deployment.version} from ${deployment.environment}`);
  };

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'deploying': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'rolled-back': return <RotateCcw className="w-4 h-4 text-orange-500" />;
    }
  };

  const getEnvironmentColor = (env: Deployment['environment']) => {
    switch (env) {
      case 'development': return 'bg-blue-500/10 text-blue-500';
      case 'staging': return 'bg-yellow-500/10 text-yellow-500';
      case 'production': return 'bg-green-500/10 text-green-500';
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5" />
          <h3 className="font-semibold">Deployment Manager</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      </div>

      {/* Environment Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <span className="font-medium">Development</span>
            </div>
            <Badge className="bg-blue-500/10 text-blue-500">DEV</Badge>
          </div>
          <Button 
            onClick={() => deploy('development')} 
            disabled={deploying !== null}
            className="w-full"
            variant="outline"
          >
            Deploy
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span className="font-medium">Staging</span>
            </div>
            <Badge className="bg-yellow-500/10 text-yellow-500">STG</Badge>
          </div>
          <Button 
            onClick={() => deploy('staging')} 
            disabled={deploying !== null}
            className="w-full"
            variant="outline"
          >
            Deploy
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="font-medium">Production</span>
            </div>
            <Badge className="bg-green-500/10 text-green-500">PROD</Badge>
          </div>
          <Button 
            onClick={() => deploy('production')} 
            disabled={deploying !== null}
            className="w-full"
          >
            Deploy
          </Button>
        </Card>
      </div>

      {/* Deployment History */}
      <div>
        <h4 className="font-medium mb-3">Deployment History</h4>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(deployment.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{deployment.version}</span>
                        <Badge className={getEnvironmentColor(deployment.environment)}>
                          {deployment.environment}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {deployment.timestamp.toLocaleString()}
                        {deployment.duration && ` • ${deployment.duration}s`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deployment.url && deployment.status === 'success' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(deployment.url, '_blank')}
                      >
                        <Globe className="w-3 h-3 mr-1" />
                        Visit
                      </Button>
                    )}
                    {deployment.status === 'success' && deployment.environment === 'production' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rollback(deployment.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Card className="p-3 bg-muted/50">
        <h4 className="text-sm font-medium mb-2">Features:</h4>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Multi-environment deployments</li>
          <li>• One-click rollback</li>
          <li>• Deployment history tracking</li>
          <li>• Version management</li>
          <li>• Status monitoring</li>
          <li>• Environment URLs</li>
        </ul>
      </Card>
    </Card>
  );
}