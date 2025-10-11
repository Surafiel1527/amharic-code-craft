import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AGIFeedbackCollectorProps {
  decisionId: string;
  userRequest: string;
  classification: string;
  onFeedbackSubmitted?: () => void;
}

export const AGIFeedbackCollector = ({
  decisionId,
  userRequest,
  classification,
  onFeedbackSubmitted
}: AGIFeedbackCollectorProps) => {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedbackType) {
      toast({
        title: "Please select feedback type",
        description: "Was the AI's response correct or incorrect?",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Submit outcome validation to the AGI system
      const { data, error } = await supabase.functions.invoke('decision-validator', {
        body: {
          action: 'validate_outcome',
          outcomeData: {
            decisionId,
            userId: user.id,
            wasCorrect: feedbackType === 'positive',
            userFeedback: feedbackText,
            detectedBy: 'user_feedback',
            detectionConfidence: 1.0,
            errorSeverity: feedbackType === 'negative' ? 'high' : 'low',
            actualIntent: feedbackText || undefined
          }
        }
      });

      if (error) throw error;

      setSubmitted(true);
      
      toast({
        title: "Feedback submitted",
        description: feedbackType === 'negative' 
          ? "The AI will learn from this mistake and improve"
          : "Thank you for confirming the AI's decision was correct"
      });

      if (data && !data.wasCorrect) {
        toast({
          title: "🧠 AI is learning...",
          description: "The system detected the issue and is updating its knowledge base",
          duration: 5000
        });
      }

      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Failed to submit feedback",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <ThumbsUp className="h-5 w-5" />
            <span className="font-medium">Thank you for your feedback!</span>
          </div>
          {feedbackType === 'negative' && (
            <p className="text-sm text-green-600 mt-2">
              The AI system is analyzing this mistake and will improve its future decisions.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Help the AI Learn
        </CardTitle>
        <CardDescription>
          Was this classification correct? Your feedback helps the AI improve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Your request:</p>
          <p className="text-sm text-muted-foreground italic">"{userRequest}"</p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">AI classified this as:</p>
          <Badge variant="outline">{classification}</Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Was this correct?</p>
          <div className="flex gap-2">
            <Button
              variant={feedbackType === 'positive' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setFeedbackType('positive')}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Yes, correct
            </Button>
            <Button
              variant={feedbackType === 'negative' ? 'destructive' : 'outline'}
              className="flex-1"
              onClick={() => setFeedbackType('negative')}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              No, wrong
            </Button>
          </div>
        </div>

        {feedbackType === 'negative' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              What did you actually want? (optional)
            </label>
            <Textarea
              placeholder="Describe what the correct response should have been..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <Button
          onClick={handleSubmitFeedback}
          disabled={!feedbackType || submitting}
          className="w-full"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your feedback trains the AI to make better decisions in the future
        </p>
      </CardContent>
    </Card>
  );
};
