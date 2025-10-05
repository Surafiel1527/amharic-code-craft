import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Info, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConfigValidationProps {
  provider: string;
  credentials: any;
}

export function ConfigValidation({ provider, credentials }: ConfigValidationProps) {
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateConfig();
  }, [provider, credentials]);

  const validateConfig = async () => {
    if (!provider || !credentials) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-database-config', {
        body: { provider, credentials }
      });

      if (!error && data?.validation) {
        setValidation(data.validation);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !validation) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'low': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-destructive';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Configuration Analysis</CardTitle>
          </div>
          <Badge variant={validation.isValid ? 'default' : 'destructive'}>
            {validation.isValid ? 'Valid' : 'Issues Found'}
          </Badge>
        </div>
        <CardDescription>
          Security and best practice validation for your {provider} connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Security Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(validation.securityScore)}`}>
              {validation.securityScore}/100
            </span>
          </div>
          <Progress value={validation.securityScore} className="h-2" />
        </div>

        {validation.issues && validation.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Issues Found
            </h4>
            {validation.issues.map((issue: any, index: number) => (
              <Alert key={index} variant="destructive">
                <div className="flex items-start gap-2">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <AlertTitle className="text-sm">{issue.field}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {issue.message}
                      {issue.fix && (
                        <div className="mt-2">
                          <code className="text-xs bg-destructive/10 px-2 py-1 rounded">
                            Recommended: {JSON.stringify(issue.fix)}
                          </code>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {validation.suggestions && validation.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Suggestions
            </h4>
            {validation.suggestions.map((suggestion: any, index: number) => (
              <Alert key={index}>
                <div className="flex items-start gap-2">
                  {getSeverityIcon(suggestion.severity)}
                  <div className="flex-1">
                    {suggestion.type === 'pattern' ? (
                      <div>
                        <AlertTitle className="text-sm">Successful Pattern Found</AlertTitle>
                        <AlertDescription className="text-xs">
                          {suggestion.message}
                        </AlertDescription>
                      </div>
                    ) : (
                      <div>
                        <AlertTitle className="text-sm">{suggestion.field}</AlertTitle>
                        <AlertDescription className="text-xs">
                          {suggestion.reason}
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span>Current: <code>{String(suggestion.current)}</code></span>
                            <span>→</span>
                            <span>Recommended: <code>{String(suggestion.recommended)}</code></span>
                          </div>
                        </AlertDescription>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {validation.isValid && validation.issues.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Configuration Looks Good!</AlertTitle>
            <AlertDescription>
              Your {provider} configuration follows best practices and security guidelines.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
