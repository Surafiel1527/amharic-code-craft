import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, FileSearch, Target, Code, CheckCircle2, Lightbulb, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThinkingStep } from '@/hooks/useThinkingSteps';

interface InlineThinkingStepsProps {
  steps: ThinkingStep[];
  className?: string;
}

// Helper to generate dynamic, user-friendly descriptions
const generateDescription = (operation: string, detail: string, status: string): string => {
  // Remove confidence percentages from display
  const cleanDetail = detail.replace(/Confidence:\s*\d+%/gi, '').trim();
  
  switch (operation) {
    case 'analyze_request':
      if (status === 'active') return 'Understanding your vision...';
      if (status === 'complete') {
        // Extract classification if present
        const classMatch = cleanDetail.match(/Classified as (\w+)/i);
        return classMatch ? `Identified as ${classMatch[1]} project` : 'Request analyzed';
      }
      return 'Analyzing request...';
      
    case 'make_decision':
      if (status === 'active') return 'Planning your approach...';
      if (status === 'complete') return 'Solution strategy ready';
      return 'Deciding approach...';
      
    case 'read_codebase':
      if (status === 'active') return 'Scanning project files...';
      if (status === 'complete') {
        // Extract file count if present
        const fileMatch = cleanDetail.match(/Found (\d+) files?/i);
        if (fileMatch) {
          const count = parseInt(fileMatch[1]);
          return count === 0 ? 'Starting fresh project' : `Found ${count} existing file${count > 1 ? 's' : ''}`;
        }
        return 'Codebase reviewed';
      }
      return 'Reading files...';
      
    case 'create_plan':
      if (status === 'active') return 'Crafting implementation plan...';
      if (status === 'complete') {
        // Look for specific plan details
        if (cleanDetail.toLowerCase().includes('implementation plan')) {
          return 'Implementation plan created';
        }
        return 'Plan ready to execute';
      }
      return 'Planning...';
      
    case 'generate_files':
      if (status === 'active') return 'Building your project...';
      if (status === 'complete') {
        // Extract file/component count
        const fileMatch = cleanDetail.match(/Generated (\d+) files?/i);
        const compMatch = cleanDetail.match(/(\d+) components?/i);
        
        if (fileMatch) {
          const count = parseInt(fileMatch[1]);
          return `Created ${count} file${count > 1 ? 's' : ''}`;
        }
        if (compMatch) {
          const count = parseInt(compMatch[1]);
          return `Built ${count} component${count > 1 ? 's' : ''}`;
        }
        return 'Project files generated';
      }
      return 'Generating code...';
      
    case 'validate_code':
      if (status === 'active') return 'Checking code quality...';
      if (status === 'complete') return 'Code validated successfully';
      return 'Validating...';
      
    case 'auto_fix':
      if (status === 'active') return 'Fixing issues...';
      if (status === 'complete') {
        const issueMatch = cleanDetail.match(/Fixed (\d+) issues?/i);
        if (issueMatch) {
          const count = parseInt(issueMatch[1]);
          return `Fixed ${count} issue${count > 1 ? 's' : ''}`;
        }
        return 'Issues resolved';
      }
      return 'Auto-fixing...';
      
    default:
      // Fallback: show clean detail or generic message
      if (cleanDetail && cleanDetail.length > 0 && cleanDetail.length < 100) {
        return cleanDetail;
      }
      return status === 'complete' ? 'Step completed' : 'Processing...';
  }
};

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
    icon: Lightbulb,
    label: 'Made decision',
    color: 'text-amber-400'
  },
  create_plan: {
    icon: Code,
    label: 'Created plan',
    color: 'text-green-400'
  },
  generate_files: {
    icon: Cog,
    label: 'Generated files',
    color: 'text-indigo-400'
  },
  validate_code: {
    icon: CheckCircle2,
    label: 'Validated code',
    color: 'text-emerald-400'
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

  // ✅ Show ALL steps (active, complete, pending) - not just completed ones
  const visibleSteps = steps;

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
      {visibleSteps.map((step) => {
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    {config.label}
                  </span>
                  {step.duration && (
                    <span className="text-xs text-muted-foreground">
                      ({step.duration.toFixed(1)}s)
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {generateDescription(step.operation, step.detail, step.status)}
                </div>
              </div>
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
