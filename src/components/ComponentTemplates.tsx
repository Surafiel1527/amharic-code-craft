import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Search, Plus, Code2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  template_code: string;
  preview_image: string | null;
  tags: string[];
  usage_count: number;
}

interface ComponentTemplatesProps {
  onInsertTemplate: (code: string, name: string) => void;
}

export function ComponentTemplates({ onInsertTemplate }: ComponentTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('component_templates')
      .select('*')
      .eq('is_public', true)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const categories = [...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInsertTemplate = async (template: Template) => {
    onInsertTemplate(template.template_code, template.name);
    
    // Increment usage count
    await supabase
      .from('component_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id);

    toast.success(`Inserted ${template.name}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Component Templates</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="p-4 space-y-3 hover:border-primary transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {template.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Used {template.usage_count} times
                </span>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>{template.name}</DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="code" className="w-full">
                        <TabsList>
                          <TabsTrigger value="code">Code</TabsTrigger>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="code">
                          <ScrollArea className="h-[500px] w-full">
                            <pre className="text-sm p-4 bg-muted rounded-lg">
                              <code>{template.template_code}</code>
                            </pre>
                          </ScrollArea>
                        </TabsContent>
                        <TabsContent value="preview">
                          <div className="h-[500px] border rounded-lg p-4">
                            <div dangerouslySetInnerHTML={{ __html: template.template_code }} />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    onClick={() => handleInsertTemplate(template)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Insert
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
