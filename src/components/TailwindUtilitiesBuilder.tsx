import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Code2, Copy, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface TailwindUtilitiesBuilderProps {
  onUtilityGenerated?: (config: string, fileName: string) => void;
}

export function TailwindUtilitiesBuilder({ onUtilityGenerated }: TailwindUtilitiesBuilderProps) {
  const [utilityType, setUtilityType] = useState<'colors' | 'spacing' | 'typography' | 'animations'>('colors');
  const [generatedConfig, setGeneratedConfig] = useState("");

  const colorSchemes = [
    { name: "Corporate Blue", primary: "#0066CC", secondary: "#0052A3", accent: "#FFB700" },
    { name: "Nature Green", primary: "#2ECC71", secondary: "#27AE60", accent: "#F39C12" },
    { name: "Sunset Orange", primary: "#E67E22", secondary: "#D35400", accent: "#F1C40F" },
    { name: "Purple Dreams", primary: "#9B59B6", secondary: "#8E44AD", accent: "#3498DB" },
    { name: "Midnight Dark", primary: "#2C3E50", secondary: "#34495E", accent: "#E74C3C" }
  ];

  const spacingScales = [
    { name: "Default Scale", values: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" } },
    { name: "Compact Scale", values: { xs: "0.125rem", sm: "0.25rem", md: "0.5rem", lg: "1rem", xl: "1.5rem" } },
    { name: "Spacious Scale", values: { xs: "0.5rem", sm: "1rem", md: "2rem", lg: "3rem", xl: "4rem" } }
  ];

  const typographyScales = [
    { 
      name: "Modern Sans", 
      config: {
        fontFamily: "Inter, system-ui, sans-serif",
        sizes: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem" }
      }
    },
    { 
      name: "Classic Serif", 
      config: {
        fontFamily: "Georgia, serif",
        sizes: { xs: "0.875rem", sm: "1rem", base: "1.125rem", lg: "1.25rem", xl: "1.5rem", "2xl": "1.875rem" }
      }
    }
  ];

  const animations = [
    { name: "Fade In", keyframes: "fadeIn", from: "opacity: 0", to: "opacity: 1" },
    { name: "Slide Up", keyframes: "slideUp", from: "transform: translateY(10px); opacity: 0", to: "transform: translateY(0); opacity: 1" },
    { name: "Scale", keyframes: "scale", from: "transform: scale(0.95); opacity: 0", to: "transform: scale(1); opacity: 1" },
    { name: "Bounce", keyframes: "bounce", animation: "bounce 1s infinite" }
  ];

  const generateColorConfig = (scheme: typeof colorSchemes[0]) => {
    return `// Tailwind Config - Colors
export const colors = {
  primary: {
    DEFAULT: '${scheme.primary}',
    50: '${adjustColor(scheme.primary, 95)}',
    100: '${adjustColor(scheme.primary, 90)}',
    200: '${adjustColor(scheme.primary, 80)}',
    300: '${adjustColor(scheme.primary, 70)}',
    400: '${adjustColor(scheme.primary, 60)}',
    500: '${scheme.primary}',
    600: '${adjustColor(scheme.primary, -10)}',
    700: '${adjustColor(scheme.primary, -20)}',
    800: '${adjustColor(scheme.primary, -30)}',
    900: '${adjustColor(scheme.primary, -40)}',
  },
  secondary: {
    DEFAULT: '${scheme.secondary}',
    light: '${adjustColor(scheme.secondary, 20)}',
    dark: '${adjustColor(scheme.secondary, -20)}',
  },
  accent: {
    DEFAULT: '${scheme.accent}',
    light: '${adjustColor(scheme.accent, 20)}',
    dark: '${adjustColor(scheme.accent, -20)}',
  }
}`;
  };

  const adjustColor = (hex: string, percent: number) => {
    // Simple color adjustment (for demo)
    return hex;
  };

  const generateSpacingConfig = (scale: typeof spacingScales[0]) => {
    return `// Tailwind Config - Spacing
export const spacing = ${JSON.stringify(scale.values, null, 2)}

// Usage in tailwind.config.ts:
// theme: {
//   extend: {
//     spacing: spacing
//   }
// }`;
  };

  const generateTypographyConfig = (scale: typeof typographyScales[0]) => {
    return `// Tailwind Config - Typography
export const typography = {
  fontFamily: {
    sans: ['${scale.config.fontFamily}'],
  },
  fontSize: ${JSON.stringify(scale.config.sizes, null, 2)}
}`;
  };

  const generateAnimationsConfig = () => {
    return `// Tailwind Config - Animations
export const animations = {
  keyframes: {
${animations.map(a => `    ${a.keyframes}: {
      '0%': { ${a.from} },
      '100%': { ${a.to} }
    }`).join(',\n')}
  },
  animation: {
${animations.map(a => `    '${a.keyframes}': '${a.keyframes} 0.3s ease-in-out'`).join(',\n')}
  }
}`;
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(generatedConfig);
    toast.success("Configuration copied!");
  };

  const downloadConfig = () => {
    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tailwind-${utilityType}.ts`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration downloaded!");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          <h3 className="font-semibold">Tailwind Utilities Builder</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      </div>

      <Tabs value={utilityType} onValueChange={(v: any) => setUtilityType(v)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="animations">Animations</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <Label>Color Schemes</Label>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {colorSchemes.map((scheme, idx) => (
                <Card 
                  key={idx} 
                  className="p-3 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setGeneratedConfig(generateColorConfig(scheme))}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{scheme.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <div 
                      className="w-12 h-12 rounded" 
                      style={{ backgroundColor: scheme.primary }}
                      title="Primary"
                    />
                    <div 
                      className="w-12 h-12 rounded" 
                      style={{ backgroundColor: scheme.secondary }}
                      title="Secondary"
                    />
                    <div 
                      className="w-12 h-12 rounded" 
                      style={{ backgroundColor: scheme.accent }}
                      title="Accent"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="spacing" className="space-y-4">
          <Label>Spacing Scales</Label>
          <div className="space-y-2">
            {spacingScales.map((scale, idx) => (
              <Card 
                key={idx}
                className="p-3 cursor-pointer hover:border-primary transition-colors"
                onClick={() => setGeneratedConfig(generateSpacingConfig(scale))}
              >
                <h4 className="font-medium mb-2">{scale.name}</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(scale.values).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Label>Typography Scales</Label>
          <div className="space-y-2">
            {typographyScales.map((scale, idx) => (
              <Card
                key={idx}
                className="p-3 cursor-pointer hover:border-primary transition-colors"
                onClick={() => setGeneratedConfig(generateTypographyConfig(scale))}
              >
                <h4 className="font-medium mb-2">{scale.name}</h4>
                <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: scale.config.fontFamily }}>
                  The quick brown fox jumps over the lazy dog
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(scale.config.sizes).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="animations" className="space-y-4">
          <Label>Animation Presets</Label>
          <Button 
            onClick={() => setGeneratedConfig(generateAnimationsConfig())}
            variant="outline"
            className="w-full"
          >
            Generate All Animations
          </Button>
          <div className="space-y-2">
            {animations.map((anim, idx) => (
              <Card key={idx} className="p-3">
                <h4 className="font-medium mb-1">{anim.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Keyframe: {anim.keyframes}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {generatedConfig && (
        <>
          <div className="flex gap-2">
            <Button onClick={copyConfig} variant="outline" className="flex-1">
              <Copy className="w-3 h-3 mr-1" />
              Copy Config
            </Button>
            <Button onClick={downloadConfig} variant="outline" className="flex-1">
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>

          <ScrollArea className="h-[200px]">
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
              <code>{generatedConfig}</code>
            </pre>
          </ScrollArea>
        </>
      )}
    </Card>
  );
}
