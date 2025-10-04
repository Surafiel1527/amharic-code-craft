import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Zap } from "lucide-react";

interface QualityMetricsProps {
  metrics?: {
    initialScore?: number;
    finalScore?: number;
    iterationsPerformed?: number;
    improvements?: string[];
  };
}

export function QualityMetrics({ metrics }: QualityMetricsProps) {
  if (!metrics) return null;

  const improvement = metrics.finalScore && metrics.initialScore 
    ? metrics.finalScore - metrics.initialScore 
    : 0;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Quality Metrics
          </h3>
          {improvement > 0 && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              +{improvement.toFixed(0)} points
            </Badge>
          )}
        </div>

        {/* Quality Scores */}
        <div className="space-y-3">
          {metrics.initialScore !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Initial Quality</span>
                <span className="font-medium">{metrics.initialScore}/100</span>
              </div>
              <Progress value={metrics.initialScore} className="h-2" />
            </div>
          )}

          {metrics.finalScore !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Final Quality</span>
                <span className="font-medium text-green-600">{metrics.finalScore}/100</span>
              </div>
              <Progress value={metrics.finalScore} className="h-2" />
            </div>
          )}
        </div>

        {/* Iterations */}
        {metrics.iterationsPerformed !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-muted-foreground">Refinement iterations:</span>
            <span className="font-medium">{metrics.iterationsPerformed}</span>
          </div>
        )}

        {/* Improvements */}
        {metrics.improvements && metrics.improvements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Improvements Made</h4>
            <ul className="space-y-1">
              {metrics.improvements.map((improvement: string, idx: number) => (
                <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-green-500">✓</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
