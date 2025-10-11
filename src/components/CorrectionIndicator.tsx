import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertTriangle, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface CorrectionData {
  issue: string;
  fix: string;
  confidence: number;
  from?: string;
  to?: string;
  reasoning?: string;
}

interface CorrectionIndicatorProps {
  isVisible: boolean;
  status: 'detecting' | 'correcting' | 'corrected' | 'failed';
  correction?: CorrectionData;
  onDismiss?: () => void;
}

export function CorrectionIndicator({
  isVisible,
  status,
  correction,
  onDismiss
}: CorrectionIndicatorProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isVisible || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'detecting':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          title: "Issue Detected",
          description: "Analyzing the problem...",
          color: "orange"
        };
      case 'correcting':
        return {
          icon: <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />,
          title: "Applying Correction",
          description: "I'm fixing this automatically...",
          color: "blue"
        };
      case 'corrected':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: "Correction Applied ✨",
          description: "Issue resolved - continuing with higher confidence",
          color: "green"
        };
      case 'failed':
        return {
          icon: <X className="h-5 w-5 text-red-500" />,
          title: "Correction Failed",
          description: "Manual intervention may be needed",
          color: "red"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
      >
        <Card className="border-2 shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{config.icon}</div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{config.title}</h4>
                    {status === 'corrected' && (
                      <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {config.description}
                </p>

                {correction && (
                  <div className="space-y-3 mt-3">
                    {/* Issue */}
                    {correction.issue && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Issue Found:</p>
                        <p className="text-sm bg-red-500/10 text-red-700 dark:text-red-400 p-2 rounded border border-red-500/20">
                          {correction.issue}
                        </p>
                      </div>
                    )}

                    {/* Correction */}
                    {correction.fix && status === 'corrected' && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Applied Fix:</p>
                        <p className="text-sm bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded border border-green-500/20">
                          {correction.fix}
                        </p>
                      </div>
                    )}

                    {/* Classification Change */}
                    {correction.from && correction.to && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="font-mono">
                          {correction.from}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="default" className="font-mono">
                          {correction.to}
                        </Badge>
                      </div>
                    )}

                    {/* Confidence */}
                    {correction.confidence !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Correction Confidence:</span>
                        <Badge variant="secondary">
                          {(correction.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    )}

                    {/* Reasoning */}
                    {correction.reasoning && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Why this correction?
                        </summary>
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          {correction.reasoning}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                {/* Learning Note */}
                {status === 'corrected' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        I've learned from this mistake. Next time I'll handle similar requests correctly from the start!
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
