import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentationGeneratorProps {
  code?: string;
  projectId?: string;
}

export const DocumentationGenerator = ({ code: initialCode = "", projectId }: DocumentationGeneratorProps) => {
  const [code, setCode] = useState(initialCode);
  const [docType, setDocType] = useState<'inline' | 'readme' | 'api'>('inline');
  const [loading, setLoading] = useState(false);
  const [documentation, setDocumentation] = useState<any>(null);

  const handleGenerate = async () => {
    if (!code.trim()) {
      toast.error("Please provide code to document");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-docs', {
        body: { code, projectId, docType, filePath: 'component' }
      });

      if (error) throw error;

      setDocumentation(data);
      toast.success("Documentation generated successfully");
    } catch (error) {
      console.error('Documentation error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate documentation");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentation Generator
        </CardTitle>
        <CardDescription>
          Auto-generate comprehensive documentation for your code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Documentation Type</label>
          <Select value={docType} onValueChange={(v) => setDocType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inline">Inline Comments (JSDoc)</SelectItem>
              <SelectItem value="readme">README.md</SelectItem>
              <SelectItem value="api">API Documentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          className="min-h-[200px] font-mono text-sm"
        />

        <Button 
          onClick={handleGenerate} 
          disabled={loading || !code.trim()}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Documentation
        </Button>

        {documentation && (
          <Tabs defaultValue="docs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="docs">Documentation</TabsTrigger>
              <TabsTrigger value="original">Original Code</TabsTrigger>
            </TabsList>

            <TabsContent value="docs" className="space-y-3">
              {docType === 'inline' && (
                <>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(documentation.documentedCode, 'documented-code.tsx')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs">
                      <code>{documentation.documentedCode}</code>
                    </pre>
                  </ScrollArea>
                </>
              )}

              {docType === 'readme' && (
                <>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(documentation.readmeContent, 'README.md')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download README
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                    <div className="prose prose-sm dark:prose-invert">
                      <pre className="text-xs whitespace-pre-wrap">{documentation.readmeContent}</pre>
                    </div>
                  </ScrollArea>
                </>
              )}

              {docType === 'api' && documentation.apiDocs && (
                <>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(JSON.stringify(documentation.apiDocs, null, 2), 'api-docs.json')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download API Docs
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs">
                      <code>{JSON.stringify(documentation.apiDocs, null, 2)}</code>
                    </pre>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            <TabsContent value="original">
              <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                <pre className="text-xs">
                  <code>{code}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};