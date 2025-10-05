import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CodeReview {
  id: string;
  file_path: string;
  line_number: number | null;
  comment: string;
  status: string;
  reviewer_id: string;
  created_at: string;
}

interface CodeReviewPanelProps {
  projectId: string;
}

export const CodeReviewPanel = ({ projectId }: CodeReviewPanelProps) => {
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [filePath, setFilePath] = useState("");
  const [lineNumber, setLineNumber] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchReviews();
  }, [projectId, filterStatus]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from("code_reviews")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const createReview = async () => {
    if (!newComment.trim() || !filePath.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await (supabase as any).from("code_reviews").insert({
        project_id: projectId,
        reviewer_id: user.user?.id,
        file_path: filePath,
        line_number: lineNumber ? parseInt(lineNumber) : null,
        comment: newComment,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Review comment added");
      setNewComment("");
      setFilePath("");
      setLineNumber("");
      fetchReviews();
    } catch (error) {
      console.error("Error creating review:", error);
      toast.error("Failed to add review");
    }
  };

  const updateReviewStatus = async (reviewId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from("code_reviews")
        .update({ status: newStatus })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success(`Review ${newStatus}`);
      fetchReviews();
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error("Failed to update review");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "outline";
      case "rejected":
        return "destructive";
      case "resolved":
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Code Review
          </CardTitle>
          <CardDescription>Comment on specific files and lines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">File Path</label>
              <Input
                placeholder="e.g., src/App.tsx"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Line Number (Optional)</label>
              <Input
                type="number"
                placeholder="e.g., 42"
                value={lineNumber}
                onChange={(e) => setLineNumber(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Comment</label>
            <Textarea
              placeholder="Add your review comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={createReview} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Add Review Comment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Code Reviews</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No reviews yet</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getStatusColor(review.status) as any}>
                                {getStatusIcon(review.status)}
                                <span className="ml-1">{review.status}</span>
                              </Badge>
                              <span className="text-sm font-mono text-muted-foreground">
                                {review.file_path}
                                {review.line_number && `:${review.line_number}`}
                              </span>
                            </div>
                            <p className="text-sm mt-2">{review.comment}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(review.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {review.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReviewStatus(review.id, "approved")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReviewStatus(review.id, "rejected")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReviewStatus(review.id, "resolved")}
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
