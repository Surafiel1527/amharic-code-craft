import { X } from 'lucide-react';
import { useEditMode } from '@/contexts/EditModeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * InspectorPanel - Visual editing interface for selected components
 * 
 * Displays a floating panel with controls to modify:
 * - Style (colors, backgrounds)
 * - Content (text)
 * - Visibility (show/hide)
 */
export function InspectorPanel() {
  const { selectedComponent, setSelectedComponent } = useEditMode();

  // Don't render if no component is selected
  if (!selectedComponent) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-50 w-80 animate-in slide-in-from-right">
      <Card className="shadow-lg border-2 border-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">
            Editing: <span className="text-primary">{selectedComponent}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSelectedComponent(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="style" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="visibility">Visibility</TabsTrigger>
            </TabsList>

            <TabsContent value="style" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="bg-color">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    className="w-16 h-10 p-1 cursor-pointer"
                    placeholder="#000000"
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-color">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    className="w-16 h-10 p-1 cursor-pointer"
                    placeholder="#000000"
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="border-color">Border Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="border-color"
                    type="color"
                    className="w-16 h-10 p-1 cursor-pointer"
                    placeholder="#000000"
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">Text Content</Label>
                <Textarea
                  id="text-content"
                  placeholder="Enter text content..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter title..."
                />
              </div>
            </TabsContent>

            <TabsContent value="visibility" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Control the visibility of this component
                </p>
                
                <Button variant="destructive" className="w-full">
                  Hide Element
                </Button>

                <Button variant="outline" className="w-full">
                  Show Element
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
