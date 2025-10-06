import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Lightbulb, 
  Code, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Brain,
  GitCompare
} from "lucide-react";

interface ArchitecturePlan {
  planId: string;
  architectureOverview: string;
  componentBreakdown: Array<{
    name: string;
    purpose: string;
    complexity: string;
    dependencies: string[];
  }>;
  technologyStack: string[];
  estimatedComplexity: string;
  potentialChallenges: string[];
  recommendedApproach: string;
}

interface AdvancedGenerationPanelProps {
  conversationId?: string;
  currentCode?: string;
  onCodeGenerated: (code: string, explanation: string) => void;
}

export const AdvancedGenerationPanel: React.FC<AdvancedGenerationPanelProps> = ({
  conversationId,
  currentCode,
  onCodeGenerated
}) => {
  const [userRequest, setUserRequest] = useState('');
  const [phase, setPhase] = useState<'input' | 'planning' | 'review' | 'generating' | 'complete'>('input');
  const [plan, setPlan] = useState<ArchitecturePlan | null>(null);
  const [generationMode, setGenerationMode] = useState<'plan' | 'smart-diff'>('plan');
  const [loading, setLoading] = useState(false);

  // PHASE 1: Create Architecture Plan
  const createPlan = async () => {
    if (!userRequest.trim()) {
      toast.error('Please describe what you want to create');
      return;
    }

    setLoading(true);
    setPhase('planning');

    try {
      // Route to mega-mind-orchestrator for planning
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          request: `Create a detailed plan for: ${userRequest}`,
          requestType: 'planning',
          context: {
            conversationId: conversationId || 'temp-' + Date.now(),
            currentCode,
            phase: 'analysis'
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setPlan(data.plan);
        setPhase('review');
        toast.success('Architecture plan created!');
      }
    } catch (error: any) {
      console.error('Planning error:', error);
      toast.error('Failed to create plan: ' + error.message);
      setPhase('input');
    } finally {
      setLoading(false);
    }
  };

  // PHASE 2: Generate Code from Plan
  const generateFromPlan = async () => {
    if (!plan) return;

    setLoading(true);
    setPhase('generating');

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Already fixed above - this section now uses mega-mind-orchestrator
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          request: userRequest,
          requestType: 'code-generation',
          context: {
            conversationId: conversationId || 'temp-' + Date.now(),
            planId: plan.planId,
            currentCode,
            userId: userData.user?.id,
            approvedPlan: plan
          }
        }
      });

      if (error) throw error;

      if (data.success && data.code) {
        onCodeGenerated(data.code, data.explanation);
        setPhase('complete');
        toast.success('Code generated from architecture plan!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Failed to generate code: ' + error.message);
      setPhase('review');
    } finally {
      setLoading(false);
    }
  };

  // Smart Diff Update (for modifications)
  const generateSmartDiff = async () => {
    if (!userRequest.trim() || !currentCode) {
      toast.error('Please provide both a request and existing code');
      return;
    }

    setLoading(true);
    setPhase('generating');

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Route to mega-mind-orchestrator instead of non-existent smart-diff-update
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          request: userRequest,
          requestType: 'code-modification',
          context: {
            currentCode,
            conversationId: conversationId || 'temp-' + Date.now(),
            userId: userData.user?.id,
            files: currentCode ? [{ file_path: 'current-file', file_content: currentCode }] : []
          }
        }
      });

      if (error) throw error;

      // Handle orchestrator response
      const generatedCode = data?.generation?.files?.[0]?.content || data?.generatedCode || data?.finalCode;
      const explanation = data?.generation?.instructions || data?.message || data?.explanation;
      
      if (generatedCode) {
        onCodeGenerated(generatedCode, explanation);
        setPhase('complete');
        
        const efficiency = data.changeAnalysis?.efficiency;
        toast.success(
          `Smart update complete! ${efficiency?.changePercent} changed, ${efficiency?.linesPreserved}% preserved`,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      console.error('Smart diff error:', error);
      toast.error('Failed to update code: ' + error.message);
      setPhase('input');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setPhase('input');
    setPlan(null);
    setUserRequest('');
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'simple': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'complex': return 'bg-orange-500';
      case 'very complex': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle>Advanced AI Generation</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant={generationMode === 'plan' ? 'default' : 'outline'} 
                   className="cursor-pointer"
                   onClick={() => setGenerationMode('plan')}>
              <Lightbulb className="w-3 h-3 mr-1" />
              Plan First
            </Badge>
            {currentCode && (
              <Badge variant={generationMode === 'smart-diff' ? 'default' : 'outline'}
                     className="cursor-pointer"
                     onClick={() => setGenerationMode('smart-diff')}>
                <GitCompare className="w-3 h-3 mr-1" />
                Smart Update
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {generationMode === 'plan' 
            ? 'AI creates an architecture plan before generating code - perfect for complex apps'
            : 'Surgical code updates that only change what is needed - fast and precise'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input Phase */}
        {phase === 'input' && (
          <>
            <Textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder={generationMode === 'plan' 
                ? "Describe what you want to create (e.g., 'Build a task management app with user auth, real-time updates, and team collaboration')"
                : "Describe what you want to change (e.g., 'Add dark mode toggle' or 'Change button colors to blue')"}
              rows={4}
              className="resize-none"
            />
            
            <div className="flex gap-2">
              {generationMode === 'plan' ? (
                <Button onClick={createPlan} className="w-full" disabled={loading}>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Create Architecture Plan
                </Button>
              ) : (
                <Button onClick={generateSmartDiff} className="w-full" disabled={loading}>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Smart Update
                </Button>
              )}
            </div>
          </>
        )}

        {/* Planning Phase */}
        {phase === 'planning' && (
          <div className="text-center py-8 space-y-2">
            <Lightbulb className="w-12 h-12 mx-auto animate-pulse text-primary" />
            <p className="font-medium">Creating architecture plan...</p>
            <p className="text-sm text-muted-foreground">Analyzing requirements and designing optimal structure</p>
          </div>
        )}

        {/* Plan Review Phase */}
        {phase === 'review' && plan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Architecture Plan Ready
              </h3>
              <Badge className={getComplexityColor(plan.estimatedComplexity)}>
                {plan.estimatedComplexity}
              </Badge>
            </div>

            <div className="space-y-3 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
              <div>
                <h4 className="font-medium text-sm mb-1">Overview</h4>
                <p className="text-sm text-muted-foreground">{plan.architectureOverview}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-2">Components ({plan.componentBreakdown.length})</h4>
                <div className="space-y-2">
                  {plan.componentBreakdown.map((comp, idx) => (
                    <div key={idx} className="text-sm p-2 bg-background rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{comp.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {comp.complexity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{comp.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-1">Tech Stack</h4>
                <div className="flex flex-wrap gap-1">
                  {plan.technologyStack.map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              </div>

              {plan.potentialChallenges.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Potential Challenges
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.potentialChallenges.map((challenge, idx) => (
                        <li key={idx}>• {challenge}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-1">Approach</h4>
                <p className="text-sm text-muted-foreground">{plan.recommendedApproach}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={resetFlow} variant="outline" className="flex-1">
                Revise Request
              </Button>
              <Button onClick={generateFromPlan} className="flex-1" disabled={loading}>
                <Code className="w-4 h-4 mr-2" />
                Generate Code
              </Button>
            </div>
          </div>
        )}

        {/* Generating Phase */}
        {phase === 'generating' && (
          <div className="text-center py-8 space-y-2">
            <Code className="w-12 h-12 mx-auto animate-pulse text-primary" />
            <p className="font-medium">Generating code...</p>
            <p className="text-sm text-muted-foreground">
              {generationMode === 'plan' 
                ? 'Implementing architecture plan with production-ready code'
                : 'Making surgical changes to your code'}
            </p>
          </div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <p className="font-medium">Generation Complete!</p>
              <p className="text-sm text-muted-foreground">
                {generationMode === 'plan' 
                  ? 'Code generated following the architecture plan'
                  : 'Code updated with minimal changes'}
              </p>
            </div>
            <Button onClick={resetFlow} variant="outline">
              Generate Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};