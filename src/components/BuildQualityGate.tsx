import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QualityGateResult {
  passed: boolean;
  blocked: boolean;
  message: string;
  violations: Array<{
    type: string;
    message: string;
    severity: string;
    current: number;
    required: number;
  }>;
  qualityGate?: {
    minCodeQualityScore: number;
    maxSecurityIssues: number;
    maxCriticalIssues: number;
    requireTests: boolean;
    minTestCoverage: number;
    blockOnFail: boolean;
  };
}

interface BuildQualityGateProps {
  projectId?: string;
  validationResults: {
    codeQualityScore: number;
    securityIssues: number;
    criticalIssues: number;
    testCoverage?: number;
  };
  onGateChecked?: (result: QualityGateResult) => void;
}

export const BuildQualityGate = ({ 
  projectId, 
  validationResults,
  onGateChecked 
}: BuildQualityGateProps) => {
  const [gateResult, setGateResult] = useState<QualityGateResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkQualityGate = async () => {
    setIsChecking(true);

    try {
      const { data, error } = await supabase.functions.invoke('unified-quality', {
        body: {
          projectId,
          validationResults
        }
      });

      if (error) throw error;

      if (data.success) {
        setGateResult(data);
        
        if (onGateChecked) {
          onGateChecked(data);
        }

        toast({
          title: data.passed ? "Quality Gate Passed" : "Quality Gate Failed",
          description: data.message,
          variant: data.passed ? "default" : "destructive"
        });
      }
    } catch (error) {
      console.error('Quality gate check failed:', error);
      toast({
        title: "Check Failed",
        description: error instanceof Error ? error.message : "Failed to check quality gate",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Auto-check on mount
    checkQualityGate();
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <Card className={`border-2 ${
      gateResult?.passed 
        ? 'border-green-500/50 bg-gradient-to-br from-background to-green-500/5' 
        : 'border-destructive/50 bg-gradient-to-br from-background to-destructive/5'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Build Quality Gate
          </CardTitle>

          {gateResult && (
            <div className="flex items-center gap-2">
              {gateResult.passed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <Badge variant={gateResult.passed ? "default" : "destructive"}>
                {gateResult.passed ? "Passed" : "Failed"}
              </Badge>
              {gateResult.blocked && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Build Blocked
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!gateResult ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Checking quality gate...</p>
          </div>
        ) : (
          <>
            {/* Current Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Code Quality</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{validationResults.codeQualityScore}</span>
                  <span className="text-sm text-muted-foreground">/ {gateResult.qualityGate?.minCodeQualityScore}</span>
                </div>
                <Progress 
                  value={(validationResults.codeQualityScore / (gateResult.qualityGate?.minCodeQualityScore || 100)) * 100} 
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Security Issues</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{validationResults.securityIssues}</span>
                  <span className="text-sm text-muted-foreground">/ {gateResult.qualityGate?.maxSecurityIssues}</span>
                </div>
                <Progress 
                  value={validationResults.securityIssues > 0 
                    ? (validationResults.securityIssues / ((gateResult.qualityGate?.maxSecurityIssues || 1) + 1)) * 100 
                    : 0
                  }
                  className={validationResults.securityIssues > (gateResult.qualityGate?.maxSecurityIssues || 0) ? 'bg-destructive' : ''}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{validationResults.criticalIssues}</span>
                  <span className="text-sm text-muted-foreground">/ {gateResult.qualityGate?.maxCriticalIssues}</span>
                </div>
                <Progress 
                  value={validationResults.criticalIssues > 0 
                    ? (validationResults.criticalIssues / ((gateResult.qualityGate?.maxCriticalIssues || 1) + 1)) * 100 
                    : 0
                  }
                  className={validationResults.criticalIssues > (gateResult.qualityGate?.maxCriticalIssues || 0) ? 'bg-destructive' : ''}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Test Coverage</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{validationResults.testCoverage || 0}%</span>
                  {gateResult.qualityGate?.requireTests && (
                    <span className="text-sm text-muted-foreground">/ {gateResult.qualityGate?.minTestCoverage}%</span>
                  )}
                </div>
                <Progress value={validationResults.testCoverage || 0} />
              </div>
            </div>

            {/* Violations */}
            {gateResult.violations.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Quality Gate Violations:</p>
                <div className="space-y-2">
                  {gateResult.violations.map((violation, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      {getSeverityIcon(violation.severity)}
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{violation.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{violation.message}</p>
                      </div>
                      <Badge variant="outline">
                        {violation.current} / {violation.required}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className={`p-4 rounded-lg border-2 ${
              gateResult.passed 
                ? 'border-green-500/50 bg-green-500/10' 
                : 'border-destructive/50 bg-destructive/10'
            }`}>
              <div className="flex items-center gap-2">
                {gateResult.passed ? (
                  <Unlock className="h-5 w-5 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-destructive" />
                )}
                <p className="font-medium">{gateResult.message}</p>
              </div>
              {gateResult.blocked && (
                <p className="text-sm text-muted-foreground mt-2">
                  Build is blocked until all quality gate requirements are met.
                </p>
              )}
            </div>

            <Button 
              onClick={checkQualityGate}
              disabled={isChecking}
              variant="outline"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Recheck Quality Gate
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
