import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Code2, Package, CheckCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface GenerationUpdate {
  phase: string;
  progress: number;
  message: string;
  timestamp: string;
}

interface LiveGenerationProgressProps {
  projectId: string;
  onComplete?: () => void;
}

export function LiveGenerationProgress({ projectId, onComplete }: LiveGenerationProgressProps) {
  const [updates, setUpdates] = useState<GenerationUpdate[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('starting');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`project-${projectId}`)
      .on('broadcast', { event: 'generation:phase' }, ({ payload }) => {
        setUpdates(prev => [...prev, payload]);
        setCurrentPhase(payload.phase);
        setProgress(payload.progress);
      })
      .on('broadcast', { event: 'generation:complete' }, ({ payload }) => {
        setUpdates(prev => [...prev, { ...payload, phase: 'complete' }]);
        setProgress(100);
        setIsComplete(true);
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, onComplete]);

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'analyzing': return <Sparkles className="h-5 w-5" />;
      case 'generating': return <Code2 className="h-5 w-5" />;
      case 'dependencies': return <Package className="h-5 w-5" />;
      case 'finalizing': return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'complete': return <CheckCircle className="h-5 w-5" />;
      default: return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'analyzing': return 'text-blue-500';
      case 'generating': return 'text-purple-500';
      case 'dependencies': return 'text-amber-500';
      case 'finalizing': return 'text-green-500';
      case 'complete': return 'text-emerald-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-2xl p-8 space-y-6 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: isComplete ? 0 : 360 }}
              transition={{ duration: 2, repeat: isComplete ? 0 : Infinity, ease: "linear" }}
            >
              {getPhaseIcon(currentPhase)}
            </motion.div>
            <h2 className="text-2xl font-bold">
              {isComplete ? '🎉 Project Ready!' : '🚀 Generating Your Project'}
            </h2>
          </div>
          <p className="text-muted-foreground">
            {isComplete 
              ? 'Your project is ready! Redirecting to workspace...'
              : 'Watch your project come to life in real-time'}
          </p>
        </motion.div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {updates.map((update, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start gap-3 p-3 rounded-lg bg-card border ${getPhaseColor(update.phase)}`}
              >
                <div className={`mt-0.5 ${getPhaseColor(update.phase)}`}>
                  {getPhaseIcon(update.phase)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium capitalize">{update.phase}</p>
                  <p className="text-sm text-muted-foreground">{update.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!isComplete && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center text-sm text-muted-foreground"
          >
            Building your components... Please wait
          </motion.div>
        )}
      </Card>
    </div>
  );
}
