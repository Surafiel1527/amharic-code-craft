import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectPreviewGeneratorProps {
  projectId: string;
  versionId?: string;
}

export function ProjectPreviewGenerator({ projectId, versionId }: ProjectPreviewGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePreview = async () => {
    try {
      setIsGenerating(true);
      setPreviewUrl(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("unified-code-operations", {
        body: {
          operation: 'generate_preview',
          params: {
            projectId,
            versionId
          }
        }
      });

      if (error) throw error;

      if (data?.previewUrl) {
        setPreviewUrl(data.previewUrl);
        toast.success("Preview generated successfully!");
      } else {
        throw new Error("No preview URL returned");
      }
    } catch (error: any) {
      console.error("Preview generation error:", error);
      toast.error(error.message || "Failed to generate preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyUrl = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      toast.success("Preview URL copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          Generate Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Live Preview</DialogTitle>
        </DialogHeader>
        
        <Card className="p-4 space-y-4">
          {!previewUrl ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a live preview URL that you can share with others.
                The preview will be valid for 7 days.
              </p>
              <Button
                onClick={generatePreview}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Generate Preview
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview URL</label>
                <div className="flex gap-2">
                  <Input
                    value={previewUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyUrl}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Preview
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPreviewUrl(null);
                    setIsOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This preview link will expire in 7 days
              </p>
            </div>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
}
