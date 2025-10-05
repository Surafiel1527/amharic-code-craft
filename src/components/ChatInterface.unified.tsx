/**
 * ChatInterface - Universal AI Chat Migration Wrapper
 * 
 * This wrapper maintains the exact same API as the original ChatInterface
 * while using the Universal AI System underneath for consistent intelligence.
 * 
 * Production-ready migration wrapper that preserves all original functionality.
 */
import { useEffect } from "react";
import { UniversalChatInterface } from "./UniversalChatInterface";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatInterfaceProps {
  conversationId: string | null;
  onCodeGenerated: (code: string) => void;
  currentCode: string;
  onConversationChange: (id: string) => void;
}

export const ChatInterface = ({ 
  conversationId, 
  onCodeGenerated, 
  currentCode,
  onConversationChange 
}: ChatInterfaceProps) => {
  const { t } = useLanguage();

  return (
    <UniversalChatInterface
      mode="panel"
      height="h-full"
      projectId={conversationId || undefined}
      conversationId={conversationId || undefined}
      selectedFiles={['current-file']}
      projectFiles={currentCode ? [{
        file_path: 'current-file',
        file_content: currentCode
      }] : []}
      onCodeApply={async (code) => {
        onCodeGenerated(code);
      }}
      onConversationChange={onConversationChange}
      persistMessages={true}
      autoLearn={true}
      autoApply={true}
      showContext={false}
      showHeader={false}
      showFooter={true}
      placeholder={t("chat.writeMessage")}
    />
  );
};
