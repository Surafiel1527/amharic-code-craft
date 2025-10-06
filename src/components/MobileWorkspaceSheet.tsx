import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, FileCode, Monitor, Tablet, Smartphone, Download, X } from "lucide-react";
import { ChatInterface } from "./ChatInterface";
import { toast } from "sonner";

interface MobileWorkspaceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  onCodeGenerated: (code: string) => void;
  currentCode: string;
  onConversationChange: (id: string) => void;
  projectFiles?: Array<{ file_path: string; file_content: string }>;
}

export function MobileWorkspaceSheet({
  isOpen,
  onClose,
  conversationId,
  onCodeGenerated,
  currentCode,
  onConversationChange,
  projectFiles = []
}: MobileWorkspaceSheetProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("mobile");
  const [activeTab, setActiveTab] = useState("chat");

  const getDeviceWidth = () => {
    switch (deviceMode) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  const handleDownloadZip = async () => {
    try {
      // This would integrate with your zip generation logic
      toast.success("Preparing files for download...");
      // TODO: Implement actual zip download
    } catch (error) {
      toast.error("Failed to download files");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Workspace</SheetTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b flex-shrink-0">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileCode className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0 p-0">
              <ChatInterface
                conversationId={conversationId}
                onCodeGenerated={onCodeGenerated}
                currentCode={currentCode}
                onConversationChange={onConversationChange}
              />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0 p-4 flex flex-col gap-4">
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  variant={deviceMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceMode("desktop")}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={deviceMode === "tablet" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceMode("tablet")}
                >
                  <Tablet className="h-4 w-4 mr-2" />
                  Tablet
                </Button>
                <Button
                  variant={deviceMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceMode("mobile")}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="flex justify-center p-4">
                  <div
                    style={{ width: getDeviceWidth(), maxWidth: "100%" }}
                    className="border rounded-lg overflow-hidden shadow-lg transition-all duration-300 bg-background"
                  >
                    <div className="bg-gradient-to-r from-primary to-primary/50 h-10 flex items-center px-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      </div>
                    </div>
                    <iframe
                      src="/"
                      className="w-full h-[500px] bg-white"
                      title="Live Preview"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="files" className="h-full m-0 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {projectFiles.length} files
                </Badge>
                <Button size="sm" onClick={handleDownloadZip}>
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                {projectFiles.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No files to display
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {projectFiles.map((file, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-3 py-2 flex items-center justify-between">
                          <span className="text-sm font-medium">{file.file_path}</span>
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <pre className="p-4 text-xs overflow-x-auto bg-background">
                          <code>{file.file_content}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
