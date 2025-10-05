import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Wand2, Plus, Trash2, Code2, Sparkles, 
  Download, Copy, CheckCircle2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ComponentProp {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface ReactComponentGeneratorProps {
  onComponentGenerated?: (code: string, fileName: string) => void;
}

export function ReactComponentGenerator({ onComponentGenerated }: ReactComponentGeneratorProps) {
  const [componentName, setComponentName] = useState("");
  const [componentType, setComponentType] = useState<'functional' | 'class'>('functional');
  const [includeTypeScript, setIncludeTypeScript] = useState(true);
  const [includeProps, setIncludeProps] = useState(true);
  const [includeState, setIncludeState] = useState(false);
  const [includeEffects, setIncludeEffects] = useState(false);
  const [includeStyles, setIncludeStyles] = useState(true);
  const [stateManagement, setStateManagement] = useState<'useState' | 'useReducer' | 'zustand' | 'context'>('useState');
  const [stylingMethod, setStylingMethod] = useState<'tailwind' | 'css-modules' | 'styled-components'>('tailwind');
  const [props, setProps] = useState<ComponentProp[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const addProp = () => {
    setProps([...props, {
      id: crypto.randomUUID(),
      name: '',
      type: 'string',
      required: false
    }]);
  };

  const updateProp = (id: string, field: keyof ComponentProp, value: any) => {
    setProps(props.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProp = (id: string) => {
    setProps(props.filter(p => p.id !== id));
  };

  const generateComponent = async () => {
    if (!componentName.trim()) {
      toast.error("Please enter a component name");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('react-component-generator', {
        body: {
          componentName,
          componentType,
          includeTypeScript,
          includeProps,
          includeState,
          includeEffects,
          includeStyles,
          stateManagement,
          stylingMethod,
          props: includeProps ? props : []
        }
      });

      if (error) throw error;

      if (data?.code) {
        setGeneratedCode(data.code);
        toast.success("Component generated successfully!");
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Failed to generate component");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  const downloadComponent = () => {
    const fileName = `${componentName}.${includeTypeScript ? 'tsx' : 'jsx'}`;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fileName}`);
  };

  const applyToProject = () => {
    if (onComponentGenerated && generatedCode) {
      const fileName = `src/components/${componentName}.${includeTypeScript ? 'tsx' : 'jsx'}`;
      onComponentGenerated(generatedCode, fileName);
      toast.success(`Created ${fileName}`);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          <h3 className="font-semibold">React Component Generator</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configure</TabsTrigger>
          <TabsTrigger value="props">Props</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          {/* Component Name */}
          <div className="space-y-2">
            <Label>Component Name</Label>
            <Input
              placeholder="e.g., UserCard, ProductList"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
            />
          </div>

          {/* Component Type */}
          <div className="space-y-2">
            <Label>Component Type</Label>
            <Select value={componentType} onValueChange={(v: any) => setComponentType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional Component</SelectItem>
                <SelectItem value="class">Class Component</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">TypeScript</span>
              <Switch checked={includeTypeScript} onCheckedChange={setIncludeTypeScript} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Props Interface</span>
              <Switch checked={includeProps} onCheckedChange={setIncludeProps} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">State Management</span>
              <Switch checked={includeState} onCheckedChange={setIncludeState} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">useEffect Hooks</span>
              <Switch checked={includeEffects} onCheckedChange={setIncludeEffects} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Styling</span>
              <Switch checked={includeStyles} onCheckedChange={setIncludeStyles} />
            </div>
          </div>

          <Separator />

          {/* State Management */}
          {includeState && (
            <div className="space-y-2">
              <Label>State Management</Label>
              <Select value={stateManagement} onValueChange={(v: any) => setStateManagement(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="useState">useState</SelectItem>
                  <SelectItem value="useReducer">useReducer</SelectItem>
                  <SelectItem value="zustand">Zustand</SelectItem>
                  <SelectItem value="context">Context API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Styling Method */}
          {includeStyles && (
            <div className="space-y-2">
              <Label>Styling Method</Label>
              <Select value={stylingMethod} onValueChange={(v: any) => setStylingMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tailwind">Tailwind CSS</SelectItem>
                  <SelectItem value="css-modules">CSS Modules</SelectItem>
                  <SelectItem value="styled-components">Styled Components</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </TabsContent>

        <TabsContent value="props" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Component Props</Label>
            <Button size="sm" onClick={addProp}>
              <Plus className="w-3 h-3 mr-1" />
              Add Prop
            </Button>
          </div>

          {props.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No props defined. Add props to generate prop types.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {props.map((prop) => (
                  <Card key={prop.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Prop name"
                            value={prop.name}
                            onChange={(e) => updateProp(prop.id, 'name', e.target.value)}
                          />
                          <Select 
                            value={prop.type} 
                            onValueChange={(v) => updateProp(prop.id, 'type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">string</SelectItem>
                              <SelectItem value="number">number</SelectItem>
                              <SelectItem value="boolean">boolean</SelectItem>
                              <SelectItem value="object">object</SelectItem>
                              <SelectItem value="array">array</SelectItem>
                              <SelectItem value="function">function</SelectItem>
                              <SelectItem value="ReactNode">ReactNode</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Input
                          placeholder="Default value (optional)"
                          value={prop.defaultValue || ''}
                          onChange={(e) => updateProp(prop.id, 'defaultValue', e.target.value)}
                        />

                        <Textarea
                          placeholder="Description (optional)"
                          value={prop.description || ''}
                          onChange={(e) => updateProp(prop.id, 'description', e.target.value)}
                          rows={2}
                        />

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={prop.required}
                            onCheckedChange={(checked) => updateProp(prop.id, 'required', checked)}
                          />
                          <span className="text-sm">Required</span>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProp(prop.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {!generatedCode ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Code2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Configure your component and click Generate</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label>Generated Component</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadComponent}>
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  {onComponentGenerated && (
                    <Button size="sm" onClick={applyToProject}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Add to Project
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{generatedCode}</code>
                </pre>
              </ScrollArea>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Button 
        onClick={generateComponent} 
        disabled={generating || !componentName.trim()}
        className="w-full"
        size="lg"
      >
        {generating ? (
          <>
            <Wand2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Component
          </>
        )}
      </Button>
    </Card>
  );
}
