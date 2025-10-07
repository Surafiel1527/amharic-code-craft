import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCode2, Package, Folder, CheckCircle2, Code2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StackBlitzPreview } from "./StackBlitzPreview";
import { FileTreeView } from "./FileTreeView";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MultiFileGeneratorProps {
  projectId: string;
  conversationId: string;
  onFilesGenerated: () => void;
}

export function MultiFileGenerator({ projectId, conversationId, onFilesGenerated }: MultiFileGeneratorProps) {
  const navigate = useNavigate();
  const [request, setRequest] = useState("");
  const [framework, setFramework] = useState<"react" | "html" | "vue">("react");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);

  const handleGenerate = async () => {
    if (!request.trim()) {
      toast.error("Please describe what you want to build");
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setProgress(0);
    setGeneratedFiles([]);
    setStatusMessage("Connecting to AI...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/multi-file-stream`;
      
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userRequest: request,
          framework,
          projectId,
          conversationId
        })
      });

      if (!response.ok) throw new Error('Failed to start generation');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No stream reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = JSON.parse(line.slice(5));
            
            if (line.startsWith('event: status')) {
              setStatusMessage(data.message);
              setProgress(data.progress);
            } else if (line.startsWith('event: file')) {
              setGeneratedFiles(prev => [...prev, data.file]);
              setProgress(data.progress);
              setStatusMessage(`Generating ${data.current}/${data.total} files...`);
            } else if (line.startsWith('event: complete')) {
              setResult(data);
              setProgress(100);
              toast.success(`Generated ${data.files.length} files successfully!`);
              onFilesGenerated();
            } else if (line.startsWith('event: error')) {
              throw new Error(data.message);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate files');
      setIsGenerating(false);
      setProgress(0);
      setStatusMessage("");
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
          <div>
            <label className="text-sm font-medium mb-2 block">Framework</label>
            <Select value={framework} onValueChange={(v: any) => setFramework(v)} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    React + TypeScript
                  </div>
                </SelectItem>
                <SelectItem value="html">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    HTML + CSS + JS
                  </div>
                </SelectItem>
                <SelectItem value="vue">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Vue 3 + TypeScript
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Describe your project... e.g., 'Create a todo app with local storage and dark mode'"
            className="min-h-[100px]"
            disabled={isGenerating}
          />

          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          )}

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !request.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating {framework.toUpperCase()} Project...
              </>
            ) : (
              <>
                <FileCode2 className="w-4 h-4 mr-2" />
                Generate {framework.toUpperCase()} Project
              </>
            )}
          </Button>
        </div>
      </Card>

      {generatedFiles.length > 0 && !result && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Files...
          </h4>
          <FileTreeView files={generatedFiles} />
        </Card>
      )}

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
            <FileTreeView files={result.files} />
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
        <>
          <StackBlitzPreview 
            files={result.files}
            projectName={request.slice(0, 50) || "Generated Project"}
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate(`/workspace/${projectId}`)}
              className="flex-1"
            >
              Open in Workspace
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setResult(null);
                setGeneratedFiles([]);
                setIsGenerating(false);
              }}
            >
              Generate Another
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
