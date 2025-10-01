import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Code, FileCode, ExternalLink, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { downloadHTML } from "@/utils/downloadHelpers";

interface ExportOptionsProps {
  htmlCode: string;
  projectTitle?: string;
}

export const ExportOptions = ({ htmlCode, projectTitle }: ExportOptionsProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleDownloadHTML = () => {
    if (!htmlCode) {
      toast.error("ምንም የተፈጠረ ኮድ የለም");
      return;
    }
    const filename = projectTitle 
      ? `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.html`
      : "website.html";
    downloadHTML(htmlCode, filename);
    toast.success("HTML ፋይል ወረደ!");
  };

  const generateReactComponent = () => {
    const componentName = projectTitle 
      ? projectTitle.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")
      : "MyComponent";
    
    return `import React from 'react';

const ${componentName} = () => {
  return (
    <div dangerouslySetInnerHTML={{ __html: \`${htmlCode.replace(/`/g, '\\`')}\` }} />
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
      htmlContent: \`${htmlCode.replace(/`/g, '\\`')}\`
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
        <Tabs defaultValue="html" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="vue">Vue</TabsTrigger>
          </TabsList>
          
          <TabsContent value="html" className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button onClick={handleDownloadHTML} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                HTML ፋይል አውርድ
              </Button>
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(htmlCode, "HTML")}
                className="w-full"
              >
                {copied === "HTML" ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                HTML ኮድ ቅዳ
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
