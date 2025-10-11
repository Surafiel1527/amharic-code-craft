import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Eye, FileCode } from "lucide-react";
import { MobileWorkspaceSheet } from "./MobileWorkspaceSheet";

interface MobileWorkspaceTriggerProps {
  conversationId: string | null;
  onCodeGenerated: (code: string) => void;
  currentCode: string;
  onConversationChange: (id: string) => void;
  projectFiles?: Array<{ file_path: string; file_content: string }>;
  projectId?: string;
  projectStatus?: 'success' | 'failed' | 'generating';
  framework?: 'react' | 'html' | 'vue'; // Add framework prop
  defaultTab?: "chat" | "preview" | "files";
}

export function MobileWorkspaceTrigger({
  conversationId,
  onCodeGenerated,
  currentCode,
  onConversationChange,
  projectFiles,
  projectId,
  projectStatus,
  framework = 'react', // Add framework with default
  defaultTab = "chat"
}: MobileWorkspaceTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 flex gap-2">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="shadow-lg text-sm md:text-base"
        >
          <MessageSquare className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          <span className="hidden xs:inline">Workspace</span>
          <span className="xs:hidden">Work</span>
        </Button>
      </div>

      <MobileWorkspaceSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        conversationId={conversationId}
        onCodeGenerated={onCodeGenerated}
        currentCode={currentCode}
        onConversationChange={onConversationChange}
        projectFiles={projectFiles}
        projectId={projectId}
        projectStatus={projectStatus}
        framework={framework} // Pass framework to sheet
      />
    </>
  );
}
