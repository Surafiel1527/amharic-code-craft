import { useState, useEffect, useRef } from "react";
import { Monitor, Smartphone, Tablet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import sdk from '@stackblitz/sdk';

type DeviceSize = "mobile" | "tablet" | "desktop";

interface DevicePreviewProps {
  generatedCode: string;
  projectFiles?: Record<string, string>;
  framework?: 'react' | 'html' | 'vue';
}

export function DevicePreview({ generatedCode, projectFiles, framework = 'html' }: DevicePreviewProps) {
  const { t } = useLanguage();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  const [isLoadingReact, setIsLoadingReact] = useState(false);
  const stackblitzRef = useRef<HTMLDivElement>(null);
  
  // Check if this is a React project
  const isReactProject = framework === 'react';
  
  // Embed StackBlitz for React projects
  useEffect(() => {
    if (!isReactProject || !projectFiles || !stackblitzRef.current) return;
    
    const embedStackBlitz = async () => {
      setIsLoadingReact(true);
      
      try {
        // Convert projectFiles to StackBlitz format
        const files: Record<string, string> = {};
        
        Object.entries(projectFiles).forEach(([path, content]) => {
          // Remove 'src/' prefix if present for StackBlitz
          const stackblitzPath = path.startsWith('src/') ? path : `src/${path}`;
          files[stackblitzPath] = typeof content === 'string' ? content : '';
        });
        
        // Ensure we have required files
        if (!files['package.json']) {
          files['package.json'] = JSON.stringify({
            name: 'react-app',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview'
            },
            dependencies: {
              'react': '^18.3.1',
              'react-dom': '^18.3.1'
            },
            devDependencies: {
              '@types/react': '^18.3.1',
              '@types/react-dom': '^18.3.1',
              '@vitejs/plugin-react': '^4.3.1',
              'typescript': '^5.2.2',
              'vite': '^5.0.0'
            }
          }, null, 2);
        }
        
        if (!files['vite.config.ts'] && !files['vite.config.js']) {
          files['vite.config.ts'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
        }
        
        if (!files['index.html']) {
          files['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
        }
        
        // Embed StackBlitz
        await sdk.embedProject(
          stackblitzRef.current,
          {
            title: 'React App',
            description: 'Generated React application',
            template: 'node',
            files
          },
          {
            openFile: 'src/App.tsx',
            view: 'preview',
            hideExplorer: true,
            hideNavigation: true,
            forceEmbedLayout: true,
            height: '100%'
          }
        );
      } catch (error) {
        console.error('StackBlitz embed error:', error);
      } finally {
        setIsLoadingReact(false);
      }
    };
    
    embedStackBlitz();
  }, [isReactProject, projectFiles]);
  
  // Clean code by removing markdown code fences and any JSON artifacts - PRODUCTION READY
  const cleanCode = (() => {
    if (!generatedCode) return '';
    
    let code = generatedCode.trim();
    
    // Remove markdown code fences
    code = code.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    
    // If it's clean HTML, return immediately
    if (code.startsWith('<!DOCTYPE') || code.startsWith('<html') || code.includes('<body')) {
      return code;
    }
    
    // Try parsing as JSON for multi-file projects
    try {
      const parsed = JSON.parse(code);
      if (Array.isArray(parsed)) {
        const htmlFile = parsed.find((f: any) => 
          f?.path?.endsWith('.html') || f?.content?.includes('<!DOCTYPE')
        );
        return htmlFile?.content || '';
      }
      return parsed.content || parsed.html || '';
    } catch {
      // Return as-is if not JSON
      return code;
    }
  })();

  // Inject script to fix header navigation
  const codeWithNavFix = cleanCode ? `
    ${cleanCode}
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          });
        });
      });
    </script>
  ` : '';
  
  const deviceSizes = {
    mobile: { width: "375px", icon: Smartphone, label: t("preview.mobile") },
    tablet: { width: "768px", icon: Tablet, label: t("preview.tablet") },
    desktop: { width: "100%", icon: Monitor, label: t("preview.desktop") },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => {
          const { icon: Icon, label } = deviceSizes[size];
          return (
            <Button
              key={size}
              variant={deviceSize === size ? "default" : "outline"}
              size="sm"
              onClick={() => setDeviceSize(size)}
              className="gap-2"
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        })}
      </div>

      <div className="relative rounded-lg border border-border bg-background/50 overflow-hidden h-[calc(100vh-250px)] flex items-start justify-center">
        {isReactProject ? (
          <div className="w-full h-full relative">
            {isLoadingReact && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading React dev server...</p>
                </div>
              </div>
            )}
            <div ref={stackblitzRef} className="w-full h-full" />
          </div>
        ) : cleanCode ? (
          <div
            className={cn(
              "h-full transition-all duration-300 ease-in-out",
              deviceSize === "desktop" && "w-full",
              deviceSize === "tablet" && "max-w-[768px] border-x border-border",
              deviceSize === "mobile" && "max-w-[375px] border-x border-border"
            )}
            style={{
              width: deviceSizes[deviceSize].width,
            }}
          >
            <iframe
              srcDoc={codeWithNavFix}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3 p-6">
              <div className="text-5xl opacity-20">🌐</div>
              <p className="text-sm">{t("chat.websiteAppears")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
