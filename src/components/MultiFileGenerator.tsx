import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCode2, Package, Folder, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StackBlitzPreview } from "./StackBlitzPreview";

interface MultiFileGeneratorProps {
  projectId: string;
  conversationId: string;
  onFilesGenerated: () => void;
}

export function MultiFileGenerator({ projectId, conversationId, onFilesGenerated }: MultiFileGeneratorProps) {
  const navigate = useNavigate();
  const [request, setRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!request.trim()) {
      toast.error("Please describe what you want to build");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('multi-file-generate', {
        body: {
          userRequest: request,
          projectId,
          conversationId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Generated ${data.files.length} files successfully!`);
      onFilesGenerated();
      
      // Redirect to workspace after a short delay to show the preview
      setTimeout(() => {
        navigate(`/workspace/${projectId}`);
        toast.success("Opening workspace with your generated files...");
      }, 2000);
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate files');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileCode2 className="w-5 h-5" />
          Multi-File Project Generator
        </h3>
        
        <div className="space-y-4">
          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Describe your project... e.g., 'Create a React todo app with TypeScript, local storage, and dark mode'"
            className="min-h-[100px]"
            disabled={isGenerating}
          />

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !request.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Project...
              </>
            ) : (
              <>
                <FileCode2 className="w-4 h-4 mr-2" />
                Generate Multi-File Project
              </>
            )}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <h4 className="font-semibold">Generation Complete!</h4>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{result.stats.totalFiles}</div>
                <div className="text-xs text-muted-foreground">Files</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{result.stats.dependencies}</div>
                <div className="text-xs text-muted-foreground">Dependencies</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {(result.stats.totalSize / 1024).toFixed(1)}KB
                </div>
                <div className="text-xs text-muted-foreground">Total Size</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{result.framework}</Badge>
              <span className="text-sm text-muted-foreground">Framework</span>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-semibold mb-2">Generated Files:</h5>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {result.files.map((file: any) => (
                  <div key={file.path} className="flex items-center justify-between text-sm py-1 px-2 hover:bg-accent rounded">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-3 h-3" />
                      <span className="font-mono text-xs">{file.path}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {file.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {result.architecture && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Architecture:</h5>
              <p className="text-sm text-muted-foreground">{result.architecture}</p>
            </div>
          )}
        </Card>
      )}

      {result && result.files && result.files.length > 0 && (
        <StackBlitzPreview 
          files={result.files}
          projectName={request.slice(0, 50) || "Generated Project"}
        />
      )}
    </div>
  );
}
