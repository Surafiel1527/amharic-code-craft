/**
 * Predictive Analysis Panel
 * 
 * Phase 3A: Real-time code quality analysis, error predictions,
 * refactoring suggestions, and performance insights
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  TrendingUp, 
  Zap, 
  Code, 
  Shield,
  Activity,
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ExternalLink
} from "lucide-react";
import { usePredictiveIntelligence } from "@/hooks/usePredictiveIntelligence";

interface PredictiveAnalysisPanelProps {
  projectId?: string;
  currentCode?: string;
  currentFilePath?: string;
}

export function PredictiveAnalysisPanel({ 
  projectId, 
  currentCode,
  currentFilePath 
}: PredictiveAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const {
    scores,
    issues,
    errorPredictions,
    refactoringSuggestions,
    performanceInsights,
    notifications,
    isAnalyzing,
    loading,
    analyzeCode,
    applyRefactoring,
    confirmError,
    markNotificationRead,
    refreshData
  } = usePredictiveIntelligence({ projectId });

  const handleAnalyze = async () => {
    if (currentCode && currentFilePath) {
      await analyzeCode(currentCode, currentFilePath);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Predictive Analysis
            </CardTitle>
            <CardDescription>
              Real-time code quality, error detection, and smart suggestions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} new</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !currentCode}
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Analyze Code</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="errors">
              Errors
              {errorPredictions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {errorPredictions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="refactoring">
              Refactoring
              {refactoringSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {refactoringSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="notifications">
              Alerts
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {scores ? (
              <>
                {/* Quality Scores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Quality</span>
                        <Code className="h-4 w-4" />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(scores.quality)}`}>
                        {scores.quality}
                      </div>
                      <Progress value={scores.quality} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Security</span>
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(scores.security)}`}>
                        {scores.security}
                      </div>
                      <Progress value={scores.security} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Performance</span>
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(scores.performance)}`}>
                        {scores.performance}
                      </div>
                      <Progress value={scores.performance} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Overall</span>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(scores.overall)}`}>
                        {Math.round(scores.overall)}
                      </div>
                      <Progress value={scores.overall} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Issues Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Issues Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {issues.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-2 border rounded"
                            >
                              {getSeverityIcon(issue.severity)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {issue.category}
                                  </Badge>
                                  {issue.line && (
                                    <span className="text-xs text-muted-foreground">
                                      Line {issue.line}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm mt-1">{issue.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  💡 {issue.suggestion}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No issues detected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Analyze Code" to start predictive analysis</p>
              </div>
            )}
          </TabsContent>

          {/* Error Predictions Tab */}
          <TabsContent value="errors">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {errorPredictions.length > 0 ? (
                  errorPredictions.map((pred) => (
                    <Card key={pred.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive">{pred.type}</Badge>
                              <Badge variant="outline">
                                {Math.round(pred.confidence * 100)}% confident
                              </Badge>
                              {pred.line && (
                                <span className="text-xs text-muted-foreground">
                                  Line {pred.line}
                                </span>
                              )}
                            </div>
                            <p className="text-sm mb-2">{pred.description}</p>
                            <p className="text-xs text-muted-foreground">
                              🛡️ {pred.preventionTip}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmError(pred.id, true)}
                              title="Confirm error"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmError(pred.id, false)}
                              title="False positive"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No error predictions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Refactoring Tab */}
          <TabsContent value="refactoring">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {refactoringSuggestions.length > 0 ? (
                  refactoringSuggestions.map((suggestion) => (
                    <Card key={suggestion.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  suggestion.priority === 'high' ? 'destructive' :
                                  suggestion.priority === 'medium' ? 'default' : 'secondary'
                                }
                              >
                                {suggestion.priority} priority
                              </Badge>
                              <Badge variant="outline">{suggestion.difficulty}</Badge>
                            </div>
                          </div>
                          {!suggestion.applied && (
                            <Button
                              size="sm"
                              onClick={() => applyRefactoring(suggestion.id)}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                        <h4 className="font-medium mb-2">{suggestion.type}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.description}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          💭 {suggestion.reasoning}
                        </p>
                        {suggestion.applied && (
                          <Badge variant="outline" className="mt-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Applied
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No refactoring suggestions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {performanceInsights.length > 0 ? (
                  performanceInsights.map((insight) => (
                    <Card key={insight.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {insight.severity === 'critical' && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          {insight.severity === 'warning' && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {insight.severity === 'info' && (
                            <Info className="h-4 w-4 text-blue-500" />
                          )}
                          <h4 className="font-medium">{insight.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        <p className="text-sm mb-2">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                        {insight.estimatedImprovement && (
                          <Badge variant="secondary">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {insight.estimatedImprovement}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No performance insights</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={notification.read ? 'opacity-60' : ''}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  notification.priority === 'urgent' ? 'destructive' :
                                  notification.priority === 'high' ? 'default' : 'secondary'
                                }
                              >
                                {notification.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <h4 className="font-medium mb-1">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            {notification.actionUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto mt-2"
                                onClick={() => window.location.href = notification.actionUrl!}
                              >
                                {notification.actionLabel || 'View Details'}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              Mark read
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
