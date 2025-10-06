import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bug, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Zap,
  TrendingUp,
  Shield,
  XCircle,
  Play
} from 'lucide-react';
import { useSmartDebugger, RuntimeError, ErrorFix } from '@/hooks/useSmartDebugger';
import { cn } from '@/lib/utils';

interface SmartDebuggerProps {
  projectId?: string;
  code?: string;
  className?: string;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'destructive', label: 'Critical' },
  error: { icon: Bug, color: 'destructive', label: 'Error' },
  warning: { icon: AlertTriangle, color: 'default', label: 'Warning' }
};

const ErrorCard: React.FC<{
  error: RuntimeError;
  onAnalyze: (error: RuntimeError) => void;
  isAnalyzing: boolean;
}> = ({ error, onAnalyze, isAnalyzing }) => {
  const SeverityIcon = severityConfig[error.severity].icon;

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <SeverityIcon className="h-5 w-5 mt-0.5 text-destructive" />
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                {error.errorMessage.substring(0, 100)}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {error.filePath && `${error.filePath}:${error.lineNumber || 0}`}
                {' · '}
                {new Date(error.occurredAt).toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>
          <Badge variant={severityConfig[error.severity].color as any}>
            {severityConfig[error.severity].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          onClick={() => onAnalyze(error)}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Analyze & Fix
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const FixCard: React.FC<{
  fix: ErrorFix;
  onApply: (fixId: string) => void;
}> = ({ fix, onApply }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={cn("mb-4", fix.applied && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {fix.description}
              {fix.applied && (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Applied
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {fix.type.replace('-', ' ').toUpperCase()} · Priority {fix.priority}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {fix.explanation}
        </p>

        {isExpanded && (
          <div className="space-y-3 mb-4">
            {fix.originalCode && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Original Code:</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  <code>{fix.originalCode}</code>
                </pre>
              </div>
            )}
            
            <div>
              <p className="text-xs font-semibold text-success mb-1">Fixed Code:</p>
              <pre className="text-xs bg-success/10 p-2 rounded overflow-x-auto">
                <code>{fix.fixedCode}</code>
              </pre>
            </div>

            <div className="bg-info/5 p-3 rounded">
              <p className="text-xs font-semibold text-info mb-2">Steps to Apply:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                {fix.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Button>
          
          {!fix.applied && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onApply(fix.id)}
              className="ml-auto"
            >
              <Play className="h-4 w-4 mr-1" />
              Apply Fix
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const SmartDebugger: React.FC<SmartDebuggerProps> = ({
  projectId,
  code,
  className
}) => {
  const {
    errors,
    currentError,
    analysis,
    fixes,
    isAnalyzing,
    analyzeError,
    applyFix,
    getRecentErrors,
    getErrorPatterns
  } = useSmartDebugger({ projectId, autoAnalyze: true });

  const [errorPatterns, setErrorPatterns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('errors');

  useEffect(() => {
    getRecentErrors();
  }, [getRecentErrors]);

  useEffect(() => {
    const loadPatterns = async () => {
      const patterns = await getErrorPatterns();
      setErrorPatterns(patterns);
    };
    loadPatterns();
  }, [getErrorPatterns]);

  const handleAnalyze = async (error: RuntimeError) => {
    await analyzeError(error, code);
  };

  const criticalErrors = errors.filter(e => e.severity === 'critical');
  const regularErrors = errors.filter(e => e.severity === 'error');

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Smart Debugger
              </CardTitle>
              <CardDescription>
                Intelligent error detection and automated fixes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                {criticalErrors.length} Critical
              </Badge>
              <Badge variant="secondary">
                {regularErrors.length} Errors
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="errors">
                Errors ({errors.length})
              </TabsTrigger>
              <TabsTrigger value="analysis">
                Analysis
              </TabsTrigger>
              <TabsTrigger value="patterns">
                Patterns ({errorPatterns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="errors" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {errors.length > 0 ? (
                  errors.map((error) => (
                    <ErrorCard
                      key={error.id}
                      error={error}
                      onAnalyze={handleAnalyze}
                      isAnalyzing={isAnalyzing && currentError?.id === error.id}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-success" />
                    <p className="font-medium">No errors detected</p>
                    <p className="text-sm">Your code is running smoothly!</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              {analysis && currentError ? (
                <div className="space-y-4">
                  {/* Root Cause */}
                  <Card className="bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Root Cause Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{analysis.rootCause}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="secondary">
                          {analysis.category}
                        </Badge>
                        <Badge variant="outline">
                          {analysis.confidence}% Confidence
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Error Path */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Error Trace Path</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.errorPath.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {idx + 1}
                            </div>
                            <p className="text-sm">{step}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fixes */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Suggested Fixes</h3>
                    <ScrollArea className="h-[400px]">
                      {fixes.map((fix) => (
                        <FixCard
                          key={fix.id}
                          fix={fix}
                          onApply={applyFix}
                        />
                      ))}
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bug className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select an error to view analysis</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="patterns" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {errorPatterns.length > 0 ? (
                  errorPatterns.map((pattern) => (
                    <Card key={pattern.id} className="mb-3">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          {pattern.pattern_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Detected {pattern.detection_count} times · {pattern.fix_success_rate}% success rate
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {pattern.confidence_score}% Confidence
                          </Badge>
                          {pattern.fix_success_rate > 80 && (
                            <Badge variant="default">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              High Success
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No error patterns detected yet</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
