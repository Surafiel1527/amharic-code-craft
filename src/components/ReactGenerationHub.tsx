import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Sparkles, Code, Eye, FileCode, Zap, Clock, Download, Copy, Check } from 'lucide-react';
import { useReactGeneration } from '@/hooks/useReactGeneration';
import { ReactGenerationPreview } from './ReactGenerationPreview';
import { ComponentFileBrowser } from './ComponentFileBrowser';
import { toast } from 'sonner';

export default function ReactGenerationHub() {
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const { mutate: generate, data: generation, isPending } = useReactGeneration();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a component description");
      return;
    }
    generate({ prompt });
    toast.success("🚀 Generation started!");
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Prompt copied to clipboard");
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to generate
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && prompt.trim() && !isPending) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [prompt, isPending]);

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Generation Input */}
        <Card className="border-2 border-primary/20 shadow-lg hover-scale transition-all">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-lg shadow-lg animate-scale-in">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Component Generator
                </span>
              </CardTitle>
              {generation && (
                <Badge variant="secondary" className="gap-1 animate-scale-in">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  Ready
                </Badge>
              )}
            </div>
            <CardDescription>
              🤖 Powered by unified-code-operations • ⚡ Live preview • 📦 Instant download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Component Description</label>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPrompt}
                        disabled={!prompt}
                        className="h-7 gap-1"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy prompt to clipboard</TooltipContent>
                  </Tooltip>
                  <Badge variant="outline" className="text-xs">
                    {prompt.length} chars
                  </Badge>
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a modern product card with image, title, price, rating stars, and animated add-to-cart button. Make it responsive with Tailwind, include hover effects, and use smooth transitions."
                className="min-h-[140px] resize-none"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> to generate
              </p>
            </div>

            {generation && (
              <div className="flex items-center gap-3 text-sm p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg animate-scale-in">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
                  <span className="font-medium">{generation.files.length} files generated</span>
                </div>
                {generation.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(generation.created_at).toLocaleTimeString()}</span>
                  </div>
                )}
                <Badge variant="outline" className="ml-auto">
                  Entry: {generation.entry_point.split('/').pop()}
                </Badge>
              </div>
            )}
            
            <Button
              onClick={handleGenerate}
              disabled={isPending || !prompt.trim()}
              className="w-full h-12 text-base hover-scale"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Components...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Components
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {generation && (
          <Card className="border-2 shadow-lg animate-scale-in">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Generated Components
                  </CardTitle>
                  <CardDescription>
                    Live preview with instant hot reload and downloadable source
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="gap-1 cursor-help">
                        <FileCode className="h-3 w-3" />
                        {generation.files.length} files
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {generation.files.map(f => f.path).join(', ')}
                    </TooltipContent>
                  </Tooltip>
                  <Badge variant="outline" className="gap-1">
                    <Download className="h-3 w-3" />
                    ZIP Ready
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="preview" className="gap-2 hover-scale">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-2 hover-scale">
                    <FileCode className="h-4 w-4" />
                    Source Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="border-2 border-dashed rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                    <div className="h-[600px] animate-fade-in">
                      <ReactGenerationPreview
                        entryPoint={generation.entry_point}
                        files={generation.files}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="mt-4 animate-fade-in">
                  <ComponentFileBrowser files={generation.files} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
