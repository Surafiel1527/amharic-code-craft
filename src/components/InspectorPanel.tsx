import { useState } from 'react';
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
  const { selectedComponent, setSelectedComponent, createModification } = useEditMode();
  
  // Local state for form inputs
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#000000');
  const [borderColor, setBorderColor] = useState('#000000');
  const [textContent, setTextContent] = useState('');
  const [titleContent, setTitleContent] = useState('');

  // Don't render if no component is selected
  if (!selectedComponent) {
    return null;
  }

  // Handlers for visibility controls
  const handleHideElement = () => {
    createModification({
      type: 'hide',
      target: selectedComponent
    });
  };

  const handleShowElement = () => {
    createModification({
      type: 'show',
      target: selectedComponent
    });
  };

  // Handlers for style controls
  const handleBgColorChange = () => {
    createModification({
      type: 'modify',
      target: selectedComponent,
      styles: `bg-[${bgColor}]`
    });
  };

  const handleTextColorChange = () => {
    createModification({
      type: 'modify',
      target: selectedComponent,
      styles: `text-[${textColor}]`
    });
  };

  const handleBorderColorChange = () => {
    createModification({
      type: 'modify',
      target: selectedComponent,
      styles: `border-[${borderColor}]`
    });
  };

  // Handler for content changes
  const handleContentChange = () => {
    if (textContent.trim()) {
      createModification({
        type: 'add',
        target: selectedComponent,
        content: textContent
      });
    }
  };

  const handleTitleChange = () => {
    if (titleContent.trim()) {
      createModification({
        type: 'add',
        target: selectedComponent,
        content: titleContent
      });
    }
  };

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
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="flex-1"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                  />
                </div>
                <Button onClick={handleBgColorChange} size="sm" className="w-full">
                  Apply Background Color
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-color">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    className="w-16 h-10 p-1 cursor-pointer"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="flex-1"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                </div>
                <Button onClick={handleTextColorChange} size="sm" className="w-full">
                  Apply Text Color
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="border-color">Border Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="border-color"
                    type="color"
                    className="w-16 h-10 p-1 cursor-pointer"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    className="flex-1"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                  />
                </div>
                <Button onClick={handleBorderColorChange} size="sm" className="w-full">
                  Apply Border Color
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">Text Content</Label>
                <Textarea
                  id="text-content"
                  placeholder="Enter text content..."
                  className="min-h-[100px]"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                <Button onClick={handleContentChange} size="sm" className="w-full">
                  Apply Content
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter title..."
                  value={titleContent}
                  onChange={(e) => setTitleContent(e.target.value)}
                />
                <Button onClick={handleTitleChange} size="sm" className="w-full">
                  Apply Title
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="visibility" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Control the visibility of this component
                </p>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleHideElement}
                >
                  Hide Element
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleShowElement}
                >
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
