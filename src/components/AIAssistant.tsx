/**
 * AIAssistant - Universal AI Chat Migration Wrapper
 * 
 * This wrapper maintains the exact same API as the original AIAssistant
 * while using the Universal AI System underneath for consistent intelligence.
 * 
 * Production-ready migration wrapper with tool support and tabs.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Code, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UniversalChatInterface } from "./UniversalChatInterface";
import { AICapabilitiesGuide } from "./AICapabilitiesGuide";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

interface AIAssistantProps {
  projectContext?: {
    title: string;
    prompt: string;
    codeLength: number;
    codeSnippet?: string;
    fullCode?: string;
  };
}

export const AIAssistant = ({ projectContext }: AIAssistantProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"chat" | "code">("chat");

  const handleDownloadZip = async () => {
    if (!projectContext?.fullCode) {
      toast.error("No code available to download");
      return;
    }

    try {
      const blob = new Blob([projectContext.fullCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectContext.title || 'project'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Code downloaded successfully!");
    } catch (error) {
      logger.error('Download error', error);
      toast.error("Failed to download code");
    }
  };

  return (
    <div className="space-y-4">
      <AICapabilitiesGuide />
      
      <Card className="glass-effect border-primary/20 h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t("aiAssistant.title")}
              </CardTitle>
              <CardDescription>
                {t("aiAssistant.subtitle")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("chat")}
              >
                Chat
              </Button>
              <Button
                variant={activeTab === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("code")}
                disabled={!projectContext?.fullCode}
              >
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 p-4">
          {activeTab === "chat" ? (
            <UniversalChatInterface
              mode="panel"
              height="h-full"
              projectId={projectContext ? `ai-assistant-${projectContext.title}` : undefined}
              projectFiles={projectContext?.codeSnippet ? [{
                file_path: 'project-code',
                file_content: projectContext.codeSnippet
              }] : []}
              persistMessages={true}
              enableTools={true}
              projectContext={projectContext}
              autoLearn={true}
              autoApply={false}
              showContext={false}
              showHeader={false}
              showFooter={true}
              placeholder={t("aiAssistant.placeholder")}
            />
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Project Code</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadZip}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download HTML
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{projectContext?.fullCode || "No code available"}</code>
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
