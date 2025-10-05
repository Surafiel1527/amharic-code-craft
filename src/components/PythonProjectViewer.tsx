import { Download, FileCode, Folder, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import JSZip from "jszip";

interface PythonFile {
  path: string;
  content: string;
}

interface PythonProjectData {
  projectName: string;
  description: string;
  framework: string;
  files: PythonFile[];
  setupInstructions: string[];
}

interface PythonProjectViewerProps {
  projectData: PythonProjectData;
  message?: string;
  instructions?: string[];
}

export function PythonProjectViewer({ projectData, message, instructions }: PythonProjectViewerProps) {
  const handleDownloadProject = async () => {
    try {
      const zip = new JSZip();
      
      // Add all project files to zip
      projectData.files.forEach(file => {
        zip.file(file.path, file.content);
      });
      
      // Generate and download zip
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectData.projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${projectData.projectName}.zip!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download project");
    }
  };

  const handleDownloadFile = (file: PythonFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${file.path}!`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-amber-500" />
              <CardTitle>{projectData.projectName}</CardTitle>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                🐍 Python
              </Badge>
              <Badge variant="secondary">{projectData.framework}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{projectData.description}</p>
            {message && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </div>
            )}
          </div>
          <Button onClick={handleDownloadProject} className="gap-2">
            <Download className="h-4 w-4" />
            Download Project
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Setup Instructions */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            📋 Setup Instructions
          </h3>
          <ol className="space-y-2 text-sm">
            {(instructions || projectData.setupInstructions).map((instruction, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground">{idx + 1}.</span>
                <code className="flex-1 bg-background rounded px-2 py-1 text-xs">
                  {instruction}
                </code>
              </li>
            ))}
          </ol>
        </div>

        {/* Project Files */}
        <Tabs defaultValue={projectData.files[0]?.path || 'files'} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {projectData.files.map((file, idx) => (
              <TabsTrigger 
                key={idx} 
                value={file.path}
                className="gap-2 shrink-0"
              >
                <FileCode className="h-3 w-3" />
                {file.path.split('/').pop()}
              </TabsTrigger>
            ))}
          </TabsList>

          {projectData.files.map((file, idx) => (
            <TabsContent key={idx} value={file.path} className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs text-muted-foreground">{file.path}</code>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDownloadFile(file)}
                    className="gap-2"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/30">
                  <pre className="p-4 text-xs">
                    <code className="language-python">{file.content}</code>
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Additional Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-1">
            <FileCode className="h-3 w-3" />
            {projectData.files.length} files
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              Production Ready
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
