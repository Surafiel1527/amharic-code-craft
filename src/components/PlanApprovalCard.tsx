import { useState } from 'react';
import { ImplementationPlanViewer } from './ImplementationPlanViewer';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface PlanApprovalCardProps {
  plan: {
    summary: string;
    approach: string;
    codebaseAnalysis: any;
    implementationPlan: any;
    formattedPlan: string;
    requiresApproval: boolean;
    approved?: boolean;
  };
  onApprove: () => void;
  onReject: (feedback?: string) => void;
}

export function PlanApprovalCard({ plan, onApprove, onReject }: PlanApprovalCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    toast.success('✅ Plan approved - starting implementation...');
    await onApprove();
    setIsLoading(false);
  };

  const handleReject = async () => {
    if (!showFeedback) {
      setShowFeedback(true);
      return;
    }

    if (!feedback.trim()) {
      toast.error('Please provide suggestions for changes');
      return;
    }

    setIsLoading(true);
    await onReject(feedback);
    setShowFeedback(false);
    setFeedback('');
    setIsLoading(false);
  };

  if (showFeedback) {
    return (
      <Card className="p-4 space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Suggest Changes</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Tell me what you'd like to change about this implementation plan:
          </p>
          <Textarea
            placeholder="Example: Use existing Dashboard.tsx instead of creating new component, simplify integration approach, etc."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowFeedback(false);
              setFeedback('');
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReject}
            disabled={isLoading || !feedback.trim()}
          >
            Submit Suggestions
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <ImplementationPlanViewer
      plan={plan.implementationPlan}
      codebaseAnalysis={plan.codebaseAnalysis}
      onApprove={handleApprove}
      onReject={handleReject}
      isLoading={isLoading}
    />
  );
}
