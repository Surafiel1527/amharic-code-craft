import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Download, Copy, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIImageGeneratorProps {
  onImageGenerated?: (imageUrl: string) => void;
}

export function AIImageGenerator({ onImageGenerated }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{prompt: string, image: string}>>([]);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const imageUrl = data.imageUrl;
      setGeneratedImage(imageUrl);
      setHistory([{ prompt, image: imageUrl }, ...history.slice(0, 4)]);
      
      if (onImageGenerated) {
        onImageGenerated(imageUrl);
      }

      toast.success('Image generated successfully!');
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Image downloaded');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const examplePrompts = [
    "A futuristic dashboard UI with neon accents",
    "Minimalist landing page hero image with gradients",
    "Abstract tech background with circuit patterns",
    "Modern app icon with geometric shapes",
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              <h3 className="font-semibold">AI Image Generator</h3>
            </div>
            <Badge variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              Nano Banana
            </Badge>
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate... e.g., 'A modern dashboard interface with dark theme'"
            className="min-h-[100px]"
            disabled={loading}
          />

          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setPrompt(example)}
                disabled={loading}
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>

          <Button
            onClick={generateImage}
            disabled={loading || !prompt.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Generated Image Display */}
      {generatedImage && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Generated Image</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedImage)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(generatedImage, 'ai-generated.png')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border">
              <img 
                src={generatedImage} 
                alt="AI Generated" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium text-sm mb-3">Recent Generations</h4>
          <div className="grid grid-cols-2 gap-3">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="group relative cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                onClick={() => setGeneratedImage(item.image)}
              >
                <img 
                  src={item.image} 
                  alt={item.prompt} 
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <p className="text-white text-xs text-center line-clamp-3">
                    {item.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
