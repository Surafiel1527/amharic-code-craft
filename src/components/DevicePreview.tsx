import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type DeviceSize = "mobile" | "tablet" | "desktop";

interface DevicePreviewProps {
  generatedCode: string;
}

export function DevicePreview({ generatedCode }: DevicePreviewProps) {
  const { t } = useLanguage();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  
  // Clean code by removing markdown code fences and any JSON artifacts
  const cleanCode = (() => {
    if (!generatedCode) return '';
    
    let code = generatedCode.trim();
    
    // Remove markdown code fences if present
    code = code.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    
    // CRITICAL: If it's already clean HTML, return immediately
    if (code.startsWith('<!DOCTYPE') || code.startsWith('<html') || code.includes('<body')) {
      return code;
    }
    
    // Try to parse as JSON and extract HTML content
    try {
      const parsed = JSON.parse(code);
      
      // Handle array of files (multi-file project)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return '';
        
        // Find HTML file in array
        const htmlFile = parsed.find((f: any) => {
          if (!f) return false;
          const path = f.path || f.name || '';
          const content = f.content || '';
          return path.match(/\.(html?|htm)$/i) || 
                 content.includes('<!DOCTYPE html>') ||
                 content.includes('<html') ||
                 content.includes('<body');
        });
        
        if (htmlFile?.content) {
          return htmlFile.content;
        }
        
        // If no HTML file found but there's content, check first file
        if (parsed[0]?.content) {
          const firstContent = parsed[0].content;
          if (firstContent.includes('<!DOCTYPE') || firstContent.includes('<html')) {
            return firstContent;
          }
        }
      } 
      // Handle single file object
      else if (parsed.content && typeof parsed.content === 'string') {
        return parsed.content;
      }
      // Handle direct content
      else if (typeof parsed === 'string') {
        return parsed;
      }
    } catch (parseError) {
      // Not JSON - could be raw HTML with issues
      console.log('DevicePreview: Content is not JSON, treating as raw HTML');
    }
    
    // Last resort: return the original code
    return code;
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
        {cleanCode ? (
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
              sandbox="allow-scripts allow-same-origin"
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
