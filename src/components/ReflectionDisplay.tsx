import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ReflectionDisplayProps {
  generationId: string;
  onRequestReflection: (generationId: string) => Promise<any>;
}

export const ReflectionDisplay = ({ generationId, onRequestReflection }: ReflectionDisplayProps) => {
  const [reflection, setReflection] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadReflection = async () => {
    setLoading(true);
    try {
      const data = await onRequestReflection(generationId);
      setReflection(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to load reflection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!reflection && !loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={loadReflection}
        className="gap-2"
      >
        <Brain className="h-4 w-4" />
        Get AI Self-Critique
      </Button>
    );
  }

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Analyzing...
      </Button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Brain className="h-4 w-4" />
          AI Self-Critique
          <Badge variant="secondary" className="ml-2">
            {reflection?.overallScore || 'N/A'}/10
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI's Self-Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strengths */}
            {reflection?.strengths && reflection.strengths.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  Strengths
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reflection.strengths.map((strength: string, idx: number) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {reflection?.improvements && reflection.improvements.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-orange-500" />
                  Suggested Improvements
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reflection.improvements.map((improvement: string, idx: number) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Overall Assessment */}
            {reflection?.assessment && (
              <div>
                <h4 className="font-medium text-sm mb-2">Overall Assessment</h4>
                <p className="text-sm text-muted-foreground">{reflection.assessment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
