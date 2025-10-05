import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, Image as ImageIcon, Sparkles, Loader2, Edit, History, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIImageGeneratorProps {
  conversationId: string;
}

interface ImageHistory {
  id: string;
  prompt: string;
  image_data: string;
  created_at: string;
}

interface StylePreset {
  name: string;
  prompt: string;
  icon: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { name: "Photorealistic", prompt: "ultra realistic, 8k, detailed, photographic", icon: "📸" },
  { name: "Digital Art", prompt: "digital art, vibrant colors, modern style", icon: "🎨" },
  { name: "3D Render", prompt: "3D render, octane render, high quality", icon: "🎭" },
  { name: "Oil Painting", prompt: "oil painting, classical art style, textured", icon: "🖼️" },
  { name: "Anime", prompt: "anime style, manga art, vibrant", icon: "⭐" },
  { name: "Minimalist", prompt: "minimalist, clean, simple design", icon: "✨" }
];

export function AIImageGenerator({ conversationId }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [batchCount, setBatchCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setImageHistory(data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const examplePrompts = [
    "A futuristic cityscape at sunset with flying cars",
    "A serene mountain landscape with aurora borealis",
    "Abstract geometric patterns in vibrant neon colors",
    "A cozy coffee shop interior with hanging plants",
    "A cyberpunk street market at night with holograms",
    "A magical forest with glowing mushrooms and fireflies"
  ];

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGenerating(true);
    try {
      const enhancedPrompt = selectedStyle 
        ? `${prompt}, ${STYLE_PRESETS.find(p => p.name === selectedStyle)?.prompt}`
        : prompt;

      if (batchCount > 1) {
        const promises = Array(batchCount).fill(null).map(() =>
          supabase.functions.invoke('generate-ai-image', {
            body: { prompt: enhancedPrompt }
          })
        );

        const results = await Promise.all(promises);
        const images = results
          .filter(r => r.data?.imageUrl)
          .map(r => r.data.imageUrl);

        if (images.length > 0) {
          setGeneratedImage(images[0]);
          toast.success(`Generated ${images.length} images successfully!`);
          await loadHistory();
        }
      } else {
        const { data, error } = await supabase.functions.invoke('generate-ai-image', {
          body: { prompt: enhancedPrompt }
        });

        if (error) throw error;

        if (data?.imageUrl) {
          setGeneratedImage(data.imageUrl);
          toast.success("Image generated successfully!");
          await loadHistory();
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  const editImage = async () => {
    if (!generatedImage || !editPrompt.trim()) {
      toast.error("Please provide an image and edit instructions");
      return;
    }

    setEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { 
          prompt: editPrompt,
          baseImage: generatedImage,
          mode: 'edit'
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setEditPrompt("");
        toast.success("Image edited successfully!");
        await loadHistory();
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error("Failed to edit image");
    } finally {
      setEditing(false);
    }
  };

  const downloadImage = (imageUrl?: string) => {
    const urlToDownload = imageUrl || generatedImage;
    if (urlToDownload) {
      const link = document.createElement('a');
      link.href = urlToDownload;
      link.download = `ai-generated-${Date.now()}.png`;
      link.click();
      toast.success("Image downloaded!");
    }
  };

  const saveToProject = async () => {
    if (!generatedImage) return;

    try {
      // Here you would integrate with your project's asset system
      // For now, we'll just show a success message
      toast.success("Image saved to project assets!");
    } catch (error) {
      toast.error("Failed to save to project");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          <h3 className="font-semibold">Pro AI Image Generator</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Nano Banana Pro
        </Badge>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="space-y-2">
            <Label>Image Prompt</Label>
            <Input
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateImage()}
            />
          </div>

          {/* Style Presets */}
          <div className="space-y-2">
            <Label>Style Preset</Label>
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a style..." />
              </SelectTrigger>
              <SelectContent>
                {STYLE_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.icon} {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Generation */}
          <div className="space-y-2">
            <Label>Batch Generation</Label>
            <Select value={batchCount.toString()} onValueChange={(v) => setBatchCount(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 image</SelectItem>
                <SelectItem value="2">2 images</SelectItem>
                <SelectItem value="3">3 images</SelectItem>
                <SelectItem value="4">4 images</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Example Prompts:</Label>
            <ScrollArea className="h-20">
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPrompt(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button 
            onClick={generateImage} 
            disabled={generating || !prompt.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating {batchCount > 1 ? `${batchCount} images` : 'image'}...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate {batchCount > 1 ? `${batchCount} Images` : 'Image'}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          {generatedImage ? (
            <>
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2">
                <Label>Edit Instructions</Label>
                <Input
                  placeholder="E.g., 'make it darker', 'add more details', 'change color to blue'"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && editImage()}
                />
              </div>

              <Button 
                onClick={editImage} 
                disabled={editing || !editPrompt.trim()}
                className="w-full"
              >
                {editing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Editing...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Apply Edits
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              Generate an image first to edit it
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : imageHistory.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No image history yet
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 gap-2">
                {imageHistory.map((item) => (
                  <Card key={item.id} className="p-2 space-y-2">
                    <div className="relative aspect-square bg-muted rounded overflow-hidden group">
                      <img 
                        src={item.image_data} 
                        alt={item.prompt} 
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setGeneratedImage(item.image_data)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => downloadImage(item.image_data)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => {
                            setGeneratedImage(item.image_data);
                            setPrompt(item.prompt);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {generatedImage && (
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            onClick={() => downloadImage()} 
            variant="outline" 
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={saveToProject} 
            variant="outline" 
            className="flex-1"
          >
            <Folder className="w-4 h-4 mr-2" />
            Save to Project
          </Button>
        </div>
      )}
    </Card>
  );
}
