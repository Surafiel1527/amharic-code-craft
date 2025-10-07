import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Code, FileCode, ExternalLink, Copy, Check, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { downloadHTML } from "@/utils/downloadHelpers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExportOptionsProps {
  htmlCode: string;
  projectTitle?: string;
}

export const ExportOptions = ({ htmlCode, projectTitle }: ExportOptionsProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  // Clean HTML code by removing JSON artifacts
  const cleanHTML = (() => {
    if (!htmlCode) return '';
    
    let code = htmlCode.trim();
    
    // Remove markdown code fences if present
    code = code.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    
    // If it's already HTML (starts with <!DOCTYPE or <html), return as-is
    if (code.startsWith('<!DOCTYPE') || code.startsWith('<html')) {
      return code;
    }
    
    // Try to parse as JSON and extract HTML content
    try {
      const parsed = JSON.parse(code);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Find HTML file in array
        const htmlFile = parsed.find((f: any) => 
          f.path?.endsWith('.html') || 
          f.path?.endsWith('.htm') ||
          f.content?.includes('<!DOCTYPE html>') ||
          f.content?.includes('<html')
        );
        if (htmlFile?.content) {
          return htmlFile.content;
        }
      } else if (parsed.content) {
        // Single file object
        return parsed.content;
      }
    } catch {
      // Not JSON, treat as raw HTML
    }
    
    return code;
  })();

  const handleDownloadHTML = () => {
    if (!cleanHTML) {
      toast.error("ምንም የተፈጠረ ኮድ የለም");
      return;
    }
    const filename = projectTitle 
      ? `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.html`
      : "website.html";
    downloadHTML(cleanHTML, filename);
    toast.success("HTML ፋይል ወረደ!");
  };

  const handleDownloadZip = async () => {
    if (!cleanHTML) {
      toast.error("ምንም የተፈጠረ ኮድ የለም");
      return;
    }
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add the HTML file
      zip.file('index.html', cleanHTML);
      
      // Generate and download the zip
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = projectTitle 
        ? `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.zip`
        : 'website.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("ZIP ፋይል ወረደ!");
    } catch (error) {
      console.error('Failed to create zip:', error);
      toast.error('ZIP ፋይል መፍጠር አልተሳካም');
    }
  };

  const generateReactComponent = () => {
    const componentName = projectTitle 
      ? projectTitle.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")
      : "MyComponent";
    
    return `import React from 'react';

const ${componentName} = () => {
  return (
    <div dangerouslySetInnerHTML={{ __html: \`${cleanHTML.replace(/`/g, '\\`')}\` }} />
  );
};

export default ${componentName};`;
  };

  const generateVueComponent = () => {
    const componentName = projectTitle || "MyComponent";
    
    return `<template>
  <div v-html="htmlContent"></div>
</template>

<script>
export default {
  name: '${componentName}',
  data() {
    return {
      htmlContent: \`${cleanHTML.replace(/`/g, '\\`')}\`
    }
  }
}
</script>`;
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type} ኮድ ተቀድቷል!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          የውጤት አማራጮች
        </CardTitle>
        <CardDescription>
          ፕሮጀክቱን በተለያዩ ቅርጸቶች ይውጡ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="vue">Vue</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                የኮድ ቅድመ እይታ - Review your generated code
              </p>
              <ScrollArea className="h-[400px] w-full rounded-md border bg-muted p-4">
                <pre className="text-xs">
                  <code>{cleanHTML}</code>
                </pre>
              </ScrollArea>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(cleanHTML, "Code")}
                  className="flex-1"
                >
                  {copied === "Code" ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Copy Code
                </Button>
                <Button onClick={handleDownloadZip} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="html" className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                Export as standalone HTML file
              </p>
              <ScrollArea className="h-[300px] w-full rounded-md border bg-muted p-4 mb-2">
                <pre className="text-xs">
                  <code>{cleanHTML}</code>
                </pre>
              </ScrollArea>
              <Button onClick={handleDownloadZip} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download as ZIP
              </Button>
              <Button 
                variant="outline"
                onClick={handleDownloadHTML} 
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download HTML Only
              </Button>
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(cleanHTML, "HTML")}
                className="w-full"
              >
                {copied === "HTML" ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copy HTML Code
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="react" className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                የ React Component የተፈጠረ ኮድ
              </p>
              <Button 
                onClick={() => copyToClipboard(generateReactComponent(), "React")}
                className="w-full"
              >
                {copied === "React" ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Code className="w-4 h-4 mr-2" />
                )}
                React Component ቅዳ
              </Button>
              <div className="bg-muted p-4 rounded-md overflow-x-auto">
                <pre className="text-xs">
                  <code>{generateReactComponent()}</code>
                </pre>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="vue" className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                የ Vue Component የተፈጠረ ኮድ
              </p>
              <Button 
                onClick={() => copyToClipboard(generateVueComponent(), "Vue")}
                className="w-full"
              >
                {copied === "Vue" ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <FileCode className="w-4 h-4 mr-2" />
                )}
                Vue Component ቅዳ
              </Button>
              <div className="bg-muted p-4 rounded-md overflow-x-auto">
                <pre className="text-xs">
                  <code>{generateVueComponent()}</code>
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-6 border-t space-y-2">
          <h4 className="text-sm font-semibold mb-2">ወደ ሆስቲንግ አቅራቢዎች ይዘምኑ</h4>
          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild className="w-full justify-start">
              <a 
                href="https://vercel.com/new" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Deploy to Vercel
              </a>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <a 
                href="https://app.netlify.com/start" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Deploy to Netlify
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
