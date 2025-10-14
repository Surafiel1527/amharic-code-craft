import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Code, FileText, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImprovementReviewProps {
  item: any;
  onApprove: (notes?: string) => void;
  onReject: (notes: string) => void;
  isLoading: boolean;
}

export function ImprovementReview({
  item,
  onApprove,
  onReject,
  isLoading,
}: ImprovementReviewProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeView, setActiveView] = useState("overview");

  const metadata = item.metadata || {};

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-2xl font-bold">{item.item_type}</h2>
            <Badge variant={item.priority === "high" ? "destructive" : "default"}>
              {item.priority} priority
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Submitted on {new Date(item.created_at).toLocaleString()}
          </p>
        </div>

        <Separator />

        {/* Content Tabs */}
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <FileText className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="changes">
              <Code className="h-4 w-4 mr-2" />
              Changes
            </TabsTrigger>
            <TabsTrigger value="impact">
              <AlertCircle className="h-4 w-4 mr-2" />
              Impact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {metadata.description || "No description provided"}
                  </p>
                </div>

                {metadata.reason && (
                  <div>
                    <h3 className="font-semibold mb-2">Reason for Change</h3>
                    <p className="text-sm text-muted-foreground">{metadata.reason}</p>
                  </div>
                )}

                {metadata.learningSource && (
                  <div>
                    <h3 className="font-semibold mb-2">Learning Source</h3>
                    <Badge variant="outline">{metadata.learningSource}</Badge>
                  </div>
                )}

                {item.approval_score && (
                  <div>
                    <h3 className="font-semibold mb-2">AI Confidence Score</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${item.approval_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{item.approval_score}%</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="changes" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {metadata.oldVersion && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-500">- Old Version</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      <code>{metadata.oldVersion}</code>
                    </pre>
                  </div>
                )}

                {metadata.newVersion && (
                  <div>
                    <h3 className="font-semibold mb-2 text-green-500">+ New Version</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      <code>{metadata.newVersion}</code>
                    </pre>
                  </div>
                )}

                {!metadata.oldVersion && !metadata.newVersion && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No code changes to display
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="impact" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {metadata.affectedFiles && (
                  <div>
                    <h3 className="font-semibold mb-2">Affected Files</h3>
                    <ul className="space-y-1">
                      {metadata.affectedFiles.map((file: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {metadata.expectedImpact && (
                  <div>
                    <h3 className="font-semibold mb-2">Expected Impact</h3>
                    <p className="text-sm text-muted-foreground">
                      {metadata.expectedImpact}
                    </p>
                  </div>
                )}

                {metadata.risks && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-500">Potential Risks</h3>
                    <ul className="space-y-1">
                      {metadata.risks.map((risk: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          ⚠️ {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Review Notes */}
        {item.status === "pending" && (
          <div>
            <label className="text-sm font-medium mb-2 block">Review Notes</label>
            <Textarea
              placeholder="Add your review notes here..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
            />
          </div>
        )}

        {item.reviewer_notes && (
          <div>
            <label className="text-sm font-medium mb-2 block">Previous Review Notes</label>
            <div className="bg-muted p-3 rounded text-sm">
              {item.reviewer_notes}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {item.status === "pending" && (
          <div className="flex gap-3">
            <Button
              onClick={() => onApprove(reviewNotes)}
              disabled={isLoading}
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve & Deploy
            </Button>
            <Button
              onClick={() => {
                if (!reviewNotes) {
                  alert("Please provide review notes for rejection");
                  return;
                }
                onReject(reviewNotes);
              }}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
