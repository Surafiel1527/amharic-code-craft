import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Code2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VersionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  htmlCode: string;
  versionNumber: number;
}

export function VersionPreviewDialog({ 
  open, 
  onOpenChange, 
  htmlCode, 
  versionNumber 
}: VersionPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (open && htmlCode) {
      // Create a blob URL for the HTML content
      const blob = new Blob([htmlCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      // Cleanup function to revoke the URL when component unmounts or dialog closes
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [open, htmlCode]);

  const handleOpenInNewTab = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlCode);
      newWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                Version {versionNumber} Preview
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Preview how the project looked at this stage
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="preview" className="text-xs gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="text-xs gap-1">
                    <Code2 className="h-3 w-3" />
                    Code
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-2 text-xs h-8 px-3"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Open in New Tab</span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="preview" className="h-full m-0 p-0" forceMount hidden={activeTab !== 'preview'}>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={`Version ${versionNumber} Preview`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading preview...
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="code" className="h-full m-0 p-0" forceMount hidden={activeTab !== 'code'}>
            <ScrollArea className="h-full">
              <pre className="text-xs bg-muted p-4 m-4 rounded-lg overflow-x-auto">
                <code>{htmlCode}</code>
              </pre>
            </ScrollArea>
          </TabsContent>
        </div>
      </DialogContent>
    </Dialog>
  );
}
