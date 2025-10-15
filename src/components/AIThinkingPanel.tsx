import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Layers, FileCode, CheckCircle2, Sparkles, FolderOpen, AlertCircle } from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { cn } from '@/lib/utils';

interface AIThinkingPanelProps {
  projectId?: string;
  conversationId?: string;
  workspaceName?: string;
  className?: string;
}

interface ThinkingStage {
  stage: 'analyzing' | 'planning' | 'building' | 'complete' | 'error';
  title: string;
  description: string;
  details?: string[];
  icon: React.ReactNode;
  color: string;
  progress?: number;
  persistent?: boolean; // Stages that should remain visible
}

export function AIThinkingPanel({ 
  projectId, 
  conversationId,
  workspaceName = 'Your Workspace',
  className 
}: AIThinkingPanelProps) {
  const { status, isActive, hasStarted, isComplete } = useRealtimeAI({ projectId, conversationId });
  const [thinkingStages, setThinkingStages] = useState<ThinkingStage[]>([]);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [isFinalState, setIsFinalState] = useState(false);

  // ✅ ENTERPRISE FIX: Reset state when conversation changes
  useEffect(() => {
    console.log('🔄 Conversation changed in AIThinkingPanel, resetting state');
    setThinkingStages([]);
    setCurrentStage(0);
    setShouldShow(false);
    setIsFinalState(false);
  }, [projectId, conversationId]);

  // Control panel visibility
  useEffect(() => {
    if (hasStarted) {
      setShouldShow(true);
    }
    // ✅ ENTERPRISE FIX: Hide panel after a delay when generation is complete
    if (isComplete && hasStarted) {
      setIsFinalState(true);
      // Keep showing for 10 seconds after completion to show final summary
      const timer = setTimeout(() => {
        setShouldShow(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [hasStarted, isComplete]);

  // Convert status updates to thinking stages
  useEffect(() => {
    if (!status.message) return;

    const statusType = status.status;
    console.log('🎯 Processing status:', statusType, status.message);
    
    if (statusType === 'analyzing') {
      setThinkingStages([{
        stage: 'analyzing',
        title: 'Understanding Your Request',
        description: 'AI is analyzing what you want to build...',
        details: [
          'Determining project complexity',
          'Identifying required features',
          'Checking workspace context'
        ],
        icon: <Brain className="h-5 w-5" />,
        color: 'text-primary bg-primary/10',
        progress: 25
      }]);
      setCurrentStage(0);
    } else if (statusType === 'thinking') {
      setThinkingStages(prev => [...prev, {
        stage: 'planning',
        title: 'Planning Implementation',
        description: 'AI is deciding how to build this...',
        details: [
          'Determining file structure',
          'Planning component architecture',
          'Selecting best approach'
        ],
        icon: <Layers className="h-5 w-5" />,
        color: 'text-accent bg-accent/10',
        progress: 50
      }]);
      setCurrentStage(1);
    } else if (statusType === 'generating' || statusType === 'editing') {
      setThinkingStages(prev => {
        const hasBuilding = prev.some(s => s.stage === 'building');
        if (hasBuilding) return prev;
        
        return [...prev, {
          stage: 'building',
          title: 'Creating Files',
          description: 'AI is writing code autonomously...',
          details: [
            'Generating components',
            'Setting up structure',
            'Adding functionality'
          ],
          icon: <FileCode className="h-5 w-5" />,
          color: 'text-success bg-success/10',
          progress: 75
        }];
      });
      setCurrentStage(2);
    } else if (statusType === 'error') {
      // Error state - FINAL STATE, stop progressing
      setIsFinalState(true);
      setThinkingStages(prev => {
        // Prevent duplicate error stages
        if (prev.some(s => s.stage === 'error')) {
          return prev;
        }
        
        return [...prev, {
          stage: 'error',
          title: 'Issue Encountered',
          description: status.message,
          details: status.errors || [
            'The AI encountered an unexpected issue',
            'Please try again or rephrase your request'
          ],
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'text-destructive bg-destructive/10',
          progress: 0,
          persistent: true // Keep visible - no more animation
        }];
      });
      
      // Move to error stage and STOP incrementing
      setCurrentStage(prev => {
        const stages = thinkingStages;
        const errorIndex = stages.findIndex(s => s.stage === 'error');
        return errorIndex >= 0 ? errorIndex : prev + 1;
      });
    } else if (statusType === 'idle' && hasStarted && !thinkingStages.some(s => s.stage === 'complete')) {
      // Success completion - FINAL STATE, stop progressing
      setIsFinalState(true);
      setThinkingStages(prev => {
        // Prevent duplicate completion stages
        if (prev.some(s => s.stage === 'complete')) {
          return prev;
        }
        
        return [...prev, {
          stage: 'complete',
          title: 'Complete!',
          description: status.message,
          details: [
            status.filesGenerated ? `Generated ${status.filesGenerated} files` : 'All files generated',
            status.duration ? `Completed in ${Math.round(status.duration / 1000)}s` : 'Ready to use'
          ],
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: 'text-green-500 bg-green-500/10',
          progress: 100,
          persistent: true // Keep visible - no more animation
        }];
      });
      
      // Move to completion stage and STOP
      setCurrentStage(prev => {
        const stages = thinkingStages;
        const completeIndex = stages.findIndex(s => s.stage === 'complete');
        return completeIndex >= 0 ? completeIndex : prev + 1;
      });
    }
  }, [status]);

  // ✅ ENTERPRISE FIX: Only show if we should and there's activity or persistent stages
  const hasPersistentStages = thinkingStages.some(s => s.persistent);
  if (!shouldShow) {
    return null;
  }

  return (
    <Card className={cn("p-3 sm:p-6 space-y-4 sm:space-y-6 border-primary/20 shadow-lg w-full", className)}>
      {/* Workspace Context Header - Mobile Optimized */}
      <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-border/50">
        <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-primary/10">
          <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="truncate">{workspaceName}</span>
            {isActive && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] sm:text-xs whitespace-nowrap",
                  status.status === 'error' 
                    ? "bg-destructive/10 border-destructive/30 text-destructive" 
                    : status.status === 'complete'
                    ? "bg-green-500/10 border-green-500/30 text-green-500"
                    : "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                {status.status === 'error' ? 'Issue' : 
                 status.status === 'complete' ? 'Done' : 
                 'Active'}
              </Badge>
            )}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            ID: {projectId?.slice(0, 6)}...{projectId?.slice(-3)}
          </p>
        </div>
      </div>

      {/* AI Thinking Process - Mobile Optimized */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <h4 className="text-xs sm:text-sm font-semibold text-foreground">AI Process</h4>
        </div>

        {/* Thinking Stages - Mobile Optimized */}
        <div className="space-y-2 sm:space-y-3">
          {thinkingStages.map((stage, index) => (
            <div
              key={index}
               className={cn(
                  "relative rounded-lg border p-2.5 sm:p-4 transition-all duration-300",
                  // Final states (error/complete) - static, no animation
                  stage.stage === 'error'
                    ? "border-destructive/50 bg-destructive/5 shadow-sm"
                    : stage.stage === 'complete'
                    ? "border-green-500/50 bg-green-500/5 shadow-sm"
                    // Active stage - only animate if not a final persistent state
                    : index === currentStage && !stage.persistent
                    ? "border-primary/50 bg-primary/5 shadow-sm scale-[1.02]" 
                    : index < currentStage 
                      ? "border-border/30 bg-muted/20 opacity-70"
                      : "border-border/20 bg-card/50 opacity-50"
                )}
            >
              {/* Connector Line - Hidden on mobile for cleaner look */}
              {index < thinkingStages.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-6 sm:left-8 top-full h-2 sm:h-3 w-0.5 -translate-x-1/2 transition-colors hidden sm:block",
                    index < currentStage ? "bg-primary" : "bg-border/30"
                  )}
                />
              )}

              <div className="flex gap-2 sm:gap-3">
                {/* Icon - Mobile Optimized */}
                <div className={cn(
                  "flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all",
                  stage.color,
                  // Only animate if active AND not a final state (error/complete)
                  index === currentStage && !stage.persistent && "animate-pulse"
                )}>
                  <div className="scale-75 sm:scale-100">
                    {stage.icon}
                  </div>
                </div>

                {/* Content - Mobile Optimized */}
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div>
                    <h5 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="truncate">{stage.title}</span>
                      {/* Only show pinging indicator for active non-final stages */}
                      {index === currentStage && !stage.persistent && (
                        <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary"></span>
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {stage.description}
                    </p>
                  </div>

                  {/* Details - Hidden on mobile to save space */}
                  {stage.details && index <= currentStage && (
                    <ul className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                      {stage.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-1 h-1 rounded-full flex-shrink-0",
                            index < currentStage ? "bg-primary" : "bg-muted-foreground/50"
                          )} />
                          <span className="truncate">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Progress - Mobile Optimized */}
                  {stage.progress !== undefined && index === currentStage && (
                    <div className="space-y-0.5 sm:space-y-1 pt-0.5 sm:pt-1">
                      <Progress value={stage.progress} className="h-1 sm:h-1.5" />
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {stage.progress}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Message - Mobile Optimized */}
        {isActive && status.message && (
          <div className="mt-2 sm:mt-4 p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] sm:text-sm text-foreground line-clamp-3">
              {status.message}
            </p>
          </div>
        )}
      </div>

      {/* Footer Info - Simplified on mobile */}
      <div className="pt-3 sm:pt-4 border-t border-border/50 text-[10px] sm:text-xs text-muted-foreground">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <span className="hidden sm:inline">AI autonomously decides:</span>
          <span className="sm:hidden">AI decides:</span>
          <span className="font-mono text-primary flex-1">
            <span className="hidden sm:inline">what to build • how to structure • which files to create</span>
            <span className="sm:hidden">structure • files • approach</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
