import { Card } from "@/components/ui/card";
import { DevicePreview } from "@/components/DevicePreview";
import { UniversalChatInterface } from "@/components/UniversalChatInterface";

import { useIsMobile } from "@/hooks/use-mobile";

interface PreviewSectionProps {
  projectId: string;
  conversationId: string | null;
  htmlCode: string;
  framework: 'react' | 'html' | 'vue';
  mobileTab?: 'chat' | 'preview' | 'code';
}

export function PreviewSection({ 
  projectId, 
  conversationId, 
  htmlCode,
  framework,
  mobileTab = 'preview'
}: PreviewSectionProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`${isMobile ? 'h-full' : 'grid lg:grid-cols-2 gap-4 p-4 h-full'}`}>
      {/* Chat Interface - Always rendered to keep state */}
      <div className={isMobile && mobileTab !== 'chat' ? 'hidden' : ''}>
        <Card className={`p-4 flex flex-col ${isMobile ? 'h-full border-0 rounded-none' : ''}`}>
          {!isMobile && <h2 className="text-lg font-semibold mb-4">AI Assistant</h2>}
          <div className="flex-1 overflow-hidden">
            {conversationId && (
              <UniversalChatInterface
                conversationId={conversationId}
                projectId={projectId}
                mode="panel"
                context={{
                  currentCode: htmlCode,
                  projectId,
                  conversationHistory: [],
                  framework
                }}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Live Preview */}
      <div className={isMobile && mobileTab !== 'preview' ? 'hidden' : ''}>
        <Card className={`p-4 ${isMobile ? 'h-full border-0 rounded-none' : ''}`}>
          {!isMobile && <h2 className="text-lg font-semibold mb-4">Live Preview</h2>}
          <DevicePreview generatedCode={htmlCode} />
        </Card>
      </div>
    </div>
  );
}
