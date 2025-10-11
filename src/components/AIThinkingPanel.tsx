import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, AlertCircle, Lightbulb, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface ThinkingStep {
  step: string;
  status: 'analyzing' | 'complete' | 'active' | 'pending';
  confidence?: number;
  reasoning?: string;
  timestamp: Date;
}

interface AIThinkingPanelProps {
  isVisible: boolean;
  currentStep?: string;
  confidence?: number;
  reasoning?: string;
  steps?: ThinkingStep[];
  classificationResult?: {
    type: string;
    intent: string;
    complexity: string;
  };
}

export function AIThinkingPanel({
  isVisible,
  currentStep,
  confidence,
  reasoning,
  steps = [],
  classificationResult
}: AIThinkingPanelProps) {
  if (!isVisible) return null;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-500';
    if (conf >= 0.6) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Moderate';
    return 'Low';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">AI Thinking Process</CardTitle>
            </div>
            <CardDescription>
              Real-time transparency into decision-making
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Step */}
            {currentStep && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Step</span>
                  <Badge variant="outline" className="animate-pulse">
                    <Zap className="h-3 w-3 mr-1" />
                    Processing
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentStep}</p>
              </div>
            )}

            {/* Confidence Score */}
            {confidence !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence Level</span>
                  <span className={`text-sm font-bold ${getConfidenceColor(confidence)}`}>
                    {(confidence * 100).toFixed(0)}% ({getConfidenceLabel(confidence)})
                  </span>
                </div>
                <Progress value={confidence * 100} className="h-2" />
                {confidence < 0.6 && (
                  <p className="text-xs text-orange-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Low confidence - may request clarification
                  </p>
                )}
              </div>
            )}

            {/* Reasoning */}
            {reasoning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Reasoning</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reasoning}
                </p>
              </div>
            )}

            {/* Classification Result */}
            {classificationResult && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Classification</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium">{classificationResult.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Intent</p>
                    <p className="text-sm font-medium">{classificationResult.intent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Complexity</p>
                    <p className="text-sm font-medium capitalize">{classificationResult.complexity}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Steps */}
            {steps.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Processing Steps</span>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      {step.status === 'complete' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      )}
                      {step.status === 'active' && (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mt-0.5 flex-shrink-0" />
                      )}
                      {step.status === 'pending' && (
                        <div className="h-4 w-4 border-2 border-muted rounded-full mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={step.status === 'complete' ? 'text-muted-foreground' : ''}>
                          {step.step}
                        </p>
                        {step.confidence !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Confidence: {(step.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Footer */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💡 This panel shows you exactly how the AI is analyzing your request and making decisions
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
