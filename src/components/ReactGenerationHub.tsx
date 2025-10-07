import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
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
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">React Component Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate complete React components with live preview
          </p>
        </div>
      </div>

      {/* Generation Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            What do you want to build?
          </CardTitle>
          <CardDescription>
            Describe the React component or feature you need. Be specific about functionality and styling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Create a responsive product card component with image, title, price, and add to cart button. Use Tailwind CSS and include hover effects."
            className="min-h-[100px]"
            disabled={isPending}
          />
          <Button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Generating...' : 'Generate Components'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {generation && (
        <Tabs defaultValue="preview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
            <TabsTrigger value="code">Code & Files</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  See your generated components in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  <ReactGenerationPreview
                    entryPoint={generation.entry_point}
                    files={generation.files}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generated Files</CardTitle>
                <CardDescription>
                  Browse all generated files and download as ZIP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComponentFileBrowser files={generation.files} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
