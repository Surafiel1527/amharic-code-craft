import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ImageGeneratorProps {
  projectId?: string;
  onImageGenerated?: (imageUrl: string) => void;
}

export const ImageGenerator = ({ projectId, onImageGenerated }: ImageGeneratorProps) => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t("imageGen.enterPrompt"));
      return;
    }

    setIsGenerating(true);
    try {
      // Use Lovable AI's Nano banana model for image generation
      const { data, error } = await supabase.functions.invoke('unified-ai-workers', {
        body: { 
          operation: 'generate-image',
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: prompt }
          ],
          modalities: ['image', 'text']
        }
      });

      if (error) {
        if (error.message.includes('429')) {
          toast.error(t("imageGen.tooManyRequests"));
        } else if (error.message.includes('402')) {
          toast.error(t("imageGen.paymentRequired"));
        } else {
          toast.error(t("imageGen.failed"));
        }
        throw error;
      }

      // Extract image from Lovable AI response
      const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        throw new Error('No image generated');
      }
      setGeneratedImage(imageUrl);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('generated_images').insert({
          user_id: user.id,
          project_id: projectId,
          prompt: prompt,
          image_data: imageUrl
        });
      }

      if (onImageGenerated) {
        onImageGenerated(imageUrl);
      }

      toast.success(t("imageGen.success"));
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("imageGen.downloaded"));
  };

  const handleCopy = () => {
    if (!generatedImage) return;

    navigator.clipboard.writeText(generatedImage);
    setCopied(true);
    toast.success(t("imageGen.dataCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {t("imageGen.title")}
        </CardTitle>
        <CardDescription>
          {t("imageGen.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={t("imageGen.placeholder")}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px]"
          dir="auto"
        />

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("imageGen.generating")}
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              {t("imageGen.generate")}
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full h-auto"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                {t("imageGen.download")}
              </Button>
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("imageGen.copied")}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    {t("imageGen.copyData")}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
