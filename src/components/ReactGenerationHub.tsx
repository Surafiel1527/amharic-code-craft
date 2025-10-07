import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Code, Eye, FileCode, Zap, Clock } from 'lucide-react';
import { useReactGeneration } from '@/hooks/useReactGeneration';
import { ReactGenerationPreview } from './ReactGenerationPreview';
import { ComponentFileBrowser } from './ComponentFileBrowser';

export default function ReactGenerationHub() {
  const [prompt, setPrompt] = useState('');
  const { mutate: generate, data: generation, isPending } = useReactGeneration();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generate({ prompt });
  };

  return (
    <div className="space-y-6">
      {/* Generation Input */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            React Component Generator
          </CardTitle>
          <CardDescription>
            AI-powered React component generation with live preview and source code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Component Description</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a responsive product card component with image, title, price, and add to cart button. Use Tailwind CSS and include hover effects and smooth animations."
              className="min-h-[120px] resize-none"
              disabled={isPending}
            />
          </div>

          {generation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Generated {generation.files.length} file(s)</span>
              {generation.created_at && (
                <>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{new Date(generation.created_at).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          )}
          
          <Button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Components...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Components
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {generation && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Generated Components
                </CardTitle>
                <CardDescription>
                  Live preview with downloadable source code
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="gap-1">
                  <FileCode className="h-3 w-3" />
                  {generation.files.length} files
                </Badge>
                <Badge variant="outline">
                  Entry: {generation.entry_point.split('/').pop()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <FileCode className="h-4 w-4" />
                  Source Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4">
                <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
                  <div className="h-[600px]">
                    <ReactGenerationPreview
                      entryPoint={generation.entry_point}
                      files={generation.files}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="code" className="mt-4">
                <ComponentFileBrowser files={generation.files} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
