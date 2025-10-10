import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Code2, Package, CheckCircle, Loader2, XCircle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface GenerationUpdate {
  phase: string;
  progress: number;
  message: string;
  timestamp: string;
  file?: string;
  fileNumber?: number;
  totalFiles?: number;
  phaseNumber?: number;
  totalPhases?: number;
}

interface LiveGenerationProgressProps {
  projectId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function LiveGenerationProgress({ projectId, onComplete, onCancel }: LiveGenerationProgressProps) {
  const [updates, setUpdates] = useState<GenerationUpdate[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('starting');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 30; // 30 retries × 2 seconds = 1 minute max
  
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
      try {
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('html_code, title')
          .eq('id', projectId)
          .single();

        if (error) {
          console.error('❌ Error checking project:', error);
          setError('Failed to verify project status. Please refresh the page.');
          return;
        }

        console.log('📊 Project check:', projectData);

        // Only complete if project has actual code AND title doesn't have status prefixes
        if (projectData?.html_code && 
            !projectData.title.includes('[Generating...]') && 
            !projectData.title.includes('[Failed]')) {
          console.log('✅ Project generation verified complete!');
          setTimeout(() => {
            onCompleteRef.current?.();
          }, 1500);
        } else {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          
          if (newRetryCount >= MAX_RETRIES) {
            console.error('❌ Max retries reached - generation appears to have failed');
            setError('Generation timed out. The project may not have been created properly. Please try again or contact support.');
          } else {
            console.log(`⏳ Still waiting for project data to save... (${newRetryCount}/${MAX_RETRIES})`);
            // Check again in 2 seconds
            setTimeout(checkProjectComplete, 2000);
          }
        }
      } catch (err) {
        console.error('❌ Exception checking project:', err);
        setError('An unexpected error occurred. Please refresh the page and try again.');
      }
    };

    checkProjectComplete();
  }, [isComplete, projectId, retryCount]);

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
        
        const newUpdate = {
          phase,
          progress,
          message: payload.message || '',
          timestamp: payload.timestamp || new Date().toISOString(),
          file: payload.file,
          fileNumber: payload.fileNumber,
          totalFiles: payload.totalFiles,
          phaseNumber: payload.phaseNumber,
          totalPhases: payload.totalPhases
        };
        
        // Enhance message with file or phase information
        if (newUpdate.file && newUpdate.fileNumber && newUpdate.totalFiles) {
          const fileEmojis: { [key: string]: string } = {
            'index': '🏠',
            'component': '🧩',
            'page': '📄',
            'style': '🎨',
            'config': '⚙️',
            'hook': '🪝',
            'util': '🔧',
            'api': '🌐',
            'test': '✅'
          };
          
          const fileType = Object.keys(fileEmojis).find(type => 
            newUpdate.file!.toLowerCase().includes(type)
          ) || 'component';
          
          newUpdate.message = `${fileEmojis[fileType]} Building ${newUpdate.file} (${newUpdate.fileNumber}/${newUpdate.totalFiles})`;
        } else if (newUpdate.phaseNumber && newUpdate.totalPhases) {
          const phaseEmojis = ['🔍', '🏗️', '✨', '🎨', '🔧', '✅'];
          const emoji = phaseEmojis[Math.min(newUpdate.phaseNumber - 1, phaseEmojis.length - 1)] || '📦';
          newUpdate.message = `${emoji} Phase ${newUpdate.phaseNumber}/${newUpdate.totalPhases}: ${newUpdate.message}`;
        } else if (!newUpdate.message.startsWith('🔍') && !newUpdate.message.startsWith('✨')) {
          // Add appropriate emoji if not already present
          const statusEmojis: { [key: string]: string } = {
            'analyzing': '🔍',
            'generating': '✨',
            'finalizing': '🎨',
            'complete': '🎉'
          };
          const emoji = statusEmojis[phase] || '⚡';
          if (!newUpdate.message.match(/^[🔍✨🎨🎉⚡]/)) {
            newUpdate.message = `${emoji} ${newUpdate.message}`;
          }
        }
        
        setUpdates(prev => [...prev, newUpdate]);
        
        setCurrentPhase(phase);
        setProgress(progress);
        
        // If we hit 100% or status is idle, mark complete (but don't call onComplete yet)
        if (progress >= 100 || payload.status === 'idle') {
          console.log('🎯 AI generation complete, verifying project data...');
          setIsComplete(true);
        }
      })
      .on('broadcast', { event: 'generation:error' }, ({ payload }) => {
        console.error('❌ Generation error received:', payload);
        setError(payload.error || 'An error occurred during generation');
        setIsComplete(true);
      })
      .on('broadcast', { event: 'generation:timeout' }, ({ payload }) => {
        console.error('⏰ Generation timeout received:', payload);
        setError('Generation timed out after 5 minutes. This might be due to a complex project or system load. Please try again.');
        setIsComplete(true);
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
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Generation Failed:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: (isComplete && !error) ? 0 : 360 }}
              transition={{ duration: 2, repeat: (isComplete && !error) ? 0 : Infinity, ease: "linear" }}
            >
              {error ? <XCircle className="h-5 w-5 text-destructive" /> : getPhaseIcon(currentPhase)}
            </motion.div>
            <h2 className="text-2xl font-bold">
              {error ? '❌ Generation Failed' : (isComplete ? '🎉 Project Ready!' : '🚀 Generating Your Project')}
            </h2>
          </div>
          <p className="text-muted-foreground">
            {error 
              ? 'Please check the error message above and try again'
              : (isComplete 
                ? 'Your project is ready! Redirecting to workspace...'
                : 'Watch your project come to life in real-time')}
          </p>
        </motion.div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="space-y-3">
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
                  {update.progress >= 100 || update.phase === 'complete' ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    getPhaseIcon(update.phase)
                  )}
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

        {!error && !isComplete && updates.length > 0 && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10"
          >
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>
                {updates[updates.length - 1].fileNumber && updates[updates.length - 1].totalFiles
                  ? `Building file ${updates[updates.length - 1].fileNumber} of ${updates[updates.length - 1].totalFiles}`
                  : currentPhase === 'analyzing'
                  ? 'Analyzing your request...'
                  : currentPhase === 'generating'
                  ? 'Generating project files...'
                  : 'Processing...'}
              </span>
            </div>
            {progress > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {progress < 30 && '🔍 Understanding your requirements...'}
                {progress >= 30 && progress < 60 && '🏗️ Building your project structure...'}
                {progress >= 60 && progress < 90 && '✨ Creating components and features...'}
                {progress >= 90 && '🎨 Adding final touches...'}
              </p>
            )}
          </motion.div>
        )}
        
        {!error && isComplete && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>✅ All files generated, finalizing project...</span>
            </div>
          </motion.div>
        )}

        {!error && onCancel && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Generation
            </Button>
          </div>
        )}

        {error && (
          <div className="flex justify-center pt-4">
            <Button
              variant="default"
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
