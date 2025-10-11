import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, HelpCircle, Lightbulb, Send } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

interface ConfidenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  confidence: number;
  questions: string[];
  onSubmitClarification: (clarification: string) => void;
  context?: {
    userRequest: string;
    classifiedAs?: string;
    concerns?: string[];
  };
}

export function ConfidenceDialog({
  isOpen,
  onClose,
  confidence,
  questions,
  onSubmitClarification,
  context
}: ConfidenceDialogProps) {
  const [clarification, setClarification] = useState("");

  const handleSubmit = () => {
    if (clarification.trim()) {
      onSubmitClarification(clarification);
      setClarification("");
      onClose();
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-orange-500";
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.6) return "Moderate";
    return "Low";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${getConfidenceColor()}`} />
            <DialogTitle>Need More Information</DialogTitle>
          </div>
          <DialogDescription>
            I want to make sure I understand exactly what you need
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confidence Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Confidence</span>
              <Badge variant="outline" className={getConfidenceColor()}>
                {(confidence * 100).toFixed(0)}% ({getConfidenceLabel()})
              </Badge>
            </div>
            <Progress value={confidence * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              I need higher confidence to proceed accurately
            </p>
          </div>

          {/* User's Request */}
          {context?.userRequest && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Your Request</span>
              <p className="text-sm text-muted-foreground">
                "{context.userRequest}"
              </p>
              {context.classifiedAs && (
                <p className="text-xs text-muted-foreground mt-1">
                  Classified as: <span className="font-mono">{context.classifiedAs}</span>
                </p>
              )}
            </div>
          )}

          {/* Concerns */}
          {context?.concerns && context.concerns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">My Concerns</span>
              </div>
              <ul className="space-y-1.5">
                {context.concerns.map((concern, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                Help me understand by answering these:
              </span>
            </div>
            <ul className="space-y-2">
              {questions.map((question, index) => (
                <li key={index} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">
                  {index + 1}. {question}
                </li>
              ))}
            </ul>
          </div>

          {/* Clarification Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Context (Optional)
            </label>
            <Textarea
              placeholder="Provide any additional details that might help me understand better..."
              value={clarification}
              onChange={(e) => setClarification(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              The more specific you are, the better I can help!
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!clarification.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Submit Clarification
          </Button>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Why am I asking?</strong> By understanding your needs better, I can provide
            more accurate and helpful results. This helps me learn and improve over time!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
