import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Code, Eye, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRealtimeOrchestration } from "@/hooks/useRealtimeOrchestration";
import { formatErrorMessage } from "@/utils/orchestrationHelpers";
import { OrchestrationProgress } from "@/components/OrchestrationProgress";

export default function TaskManagerOrchestration() {
  const { user } = useAuth();
  const [status, setStatus] = useState("Ready to start");
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [jobId, setJobId] = useState<string | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [streamUpdates, setStreamUpdates] = useState<string[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);

  // Real-time progress tracking
  const { jobData } = useRealtimeOrchestration({
    jobId,
    onProgress: (update) => {
      setStatus(update.current_step);
      setProgress(update.progress);
      setPhases(update.phases || []);
      setStreamUpdates(update.stream_updates || []);
      
      if (update.output_data?.generatedCode || update.output_data?.html) {
        setGeneratedCode(update.output_data.generatedCode || update.output_data.html);
      }
    },
    onComplete: (data) => {
      setIsProcessing(false);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `✅ Complete! Your project has been ${jobId ? 'updated' : 'created'} successfully.`
      }]);
      toast({
        title: "✅ Complete!",
        description: "Your project is ready!",
      });
    },
    onError: (error) => {
      setIsProcessing(false);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${formatErrorMessage(error)}`
      }]);
      toast({
        title: "Error",
        description: formatErrorMessage(error),
        variant: "destructive"
      });
    },
    enablePollingFallback: true
  });

  const handleSendMessage = async () => {
    if (!user || !userInput.trim() || isProcessing) return;

    const message = userInput.trim();
    setUserInput("");
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsProcessing(true);
    setActiveTab("progress");
    setStatus("🧠 Mega Mind activated - analyzing your request...");
    setProgress(5);

    try {
      const { data, error } = await supabase.functions.invoke("mega-mind-orchestrator", {
        body: {
          request: message,
          requestType: 'code-generation',
          context: {
            userId: user.id,
            conversationHistory: chatHistory,
            timestamp: new Date().toISOString(),
            existingCode: generatedCode,
            autoRefine: true,
            autoLearn: true
          }
        }
      });

      if (error) throw error;
      if (!data?.jobId) throw new Error("No job ID returned");

      setJobId(data.jobId);
      setStatus("Processing your request...");
      
      toast({
        title: "🧠 Mega Mind Working",
        description: "Building your project...",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCancelDialog(true)}
          >
            Cancel
          </Button>
        ),
      });
    } catch (error: any) {
      console.error("❌ Failed:", error);
      setIsProcessing(false);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${formatErrorMessage(error)}`
      }]);
      toast({
        title: "Failed",
        description: formatErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleCancelConfirm = async () => {
    if (!jobId) return;
    
    try {
      await supabase
        .from('ai_generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);
      
      toast({
        title: "Cancelled",
        description: "Job has been cancelled",
      });
      
      setShowCancelDialog(false);
      setIsProcessing(false);
      setJobId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive"
      });
    }
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🧠 Mega Mind Orchestrator
          </h1>
          <p className="text-lg text-muted-foreground">
            Build or improve your projects with AI intelligence
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="gap-2">
              <Send className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <Code className="w-4 h-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-lg font-medium mb-2">👋 Welcome to Mega Mind!</p>
                    <p className="text-sm">Tell me what you want to build or improve...</p>
                    <div className="mt-4 text-left space-y-2 max-w-md mx-auto">
                      <p className="text-xs font-medium">Examples:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• "Build a todo app with authentication"</li>
                        <li>• "Improve my coffee shop website's colors"</li>
                        <li>• "Add a contact form to my existing site"</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary mr-8'}`}>
                      <p className="text-sm font-medium mb-1">{msg.role === 'user' ? '👤 You' : '🧠 Mega Mind'}</p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Describe what you want to build or improve..."
                  className="min-h-[100px]"
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!userInput.trim() || isProcessing}
                  size="lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {!isProcessing && chatHistory.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Start a conversation in the Chat tab to see progress here</p>
              </Card>
            ) : (
              <>
                <Card className="p-4 mb-4">
                  <p className="text-sm text-muted-foreground">{status}</p>
                </Card>
                
                <OrchestrationProgress 
                  phases={phases}
                  isLoading={isProcessing}
                  jobId={jobId || undefined}
                  currentProgress={progress}
                  streamingUpdates={streamUpdates}
                  onCancel={() => setShowCancelDialog(true)}
                />
              </>
            )}
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
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{generatedCode}</code>
                </pre>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Send a message to start generating code
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Generation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? All progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Continue</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
