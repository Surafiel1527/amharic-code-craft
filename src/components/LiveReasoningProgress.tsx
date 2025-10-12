import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle2, Loader2, Code2, FileCode, Target, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface ReasoningStep {
  step: string;
  status: 'thinking' | 'complete' | 'active';
  details?: string;
  timestamp: Date;
}

interface LiveReasoningProgressProps {
  conversationId: string;
  projectId?: string;
}

export function LiveReasoningProgress({ conversationId, projectId }: LiveReasoningProgressProps) {
  const [isActive, setIsActive] = useState(true);
  const [currentPhase, setCurrentPhase] = useState('Initializing');
  const [progress, setProgress] = useState(0);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [currentAction, setCurrentAction] = useState('');
  const [filesGenerated, setFilesGenerated] = useState<string[]>([]);

  useEffect(() => {
    const channelId = projectId || conversationId;
    
    // Subscribe to reasoning traces
    const reasoningChannel = supabase
      .channel(`reasoning-${channelId}`)
      .on('broadcast', { event: 'reasoning-step' }, ({ payload }) => {
        setReasoningSteps(prev => [...prev, {
          step: payload.step || 'Processing',
          status: 'complete',
          details: payload.details,
          timestamp: new Date()
        }]);
      })
      .subscribe();

    // Subscribe to AI status updates
    const statusChannel = supabase
      .channel(`ai-status-${channelId}`)
      .on('broadcast', { event: 'status-update' }, ({ payload }) => {
        setCurrentPhase(payload.message || payload.phase || 'Processing');
        setCurrentAction(payload.action || '');
        
        if (payload.progress !== undefined) {
          setProgress(Math.min(100, Math.max(0, payload.progress)));
        }
        
        if (payload.status === 'complete' || payload.status === 'success') {
          setIsActive(false);
          setProgress(100);
        }
      })
      .subscribe();

    // Subscribe to code generation updates
    const codeChannel = supabase
      .channel(`preview-${channelId}`)
      .on('broadcast', { event: 'code-update' }, ({ payload }) => {
        if (payload.component || payload.file) {
          const fileName = payload.component || payload.file;
          setFilesGenerated(prev => {
            if (!prev.includes(fileName)) {
              return [...prev, fileName];
            }
            return prev;
          });
        }
      })
      .subscribe();

    // Note: We rely on real-time updates for reasoning steps
    // Database query removed to avoid type complexity issues

    return () => {
      supabase.removeChannel(reasoningChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(codeChannel);
    };
  }, [conversationId, projectId]);

  const getPhaseIcon = () => {
    if (!isActive && progress === 100) return CheckCircle2;
    if (currentPhase.toLowerCase().includes('thinking') || currentPhase.toLowerCase().includes('reasoning')) return Brain;
    if (currentPhase.toLowerCase().includes('generat') || currentPhase.toLowerCase().includes('creat')) return Code2;
    if (currentPhase.toLowerCase().includes('analyz')) return Target;
    return Loader2;
  };

  const PhaseIcon = getPhaseIcon();

  return (
    <Card className="p-4 bg-muted/30 border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PhaseIcon className={`w-4 h-4 ${isActive ? 'animate-spin' : ''} text-primary`} />
          <span className="text-sm font-medium">{currentPhase}</span>
        </div>
        <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
          {isActive ? 'In Progress' : 'Complete'}
        </Badge>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-1.5 mb-3" />

      {/* Current Action */}
      {currentAction && (
        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <Target className="w-3 h-3" />
          {currentAction}
        </div>
      )}

      {/* Reasoning Steps */}
      {reasoningSteps.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Reasoning Process:</div>
          <AnimatePresence>
            {reasoningSteps.slice(-5).map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-xs"
              >
                <div className="mt-0.5">
                  {step.status === 'complete' ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : step.status === 'active' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  ) : (
                    <Brain className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.step}</div>
                  {step.details && (
                    <div className="text-muted-foreground text-[10px] mt-0.5 line-clamp-2">
                      {step.details}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Files Generated */}
      {filesGenerated.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <FileCode className="w-3 h-3" />
            Files Generated: {filesGenerated.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {filesGenerated.slice(0, 5).map((file, index) => (
              <Badge key={index} variant="outline" className="text-[10px]">
                {file}
              </Badge>
            ))}
            {filesGenerated.length > 5 && (
              <Badge variant="secondary" className="text-[10px]">
                +{filesGenerated.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
