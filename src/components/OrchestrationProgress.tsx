import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Clock, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Phase {
  name: string;
  duration: number;
  result: any;
}

interface OrchestrationProgressProps {
  phases: Phase[];
  isLoading: boolean;
  totalDuration?: number;
  jobId?: string;
  onCancel?: () => void;
}

const phaseLabels: Record<string, string> = {
  planning: "🎯 Architecture Planning",
  impact_analysis: "🔍 Impact Analysis",
  pattern_retrieval: "🧩 Pattern Retrieval",
  generation: "⚡ Code Generation",
  refinement: "✨ Quality Refinement",
  learning: "🧠 Learning Patterns"
};

export function OrchestrationProgress({ phases, isLoading, totalDuration, jobId, onCancel }: OrchestrationProgressProps) {
  const expectedPhases = ['planning', 'impact_analysis', 'pattern_retrieval', 'generation', 'refinement', 'learning'];
  const progress = (phases.length / expectedPhases.length) * 100;
  const isComplete = !isLoading && progress === 100;
  
  // Auto-collapse 2 seconds after completion
  const [isOpen, setIsOpen] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setIsOpen(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(true);
    }
  }, [isComplete]);

  const handleCancel = async () => {
    if (!jobId) return;
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('ai_generation_jobs')
        .update({ 
          status: 'cancelled',
          error_message: 'Cancelled by user'
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Orchestration Cancelled",
        description: "The task generation has been stopped.",
      });
      
      onCancel?.();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast({
        title: "Error",
        description: "Failed to cancel the orchestration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

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
          <div className="flex items-center gap-2">
            {isLoading && jobId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={isCancelling}
                    className="h-5 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will stop the orchestration process. All progress will be lost and you'll need to start over.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, continue</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, cancel it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {totalDuration && (
              <Badge variant="outline" className="text-xs h-5">
                <Clock className="w-3 h-3 mr-1" />
                {(totalDuration / 1000).toFixed(2)}s
              </Badge>
            )}
          </div>
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
