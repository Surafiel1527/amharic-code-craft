import { Card } from "@/components/ui/card";
import { DevicePreview } from "@/components/DevicePreview";
import { UniversalChatInterface } from "@/components/UniversalChatInterface";

interface PreviewSectionProps {
  projectId: string;
  conversationId: string | null;
  htmlCode: string;
  framework: 'react' | 'html' | 'vue';
}

export function PreviewSection({ 
  projectId, 
  conversationId, 
  htmlCode,
  framework,
}: PreviewSectionProps) {
  
  return (
    <div className="grid lg:grid-cols-2 gap-4 p-4 h-full">
      {/* Chat Interface */}
      <Card className="p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">AI Assistant</h2>
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

      {/* Live Preview */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
        <DevicePreview generatedCode={htmlCode} />
      </Card>
    </div>
  );
}
