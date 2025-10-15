import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DesignToCodeProps {
  onCodeGenerated?: (code: string) => void;
}

export const DesignToCode = ({ onCodeGenerated }: DesignToCodeProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [requirements, setRequirements] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("ምስሉ ከ20MB በታች መሆን አለበት");
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!imagePreview) {
      toast.error("እባክዎ ምስል ይጫኑ");
      return;
    }

    setIsGenerating(true);
    try {
      // Route to unified mega-mind for design-to-code
      const { data, error } = await supabase.functions.invoke('mega-mind', {
        body: {
          request: `Convert this design to code: ${requirements.trim() || 'Create a clean, responsive UI'}`,
          requestType: 'design-to-code',
          context: {
            imageData: imagePreview,
            requirements: requirements.trim()
          }
        }
      });

      if (error) throw error;

      // Extract code from orchestrator response
      const generatedCode = data?.generation?.files?.[0]?.content || data?.generatedCode || data?.finalCode;
      if (generatedCode) {
        onCodeGenerated?.(generatedCode);
        toast.success("ኮድ በተሳካ ሁኔታ ተፈጠረ!");
      }
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error("ኮድ መፍጠር አልተቻለም");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          ዲዛይን ወደ ኮድ
        </CardTitle>
        <CardDescription>
          የዲዛይን ምስል፣ wireframe ወይም screenshot ይጫኑ እና በራስ-ሰር HTML/CSS ኮድ ይፍጠሩ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>ዲዛይን ምስል ይጫኑ</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Design preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                >
                  ምስል ይቀይሩ
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  ምስል ለመጫን ጠቅ ያድርጉ ወይም ይጎትቱ
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, WEBP (እስከ 20MB)
                </p>
              </label>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>ተጨማሪ መስፈርቶች (አማራጭ)</Label>
          <Textarea
            placeholder="ምሳሌ: የኢትዮጵያ ባህላዊ ቀለሞችን ተጠቀም፣ ለሞባይል ተስማሚ አድርግ..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="min-h-[100px]"
            dir="auto"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!imagePreview || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              በመፍጠር ላይ...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              ኮድ ፍጠር
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
