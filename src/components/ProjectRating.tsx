import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ProjectRatingProps {
  projectId: string;
}

export const ProjectRating = ({ projectId }: ProjectRatingProps) => {
  const { user } = useAuth();
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [projectId, user]);

  const fetchRatings = async () => {
    // Fetch average rating and count
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('project_ratings')
      .select('rating')
      .eq('project_id', projectId);

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
    } else if (ratingsData && ratingsData.length > 0) {
      const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
      setAverageRating(sum / ratingsData.length);
      setTotalRatings(ratingsData.length);
    }

    // Fetch user's rating if logged in
    if (user) {
      const { data: userRatingData } = await supabase
        .from('project_ratings')
        .select('rating')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (userRatingData) {
        setUserRating(userRatingData.rating);
      }
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast.error("እባክዎ መጀመሪያ ይግቡ");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('project_ratings')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          rating,
        });

      if (error) throw error;

      setUserRating(rating);
      toast.success("ደረጃ ተሰጥቷል");
      fetchRatings();
    } catch (error) {
      console.error('Error rating project:', error);
      toast.error("ደረጃ መስጠት አልተቻለም");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
          ደረጃ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-5 w-5",
                  star <= Math.round(averageRating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                )}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {totalRatings} ደረጃዎች
          </p>
        </div>

        {user && (
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-sm font-medium text-center">
              ፕሮጀክቱን ይገምግሙ
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={isLoading}
                  className="transition-transform hover:scale-110 disabled:opacity-50"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      star <= (hoverRating || userRating)
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            {userRating > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                ደረጃዎ: {userRating} ኮከቦች
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
