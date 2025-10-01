import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, Save, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Project {
  id: string;
  title: string;
  prompt: string;
  html_code: string;
  created_at: string;
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
  {
    title: "የምግብ ትዕዛዝ ገፅ",
    prompt: "ለምግብ ቤት የምግብ ትዕዛዝ ድህረ ገፅ ፍጠር። የምግብ ምናሌ፣ ዋጋዎች፣ ምስሎች፣ እና የማዘዝ ቁልፍ ይኑረው। አበላሽ እና ቀለም ያለ ዲዛይን።",
    emoji: "🍽️"
  },
  {
    title: "የወጣቶች ክበብ",
    prompt: "ለወጣቶች ክበብ ድህረ ገፅ ፍጠር። ስለ ክበቡ መረጃ፣ ክስተቶች፣ ፎቶ ማሳያ፣ እና የምዝገባ ቅጽ። ወጣታዊ እና ሕያው ዲዛይን።",
    emoji: "🎯"
  }
];

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetchRecentProjects();
  }, []);

  const fetchRecentProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecentProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("እባክዎ መግለጫ ያስገቡ");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-website", {
        body: { prompt },
      });

      if (error) throw error;

      setGeneratedCode(data.html);
      toast.success("ድህረ ገፅ በተሳካ ሁኔታ ተፈጥሯል!");
    } catch (error) {
      console.error("Error generating website:", error);
      toast.error("ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።");
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

    setIsSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({
        title: projectTitle,
        prompt: prompt,
        html_code: generatedCode,
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
    toast.success("ምሳሌ ተጫነ - አሁን 'ድህረ ገፅ ፍጠር' ይጫኑ");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("ኮድ ተቀድቷል!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_91%_65%/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(142_76%_36%/0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              የአማርኛ AI ቴክኖሎጂ
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent leading-tight">
              በአማርኛ ድህረ ገፆችን ይፍጠሩ
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              የእርስዎን ሀሳብ በአማርኛ ይግለጹ፣ AI የእርስዎን ድህረ ገፅ በጥቂት ሰከንዶች ውስጥ ይገነባል።
            </p>
          </div>
        </div>
      </section>

      {/* Example Prompts */}
      <section className="container mx-auto px-4 py-8 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ምሳሌዎች - ይምረጡ እና ይሞክሩ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/50 transition-all"
                onClick={() => useExamplePrompt(example.prompt)}
              >
                <span className="text-3xl">{example.emoji}</span>
                <span className="text-xs text-center">{example.title}</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Editor Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Input Panel */}
          <Card className="p-6 space-y-4 bg-card border-border shadow-lg">
            <div className="space-y-2">
              <label className="text-lg font-semibold flex items-center gap-2">
                <span className="text-primary">📝</span>
                የእርስዎን ድህረ ገፅ ይግለጹ
              </label>
              <p className="text-sm text-muted-foreground">
                እንደ "ለንግዴ ገጽ ፍጠር" ወይም "የግል ብሎግ ገጽ አዘጋጅ" ይፃፉ
              </p>
            </div>
            
            <Textarea
              placeholder="ምሳሌ: ለቡና ቤቴ ቆንጆ ድህረ ገፅ ፍጠር። ምስሎች፣ ዋጋዎች እና የመገኛ አድራሻ ይኑረው።"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[300px] resize-none bg-background/50 border-border focus:border-primary transition-colors text-base"
              dir="auto"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-primary/20 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    በመፍጠር ላይ...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    ድህረ ገፅ ፍጠር
                  </>
                )}
              </Button>

              {generatedCode && (
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-12 w-12">
                      <Save className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>ፕሮጀክት አስቀምጥ</DialogTitle>
                      <DialogDescription>
                        የፕሮጀክት ስም ያስገቡ
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder="የፕሮጀክት ስም"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                      />
                      <Button
                        onClick={handleSaveProject}
                        disabled={isSaving}
                        className="w-full"
                      >
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
          </Card>

          {/* Preview Panel */}
          <Card className="p-6 space-y-4 bg-card border-border shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold flex items-center gap-2">
                <span className="text-accent">🎨</span>
                ቅድመ እይታ
              </label>
              {generatedCode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCode}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      ተቀድቷል
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      ኮድ ቅዳ
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="relative rounded-lg border border-border bg-background/50 overflow-hidden min-h-[500px]">
              {generatedCode ? (
                <iframe
                  srcDoc={generatedCode}
                  className="w-full h-[500px] border-0"
                  title="Generated Website Preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-4 p-8">
                    <div className="text-6xl opacity-20">🌐</div>
                    <p className="text-lg">የእርስዎ ድህረ ገፅ እዚህ ይታያል</p>
                    <p className="text-sm">በግራ በኩል መግለጫ ያስገቡ እና "ድህረ ገፅ ፍጠር" ይጫኑ</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              የቅርብ ጊዜ ፕሮጀክቶች
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <Card
                  key={project.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => loadProject(project)}
                >
                  <h3 className="font-semibold mb-2 truncate">{project.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {project.prompt}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString("am-ET", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ለምን ይህን መጠቀም አለብዎ?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3 bg-card border-border hover:border-primary/50 transition-all">
              <div className="text-4xl">⚡</div>
              <h3 className="text-xl font-semibold">በጣም ፈጣን</h3>
              <p className="text-muted-foreground">
                በሰከንዶች ውስጥ ሙሉ በሙሉ የሚሰራ ድህረ ገፅ ይቀበሉ
              </p>
            </Card>

            <Card className="p-6 space-y-3 bg-card border-border hover:border-primary/50 transition-all">
              <div className="text-4xl">🎯</div>
              <h3 className="text-xl font-semibold">ቀላል ለመጠቀም</h3>
              <p className="text-muted-foreground">
                በአማርኛ ብቻ ይፃፉ። ምንም ፕሮግራም ኮድ አያስፈልግም
              </p>
            </Card>

            <Card className="p-6 space-y-3 bg-card border-border hover:border-primary/50 transition-all">
              <div className="text-4xl">🚀</div>
              <h3 className="text-xl font-semibold">AI የተደገፈ</h3>
              <p className="text-muted-foreground">
                የላቀ AI ቴክኖሎጂ የእርስዎን ሀሳብ ወደ እውነታ ይለውጣል
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
