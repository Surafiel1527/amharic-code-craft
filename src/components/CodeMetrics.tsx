import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, FileCode2, GitBranch, TrendingUp } from "lucide-react";

interface CodeMetricsProps {
  code: string;
  filePath: string;
}

export function CodeMetrics({ code, filePath }: CodeMetricsProps) {
  const metrics = useMemo(() => {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const commentLines = lines.filter(l => {
      const trimmed = l.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    });

    // Count functions
    const functionRegex = /(?:function|const|let|var)\s+\w+\s*=?\s*(?:async\s*)?\(|(?:async\s+)?(?:function)\s+\w+\s*\(/g;
    const functions = (code.match(functionRegex) || []).length;

    // Count imports
    const importRegex = /import\s+.*from/g;
    const imports = (code.match(importRegex) || []).length;

    // Count exports
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type)/g;
    const exports = (code.match(exportRegex) || []).length;

    // Cyclomatic complexity (simplified)
    const complexityRegex = /\b(if|else|for|while|case|catch|\?\?|\?|&&|\|\|)\b/g;
    const complexity = (code.match(complexityRegex) || []).length;

    // Code density
    const commentRatio = (commentLines.length / lines.length) * 100;
    const codeRatio = (nonEmptyLines.length / lines.length) * 100;

    // Maintainability index (simplified 0-100)
    const avgLineLength = code.length / lines.length;
    const maintainabilityScore = Math.max(0, Math.min(100,
      100 - (complexity / 10) * 5 - (functions / 20) * 5 - (avgLineLength / 100) * 10
    ));

    // Quality score
    const qualityScore = Math.round(
      (maintainabilityScore * 0.4) +
      (Math.min(commentRatio / 20, 1) * 100 * 0.2) +
      (Math.min((100 - complexity) / 10, 10) * 10 * 0.4)
    );

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length,
      commentLines: commentLines.length,
      functions,
      imports,
      exports,
      complexity,
      commentRatio,
      codeRatio,
      maintainabilityScore,
      qualityScore,
      avgLineLength: Math.round(avgLineLength),
      fileSize: code.length
    };
  }, [code]);

  const getComplexityLevel = (complexity: number) => {
    if (complexity < 10) return { label: 'Simple', color: 'text-green-600' };
    if (complexity < 20) return { label: 'Moderate', color: 'text-yellow-600' };
    if (complexity < 40) return { label: 'Complex', color: 'text-orange-600' };
    return { label: 'Very Complex', color: 'text-red-600' };
  };

  const getQualityLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', icon: CheckCircle2 };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', icon: CheckCircle2 };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600', icon: AlertCircle };
    return { label: 'Needs Work', color: 'text-red-600', icon: AlertCircle };
  };

  const complexityLevel = getComplexityLevel(metrics.complexity);
  const qualityLevel = getQualityLevel(metrics.qualityScore);
  const QualityIcon = qualityLevel.icon;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <FileCode2 className="w-5 h-5" />
            Code Metrics
          </h3>
          <p className="text-xs text-muted-foreground font-mono">{filePath.split('/').pop()}</p>
        </div>

        {/* Quality Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <QualityIcon className={`w-4 h-4 ${qualityLevel.color}`} />
              Quality Score
            </span>
            <Badge className={qualityLevel.color}>
              {qualityLevel.label}
            </Badge>
          </div>
          <Progress value={metrics.qualityScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {metrics.qualityScore}/100
          </p>
        </div>

        {/* Basic Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Lines</div>
            <div className="text-2xl font-bold">{metrics.totalLines}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Code Lines</div>
            <div className="text-2xl font-bold">{metrics.codeLines}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Functions</div>
            <div className="text-2xl font-bold">{metrics.functions}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">File Size</div>
            <div className="text-2xl font-bold">
              {(metrics.fileSize / 1024).toFixed(1)}KB
            </div>
          </div>
        </div>

        {/* Complexity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Complexity
            </span>
            <Badge variant="outline" className={complexityLevel.color}>
              {complexityLevel.label}
            </Badge>
          </div>
          <Progress value={Math.min((metrics.complexity / 40) * 100, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {metrics.complexity} decision points
          </p>
        </div>

        {/* Dependencies */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Imports</div>
              <div className="text-lg font-semibold">{metrics.imports}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Exports</div>
              <div className="text-lg font-semibold">{metrics.exports}</div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Comment Ratio</span>
            <span className="font-medium">{metrics.commentRatio.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Code Density</span>
            <span className="font-medium">{metrics.codeRatio.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avg Line Length</span>
            <span className="font-medium">{metrics.avgLineLength} chars</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Maintainability</span>
            <span className="font-medium">{metrics.maintainabilityScore.toFixed(0)}/100</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
