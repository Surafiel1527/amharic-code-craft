import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Layers, FileCode, CheckCircle2, Sparkles, FolderOpen } from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { cn } from '@/lib/utils';

interface AIThinkingPanelProps {
  projectId?: string;
  conversationId?: string;
  workspaceName?: string;
  className?: string;
}

interface ThinkingStage {
  stage: 'analyzing' | 'planning' | 'building' | 'complete';
  title: string;
  description: string;
  details?: string[];
  icon: React.ReactNode;
  color: string;
  progress?: number;
}

export function AIThinkingPanel({ 
  projectId, 
  conversationId,
  workspaceName = 'Your Workspace',
  className 
}: AIThinkingPanelProps) {
  const { status, isActive } = useRealtimeAI({ projectId, conversationId });
  const [thinkingStages, setThinkingStages] = useState<ThinkingStage[]>([]);
  const [currentStage, setCurrentStage] = useState<number>(0);

  // Convert status updates to thinking stages
  useEffect(() => {
    if (!status.message) return;

    const statusType = status.status;
    
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
    } else if (statusType === 'idle' && status.message.includes('done')) {
      setThinkingStages(prev => [...prev, {
        stage: 'complete',
        title: 'Complete!',
        description: 'AI finished building your project',
        details: ['All files generated', 'Ready to use'],
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'text-green-500 bg-green-500/10',
        progress: 100
      }]);
      setCurrentStage(3);
    }
  }, [status]);

  if (!isActive && thinkingStages.length === 0) {
    return null;
  }

  return (
    <Card className={cn("p-6 space-y-6 border-primary/20 shadow-lg", className)}>
      {/* Workspace Context Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {workspaceName}
            {isActive && (
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Active
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            Workspace ID: {projectId?.slice(0, 8)}...{projectId?.slice(-4)}
          </p>
        </div>
      </div>

      {/* AI Thinking Process */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">AI's Autonomous Process</h4>
        </div>

        {/* Thinking Stages */}
        <div className="space-y-3">
          {thinkingStages.map((stage, index) => (
            <div
              key={index}
              className={cn(
                "relative rounded-lg border p-4 transition-all duration-300",
                index === currentStage 
                  ? "border-primary/50 bg-primary/5 shadow-sm scale-[1.02]" 
                  : index < currentStage 
                    ? "border-border/30 bg-muted/20 opacity-70"
                    : "border-border/20 bg-card/50 opacity-50"
              )}
            >
              {/* Connector Line */}
              {index < thinkingStages.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-8 top-full h-3 w-0.5 -translate-x-1/2 transition-colors",
                    index < currentStage ? "bg-primary" : "bg-border/30"
                  )}
                />
              )}

              <div className="flex gap-3">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  stage.color,
                  index === currentStage && "animate-pulse"
                )}>
                  {stage.icon}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div>
                    <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {stage.title}
                      {index === currentStage && (
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stage.description}
                    </p>
                  </div>

                  {/* Details */}
                  {stage.details && index <= currentStage && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {stage.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-1 h-1 rounded-full",
                            index < currentStage ? "bg-primary" : "bg-muted-foreground/50"
                          )} />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Progress */}
                  {stage.progress !== undefined && index === currentStage && (
                    <div className="space-y-1 pt-1">
                      <Progress value={stage.progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {stage.progress}% complete
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Message */}
        {isActive && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm text-foreground">
              {status.message}
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
        <div className="flex-1">
          AI autonomously decides:
          <span className="font-mono text-primary ml-1">
            what to build • how to structure • which files to create
          </span>
        </div>
      </div>
    </Card>
  );
}
