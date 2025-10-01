import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { optimizeImage, createImagePreview, isImageFile } from "@/utils/imageOptimization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  accept?: string;
  className?: string;
}

export const ImageUpload = ({
  onUpload,
  maxSizeMB = 1,
  maxWidthOrHeight = 1920,
  accept = "image/*",
  className,
}: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      toast.error("Please select a valid image file");
      return;
    }

    setOriginalSize(file.size);
    setIsOptimizing(true);
    setProgress(0);

    try {
      // Show preview of original
      const previewUrl = await createImagePreview(file);
      setPreview(previewUrl);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Optimize image
      const optimizedFile = await optimizeImage(file, {
        maxSizeMB,
        maxWidthOrHeight,
        quality: 0.8,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setOptimizedSize(optimizedFile.size);

      const savings = ((1 - optimizedFile.size / file.size) * 100).toFixed(0);
      toast.success(`Image optimized! Saved ${savings}% space`);

      onUpload(optimizedFile);
    } catch (error) {
      console.error("Image optimization error:", error);
      toast.error("Failed to optimize image");
      // Upload original if optimization fails
      onUpload(file);
    } finally {
      setIsOptimizing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setOriginalSize(null);
    setOptimizedSize(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card className={cn("p-6", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload image"
      />

      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all hover-scale"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              inputRef.current?.click();
            }
          }}
        >
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Click to upload image</p>
          <p className="text-xs text-muted-foreground">
            Max size: {maxSizeMB}MB • Automatically optimized
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 hover-scale"
              onClick={handleRemove}
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isOptimizing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Optimizing image...</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {originalSize && optimizedSize && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Original:</span>
                <span>{formatBytes(originalSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>Optimized:</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatBytes(optimizedSize)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};