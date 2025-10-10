import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, Lightbulb, Target, BookOpen } from "lucide-react";

export default function AutonomousLearningPanel() {
  const { data: learningData } = useQuery({
    queryKey: ['autonomous-learning'],
    queryFn: async () => {
      const { data: patterns } = await supabase
        .from('universal_error_patterns')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(20);

      const { data: knowledge } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('success_rate', { ascending: false })
        .limit(20);

      const { data: improvements } = await supabase
        .from('ai_improvement_logs')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(20);

      return { patterns, knowledge, improvements };
    },
    refetchInterval: 30000
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Autonomous Learning & Context Intelligence
        </h2>
        <p className="text-muted-foreground mt-1">
          AGI-powered pattern recognition, learning evolution, and predictive insights
        </p>
      </div>

      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns">
            <Target className="h-4 w-4 mr-2" />
            Error Patterns
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="improvements">
            <Lightbulb className="h-4 w-4 mr-2" />
            AI Improvements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learned Error Patterns</CardTitle>
              <CardDescription>
                Patterns recognized and learned from past errors with success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningData?.patterns?.map((pattern: any) => (
                  <div key={pattern.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{pattern.pattern_name}</p>
                      <Badge variant="secondary">
                        {(pattern.confidence_score * 100).toFixed(0)}% confident
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pattern.error_description}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Success Rate</span>
                        <span>
                          {pattern.success_count} / {pattern.success_count + pattern.failure_count}
                        </span>
                      </div>
                      <Progress 
                        value={(pattern.success_count / (pattern.success_count + pattern.failure_count)) * 100} 
                      />
                    </div>
                    {pattern.context_requirements && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">Context Requirements:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.keys(pattern.context_requirements).map((key) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!learningData?.patterns || learningData.patterns.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No patterns learned yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Knowledge Base</CardTitle>
              <CardDescription>
                Accumulated knowledge from successful implementations and best practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningData?.knowledge?.map((item: any) => (
                  <div key={item.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.pattern_name}</p>
                      <Badge>{item.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.best_approach}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {item.success_rate?.toFixed(0)}% success
                      </span>
                      <span>
                        Learned from {item.learned_from_cases} cases
                      </span>
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!learningData?.knowledge || learningData.knowledge.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Knowledge base is building up
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Driven Improvements</CardTitle>
              <CardDescription>
                Self-improvement logs and performance enhancements made by the AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningData?.improvements?.map((improvement: any) => (
                  <div key={improvement.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{improvement.improvement_type}</p>
                      <Badge variant={
                        improvement.validation_status === 'validated' ? 'default' :
                        improvement.validation_status === 'testing' ? 'secondary' :
                        'outline'
                      }>
                        {improvement.validation_status}
                      </Badge>
                    </div>
                    {improvement.improvement_percentage && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">
                          +{improvement.improvement_percentage.toFixed(1)}% improvement
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Before</p>
                        <p className="font-medium">{improvement.before_metric}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">After</p>
                        <p className="font-medium">{improvement.after_metric}</p>
                      </div>
                    </div>
                    <Progress value={improvement.confidence_score * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Confidence: {(improvement.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
                {(!learningData?.improvements || learningData.improvements.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No improvements logged yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
