import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, Check, Save, Clock, Sparkles, MessageSquare, Zap, LogOut, Settings, Download, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChatInterface } from "@/components/ChatInterface";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { downloadHTML } from "@/utils/downloadHelpers";

interface Project {
  id: string;
  title: string;
  prompt: string;
  html_code: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const EXAMPLE_PROMPTS = [
  {
    title: "የቡና ቤት ድህረ ገፅ",
    prompt: "ለቡና ቤቴ ቆንጆ ድህረ ገፅ ፍጠር። የቡና ምስሎች፣ የቡና አይነቶች እና ዋጋዎች፣ የመገኛ አድራሻ እና የድህረ ገፁ ቆንጆ ዲዛይን ይኑረው። የኢትዮጵያ ባህላዊ ቀለሞችን ተጠቀም።",
    emoji: "☕"
  },
  {
    title: "የግል ብሎግ",
    prompt: "ለግል ብሎግ ድህረ ገፅ ፍጠር። የብሎግ ፖስቶች፣ ስለኔ ክፍል፣ የመገናኛ ቅጽ እና ማህበራዊ ሚዲያ አገናኞች ይኑሩት። ዘመናዊ እና ንፁህ ዲዛይን ተጠቀም።",
    emoji: "📝"
  },
  {
    title: "የንግድ ማሳያ ገፅ",
    prompt: "ለትንሽ ንግድ ማሳያ ገፅ ፍጠር። የምርቶች ክፍል፣ አገልግሎቶች፣ የደንበኛ ግምገማዎች፣ እና የመገናኛ መረጃ ይኑረው። ሙያዊ እና አስተማማኝ ዲዛይን።",
    emoji: "🏢"
  },
  {
    title: "የፖርትፎሊዮ ድህረ ገፅ",
    prompt: "ለአርቲስት ወይም ፎቶግራፈር የፖርትፎሊዮ ድህረ ገፅ ፍጠር። የስራ ማሳያ ክፍል፣ ስለኔ፣ እና የመገናኛ ቅጽ። ጥበባዊ እና ውበት ያለው ዲዛይን።",
    emoji: "🎨"
  },
];

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole(user?.id);
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"quick" | "chat">("quick");
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentProjects();
      fetchConversations();
    }
  }, [user]);

  const fetchRecentProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecentProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleQuickGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("እባክዎ መግለጫ ያስገቡ");
      return;
    }

    if (!isOnline) {
      toast.error("ከመስመር ጋር መገናኘት ይፈልጋል");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-website", {
        body: { prompt },
      });

      if (error) {
        if (error.message.includes("429")) {
          toast.error("በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።");
        } else if (error.message.includes("402")) {
          toast.error("ክፍያ ያስፈልጋል። እባክዎ የእርስዎን መለያ ይሙሉ።");
        } else {
          toast.error("ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።");
        }
        throw error;
      }

      setGeneratedCode(data.html);
      toast.success("ድህረ ገፅ በተሳካ ሁኔታ ተፈጥሯል!");
    } catch (error) {
      console.error("Error generating website:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProject = async () => {
    if (!projectTitle.trim()) {
      toast.error("እባክዎ የፕሮጀክት ስም ያስገቡ");
      return;
    }

    if (!generatedCode) {
      toast.error("ምንም የተፈጠረ ኮድ የለም");
      return;
    }

    if (!user) {
      toast.error("እባክዎ ይግቡ");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({
        title: projectTitle,
        prompt: prompt,
        html_code: generatedCode,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("ፕሮጀክት በተሳካ ሁኔታ ተቀምጧል!");
      setSaveDialogOpen(false);
      setProjectTitle("");
      fetchRecentProjects();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("ፕሮጀክትን ማስቀመጥ አልተቻለም");
    } finally {
      setIsSaving(false);
    }
  };

  const loadProject = (project: Project) => {
    setPrompt(project.prompt);
    setGeneratedCode(project.html_code);
    toast.success(`"${project.title}" ተጫነ`);
  };

  const useExamplePrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    toast.success("ምሳሌ ተጫነ");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("ኮድ ተቀድቷል!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedCode) {
      toast.error("ምንም የተፈጠረ ኮድ የለም");
      return;
    }

    const filename = projectTitle.trim() 
      ? `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.html`
      : "website.html";
    
    downloadHTML(generatedCode, filename);
    toast.success("ፋይል ወረደ!");
  };

  const createNewConversation = async () => {
    if (!user) {
      toast.error("እባክዎ ይግቡ");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ title: "አዲስ ውይይት", user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setActiveConversation(data.id);
      setGeneratedCode("");
      fetchConversations();
      toast.success("አዲስ ውይይት ተፈጠረ");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("ውይይት መፍጠር አልተቻለም");
    }
  };

  const handleCodeGenerated = (code: string) => {
    setGeneratedCode(code);
  };

  const handleConversationChange = (id: string) => {
    setActiveConversation(id);
    fetchConversations();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_91%_65%/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(142_76%_36%/0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-4xl mx-auto text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1" />
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                የአማርኛ AI ቴክኖሎጂ - ዘመናዊ እና ብልህ
              </div>
              <div className="flex-1 flex justify-end gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                    <Shield className="h-4 w-4" />
                    አስተዳዳሪ
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="gap-2">
                  <Settings className="h-4 w-4" />
                  ማስተካከያ
                </Button>
                <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  ውጣ
                </Button>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent leading-tight">
              በአማርኛ ድህረ ገፆችን ይፍጠሩ
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI ጋር በመወያየት ወይም በቀላል መግለጫ ድህረ ገፅዎን ይገንቡ። እንደ Lovable እና Replit!
            </p>
          </div>
        </div>
      </section>

      {/* Example Prompts */}
      {mode === "quick" && (
        <section className="container mx-auto px-4 py-6 border-b border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              ምሳሌዎች
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {EXAMPLE_PROMPTS.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:border-primary/50 transition-all text-xs"
                  onClick={() => useExamplePrompt(example.prompt)}
                >
                  <span className="text-2xl">{example.emoji}</span>
                  <span className="text-center">{example.title}</span>
                </Button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[300px_1fr_1fr] gap-4 max-w-7xl mx-auto">
          {/* Sidebar - Conversations List */}
          {mode === "chat" && (
            <Card className="p-4 space-y-4 h-[calc(100vh-350px)] flex flex-col">
              <h3 className="font-semibold text-sm">ውይይቶች</h3>
              <ConversationSidebar
                conversations={conversations}
                activeConversation={activeConversation}
                onConversationSelect={setActiveConversation}
                onNewConversation={createNewConversation}
                onConversationsChange={fetchConversations}
              />
            </Card>
          )}

          {/* Editor Panel */}
          <Card className={`p-6 space-y-4 bg-card border-border shadow-lg ${mode === "chat" ? "" : "lg:col-span-2"}`}>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "quick" | "chat")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick" className="gap-2">
                  <Zap className="h-4 w-4" />
                  ፈጣን ሁነታ
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  የውይይት ሁነታ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">የእርስዎን ድህረ ገፅ ይግለጹ</label>
                </div>
                
                <Textarea
                  placeholder="ምሳሌ: ለቡና ቤቴ ቆንጆ ድህረ ገፅ ፍጠር። ምስሎች፣ ዋጋዎች እና የመገኛ አድራሻ ይኑረው።"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[200px] resize-none"
                  dir="auto"
                />
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleQuickGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        በመፍጠር ላይ...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        ድህረ ገፅ ፍጠር
                      </>
                    )}
                  </Button>

                  {generatedCode && (
                    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Save className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>ፕሮጀክት አስቀምጥ</DialogTitle>
                          <DialogDescription>የፕሮጀክት ስም ያስገቡ</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Input
                            placeholder="የፕሮጀክት ስም"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                          />
                          <Button onClick={handleSaveProject} disabled={isSaving} className="w-full">
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                በማስቀመጥ ላይ...
                              </>
                            ) : (
                              "አስቀምጥ"
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-4 h-[calc(100vh-400px)]">
                <ChatInterface
                  conversationId={activeConversation}
                  onCodeGenerated={handleCodeGenerated}
                  currentCode={generatedCode}
                  onConversationChange={handleConversationChange}
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Preview Panel */}
          <Card className="p-6 space-y-4 bg-card border-border shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-2">
                🎨 ቅድመ እይታ
              </label>
              {generatedCode && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyCode} className="gap-2">
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        ተቀድቷል
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        ቅዳ
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="h-3 w-3" />
                    አውርድ
                  </Button>
                </div>
              )}
            </div>

            <div className="relative rounded-lg border border-border bg-background/50 overflow-hidden h-[calc(100vh-400px)]">
              {generatedCode ? (
                <iframe
                  srcDoc={generatedCode}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-3 p-6">
                    <div className="text-5xl opacity-20">🌐</div>
                    <p className="text-sm">የእርስዎ ድህረ ገፅ እዚህ ይታያል</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Projects Section */}
      {recentProjects.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                የእርስዎ ፕሮጀክቶች
              </h2>
            </div>
            <ProjectsGrid
              projects={recentProjects}
              onLoadProject={loadProject}
              onProjectsChange={fetchRecentProjects}
            />
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
