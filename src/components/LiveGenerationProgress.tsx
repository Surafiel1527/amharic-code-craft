import { useEffect, useState, useRef } from "react";
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
  
  // Store the latest onComplete callback in a ref to avoid re-subscriptions
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Poll for actual project data to verify generation is complete
  useEffect(() => {
    if (!isComplete) return;

    console.log('🔍 Verifying project generation is complete...');
    
    const checkProjectComplete = async () => {
      const { data: projectData } = await supabase
        .from('projects')
        .select('html_code, title')
        .eq('id', projectId)
        .single();

      console.log('📊 Project check:', projectData);

      // Only complete if project has actual code AND title doesn't say generating
      if (projectData?.html_code && !projectData.title.includes('[Generating...]')) {
        console.log('✅ Project generation verified complete!');
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 1500);
      } else {
        console.log('⏳ Still waiting for project data to save...');
        // Check again in 2 seconds
        setTimeout(checkProjectComplete, 2000);
      }
    };

    checkProjectComplete();
  }, [isComplete, projectId]);

  useEffect(() => {
    console.log('🔌 LiveGenerationProgress subscribing to:', `ai-status-${projectId}`);
    
    const statusChannel = supabase
      .channel(`ai-status-${projectId}`)
      .on('broadcast', { event: 'status-update' }, ({ payload }) => {
        console.log('📥 Status update received:', payload);
        
        // Map AI status to phases
        const phaseMap: { [key: string]: string } = {
          'thinking': 'analyzing',
          'reading': 'analyzing', 
          'analyzing': 'analyzing',
          'generating': 'generating',
          'editing': 'finalizing',
          'fixing': 'finalizing',
          'idle': 'complete'
        };
        
        const phase = phaseMap[payload.status] || 'generating';
        const progress = payload.progress || 0;
        
        setUpdates(prev => [...prev, {
          phase,
          progress,
          message: payload.message || '',
          timestamp: payload.timestamp || new Date().toISOString()
        }]);
        
        setCurrentPhase(phase);
        setProgress(progress);
        
        // If we hit 100% or status is idle, mark complete (but don't call onComplete yet)
        if (progress >= 100 || payload.status === 'idle') {
          console.log('🎯 AI generation complete, verifying project data...');
          setIsComplete(true);
        }
      })
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
      });

    // Timeout fallback: if stuck for >45 seconds, reload anyway
    const timeout = setTimeout(() => {
      console.log('⏰ Generation timeout - forcing completion check');
      setIsComplete(true);
    }, 45000);

    return () => {
      console.log('🔌 Unsubscribing from status channel');
      supabase.removeChannel(statusChannel);
      clearTimeout(timeout);
    };
  }, [projectId]);

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
