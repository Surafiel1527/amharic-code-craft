import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Code2, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface CodeEditorProps {
  filePath: string | null;
  initialContent: string;
  onSave: (content: string) => void;
}

export function CodeEditor({ filePath, initialContent, onSave }: CodeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
  }, [initialContent, filePath]);

  const handleSave = () => {
    onSave(content);
    setIsDirty(false);
    toast.success('File saved successfully');
  };

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a file to edit</p>
        </div>
      </div>
    );
  }

  const getLanguage = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.jsx') || path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.json')) return 'json';
    return 'text';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          <span className="text-sm font-medium">{filePath.split('/').pop()}</span>
          {isDirty && <span className="text-xs text-orange-500">●</span>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>

      <Tabs defaultValue="code" className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2">
          <TabsTrigger value="code">
            <Code2 className="w-4 h-4 mr-2" />
            Code
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="flex-1 p-0 m-0">
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsDirty(true);
            }}
            className="h-full resize-none font-mono text-sm border-0 rounded-none"
            placeholder="Start coding..."
          />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 p-4">
          <div className="h-full border rounded-lg p-4 bg-card overflow-auto">
            <pre className="text-sm">
              <code className={`language-${getLanguage(filePath)}`}>
                {content}
              </code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
