import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  GitBranch, 
  TestTube, 
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  Info
} from "lucide-react";

interface ImplementationPlan {
  summary: string;
  approach: string;
  steps: Array<{
    step: number;
    action: string;
    files: string[];
    purpose: string;
    estimatedTime: string;
  }>;
  fileBreakdown: Array<{
    path: string;
    type: string;
    purpose: string;
    keyFeatures: string[];
    dependencies: string[];
    risks: string[];
  }>;
  integrationStrategy: {
    existingFiles: Array<{
      file: string;
      changes: string[];
      reason: string;
    }>;
    newConnections: Array<{
      from: string;
      to: string;
      type: string;
      purpose: string;
    }>;
  };
  testingStrategy: {
    unitTests: string[];
    integrationTests: string[];
    manualChecks: string[];
  };
  rollbackPlan: {
    steps: string[];
    safetyMeasures: string[];
  };
  successCriteria: string[];
}

interface CodebaseAnalysis {
  totalFiles: number;
  similarFunctionality: Array<{
    file: string;
    similarity: number;
    reason: string;
    canEnhance: boolean;
  }>;
  duplicates: {
    duplicates: Array<{ name: string; locations: string[] }>;
    conflicts: Array<{ issue: string; severity: string }>;
  };
  recommendations: string[];
}

interface ImplementationPlanViewerProps {
  plan: ImplementationPlan;
  codebaseAnalysis: CodebaseAnalysis;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function ImplementationPlanViewer({ 
  plan, 
  codebaseAnalysis, 
  onApprove, 
  onReject,
  isLoading = false 
}: ImplementationPlanViewerProps) {
  const hasConflicts = codebaseAnalysis.duplicates.conflicts.length > 0;
  const hasDuplicates = codebaseAnalysis.duplicates.duplicates.length > 0;
  const complexityColor = 
    plan.steps.length > 10 ? "text-red-500" : 
    plan.steps.length > 5 ? "text-yellow-500" : "text-green-500";

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              Implementation Plan
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{plan.summary}</p>
          </div>
          <Badge variant="secondary" className={complexityColor}>
            {plan.steps.length} steps
          </Badge>
        </div>

        {/* Alerts */}
        {hasConflicts && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Conflicts Detected</AlertTitle>
            <AlertDescription>
              {codebaseAnalysis.duplicates.conflicts.length} conflict(s) found. Review carefully before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {hasDuplicates && !hasConflicts && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Duplicates Found</AlertTitle>
            <AlertDescription>
              {codebaseAnalysis.duplicates.duplicates.length} duplicate(s) will be consolidated.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-6">
          {/* Approach */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Approach
            </h4>
            <p className="text-sm text-muted-foreground">{plan.approach}</p>
          </div>

          {/* Codebase Analysis */}
          {codebaseAnalysis.similarFunctionality.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Similar Functionality Found
              </h4>
              <div className="space-y-2">
                {codebaseAnalysis.similarFunctionality.slice(0, 3).map((match, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs">{match.file}</code>
                      <Badge variant={match.canEnhance ? "default" : "outline"} className="text-xs">
                        {match.similarity}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{match.reason}</p>
                    {match.canEnhance && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                        ✓ Will be enhanced
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {codebaseAnalysis.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Recommendations</h4>
              <div className="space-y-2">
                {codebaseAnalysis.recommendations.map((rec, idx) => {
                  const isWarning = rec.includes('⚠️') || rec.includes('CRITICAL');
                  const isPositive = rec.includes('✅') || rec.includes('RECOMMENDED');
                  return (
                    <div 
                      key={idx} 
                      className={`p-2 rounded text-xs ${
                        isWarning ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                        isPositive ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                        'bg-muted'
                      }`}
                    >
                      {rec}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Implementation Steps */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Implementation Steps
            </h4>
            <div className="space-y-3">
              {plan.steps.map((step) => (
                <div key={step.step} className="p-3 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {step.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{step.action}</div>
                      <div className="text-xs text-muted-foreground">{step.purpose}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {step.estimatedTime}
                        </Badge>
                        {step.files.map((file, i) => (
                          <code key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {file}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Breakdown */}
          {plan.fileBreakdown.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                File Breakdown
              </h4>
              <div className="space-y-3">
                {plan.fileBreakdown.map((file, idx) => (
                  <div key={idx} className="p-3 rounded-lg border">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-medium">{file.path}</code>
                        <Badge variant="outline" className="text-xs">{file.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{file.purpose}</p>
                      
                      {file.keyFeatures.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1">Key Features:</div>
                          <div className="flex flex-wrap gap-1">
                            {file.keyFeatures.map((feat, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {feat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {file.dependencies.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1">Dependencies:</div>
                          <div className="flex flex-wrap gap-1">
                            {file.dependencies.map((dep, i) => (
                              <code key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {dep}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {file.risks.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1 text-yellow-600 dark:text-yellow-400">
                            Risks:
                          </div>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {file.risks.map((risk, i) => (
                              <li key={i}>• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integration Strategy */}
          {(plan.integrationStrategy.existingFiles.length > 0 || 
            plan.integrationStrategy.newConnections.length > 0) && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Integration Strategy
              </h4>
              
              {plan.integrationStrategy.existingFiles.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium mb-2">Files to Modify:</div>
                  <div className="space-y-2">
                    {plan.integrationStrategy.existingFiles.map((file, idx) => (
                      <div key={idx} className="p-2 rounded border">
                        <code className="text-xs font-medium">{file.file}</code>
                        <p className="text-xs text-muted-foreground mt-1">{file.reason}</p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {file.changes.map((change, i) => (
                            <li key={i}>• {change}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.integrationStrategy.newConnections.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">New Connections:</div>
                  <div className="space-y-2">
                    {plan.integrationStrategy.newConnections.map((conn, idx) => (
                      <div key={idx} className="p-2 rounded border text-xs">
                        <div className="flex items-center gap-2">
                          <code className="font-medium">{conn.from}</code>
                          <span className="text-muted-foreground">→</span>
                          <code className="font-medium">{conn.to}</code>
                          <Badge variant="outline" className="text-xs">{conn.type}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{conn.purpose}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Testing Strategy */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Testing Strategy
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 rounded-lg border">
                <div className="text-xs font-medium mb-2">Unit Tests</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {plan.testingStrategy.unitTests.map((test, i) => (
                    <li key={i}>• {test}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs font-medium mb-2">Integration Tests</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {plan.testingStrategy.integrationTests.map((test, i) => (
                    <li key={i}>• {test}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs font-medium mb-2">Manual Checks</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {plan.testingStrategy.manualChecks.map((check, i) => (
                    <li key={i}>• {check}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Rollback Plan */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rollback Plan
            </h4>
            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium mb-1">Steps:</div>
                <ol className="text-xs text-muted-foreground space-y-1">
                  {plan.rollbackPlan.steps.map((step, i) => (
                    <li key={i}>{i + 1}. {step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">Safety Measures:</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {plan.rollbackPlan.safetyMeasures.map((measure, i) => (
                    <li key={i}>• {measure}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Success Criteria */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Success Criteria
            </h4>
            <ul className="space-y-2">
              {plan.successCriteria.map((criterion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Review the plan and approve to proceed with implementation
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onReject}
            disabled={isLoading}
          >
            Suggest Changes
          </Button>
          <Button 
            onClick={onApprove}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve & Implement
          </Button>
        </div>
      </div>
    </Card>
  );
}
