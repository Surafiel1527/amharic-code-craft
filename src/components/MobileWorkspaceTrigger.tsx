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
  defaultTab?: "chat" | "preview" | "files";
}

export function MobileWorkspaceTrigger({
  conversationId,
  onCodeGenerated,
  currentCode,
  onConversationChange,
  projectFiles,
  defaultTab = "chat"
}: MobileWorkspaceTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 flex gap-2 md:hidden">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="shadow-lg"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          Workspace
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
      />
    </>
  );
}
