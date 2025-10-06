import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, Shield, Zap, Package, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DeploymentAnalysisProps {
  deploymentId: string;
}

interface Validation {
  id: string;
  validation_type: string;
  status: string;
  issues: string[];
  recommendations: string[];
  auto_fixed: boolean;
  completed_at: string;
}

export const DeploymentAnalysis = ({ deploymentId }: DeploymentAnalysisProps) => {
  const { data: validations, isLoading } = useQuery({
    queryKey: ['deployment-validations', deploymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_validations' as any)
        .select('*')
        .eq('deployment_id', deploymentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) as Validation[];
    },
  });

  const getValidationIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="h-5 w-5" />;
      case 'performance': return <Zap className="h-5 w-5" />;
      case 'compatibility': return <Globe className="h-5 w-5" />;
      case 'dependencies': return <Package className="h-5 w-5" />;
      case 'bundle_size': return <Package className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'failed': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      passed: 'default',
      warning: 'secondary',
      failed: 'destructive',
      pending: 'outline',
    };
    return variants[status] || 'outline';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Analyzing deployment...</p>
        </CardContent>
      </Card>
    );
  }

  if (!validations || validations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Info className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No analysis available yet</p>
        </CardContent>
      </Card>
    );
  }

  const passedCount = validations.filter(v => v.status === 'passed').length;
  const warningCount = validations.filter(v => v.status === 'warning').length;
  const failedCount = validations.filter(v => v.status === 'failed').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{passedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">{failedCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Validations */}
      {validations.map((validation) => (
        <Card key={validation.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getValidationIcon(validation.validation_type)}
                <div>
                  <CardTitle className="text-lg capitalize">
                    {validation.validation_type.replace('_', ' ')}
                  </CardTitle>
                  <CardDescription>
                    {validation.completed_at 
                      ? `Completed ${new Date(validation.completed_at).toLocaleString()}`
                      : 'In progress...'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {validation.auto_fixed && (
                  <Badge variant="outline" className="text-xs">Auto-fixed</Badge>
                )}
                <Badge variant={getStatusBadge(validation.status)}>
                  {validation.status}
                </Badge>
                {getStatusIcon(validation.status)}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Issues */}
            {validation.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Issues Found ({validation.issues.length})
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {validation.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {validation.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  AI Recommendations ({validation.recommendations.length})
                </h4>
                <div className="space-y-2">
                  {validation.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
