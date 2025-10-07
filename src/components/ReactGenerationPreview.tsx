import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { GeneratedFile } from '@/hooks/useReactGeneration';

interface ReactGenerationPreviewProps {
  entryPoint: string;
  files: GeneratedFile[];
  className?: string;
}

export function ReactGenerationPreview({ entryPoint, files, className }: ReactGenerationPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!files.length || !iframeRef.current) return;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    // Build a complete React app bundle for preview
    const buildPreviewHTML = () => {
      // Find the entry point component
      const entryFile = files.find(f => f.path === entryPoint);
      if (!entryFile) return '';

      // Create module map for imports
      const moduleMap = files.reduce((acc, file) => {
        acc[file.path] = file.code;
        return acc;
      }, {} as Record<string, string>);

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            
            <script type="text/babel" data-type="module">
              const { useState, useEffect, useRef, useCallback, useMemo } = React;
              
              // Module system
              const modules = ${JSON.stringify(moduleMap)};
              
              // Transform and execute all modules
              ${files.map(file => `
                // ${file.path}
                ${file.code.replace(/^import\s+.*from\s+['"].*['"]\s*;?\s*$/gm, '').replace(/^export\s+(default\s+)?/gm, '')}
              `).join('\n')}
              
              // Render the entry point
              const root = ReactDOM.createRoot(document.getElementById('root'));
              
              // Find and render the main component
              try {
                const EntryComponent = ${entryPoint.replace(/\.[jt]sx?$/, '').split('/').pop()};
                root.render(<EntryComponent />);
              } catch (error) {
                root.render(
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Preview Error</h2>
                    <p>{error.message}</p>
                  </div>
                );
              }
            </script>
          </body>
        </html>
      `;
    };

    const html = buildPreviewHTML();
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }, [files, entryPoint]);

  if (!files.length) {
    return (
      <Card className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Waiting for generation...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden h-full ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="React Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </Card>
  );
}
