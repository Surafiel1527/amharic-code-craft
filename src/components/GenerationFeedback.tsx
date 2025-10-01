import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GenerationFeedbackProps {
  generationId: string;
  onFeedback?: (feedback: string) => void;
}

export const GenerationFeedback = ({ generationId, onFeedback }: GenerationFeedbackProps) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const { toast } = useToast();

  const handleFeedback = async (type: 'thumbs_up' | 'thumbs_down') => {
    setFeedback(type);

    try {
      const { error } = await supabase
        .from('generation_analytics')
        .update({
          feedback_type: type,
          updated_at: new Date().toISOString()
        })
        .eq('id', generationId);

      if (error) throw error;

      toast({
        title: "Thanks for your feedback!",
        description: "This helps us improve the AI",
      });

      onFeedback?.(type);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleRating = async (score: number) => {
    setRating(score);

    try {
      const { error } = await supabase
        .from('generation_analytics')
        .update({
          user_satisfaction_score: score,
          code_worked: score >= 4,
          updated_at: new Date().toISOString()
        })
        .eq('id', generationId);

      if (error) throw error;

      toast({
        title: "Rating saved!",
        description: `You rated this ${score}/5`,
      });

      onFeedback?.(`rating_${score}`);
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">How was this generation?</p>
            <div className="flex gap-2">
              <Button
                variant={feedback === 'thumbs_up' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback('thumbs_up')}
                disabled={feedback !== null}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Good
              </Button>
              <Button
                variant={feedback === 'thumbs_down' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleFeedback('thumbs_down')}
                disabled={feedback !== null}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Needs Work
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Rate this generation (1-5):</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={rating > 0}
                  className="focus:outline-none disabled:cursor-not-allowed"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};