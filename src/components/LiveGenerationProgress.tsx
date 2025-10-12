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
  phaseName?: string;
  currentOperation?: string;
}

interface LiveGenerationProgressProps {
  projectId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function LiveGenerationProgress({ projectId, onComplete, onCancel }: LiveGenerationProgressProps) {
  const [updates, setUpdates] = useState<GenerationUpdate[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('starting');
  const [currentPhaseName, setCurrentPhaseName] = useState<string>('Starting');
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const MAX_RETRIES = 30; // 30 retries × 2 seconds = 1 minute max
  
  // CRITICAL FIX: Add state to control when component should hide
  const [shouldHide, setShouldHide] = useState(false);
  
  // Store the latest onComplete callback in a ref to avoid re-subscriptions
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    
    try {
      // Get the failed job details
      const { data: job, error: jobError } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (jobError || !job) {
        console.error('Failed to fetch job:', jobError);
        setError('Could not retrieve generation details. Please try starting a new generation.');
        setIsRetrying(false);
        return;
      }

      console.log('🔄 Retrying from job:', job);

      // Parse JSON data safely
      const inputData = job.input_data as Record<string, any>;
      const outputData = job.output_data as Record<string, any>;

      // Reset the job status to retry
      const { error: updateError } = await supabase
        .from('ai_generation_jobs')
        .update({
          status: 'queued',
          error_message: null,
          retry_count: (job.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) {
        console.error('Failed to update job:', updateError);
        setError('Could not restart generation. Please try again.');
        setIsRetrying(false);
        return;
      }

      // Call the orchestrator to resume
      const { error: invokeError } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          request: inputData.request || 'Continue from where we left off',
          conversationId: job.conversation_id,
          userId: job.user_id,
          requestType: job.job_type || 'generation',
          context: {
            ...(inputData.context || {}),
            projectId: projectId,
            resumeFromProgress: job.progress || 0,
            existingFiles: outputData?.files || [],
            isRetry: true
          }
        }
      });

      if (invokeError) {
        console.error('Failed to invoke orchestrator:', invokeError);
        setError('Failed to restart generation. Please try again.');
        setIsRetrying(false);
        return;
      }

      // Reset UI state
      setUpdates([]);
      setCurrentPhase('starting');
      setProgress(job.progress || 0);
      setIsComplete(false);
      setRetryCount(0);
      setIsRetrying(false);
      
      console.log('✅ Generation restarted successfully');
    } catch (err) {
      console.error('Retry error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsRetrying(false);
    }
  };

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

        // Check if project has code and verify job is actually complete
        const { data: jobData } = await supabase
          .from('ai_generation_jobs')
          .select('status, progress')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        console.log('📊 Job check:', jobData);

        // Only complete if:
        // 1. Project has actual code
        // 2. Title doesn't have generating status
        // 3. Job is marked as complete with 100% progress
        if (projectData?.html_code && 
            !projectData.title.includes('[Generating...]') && 
            !projectData.title.includes('[Failed]') &&
            jobData?.status === 'complete' &&
            jobData?.progress === 100) {
          console.log('✅ Project generation verified complete!');
          // Wait a bit longer to ensure all UI updates are done
          setTimeout(() => {
            onCompleteRef.current?.();
          }, 2000);
        } else {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          
          if (newRetryCount >= MAX_RETRIES) {
            console.error('❌ Max retries reached - generation appears to have failed');
            setError('Generation timed out. The project may not have been created properly. Please try again or contact support.');
          } else {
            console.log(`⏳ Still waiting for project data to save... (${newRetryCount}/${MAX_RETRIES})`);
            console.log(`   Project code: ${!!projectData?.html_code}, Job status: ${jobData?.status}, Progress: ${jobData?.progress}`);
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
        
        // Update phase name and operation from payload
        if (payload.phaseName) {
          setCurrentPhaseName(payload.phaseName);
        }
        if (payload.currentOperation) {
          setCurrentOperation(payload.currentOperation);
        }
        
        const newUpdate = {
          phase,
          progress,
          message: payload.message || '',
          timestamp: payload.timestamp || new Date().toISOString(),
          file: payload.file,
          fileNumber: payload.fileNumber,
          totalFiles: payload.totalFiles,
          phaseNumber: payload.phaseNumber,
          totalPhases: payload.totalPhases,
          phaseName: payload.phaseName,
          currentOperation: payload.currentOperation
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
            'test': '✅',
            'auth': '🔐',
            'header': '📋',
            'footer': '📍',
            'sidebar': '📑',
            'navbar': '🗂️',
            'button': '🔘',
            'card': '🃏'
          };
          
          const fileType = Object.keys(fileEmojis).find(type => 
            newUpdate.file!.toLowerCase().includes(type)
          ) || 'component';
          
          // Extract readable component name from path
          const fileName = newUpdate.file.split('/').pop()?.replace(/\.(tsx?|jsx?|vue|html)$/, '') || newUpdate.file;
          const readableName = fileName
            .replace(/([A-Z])/g, ' $1') // Add space before capitals
            .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
            .trim();
          
          newUpdate.message = `${fileEmojis[fileType]} Creating ${readableName} (${newUpdate.fileNumber}/${newUpdate.totalFiles})`;
          
          // Set as current operation for display
          setCurrentOperation(`Creating ${readableName} component`);
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
        
        // Only mark complete when we get explicit completion event
        // Don't rely on progress percentage alone
        if (payload.status === 'complete' || payload.message?.includes('Generation complete')) {
          console.log('🎯 Received completion signal, verifying project data...');
          setIsComplete(true);
        }
      })
      .on('broadcast', { event: 'generation:complete' }, ({ payload }) => {
        console.log('✅ Generation complete event received:', payload);
        setProgress(100);
        setCurrentPhase('complete');
        setIsComplete(true);
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

  // CRITICAL FIX: Verify files exist before hiding, keep thinking steps visible longer
  useEffect(() => {
    if (!isComplete || progress < 100 || error) return;
    
    const verifyAndHide = async () => {
      try {
        console.log('✅ Generation complete, verifying files...');
        
        // Wait a bit for files to be written
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify project_files exist
        const { data: files } = await supabase
          .from('project_files')
          .select('file_path')
          .eq('project_id', projectId)
          .limit(1);
        
        if (files && files.length > 0) {
          console.log('✅ Files verified, keeping visible for 5 seconds so user can see thinking steps');
          // Keep visible for 5 seconds so user can see final thinking steps
          await new Promise(resolve => setTimeout(resolve, 5000));
          setShouldHide(true);
          onCompleteRef.current?.();
        } else {
          console.warn('⚠️ No files found, waiting longer...');
          // Retry after delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          setShouldHide(true);
          onCompleteRef.current?.();
        }
      } catch (error) {
        console.error('❌ Error verifying files:', error);
        // Hide anyway after delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShouldHide(true);
        onCompleteRef.current?.();
      }
    };
    
    verifyAndHide();
  }, [isComplete, progress, error, projectId]);

  // Don't render if should hide
  if (shouldHide) {
    return null;
  }

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
            <AlertDescription className="ml-2 flex items-center justify-between">
              <div>
                <strong>Generation Failed:</strong> {error}
              </div>
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
                : currentOperation || 'Watch your project come to life in real-time')}
          </p>
          {!error && !isComplete && currentPhaseName && (
            <p className="text-sm font-medium text-primary mt-1">
              {currentPhaseName}
            </p>
          )}
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
                  <p className="font-medium capitalize">{update.phaseName || update.phase}</p>
                  <p className="text-sm text-muted-foreground">{update.message}</p>
                  {update.currentOperation && (
                    <p className="text-xs text-muted-foreground/80 mt-0.5 italic">
                      → {update.currentOperation}
                    </p>
                  )}
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
                {currentOperation || (
                  updates[updates.length - 1].fileNumber && updates[updates.length - 1].totalFiles
                    ? `Building file ${updates[updates.length - 1].fileNumber} of ${updates[updates.length - 1].totalFiles}`
                    : currentPhase === 'analyzing'
                    ? 'Analyzing your request...'
                    : currentPhase === 'generating'
                    ? 'Generating project files...'
                    : 'Processing...'
                )}
              </span>
            </div>
            {progress > 0 && currentPhaseName && (
              <p className="text-xs text-primary/80 font-medium mt-2">
                {currentPhaseName}
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
          <div className="flex justify-center gap-3 pt-4">
            <Button
              variant="default"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Retry Generation
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              disabled={isRetrying}
            >
              Return to Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
