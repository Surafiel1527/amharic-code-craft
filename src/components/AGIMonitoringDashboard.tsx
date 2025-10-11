import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Target, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DecisionLog {
  id: string;
  decision_type: string;
  classified_as: string;
  confidence_score: number;
  user_request: string;
  created_at: string;
  decision_outcomes?: {
    was_correct: boolean;
    symptoms: string[];
  }[];
}

interface MisclassificationPattern {
  id: string;
  pattern_name: string;
  wrong_classification: string;
  correct_classification: string;
  confidence_score: number;
  times_seen: number;
  times_corrected: number;
  success_rate: number;
  common_keywords: string[];
}

interface AutoCorrection {
  id: string;
  original_classification: string;
  corrected_classification: string;
  correction_confidence: number;
  correction_method: string;
  was_successful: boolean | null;
  corrected_at: string;
}

export const AGIMonitoringDashboard = () => {
  const { toast } = useToast();
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [patterns, setPatterns] = useState<MisclassificationPattern[]>([]);
  const [corrections, setCorrections] = useState<AutoCorrection[]>([]);
  const [stats, setStats] = useState({
    totalDecisions: 0,
    correctDecisions: 0,
    learningEvents: 0,
    autoCorrections: 0,
    accuracyRate: 0,
    improvementRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAGIData();
    
    // Subscribe to real-time updates
    const decisionsChannel = supabase
      .channel('agi-decisions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'decision_logs' },
        () => loadAGIData()
      )
      .subscribe();

    return () => {
      decisionsChannel.unsubscribe();
    };
  }, []);

  const loadAGIData = async () => {
    try {
      // Load recent decisions
      const { data: decisionsData, error: decisionsError } = await supabase
        .from('decision_logs')
        .select(`
          *,
          decision_outcomes(was_correct, symptoms)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (decisionsError) throw decisionsError;

      // Load misclassification patterns
      const { data: patternsData, error: patternsError } = await supabase
        .from('misclassification_patterns')
        .select('*')
        .eq('is_active', true)
        .order('confidence_score', { ascending: false });

      if (patternsError) throw patternsError;

      // Load auto-corrections
      const { data: correctionsData, error: correctionsError } = await supabase
        .from('auto_corrections')
        .select('*')
        .order('corrected_at', { ascending: false })
        .limit(20);

      if (correctionsError) throw correctionsError;

      setDecisions(decisionsData || []);
      setPatterns(patternsData || []);
      setCorrections(correctionsData || []);

      // Calculate statistics
      const totalDecisions = decisionsData?.length || 0;
      const correctDecisions = decisionsData?.filter(d => 
        d.decision_outcomes?.some(o => o.was_correct)
      ).length || 0;
      const learningEvents = decisionsData?.filter(d =>
        d.decision_outcomes?.some(o => !o.was_correct)
      ).length || 0;
      const autoCorrections = correctionsData?.length || 0;
      const successfulCorrections = correctionsData?.filter(c => c.was_successful).length || 0;

      setStats({
        totalDecisions,
        correctDecisions,
        learningEvents,
        autoCorrections,
        accuracyRate: totalDecisions > 0 ? (correctDecisions / totalDecisions) * 100 : 0,
        improvementRate: autoCorrections > 0 ? (successfulCorrections / autoCorrections) * 100 : 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading AGI data:', error);
      toast({
        title: "Error loading AGI monitoring data",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Brain className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AGI Self-Correction Monitor</h2>
          <p className="text-muted-foreground">Real-time intelligence and learning analytics</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDecisions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.correctDecisions} correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accuracyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Learning from {stats.learningEvents} mistakes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Corrections</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.autoCorrections}</div>
            <p className="text-xs text-muted-foreground">
              {stats.improvementRate.toFixed(0)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learned Patterns</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
            <p className="text-xs text-muted-foreground">
              Active correction patterns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="decisions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="decisions">Recent Decisions</TabsTrigger>
          <TabsTrigger value="patterns">Learned Patterns</TabsTrigger>
          <TabsTrigger value="corrections">Auto-Corrections</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision History</CardTitle>
              <CardDescription>
                Monitoring all AI classification decisions and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{decision.user_request}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{decision.classified_as}</Badge>
                            <Badge variant="secondary">
                              {(decision.confidence_score * 100).toFixed(0)}% confidence
                            </Badge>
                            {decision.decision_outcomes?.[0]?.was_correct === false && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Incorrect
                              </Badge>
                            )}
                            {decision.decision_outcomes?.[0]?.was_correct === true && (
                              <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Correct
                              </Badge>
                            )}
                          </div>
                          {decision.decision_outcomes?.[0]?.symptoms && decision.decision_outcomes[0].symptoms.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground">Detected symptoms:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {decision.decision_outcomes[0].symptoms.map((symptom, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {symptom.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {new Date(decision.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Misclassification Patterns</CardTitle>
              <CardDescription>
                Patterns learned from past mistakes to prevent future errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {patterns.map((pattern) => (
                    <div key={pattern.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{pattern.pattern_name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="destructive">{pattern.wrong_classification}</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default" className="bg-green-600">
                              {pattern.correct_classification}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {(pattern.confidence_score * 100).toFixed(0)}% confidence
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {pattern.times_corrected}/{pattern.times_seen} corrected
                          </p>
                        </div>
                      </div>
                      {pattern.common_keywords.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Common keywords:</p>
                          <div className="flex flex-wrap gap-1">
                            {pattern.common_keywords.map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Success rate:</span>
                          <span className="font-medium">{(pattern.success_rate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corrections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autonomous Corrections</CardTitle>
              <CardDescription>
                Real-time corrections applied by the AGI system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {corrections.map((correction) => (
                    <div key={correction.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{correction.original_classification}</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default">{correction.corrected_classification}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {correction.correction_method}
                            </Badge>
                            <Badge variant="outline">
                              {(correction.correction_confidence * 100).toFixed(0)}% confidence
                            </Badge>
                            {correction.was_successful === true && (
                              <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Successful
                              </Badge>
                            )}
                            {correction.was_successful === false && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                            {correction.was_successful === null && (
                              <Badge variant="secondary">Pending validation</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {new Date(correction.corrected_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
