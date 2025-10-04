import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Code2, 
  Eye, 
  History, 
  Play,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { ChatInterface } from "./ChatInterface";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  generated_code?: string;
  created_at: string;
}

interface UserWorkspaceProps {
  projectId: string;
  conversationId: string;
  initialCode: string;
  onCodeUpdate: (code: string) => void;
}

export const UserWorkspace = ({ 
  projectId, 
  conversationId, 
  initialCode,
  onCodeUpdate 
}: UserWorkspaceProps) => {
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [workingCode, setWorkingCode] = useState(initialCode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load conversation messages and version history
  useEffect(() => {
    loadConversationHistory();
    loadVersionHistory();
  }, [conversationId]);

  const loadConversationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const typedMessages: Message[] = (data || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        generated_code: m.generated_code || undefined,
        created_at: m.created_at
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const loadVersionHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVersionHistory(data || []);
    } catch (error) {
      console.error("Error loading version history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCodeGenerated = (code: string) => {
    setWorkingCode(code);
    onCodeUpdate(code);
    
    // Create a version snapshot
    saveVersion(code);
  };

  const saveVersion = async (code: string) => {
    try {
      // Get the current version count
      const { data: versions } = await supabase
        .from("project_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (versions && versions[0]?.version_number || 0) + 1;

      await supabase.from("project_versions").insert({
        project_id: projectId,
        version_number: nextVersion,
        html_code: code,
        changes_summary: `Update ${nextVersion}`
      });

      loadVersionHistory();
    } catch (error) {
      console.error("Error saving version:", error);
    }
  };

  const handleRestoreVersion = async (version: any) => {
    try {
      setWorkingCode(version.html_code);
      onCodeUpdate(version.html_code);
      
      // Update conversation code
      await supabase
        .from("conversations")
        .update({ current_code: version.html_code })
        .eq("id", conversationId);

      toast.success(`Restored to version ${version.version_number}`);
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-12 px-4">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-2">
            <Code2 className="w-4 h-4" />
            Code
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
            {versionHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {versionHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 m-0 p-0">
          <div className="h-[calc(100vh-280px)]">
            <ChatInterface
              conversationId={conversationId}
              onCodeGenerated={handleCodeGenerated}
              currentCode={workingCode}
              onConversationChange={() => {}}
            />
          </div>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 m-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Project Code</h3>
                  <p className="text-sm text-muted-foreground">
                    {(workingCode.length / 1000).toFixed(1)}KB • {workingCode.split('\n').length} lines
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(workingCode);
                    toast.success("Code copied to clipboard");
                  }}
                >
                  Copy Code
                </Button>
              </div>
              <Card className="p-4 bg-muted/50">
                <pre className="text-xs overflow-auto">
                  <code>{workingCode || "// No code generated yet"}</code>
                </pre>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 m-0">
          <div className="h-[calc(100vh-280px)] p-4">
            <div className="h-full border rounded-lg overflow-hidden bg-white">
              {workingCode ? (
                <iframe
                  srcDoc={workingCode}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Play className="w-12 h-12 mx-auto opacity-50" />
                    <p>No preview available</p>
                    <p className="text-sm">Generate code in the Chat tab to see a preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Version History</h3>
                  <p className="text-sm text-muted-foreground">
                    Restore any previous version of your project
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVersionHistory}
                  disabled={loadingHistory}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <Separator />

              {versionHistory.length === 0 ? (
                <Card className="p-8 text-center">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No version history yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Versions are created automatically when you generate code
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {versionHistory.map((version) => (
                    <Card key={version.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">v{version.version_number}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(version.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {version.changes_summary || "No description"}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{(version.html_code.length / 1000).toFixed(1)}KB</span>
                            {version.quality_score && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Quality: {version.quality_score}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(version)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
