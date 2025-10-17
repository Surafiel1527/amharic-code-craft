/**
 * DECISION ENGINE DEMO
 * 
 * Interactive demo to test the Intelligent Decision Engine
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Brain, Lightbulb, TrendingUp, Zap } from 'lucide-react';

interface DecisionResult {
  success: boolean;
  decision: {
    bestOption: any;
    alternatives: any[];
    confidence: number;
    reasoning: string;
    requiresUserInput: boolean;
    userInputReason?: string;
  };
  message: string;
}

export default function DecisionEngineDemo() {
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testDecision = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('intelligent-decision', {
        body: {
          options: [
            {
              id: 'option_a',
              name: 'React + TypeScript',
              description: 'Modern frontend with type safety',
              pros: ['Type safety', 'Large ecosystem', 'Great DX'],
              cons: ['Build complexity', 'Learning curve'],
              estimatedEffort: 'medium',
              riskLevel: 'low'
            },
            {
              id: 'option_b',
              name: 'Vue.js + JavaScript',
              description: 'Progressive framework approach',
              pros: ['Easy to learn', 'Flexible', 'Good performance'],
              cons: ['Smaller ecosystem', 'Less type safety'],
              estimatedEffort: 'low',
              riskLevel: 'medium'
            },
            {
              id: 'option_c',
              name: 'Svelte',
              description: 'Compiler-based approach',
              pros: ['No virtual DOM', 'Small bundle', 'Fast'],
              cons: ['Newer framework', 'Smaller community'],
              estimatedEffort: 'medium',
              riskLevel: 'high'
            }
          ],
          context: {
            scenario: 'Choosing frontend framework for new project',
            userGoal: 'Build a high-performance web application',
            constraints: {
              time: 'normal',
              complexity: 'moderate'
            },
            userPreferences: {
              preferredApproach: 'balanced',
              riskTolerance: 'medium',
              speedVsQuality: 'quality'
            }
          }
        }
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: 'Decision Made',
        description: data.message,
        variant: 'default'
      });

    } catch (error: any) {
      toast({
        title: 'Decision Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            Intelligent Decision Engine Demo
          </h1>
          <p className="text-muted-foreground">
            Watch AI make autonomous decisions with confidence scoring
          </p>
          
          <Button 
            onClick={testDecision} 
            size="lg"
            disabled={loading}
            className="mt-4"
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            {loading ? 'Making Decision...' : 'Test Decision Engine'}
          </Button>
        </div>

        {/* Results */}
        {result && result.success && (
          <div className="space-y-6">
            
            {/* Best Option */}
            <Card className="p-8 border-2 border-primary">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold">Recommended Choice</h2>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(result.decision.confidence * 100)}% Confidence
                    </p>
                  </div>
                </div>
                
                <Badge variant="default" className="text-lg px-4 py-2">
                  {result.decision.bestOption.recommendationLevel.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {result.decision.bestOption.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {result.decision.bestOption.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-green-600">Pros</h4>
                    <ul className="space-y-1">
                      {result.decision.bestOption.pros.map((pro: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-green-500">✓</span> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-orange-600">Cons</h4>
                    <ul className="space-y-1">
                      {result.decision.bestOption.cons.map((con: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-orange-500">⚠</span> {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">AI Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    {result.decision.reasoning}
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Effort</p>
                    <Badge variant="outline">{result.decision.bestOption.estimatedEffort}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk</p>
                    <Badge variant="outline">{result.decision.bestOption.riskLevel}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <span className="font-bold">{Math.round(result.decision.bestOption.overallScore * 100)}%</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Alternatives */}
            {result.decision.alternatives && result.decision.alternatives.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Alternative Options
                </h3>
                
                <div className="space-y-4">
                  {result.decision.alternatives.map((alt: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{alt.name}</h4>
                        <Badge variant="secondary">
                          {Math.round(alt.overallScore * 100)}% Score
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alt.reasoning}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* User Input Required? */}
            {result.decision.requiresUserInput && (
              <Card className="p-6 bg-yellow-500/10 border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-yellow-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg">Your Input Would Help</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.decision.userInputReason}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Info Card */}
        {!result && (
          <Card className="p-8 text-center space-y-4">
            <Brain className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Test the Decision Engine
              </h3>
              <p className="text-muted-foreground">
                The AI will evaluate multiple options using context analysis, 
                historical patterns, risk assessment, and outcome prediction.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">40%</div>
                <div className="text-xs text-muted-foreground">Context Fit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">30%</div>
                <div className="text-xs text-muted-foreground">Historical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">15%</div>
                <div className="text-xs text-muted-foreground">Risk</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">15%</div>
                <div className="text-xs text-muted-foreground">AI + Effort</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
