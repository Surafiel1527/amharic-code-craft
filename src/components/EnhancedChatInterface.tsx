/**
 * EnhancedChatInterface - Universal AI Chat Migration Wrapper
 * 
 * This wrapper maintains the exact same API as the original EnhancedChatInterface
 * while using the Universal AI System underneath for consistent intelligence.
 * 
 * Production-ready migration wrapper with all enterprise features.
 */
import { UniversalChatInterface } from "./UniversalChatInterface";

interface EnhancedChatInterfaceProps {
  projectId?: string;
  selectedFiles?: string[];
  projectFiles?: Array<{ file_path: string; file_content: string }>;
  onCodeApply?: (code: string, filePath: string) => void;
}

export function EnhancedChatInterface({ 
  projectId, 
  selectedFiles = [], 
  projectFiles = [],
  onCodeApply 
}: EnhancedChatInterfaceProps) {
  return (
    <UniversalChatInterface
      mode="panel"
      height="h-[600px]"
      projectId={projectId}
      selectedFiles={selectedFiles}
      projectFiles={projectFiles}
      onCodeApply={onCodeApply ? async (code, filePath) => {
        await Promise.resolve(onCodeApply(code, filePath));
      } : undefined}
      persistMessages={false}
      autoLearn={true}
      autoApply={true}
      showContext={true}
      showHeader={true}
      showFooter={true}
      placeholder="Describe the issue or what you want to build..."
    />
  );
}
