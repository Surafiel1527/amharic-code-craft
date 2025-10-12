import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, FileSearch, Target, Code, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThinkingStep } from '@/hooks/useThinkingSteps';

interface InlineThinkingStepsProps {
  steps: ThinkingStep[];
  className?: string;
}

const OPERATION_CONFIG = {
  analyze_request: {
    icon: Brain,
    label: 'Analyzed request',
    color: 'text-blue-400'
  },
  read_codebase: {
    icon: FileSearch,
    label: 'Read codebase',
    color: 'text-purple-400'
  },
  make_decision: {
    icon: Target,
    label: 'Made decision',
    color: 'text-green-400'
  },
  create_plan: {
    icon: Code,
    label: 'Created plan',
    color: 'text-orange-400'
  },
  generate_files: {
    icon: Code,
    label: 'Generated files',
    color: 'text-cyan-400'
  },
  validate_code: {
    icon: CheckCircle2,
    label: 'Validated code',
    color: 'text-green-400'
  },
  auto_fix: {
    icon: Code,
    label: 'Auto-fixed issues',
    color: 'text-yellow-400'
  },
  generate_file: {
    icon: FileSearch,
    label: 'Generated file',
    color: 'text-indigo-400'
  },
  phase_start: {
    icon: Target,
    label: 'Started phase',
    color: 'text-pink-400'
  }
};

export function InlineThinkingSteps({ steps, className }: InlineThinkingStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  if (steps.length === 0) return null;

  const completedSteps = steps.filter(s => s.status === 'complete');

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  return (
    <div className={cn("space-y-1.5 mb-3", className)}>
      {completedSteps.map((step) => {
        const config = OPERATION_CONFIG[step.operation as keyof typeof OPERATION_CONFIG] || {
          icon: CheckCircle2,
          label: step.operation,
          color: 'text-gray-400'
        };
        const Icon = config.icon;
        const isExpanded = expandedSteps.has(step.id);

        return (
          <div
            key={step.id}
            className="border border-border/40 rounded-lg bg-card/50 overflow-hidden"
          >
            <button
              onClick={() => toggleStep(step.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.color)} />
              <span className="text-xs text-foreground flex-1">
                {config.label}
                {step.duration && (
                  <span className="text-muted-foreground ml-1">
                    ({step.duration.toFixed(1)}s)
                  </span>
                )}
              </span>
            </button>
            
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border/40 bg-muted/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.detail}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
