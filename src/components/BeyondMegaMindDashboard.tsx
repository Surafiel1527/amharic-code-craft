import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, Image as ImageIcon, Code2, Zap, Brain, 
  Mic, Eye, Rocket, Cpu, Wand2, Download, Copy,
  Upload, Palette, Layout, CheckCircle2
} from "lucide-react";

export default function BeyondMegaMindDashboard() {
  const [activeTab, setActiveTab] = useState("multi-modal");
  
  // Multi-Modal Generator State
  const [multiModalPrompt, setMultiModalPrompt] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [includeCode, setIncludeCode] = useState(true);
  const [optimize, setOptimize] = useState(true);
  const [multiModalResult, setMultiModalResult] = useState<any>(null);
  const [isGeneratingMultiModal, setIsGeneratingMultiModal] = useState(false);

  // Visual Code Generator State
  const [designImage, setDesignImage] = useState<File | null>(null);
  const [designImagePreview, setDesignImagePreview] = useState<string>("");
  const [designDescription, setDesignDescription] = useState("");
  const [framework, setFramework] = useState<"react" | "vue" | "angular" | "svelte">("react");
  const [styling, setStyling] = useState<"tailwind" | "css" | "styled-components">("tailwind");
  const [visualCodeResult, setVisualCodeResult] = useState<any>(null);
  const [isGeneratingVisualCode, setIsGeneratingVisualCode] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDesignImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDesignImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiModalGenerate = async () => {
    if (!multiModalPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGeneratingMultiModal(true);
    setMultiModalResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('unified-ai-workers', {
        body: { 
          prompt: multiModalPrompt,
          includeImages,
          includeCode,
          optimize
        }
      });

      if (error) throw error;

      setMultiModalResult(data);
      toast.success(`Generated in ${data.generationTime}ms!`, {
        description: `${data.images.length} images, ${data.code ? 'code included' : 'no code'}`
      });
    } catch (error: any) {
      console.error('Multi-modal generation error:', error);
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGeneratingMultiModal(false);
    }
  };

  const handleVisualCodeGenerate = async () => {
    if (!designImagePreview) {
      toast.error("Please upload a design image");
      return;
    }

    setIsGeneratingVisualCode(true);
    setVisualCodeResult(null);

    try {
      const base64Data = designImagePreview.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('mega-mind-orchestrator', {
        body: {
          imageBase64: base64Data,
          description: designDescription,
          framework,
          styling
        }
      });

      if (error) throw error;

      setVisualCodeResult(data);
      toast.success("Code generated from design!", {
        description: `${data.code.subComponents.length + 1} components created`
      });
    } catch (error: any) {
      console.error('Visual code generation error:', error);
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGeneratingVisualCode(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
            Beyond Mega Mind
          </h1>
          <p className="text-muted-foreground">
            Next-generation AI: Multi-modal generation, visual code, voice control & more
          </p>
        </div>
      </div>

      {/* Feature Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <Brain className="w-3 h-3" /> Multi-Modal AI
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Eye className="w-3 h-3" /> Visual Code Gen
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Mic className="w-3 h-3" /> Voice Control
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Zap className="w-3 h-3" /> Instant Deploy
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="w-3 h-3" /> Self-Learning
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="multi-modal" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Multi-Modal Generator
          </TabsTrigger>
          <TabsTrigger value="visual-code" className="gap-2">
            <Eye className="w-4 h-4" />
            Image to Code
          </TabsTrigger>
        </TabsList>

        {/* Multi-Modal Generator Tab */}
        <TabsContent value="multi-modal" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-500" />
                  Multi-Modal Generation
                </CardTitle>
                <CardDescription>
                  Generate text, images, and code simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Prompt</Label>
                  <Textarea
                    value={multiModalPrompt}
                    onChange={(e) => setMultiModalPrompt(e.target.value)}
                    placeholder="Example: Create a futuristic dashboard with neon colors. Include analytics charts and a user profile section with avatar."
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                      <Label>Include Images</Label>
                    </div>
                    <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-green-500" />
                      <Label>Include Code</Label>
                    </div>
                    <Switch checked={includeCode} onCheckedChange={setIncludeCode} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <Label>Auto-Optimize</Label>
                    </div>
                    <Switch checked={optimize} onCheckedChange={setOptimize} />
                  </div>
                </div>

                <Button
                  onClick={handleMultiModalGenerate}
                  disabled={isGeneratingMultiModal || !multiModalPrompt}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingMultiModal ? (
                    <>
                      <Cpu className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Everything
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {multiModalResult 
                    ? `Generated in ${multiModalResult.generationTime}ms`
                    : 'Results will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {multiModalResult ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* Text Response */}
                      {multiModalResult.text && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              AI Response
                            </h4>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(multiModalResult.text)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-3 bg-muted rounded-lg text-sm">
                            {multiModalResult.text}
                          </div>
                        </div>
                      )}

                      {/* Generated Images */}
                      {multiModalResult.images.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Generated Images ({multiModalResult.images.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {multiModalResult.images.map((img: any, idx: number) => (
                              <div key={idx} className="space-y-2">
                                <img 
                                  src={img.url} 
                                  alt={img.prompt}
                                  className="w-full rounded-lg border"
                                />
                                <p className="text-xs text-muted-foreground">{img.prompt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generated Code */}
                      {multiModalResult.code && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Code2 className="w-4 h-4" />
                              Generated Code
                            </h4>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(multiModalResult.code)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                            {multiModalResult.code}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Enter a prompt and click generate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Visual Code Generator Tab */}
        <TabsContent value="visual-code" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  Image to Code
                </CardTitle>
                <CardDescription>
                  Upload a design and get production-ready code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Design</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {designImagePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={designImagePreview} 
                          alt="Design preview"
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDesignImage(null);
                            setDesignImagePreview("");
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={designDescription}
                    onChange={(e) => setDesignDescription(e.target.value)}
                    placeholder="Add context about the design..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Framework</Label>
                    <div className="flex gap-2">
                      {(['react', 'vue'] as const).map((fw) => (
                        <Button
                          key={fw}
                          size="sm"
                          variant={framework === fw ? "default" : "outline"}
                          onClick={() => setFramework(fw)}
                          className="flex-1"
                        >
                          {fw}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Styling</Label>
                    <div className="flex gap-2">
                      {(['tailwind', 'css'] as const).map((style) => (
                        <Button
                          key={style}
                          size="sm"
                          variant={styling === style ? "default" : "outline"}
                          onClick={() => setStyling(style)}
                          className="flex-1"
                        >
                          {style}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleVisualCodeGenerate}
                  disabled={isGeneratingVisualCode || !designImagePreview}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingVisualCode ? (
                    <>
                      <Cpu className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing & Generating...
                    </>
                  ) : (
                    <>
                      <Palette className="w-4 h-4 mr-2" />
                      Generate Code from Design
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Code Results Section */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Code</CardTitle>
                <CardDescription>
                  {visualCodeResult 
                    ? `${visualCodeResult.code.subComponents.length + 1} components created`
                    : 'Code will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visualCodeResult ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* Analysis */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Layout className="w-4 h-4" />
                          Design Analysis
                        </h4>
                        <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                          <p><strong>Layout:</strong> {visualCodeResult.analysis.layout}</p>
                          <p><strong>Components:</strong> {visualCodeResult.analysis.components.join(', ')}</p>
                          <p><strong>Colors:</strong> {visualCodeResult.analysis.colors.join(', ')}</p>
                        </div>
                      </div>

                      {/* Main Component */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Code2 className="w-4 h-4" />
                            Main Component
                          </h4>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToClipboard(visualCodeResult.code.mainComponent)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-[200px]">
                          {visualCodeResult.code.mainComponent}
                        </pre>
                      </div>

                      {/* Sub Components */}
                      {visualCodeResult.code.subComponents.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">
                            Sub-Components ({visualCodeResult.code.subComponents.length})
                          </h4>
                          {visualCodeResult.code.subComponents.map((comp: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline">{comp.name}</Badge>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => copyToClipboard(comp.code)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <pre className="p-2 bg-muted/50 rounded text-xs overflow-x-auto max-h-[100px]">
                                {comp.code}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {visualCodeResult.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {visualCodeResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Eye className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Upload a design to generate code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Capabilities Grid */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardHeader>
          <CardTitle>Beyond Mega Mind Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h4 className="font-semibold">Multi-Modal Generation</h4>
              <p className="text-sm text-muted-foreground">
                Generate text, images, and code simultaneously in one request
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
              <Eye className="w-6 h-6 text-blue-500" />
              <h4 className="font-semibold">Visual Code AI</h4>
              <p className="text-sm text-muted-foreground">
                Upload any design and get production-ready code instantly
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
              <Rocket className="w-6 h-6 text-orange-500" />
              <h4 className="font-semibold">Instant Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Auto-optimize generated code for performance and best practices
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
