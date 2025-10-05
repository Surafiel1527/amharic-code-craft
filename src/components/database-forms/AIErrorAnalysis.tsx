import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Lightbulb, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIErrorAnalysisProps {
  provider: string;
  error: string;
  credentials: any;
  credentialId?: string;
  onFixApplied?: (updatedCredentials: any) => void;
}

export function AIErrorAnalysis({ provider, error, credentials, credentialId, onFixApplied }: AIErrorAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [applyingFix, setApplyingFix] = useState<number | null>(null);

  const analyzeError = async () => {
    setAnalyzing(true);
    try {
      const { data, error: analysisError } = await supabase.functions.invoke('analyze-database-error', {
        body: {
          errorMessage: error,
          provider,
          credentials,
          credentialId
        }
      });

      if (analysisError) throw analysisError;

      setAnalysis(data.analysis);
      toast.success('AI analysis complete');
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Failed to analyze error');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyFix = async (fix: any, index: number) => {
    setApplyingFix(index);
    try {
      const updatedCredentials = { ...credentials, ...fix.changes };
      
      // Test the connection with updated credentials
      const { data: testResult, error: testError } = await supabase.functions.invoke('test-database-connection', {
        body: {
          type: provider,
          ...updatedCredentials
        }
      });

      if (testError) throw testError;

      if (testResult.success) {
        toast.success('Fix applied successfully! Connection now works.');
        onFixApplied?.(updatedCredentials);
        
        // Mark fix as applied
        if (credentialId) {
          await supabase
            .from('database_connection_errors')
            .update({ fix_applied: true, resolved: true })
            .eq('credential_id', credentialId)
            .eq('error_message', error);
        }
      } else {
        toast.error('Fix did not resolve the issue: ' + testResult.error);
      }
    } catch (err) {
      console.error('Fix application error:', err);
      toast.error('Failed to apply fix');
    } finally {
      setApplyingFix(null);
    }
  };

  if (!error) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Connection Failed</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm">{error}</p>
        </AlertDescription>
      </Alert>

      {!analysis && (
        <Button 
          onClick={analyzeError} 
          disabled={analyzing}
          className="w-full"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4 mr-2" />
              Get AI-Powered Fix Suggestions
            </>
          )}
        </Button>
      )}

      {analysis && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Root Cause</h4>
                <p className="text-sm text-muted-foreground">{analysis.rootCause}</p>
              </div>

              {analysis.suggestedFixes && analysis.suggestedFixes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Suggested Fixes</h4>
                  <div className="space-y-3">
                    {analysis.suggestedFixes.map((fix: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{fix.title}</CardTitle>
                              <CardDescription className="mt-1">{fix.description}</CardDescription>
                            </div>
                            <Badge variant={getPriorityColor(fix.priority)}>
                              {fix.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {fix.changes && Object.keys(fix.changes).length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium mb-2">Configuration Changes:</p>
                              <code className="text-xs bg-muted p-2 rounded block">
                                {JSON.stringify(fix.changes, null, 2)}
                              </code>
                            </div>
                          )}
                          <Button 
                            onClick={() => applyFix(fix, index)}
                            disabled={applyingFix !== null}
                            className="w-full"
                          >
                            {applyingFix === index ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Applying Fix...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Apply This Fix
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {analysis.securityNotes && analysis.securityNotes.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Security Notes</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {analysis.securityNotes.map((note: string, index: number) => (
                        <li key={index} className="text-sm">{note}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {analysis.additionalResources && analysis.additionalResources.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Additional Resources</h4>
                  <div className="space-y-2">
                    {analysis.additionalResources.map((resource: string, index: number) => (
                      <a 
                        key={index}
                        href={resource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {resource}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
