import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, CheckCircle2, XCircle, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface LearningMetric {
  category: string;
  successRate: number;
  totalAttempts: number;
  recentImprovements: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface LearningProgressPanelProps {
  metrics: LearningMetric[];
  overallAccuracy: number;
  correctionsApplied: number;
  patternsLearned: number;
}

export function LearningProgressPanel({
  metrics,
  overallAccuracy,
  correctionsApplied,
  patternsLearned
}: LearningProgressPanelProps) {
  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return 'text-green-500';
      case 'stable':
        return 'text-blue-500';
      case 'declining':
        return 'text-red-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle>Learning Progress</CardTitle>
        </div>
        <CardDescription>
          Meta-learning improvements over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1 p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Accuracy</span>
            </div>
            <p className="text-2xl font-bold">{overallAccuracy}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1 p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Corrections</span>
            </div>
            <p className="text-2xl font-bold">{correctionsApplied}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-1 p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Patterns</span>
            </div>
            <p className="text-2xl font-bold">{patternsLearned}</p>
          </motion.div>
        </div>

        {/* Category Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Learning by Category</h4>
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metric.category}</span>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${getTrendColor(metric.trend)}`}>
                    {metric.successRate}%
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {metric.totalAttempts} attempts
                  </Badge>
                </div>
              </div>
              <Progress value={metric.successRate} className="h-2" />
              {metric.recentImprovements > 0 && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{metric.recentImprovements}% improvement recently
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Learning Insights */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Recent Learnings
          </h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Learned to detect "update" vs "create" requests with 95% accuracy</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Improved backend requirement detection by 23%</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Still learning: Complex multi-feature requests (67% accuracy)</span>
            </li>
          </ul>
        </div>

        {/* Info Footer */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Every correction helps me learn. I'm constantly improving to serve you better!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
