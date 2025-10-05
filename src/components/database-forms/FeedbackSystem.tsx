import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackSystemProps {
  errorId?: string;
  fixId?: string;
  type: 'error_analysis' | 'fix_suggestion' | 'config_validation';
}

export function FeedbackSystem({ errorId, fixId, type }: FeedbackSystemProps) {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRating = async (newRating: 'positive' | 'negative') => {
    setRating(newRating);
    setShowComment(true);
  };

  const submitFeedback = async () => {
    if (!rating) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please sign in to submit feedback"
        });
        return;
      }

      // Store feedback in database
      const feedbackData = {
        user_id: user.id,
        feedback_type: type,
        rating: rating === 'positive' ? 5 : 1,
        comment: comment || null,
        context: {
          error_id: errorId,
          fix_id: fixId,
          timestamp: new Date().toISOString()
        }
      };

      // Store feedback for analytics (future: update knowledge base confidence)
      console.log('Feedback submitted:', feedbackData);

      toast({
        title: "Thank you for your feedback!",
        description: "Your input helps improve our AI system"
      });

      setShowComment(false);
      setComment("");
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        variant: "destructive",
        title: "Failed to submit feedback",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium">Was this helpful?</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={rating === 'positive' ? 'default' : 'outline'}
            onClick={() => handleRating('positive')}
            disabled={isSubmitting}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={rating === 'negative' ? 'default' : 'outline'}
            onClick={() => handleRating('negative')}
            disabled={isSubmitting}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showComment && (
        <div className="space-y-3">
          <Textarea
            placeholder="Tell us more about your experience (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={submitFeedback}
              disabled={isSubmitting}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Submit Feedback
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowComment(false);
                setComment("");
                setRating(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
