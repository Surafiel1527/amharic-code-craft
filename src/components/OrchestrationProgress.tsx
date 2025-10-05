import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Phase {
  name: string;
  duration: number;
  result: any;
}

interface OrchestrationProgressProps {
  phases: Phase[];
  isLoading: boolean;
  totalDuration?: number;
}

const phaseLabels: Record<string, string> = {
  planning: "🎯 Architecture Planning",
  impact_analysis: "🔍 Impact Analysis",
  pattern_retrieval: "🧩 Pattern Retrieval",
  generation: "⚡ Code Generation",
  refinement: "✨ Quality Refinement",
  learning: "🧠 Learning Patterns"
};

export function OrchestrationProgress({ phases, isLoading, totalDuration }: OrchestrationProgressProps) {
  const expectedPhases = ['planning', 'impact_analysis', 'pattern_retrieval', 'generation', 'refinement', 'learning'];
  const progress = (phases.length / expectedPhases.length) * 100;
  const isComplete = !isLoading && progress === 100;
  
  // Auto-collapse 2 seconds after completion
  const [isOpen, setIsOpen] = useState(true);
  
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setIsOpen(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(true);
    }
  }, [isComplete]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-3 space-y-2 bg-muted/50">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
              <h3 className="text-xs font-semibold flex items-center gap-1">
                {isComplete ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                )}
                Smart Orchestration
                {isOpen ? (
                  <ChevronUp className="w-3 h-3 ml-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1" />
                )}
              </h3>
            </Button>
          </CollapsibleTrigger>
          {totalDuration && (
            <Badge variant="outline" className="text-xs h-5">
              <Clock className="w-3 h-3 mr-1" />
              {(totalDuration / 1000).toFixed(2)}s
            </Badge>
          )}
        </div>

        <CollapsibleContent className="space-y-2">
          <Progress value={progress} className="h-1.5" />

          <div className="space-y-1.5">
            {expectedPhases.map((phaseName) => {
              const phase = phases.find(p => p.name === phaseName);
              const isCompleted = !!phase;
              const isCurrent = isLoading && phases.length > 0 && phases[phases.length - 1].name === phaseName;

              return (
                <div key={phaseName} className="flex items-center gap-2 text-xs">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-muted shrink-0" />
                  )}
                  <span className={isCompleted || isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {phaseLabels[phaseName]}
                  </span>
                  {phase && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(phase.duration / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
