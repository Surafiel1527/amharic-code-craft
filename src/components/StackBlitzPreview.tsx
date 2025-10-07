import { useEffect, useRef, useState } from 'react';
import sdk from '@stackblitz/sdk';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StackBlitzPreviewProps {
  files: Array<{
    path: string;
    content: string;
    type?: string;
  }>;
  projectName: string;
}

export function StackBlitzPreview({ files, projectName }: StackBlitzPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectUrl, setProjectUrl] = useState<string | null>(null);
  const [installingPackages, setInstallingPackages] = useState(false);

  useEffect(() => {
    if (!containerRef.current || files.length === 0) {
      setError('No files to display');
      setLoading(false);
      return;
    }

    const embedProject = async () => {
      try {
        setLoading(true);
        setError(null);

        // Validate files
        if (!files.some(f => f.path.includes('App.tsx') || f.path.includes('App.jsx'))) {
          setError('Project must contain an App component');
          setLoading(false);
          return;
        }

        // Convert files array to StackBlitz format
        const stackBlitzFiles: Record<string, string> = {};
        
        files.forEach(file => {
          // Remove leading slash and normalize path
          let path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
          // Ensure src directory structure
          if (!path.startsWith('src/') && !path.startsWith('public/') && !['package.json', 'vite.config.ts', 'tsconfig.json', 'index.html'].includes(path)) {
            path = `src/${path}`;
          }
          stackBlitzFiles[path] = file.content;
        });

        // Extract dependencies from files (look for imports)
        const detectedDeps = new Set<string>();
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        
        files.forEach(file => {
          let match;
          while ((match = importRegex.exec(file.content)) !== null) {
            const pkg = match[1];
            // Only add external packages (not relative imports)
            if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
              const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
              detectedDeps.add(pkgName);
            }
          }
        });

        // Add package.json if not present
        if (!stackBlitzFiles['package.json']) {
          const dependencies: Record<string, string> = {
            react: '^18.3.1',
            'react-dom': '^18.3.1'
          };

          // Add detected dependencies with latest versions
          detectedDeps.forEach(dep => {
            if (dep === 'lucide-react') dependencies[dep] = '^0.462.0';
            else if (dep === 'zustand') dependencies[dep] = '^5.0.8';
            else if (dep === 'framer-motion') dependencies[dep] = '^12.23.22';
            else if (!dependencies[dep]) dependencies[dep] = 'latest';
          });

          stackBlitzFiles['package.json'] = JSON.stringify({
            name: projectName.toLowerCase().replace(/\s+/g, '-').substring(0, 50),
            version: '0.0.0',
            private: true,
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'tsc && vite build',
              preview: 'vite preview'
            },
            dependencies,
            devDependencies: {
              '@types/react': '^18.3.1',
              '@types/react-dom': '^18.3.1',
              '@vitejs/plugin-react': '^4.3.1',
              typescript: '^5.6.3',
              vite: '^6.0.3'
            }
          }, null, 2);
        }

        // Add vite.config.ts if not present
        if (!stackBlitzFiles['vite.config.ts']) {
          stackBlitzFiles['vite.config.ts'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
        }

        // Add tsconfig.json if not present
        if (!stackBlitzFiles['tsconfig.json']) {
          stackBlitzFiles['tsconfig.json'] = JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              useDefineForClassFields: true,
              lib: ['ES2020', 'DOM', 'DOM.Iterable'],
              module: 'ESNext',
              skipLibCheck: true,
              moduleResolution: 'bundler',
              allowImportingTsExtensions: true,
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: true,
              jsx: 'react-jsx',
              strict: true,
              noUnusedLocals: true,
              noUnusedParameters: true,
              noFallthroughCasesInSwitch: true
            },
            include: ['src']
          }, null, 2);
        }

        // Add main.tsx entry point if not present
        if (!stackBlitzFiles['src/main.tsx']) {
          stackBlitzFiles['src/main.tsx'] = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`;
        }

        // Add basic index.css if not present
        if (!stackBlitzFiles['src/index.css']) {
          stackBlitzFiles['src/index.css'] = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
        }

        // Add index.html if not present
        if (!stackBlitzFiles['index.html']) {
          stackBlitzFiles['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
        }

        setInstallingPackages(true);

        // Embed the project with proper configuration
        const projectId = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        
        const vm = await sdk.embedProject(
          containerRef.current,
          {
            title: projectName,
            description: `AI-generated React project - ${new Date().toLocaleDateString()}`,
            template: 'node',
            files: stackBlitzFiles,
            settings: {
              compile: {
                trigger: 'auto',
                action: 'hmr',
                clearConsole: false
              }
            }
          },
          {
            openFile: Object.keys(stackBlitzFiles).find(f => f.includes('App.tsx')) || 'src/App.tsx',
            view: 'preview',
            height: 600,
            hideNavigation: false,
            forceEmbedLayout: true,
            clickToLoad: false
          }
        );

        // Generate proper StackBlitz URL
        setProjectUrl(`https://stackblitz.com/edit/${projectId}`);
        
        // Wait a bit for packages to install
        setTimeout(() => {
          setInstallingPackages(false);
          setLoading(false);
        }, 3000);
        
      } catch (err) {
        console.error('StackBlitz embed error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
        setError(`Preview error: ${errorMessage}. Your files are still saved and can be downloaded.`);
        setLoading(false);
        setInstallingPackages(false);
      }
    };

    embedProject();
  }, [files, projectName]);

  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold">Preview Error</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs opacity-75">
                Your project files are still saved and available in the file browser above. You can download them as a ZIP file.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-background">
            <span className="hidden sm:inline">Live Preview with Real npm Install</span>
            <span className="sm:hidden">Live Preview</span>
          </Badge>
          {installingPackages && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Installing packages...
            </Badge>
          )}
          {!loading && !installingPackages && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
              ✓ Ready
            </Badge>
          )}
        </div>
        {projectUrl && !loading && (
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Open in StackBlitz</span>
              <span className="sm:hidden">Open</span>
            </a>
          </Button>
        )}
      </div>
      <div 
        ref={containerRef} 
        className="w-full relative"
        style={{ minHeight: '600px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Setting up your development environment...</p>
                <p className="text-xs text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
