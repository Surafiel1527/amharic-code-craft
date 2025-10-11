import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, FileCode, Monitor, Tablet, Smartphone, Download, X } from "lucide-react";
import { UniversalChatInterface } from "./UniversalChatInterface";
import { toast } from "sonner";

interface MobileWorkspaceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  onCodeGenerated: (code: string) => void;
  currentCode: string;
  onConversationChange: (id: string) => void;
  projectFiles?: Array<{ file_path: string; file_content: string }>;
  projectId?: string;
  projectStatus?: 'success' | 'failed' | 'generating';
}

export function MobileWorkspaceSheet({
  isOpen,
  onClose,
  conversationId,
  onCodeGenerated,
  currentCode,
  onConversationChange,
  projectFiles = [],
  projectId,
  projectStatus = 'success'
}: MobileWorkspaceSheetProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("mobile");
  const [activeTab, setActiveTab] = useState("chat");
  
  // Detect screen size for responsive behavior
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
        side={isMobile ? "bottom" : "right"}
        className={`p-0 flex flex-col ${
          isMobile 
            ? "h-[90vh] w-full" 
            : isTablet 
            ? "w-[500px] h-full" 
            : "w-[600px] h-full"
        }`}
      >
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base md:text-lg">Workspace</SheetTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b flex-shrink-0">
            <TabsTrigger value="chat" className="gap-1 md:gap-2 text-xs md:text-sm">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1 md:gap-2 text-xs md:text-sm">
              <Eye className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1 md:gap-2 text-xs md:text-sm">
              <FileCode className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0 p-0">
              <UniversalChatInterface
                mode="panel"
                operationMode="enhance"
                height="h-full"
                conversationId={conversationId}
                projectId={projectId}
                projectFiles={projectFiles.length > 0 ? projectFiles : (currentCode ? [{
                  file_path: 'main-project',
                  file_content: currentCode
                }] : [])}
                context={{ projectId, projectStatus }}
                onCodeApply={async (code) => {
                  onCodeGenerated(code);
                }}
                onConversationChange={onConversationChange}
                persistMessages={true}
                autoLearn={true}
                autoApply={true}
                showContext={true}
                showHeader={false}
                showFooter={true}
                placeholder={projectStatus === 'failed' ? "Describe the issue or ask for help fixing it..." : "Describe what you want to add or improve..."}
              />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0 p-2 md:p-4 flex flex-col gap-2 md:gap-4">
              <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
                <Button
                  variant={deviceMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceMode("desktop")}
                  className="text-xs md:text-sm"
                >
                  <Monitor className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Desktop</span>
                  <span className="sm:hidden">PC</span>
                </Button>
                <Button
                  variant={deviceMode === "tablet" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceMode("tablet")}
                  className="text-xs md:text-sm"
                >
                  <Tablet className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Tablet</span>
                  <span className="sm:hidden">Tab</span>
                </Button>
                <Button
                  variant={deviceMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceMode("mobile")}
                  className="text-xs md:text-sm"
                >
                  <Smartphone className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Mobile</span>
                  <span className="sm:hidden">Mob</span>
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="flex justify-center p-2 md:p-4">
                  <div
                    style={{ width: getDeviceWidth(), maxWidth: "100%" }}
                    className="border rounded-lg overflow-hidden shadow-lg transition-all duration-300 bg-background"
                  >
                    <div className="bg-gradient-to-r from-primary to-primary/50 h-8 md:h-10 flex items-center px-2 md:px-3">
                      <div className="flex gap-1 md:gap-1.5">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500" />
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-500" />
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500" />
                      </div>
                    </div>
                    <iframe
                      src="/"
                      className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-white"
                      title="Live Preview"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="files" className="h-full m-0 p-2 md:p-4 flex flex-col gap-2 md:gap-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs md:text-sm">
                  {projectFiles.length} files
                </Badge>
                <Button size="sm" onClick={handleDownloadZip} className="text-xs md:text-sm">
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Download ZIP</span>
                  <span className="sm:hidden">ZIP</span>
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                {projectFiles.length === 0 ? (
                  <div className="p-4 md:p-8 text-center text-muted-foreground text-sm md:text-base">
                    No files to display
                  </div>
                ) : (
                  <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                    {projectFiles.map((file, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-2 md:px-3 py-1.5 md:py-2 flex items-center justify-between">
                          <span className="text-xs md:text-sm font-medium truncate flex-1 mr-2">{file.file_path}</span>
                          <FileCode className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <pre className="p-2 md:p-4 text-[10px] md:text-xs overflow-x-auto bg-background">
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
