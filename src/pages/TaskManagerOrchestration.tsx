import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Code, Eye, MessageSquare, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UniversalChatInterface } from "@/components/UniversalChatInterface";

export default function TaskManagerOrchestration() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  const [generatedCode, setGeneratedCode] = useState("");

  const handleCodeApply = async (code: string) => {
    setGeneratedCode(code);
    setActiveTab("preview");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to continue</p>
          <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🧠 Mega Mind
            </h1>
            <p className="text-sm text-muted-foreground">Universal AI Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <UniversalChatInterface
              mode="fullscreen"
              height="h-[calc(100vh-280px)]"
              onCodeApply={handleCodeApply}
              persistMessages={true}
              autoLearn={true}
              autoApply={true}
              showContext={true}
              showHeader={true}
              showFooter={true}
              placeholder="Tell me what you want to build or improve..."
            />
          </TabsContent>

          <TabsContent value="preview">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Generated Code
                </h3>
              </div>
              {generatedCode ? (
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm max-h-[calc(100vh-350px)] overflow-y-auto">
                  <code>{generatedCode}</code>
                </pre>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No code generated yet</p>
                  <p className="text-sm">Start a conversation in the Chat tab to generate code</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
