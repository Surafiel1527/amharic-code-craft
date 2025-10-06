import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Loader2, 
  Clock, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Code,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { motion, AnimatePresence } from "framer-motion";

interface Phase {
  name: string;
  duration?: number;
  result?: 'success' | 'error' | 'pending';
  icon?: 'brain' | 'code' | 'sparkles' | 'zap';
  timestamp?: string;
}

interface OrchestrationProgressProps {
  phases: Phase[];
  isLoading: boolean;
  totalDuration?: number;
  jobId?: string;
  onCancel?: () => void;
  currentProgress?: number;
  eta?: string;
  streamingUpdates?: string[];
}

const expectedPhases = [
  { name: 'planning', label: '🎯 Architecture Planning' },
  { name: 'impact_analysis', label: '🔍 Impact Analysis' },
  { name: 'pattern_retrieval', label: '🧩 Pattern Retrieval' },
  { name: 'generation', label: '⚡ Code Generation' },
  { name: 'refinement', label: '✨ Quality Refinement' },
  { name: 'learning', label: '🧠 Learning Patterns' }
];

const getPhaseIcon = (iconType?: string) => {
  switch (iconType) {
    case 'brain': return <Brain className="w-4 h-4" />;
    case 'code': return <Code className="w-4 h-4" />;
    case 'sparkles': return <Sparkles className="w-4 h-4" />;
    case 'zap': return <Zap className="w-4 h-4" />;
    default: return <Loader2 className="w-4 h-4 animate-spin" />;
  }
};

export const OrchestrationProgress = ({
  phases,
  isLoading,
  totalDuration,
  jobId,
  onCancel,
  currentProgress,
  eta,
  streamingUpdates = []
}: OrchestrationProgressProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [realtimeProgress, setRealtimeProgress] = useState(currentProgress || 0);
  
  const completedPhases = phases.filter(p => p.result === 'success').length;
  const totalPhases = phases.length;
  const progress = currentProgress || (totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0);
  const isComplete = completedPhases === totalPhases && !isLoading;

  // Realtime subscription for live progress updates
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-progress-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_generation_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const newData = payload.new as any;
          setRealtimeProgress(newData.progress || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  const handleCancel = async () => {
    if (!jobId) return;
    
    try {
      const { error } = await supabase
        .from('ai_generation_jobs')
        .update({ 
          status: 'cancelled',
          error_message: 'Cancelled by user'
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success("Orchestration cancelled");
      onCancel?.();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error("Failed to cancel orchestration");
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <Card className="p-4 border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <motion.div 
                className="relative"
                animate={{ scale: isLoading ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: isLoading ? Infinity : 0, duration: 2 }}
              >
                {isLoading && (
                  <div className="relative">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/20"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                )}
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </motion.div>
                )}
              </motion.div>
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {isComplete ? 'Generation Complete' : 'AI Mega Mind at Work'}
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  {completedPhases} of {totalPhases} phases complete
                  {eta && <span className="ml-2">• ETA: {eta}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isComplete ? "default" : "secondary"} className="font-mono">
                {Math.round(realtimeProgress)}%
              </Badge>
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-3">
          <div className="relative">
            <Progress value={realtimeProgress} className="h-3" />
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
              style={{ width: `${realtimeProgress}%` }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
          </div>
          
          {/* Streaming Updates */}
          {streamingUpdates.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/30 rounded-lg border border-primary/10">
              <AnimatePresence>
                {streamingUpdates.slice(-5).map((update, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground font-mono"
                  >
                    → {update}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          
          <div className="space-y-2">
            {expectedPhases.map((phase, index) => {
              const phaseData = phases.find(p => p.name === phase.name);
              const status = phaseData?.result || 
                (index < completedPhases ? 'success' : 'pending');
              
              return (
                <motion.div
                  key={phase.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {status === 'success' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        </motion.div>
                      )}
                      {status === 'error' && (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      {status === 'pending' && index === completedPhases && isLoading && (
                        <div className="relative">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          {getPhaseIcon(phaseData?.icon)}
                        </div>
                      )}
                      {status === 'pending' && (index !== completedPhases || !isLoading) && (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{phase.label}</span>
                      {phaseData?.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(phaseData.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {phaseData?.duration && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {(phaseData.duration / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>

          {isLoading && jobId && (
            <div className="flex justify-end pt-2 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Orchestration
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Orchestration?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will stop the AI generation process. All progress will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Continue</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel It
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {totalDuration && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="w-3 h-3" />
              Total Duration: {(totalDuration / 1000).toFixed(2)}s
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
