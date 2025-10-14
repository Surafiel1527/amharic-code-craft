import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type DeviceSize = "mobile" | "tablet" | "desktop";

interface DevicePreviewProps {
  generatedCode: string;
  projectFiles?: Record<string, string>;
  framework?: 'react' | 'html' | 'vue';
}

export function DevicePreview({ generatedCode, projectFiles, framework = 'html' }: DevicePreviewProps) {
  const { t } = useLanguage();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  
  // Check if this is a React project
  const isReactProject = framework === 'react';
  
  // Strip TypeScript annotations for browser preview
  const stripTypeScript = (code: string): string => {
    if (!code) return '';
    
    return code
      // Remove interface/type declarations
      .replace(/interface\s+\w+\s*{[^}]*}/g, '')
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
      // Remove type annotations from variables
      .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,)\]])/g, '')
      // Remove type parameters
      .replace(/<[^>]+>/g, '')
      // Remove 'as' type assertions
      .replace(/\s+as\s+\w+/g, '')
      // Remove readonly/public/private/protected
      .replace(/\b(readonly|public|private|protected)\s+/g, '')
      // Remove generic constraints
      .replace(/extends\s+\w+/g, '')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // For React projects, create a standalone HTML document with React CDN
  const reactPreviewHTML = isReactProject && projectFiles ? (() => {
    const appCode = projectFiles['src/App.tsx'] || projectFiles['App.tsx'] || generatedCode;
    const cleanedCode = stripTypeScript(appCode);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    ${projectFiles['src/index.css'] || projectFiles['index.css'] || `
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      }
      * { box-sizing: border-box; }
    `}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useMemo, useRef } = React;
    
    ${cleanedCode}
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
    `;
  })() : null;
  
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
        {isReactProject && reactPreviewHTML ? (
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
              srcDoc={reactPreviewHTML}
              className="w-full h-full border-0"
              title="React Preview"
              sandbox="allow-scripts"
            />
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
