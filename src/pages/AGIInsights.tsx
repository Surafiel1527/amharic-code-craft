import { AGIMonitoringDashboard } from "@/components/AGIMonitoringDashboard";
import { AGIFeedbackCollector } from "@/components/AGIFeedbackCollector";
import { AIThinkingPanel } from "@/components/AIThinkingPanel";
import { CorrectionIndicator } from "@/components/CorrectionIndicator";
import { ConfidenceDialog } from "@/components/ConfidenceDialog";
import { LearningProgressPanel } from "@/components/LearningProgressPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Eye, TrendingUp, Settings } from "lucide-react";
import { useState } from "react";

const AGIInsights = () => {
  // Demo states for transparency components
  const [showThinkingDemo, setShowThinkingDemo] = useState(false);
  const [showCorrectionDemo, setShowCorrectionDemo] = useState(false);
  const [showConfidenceDemo, setShowConfidenceDemo] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              AGI Self-Correction System
            </h1>
            <p className="text-muted-foreground">
              Full transparency into autonomous decision-making and learning
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Eye className="h-3 w-3 mr-1" />
            Real-Time Transparency
          </Badge>
        </div>

        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="monitoring">
              <Settings className="h-4 w-4 mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="transparency">
              <Eye className="h-4 w-4 mr-2" />
              Transparency
            </TabsTrigger>
            <TabsTrigger value="learning">
              <TrendingUp className="h-4 w-4 mr-2" />
              Learning
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <Brain className="h-4 w-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <AGIMonitoringDashboard />
          </TabsContent>

          {/* Transparency Tab */}
          <TabsContent value="transparency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Transparency Components</CardTitle>
                <CardDescription>
                  Live demos of components that show users what AI is thinking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Thinking Panel Demo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">AI Thinking Panel</h3>
                      <p className="text-sm text-muted-foreground">
                        Shows real-time decision-making process
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowThinkingDemo(!showThinkingDemo)}
                      variant={showThinkingDemo ? "default" : "outline"}
                    >
                      {showThinkingDemo ? "Hide" : "Show"} Demo
                    </Button>
                  </div>
                  {showThinkingDemo && (
                    <AIThinkingPanel
                      isVisible={true}
                      currentStep="Analyzing request intent and complexity"
                      confidence={0.73}
                      reasoning="High context quality with clear user intent. Backend requirements detected based on keywords."
                      classificationResult={{
                        type: "feature_generation",
                        intent: "create",
                        complexity: "moderate"
                      }}
                      steps={[
                        { step: "Load conversation history", status: "complete", timestamp: new Date() },
                        { step: "Analyze user intent", status: "complete", confidence: 0.85, timestamp: new Date() },
                        { step: "Detect backend requirements", status: "active", confidence: 0.73, timestamp: new Date() },
                        { step: "Generate implementation plan", status: "pending", timestamp: new Date() }
                      ]}
                    />
                  )}
                </div>

                {/* Correction Indicator Demo */}
                <div className="space-y-3 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Correction Indicator</h3>
                      <p className="text-sm text-muted-foreground">
                        Live alerts when AI corrects itself
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowCorrectionDemo(!showCorrectionDemo)}
                      variant={showCorrectionDemo ? "default" : "outline"}
                    >
                      {showCorrectionDemo ? "Hide" : "Show"} Demo
                    </Button>
                  </div>
                  <CorrectionIndicator
                    isVisible={showCorrectionDemo}
                    status="corrected"
                    correction={{
                      issue: "Misclassified 'update README' as meta-request",
                      fix: "Reclassified to code_modification with database pattern matching",
                      confidence: 0.92,
                      from: "meta_request",
                      to: "code_modification",
                      reasoning: "The keywords 'update' and 'README' indicate file modification, not a question about the system. Historical patterns show 94% success rate for similar requests."
                    }}
                  />
                </div>

                {/* Confidence Dialog Demo */}
                <div className="space-y-3 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Confidence Dialog</h3>
                      <p className="text-sm text-muted-foreground">
                        Requests user input when confidence is low
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowConfidenceDemo(true)}
                      variant="outline"
                    >
                      Show Demo
                    </Button>
                  </div>
                  <ConfidenceDialog
                    isOpen={showConfidenceDemo}
                    onClose={() => setShowConfidenceDemo(false)}
                    confidence={0.35}
                    questions={[
                      "Could you provide more details about what you want to achieve?",
                      "Are there specific features or components you want to focus on?",
                      "Do you have any examples or references that might help?"
                    ]}
                    onSubmitClarification={(clarification) => {
                      console.log("User clarification:", clarification);
                    }}
                    context={{
                      userRequest: "Make it better",
                      classifiedAs: "ambiguous_request",
                      concerns: [
                        "Request is too vague to classify accurately",
                        "No specific features or changes mentioned",
                        "Context quality is low - need more information"
                      ]
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Tab */}
          <TabsContent value="learning" className="space-y-6">
            <LearningProgressPanel
              overallAccuracy={87}
              correctionsApplied={143}
              patternsLearned={67}
              metrics={[
                {
                  category: "Request Classification",
                  successRate: 92,
                  totalAttempts: 456,
                  recentImprovements: 8,
                  trend: "improving"
                },
                {
                  category: "Backend Detection",
                  successRate: 85,
                  totalAttempts: 312,
                  recentImprovements: 12,
                  trend: "improving"
                },
                {
                  category: "Complexity Assessment",
                  successRate: 78,
                  totalAttempts: 289,
                  recentImprovements: 0,
                  trend: "stable"
                },
                {
                  category: "Multi-Feature Orchestration",
                  successRate: 67,
                  totalAttempts: 124,
                  recentImprovements: -3,
                  trend: "declining"
                }
              ]}
            />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback System</CardTitle>
                <CardDescription>
                  Collect feedback on AI decisions to improve learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AGIFeedbackCollector
                  decisionId="demo-decision-id"
                  userRequest="Create a user dashboard with authentication"
                  classification="feature_generation"
                  onFeedbackSubmitted={() => {
                    console.log("Feedback submitted");
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AGIInsights;
