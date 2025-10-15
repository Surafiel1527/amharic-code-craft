import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Code2, Package, CheckCircle, Loader2, XCircle, X, RotateCcw } from "lucide-react";
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
      const { error: invokeError } = await supabase.functions.invoke('mega-mind', {
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

  // CRITICAL FIX: Hide banner after generation completes
  useEffect(() => {
    if (!isComplete || progress < 100 || error) return;
    
    const verifyAndHide = async () => {
      try {
        console.log('✅ Generation complete, verifying files...');
        
        // Wait briefly for UI updates
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify project_files exist
        const { data: files } = await supabase
          .from('project_files')
          .select('file_path')
          .eq('project_id', projectId)
          .limit(1);
        
        if (files && files.length > 0) {
          console.log('✅ Files verified, hiding banner');
          setShouldHide(true);
          onCompleteRef.current?.();
        } else {
          console.warn('⚠️ No files found yet, hiding banner anyway');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setShouldHide(true);
          onCompleteRef.current?.();
        }
      } catch (error) {
        console.error('❌ Error verifying files:', error);
        // Always hide after delay
        await new Promise(resolve => setTimeout(resolve, 1000));
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
      case 'analyzing': return 'text-primary';
      case 'generating': return 'text-primary';
      case 'dependencies': return 'text-accent';
      case 'finalizing': return 'text-primary';
      case 'complete': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'analyzing': return 'Understanding your request';
      case 'generating': return 'Building your project';
      case 'dependencies': return 'Setting up packages';
      case 'finalizing': return 'Adding final touches';
      case 'complete': return 'All done!';
      default: return 'Working on it';
    }
  };

  const getOperationLabel = (operation: string) => {
    // Make operations more user-friendly
    if (operation.includes('Creating') || operation.includes('component')) {
      return operation;
    }
    if (operation.includes('Analyzed')) return 'Analyzing your request';
    if (operation.includes('decision')) return 'Planning the best approach';
    if (operation.includes('Read')) return 'Reviewing existing code';
    if (operation.includes('plan')) return 'Creating implementation plan';
    if (operation.includes('Generated')) return 'Writing code';
    if (operation.includes('Validated')) return 'Checking code quality';
    if (operation.includes('Auto-fixed')) return 'Optimizing and polishing';
    return operation;
  };

  // Detect mobile
  const isMobile = window.innerWidth < 768;

  // On mobile, render as compact banner above navigation
  if (isMobile) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-40 px-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Card className="w-full p-3 space-y-2 glass-effect shadow-elegant border-primary/20">
            {error && (
              <Alert variant="destructive" className="py-2">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="ml-2 text-xs">
                  <div>
                    <strong>Generation Failed:</strong> {error}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <motion.div
                  animate={{ 
                    rotate: (isComplete && !error) ? 0 : 360,
                    scale: (isComplete && !error) ? [1, 1.2, 1] : 1
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: (isComplete && !error) ? 0 : Infinity, ease: "linear" },
                    scale: { duration: 0.5 }
                  }}
                  className={`flex-shrink-0 ${getPhaseColor(currentPhase)}`}
                >
                  {error ? <XCircle className="h-4 w-4 text-destructive" /> : getPhaseIcon(currentPhase)}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {error ? 'Generation Failed' : (isComplete ? '🎉 Project Ready!' : getPhaseLabel(currentPhase))}
                  </p>
                  {!error && !isComplete && currentOperation && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {getOperationLabel(currentOperation)}
                    </p>
                  )}
                </div>
              </div>
              
              {!error && !isComplete && (
                <motion.span 
                  key={progress}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xs font-medium text-primary flex-shrink-0"
                >
                  {progress}%
                </motion.span>
              )}
            </div>

            {!error && !isComplete && (
              <div className="relative">
                <Progress value={progress} className="h-1.5 overflow-hidden" />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: [-200, 200] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  style={{ width: '100px' }}
                />
              </div>
            )}

            {error && (
              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 h-8 text-xs"
                  variant="default"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
                <Button
                  onClick={onCancel}
                  disabled={isRetrying}
                  variant="ghost"
                  className="h-8 px-3"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  // Desktop: render as floating card in bottom-right with enterprise design
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)]"
      >
        <Card className="p-6 space-y-5 glass-effect shadow-elegant border-primary/20 overflow-hidden relative">
          {/* Animated background gradient */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
          />

          <div className="relative z-10">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <strong>Generation Failed:</strong> {error}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        size="sm"
                        variant="outline"
                        className="hover-scale"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {isRetrying ? 'Retrying...' : 'Retry Generation'}
                      </Button>
                      <Button
                        onClick={onCancel}
                        disabled={isRetrying}
                        size="sm"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <motion.div
                  animate={{ 
                    rotate: (isComplete && !error) ? [0, 360] : 0,
                    scale: isComplete && !error ? [1, 1.15, 1] : 1
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: isComplete && !error ? 0 : Infinity, ease: "linear" },
                    scale: { duration: 0.6, ease: "easeOut" }
                  }}
                  className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ${getPhaseColor(currentPhase)}`}
                >
                  {error ? (
                    <XCircle className="h-7 w-7 text-destructive" />
                  ) : (
                    <motion.div
                      animate={isComplete ? {} : { y: [0, -2, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {getPhaseIcon(currentPhase)}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <motion.h3 
                    className="font-semibold text-lg mb-1"
                    key={isComplete ? 'complete' : currentPhase}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error ? 'Generation Failed' : (isComplete ? '🎉 Project Ready!' : getPhaseLabel(currentPhase))}
                  </motion.h3>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    key={currentOperation || currentPhase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {error ? 'Something went wrong during generation' : 
                     (isComplete ? 'Your project is ready to use!' : 
                      (currentOperation ? getOperationLabel(currentOperation) : getPhaseLabel(currentPhase)))}
                  </motion.p>
                </div>
              </div>
              
              {!error && !isComplete && (
                <motion.div 
                  key={progress}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-end"
                >
                  <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                    {progress}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isComplete ? 'Complete' : 'Progress'}
                  </div>
                </motion.div>
              )}
            </div>

            {!error && !isComplete && (
              <div className="space-y-4 mt-5">
                <div className="relative">
                  <Progress value={progress} className="h-2.5 overflow-hidden" />
                  {/* Shimmer effect */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none"
                    animate={{ x: [-200, 400] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ width: '200px' }}
                  />
                </div>

                {updates.length > 0 && (
                  <div className="max-h-28 overflow-y-auto space-y-2 text-xs scrollbar-thin">
                    <AnimatePresence mode="popLayout">
                      {updates.slice(-4).reverse().map((update, idx) => (
                        <motion.div
                          key={`${update.timestamp}-${idx}`}
                          initial={{ opacity: 0, x: -20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ 
                            opacity: { duration: 0.3 },
                            x: { duration: 0.3 },
                            height: { duration: 0.2 }
                          }}
                          className="flex items-start gap-2 text-muted-foreground py-1.5 px-3 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors"
                        >
                          <span className="mt-0.5 flex-shrink-0">•</span>
                          <span className="flex-1">{update.message}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {isComplete && !error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
              >
                <p className="text-sm text-center font-medium">
                  ✨ Your project has been successfully generated and is ready to use!
                </p>
              </motion.div>
            )}

            <div className="flex gap-2 mt-4">
              {!error && onCancel && (
                <Button
                  onClick={onCancel}
                  variant="ghost"
                  size="sm"
                  className="flex-1 hover-scale"
                >
                  <X className="h-4 w-4 mr-2" />
                  {isComplete ? 'Close' : 'Dismiss'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
