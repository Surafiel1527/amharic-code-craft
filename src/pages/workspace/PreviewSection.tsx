import { Card } from "@/components/ui/card";
import { DevicePreview } from "@/components/DevicePreview";
import { UniversalChatInterface } from "@/components/UniversalChatInterface";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Download, FileCode, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import JSZip from "jszip";
import { toast } from "sonner";
import { useState, useMemo } from "react";

interface PreviewSectionProps {
  projectId: string;
  conversationId: string | null;
  htmlCode: string;
  framework: 'react' | 'html' | 'vue';
  mobileTab?: 'chat' | 'preview' | 'code';
  projectTitle?: string;
  selectedFiles?: string[];
  onFileSelect?: (path: string) => void;
  projectFiles?: any[]; // Real files from database
}

export function PreviewSection({ 
  projectId, 
  conversationId, 
  htmlCode,
  framework,
  mobileTab = 'preview',
  projectTitle = 'project',
  selectedFiles = [],
  onFileSelect,
  projectFiles = []
}: PreviewSectionProps) {
  const isMobile = useIsMobile();
  const [selectedFile, setSelectedFile] = useState<string>(framework === 'react' ? 'src/App.tsx' : 'index.html');
  
  // Generate all file contents - use real project files if available
  const fileContents = useMemo(() => {
    const files: Record<string, string> = {};
    
    // 🆕 Use real project files from database if available
    if (projectFiles && projectFiles.length > 0) {
      console.log('📁 Using real project files from database:', projectFiles.length);
      projectFiles.forEach(file => {
        files[file.file_path] = file.file_content;
      });
      return files;
    }
    
    // Fallback: Generate dummy files from htmlCode for legacy single-file projects
    // Only log warning if this is a React project (HTML projects don't use project_files)
    if (framework === 'react') {
      console.log('⚠️ No project files found, generating dummy files from htmlCode');
    }
    if (framework === 'react') {
      files['src/App.tsx'] = htmlCode;
      files['src/main.tsx'] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
      files['src/index.css'] = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
      files['package.json'] = JSON.stringify({
        name: projectTitle.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          "react": "^18.3.1",
          "react-dom": "^18.3.1"
        },
        devDependencies: {
          "@types/react": "^18.3.1",
          "@types/react-dom": "^18.3.1",
          "@vitejs/plugin-react": "^4.3.1",
          "typescript": "^5.2.2",
          "vite": "^5.0.0"
        }
      }, null, 2);
      files['vite.config.ts'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
      files['tsconfig.json'] = JSON.stringify({
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }]
      }, null, 2);
      files['index.html'] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
      files['README.md'] = `# ${projectTitle}

Generated with Amharic Code Craft

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run development server:
\`\`\`bash
npm run dev
\`\`\`

3. Build for production:
\`\`\`bash
npm run build
\`\`\`
`;
    } else {
      files['index.html'] = htmlCode;
    }
    
    return files;
  }, [htmlCode, framework, projectTitle, projectFiles]);
  
  const handleDownloadZip = async () => {
    try {
      toast.info("Preparing download...");
      
      const zip = new JSZip();
      
      // Add main HTML/code file
      if (framework === 'html') {
        zip.file("index.html", htmlCode);
      } else {
        zip.file("src/App.tsx", htmlCode);
        
        // Add basic React project structure
        zip.file("package.json", JSON.stringify({
          name: projectTitle.toLowerCase().replace(/\s+/g, '-'),
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview"
          },
          dependencies: {
            "react": "^18.3.1",
            "react-dom": "^18.3.1"
          },
          devDependencies: {
            "@types/react": "^18.3.1",
            "@types/react-dom": "^18.3.1",
            "@vitejs/plugin-react": "^4.3.1",
            "typescript": "^5.2.2",
            "vite": "^5.0.0"
          }
        }, null, 2));
        
        zip.file("index.html", `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
        
        zip.file("src/main.tsx", `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`);
        
        zip.file("src/index.css", `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`);
        
        zip.file("vite.config.ts", `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`);
        
        zip.file("tsconfig.json", JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true
          },
          include: ["src"],
          references: [{ path: "./tsconfig.node.json" }]
        }, null, 2));
        
        zip.file("README.md", `# ${projectTitle}

Generated with Amharic Code Craft

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run development server:
\`\`\`bash
npm run dev
\`\`\`

3. Build for production:
\`\`\`bash
npm run build
\`\`\`
`);
      }
      
      // Generate and download
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("✅ Project downloaded successfully!");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download project");
    }
  };
  
  // On mobile, only render the active tab content
  if (isMobile) {
    if (mobileTab === 'chat') {
      return (
        <div className="h-full flex flex-col">
          {conversationId ? (
            <UniversalChatInterface
              conversationId={conversationId}
              projectId={projectId}
              mode="panel"
              persistMessages={true}
              selectedFiles={selectedFiles}
              projectFiles={Object.entries(fileContents).map(([path, content]) => ({
                file_path: path,
                file_content: typeof content === 'string' ? content : ''
              }))}
              context={{
                currentCode: htmlCode,
                projectId,
                conversationHistory: [],
                framework
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading chat...</p>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (mobileTab === 'preview') {
      return (
        <div className="h-full">
          <Card className="p-4 h-full border-0 rounded-none">
            <DevicePreview generatedCode={fileContents['index.html'] || htmlCode} />
          </Card>
        </div>
      );
    }
    
    if (mobileTab === 'code') {
      return (
        <div className="h-full flex flex-col border-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Project Files</h2>
            </div>
            <Button onClick={handleDownloadZip} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download ZIP
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Dynamic File tree from actual project files */}
              <div className="space-y-2">
                <div className="font-medium text-sm text-muted-foreground mb-2">
                  📁 {projectTitle || 'Project'}
                </div>
                
                <div className="ml-4 space-y-1 text-sm">
                  {Object.keys(fileContents).sort().map((filePath) => {
                    const parts = filePath.split('/');
                    const fileName = parts[parts.length - 1];
                    const isInFolder = parts.length > 1;
                    
                    return (
                      <button
                        key={filePath}
                        onClick={() => {
                          setSelectedFile(filePath);
                          onFileSelect?.(filePath);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-accent transition-colors ${
                          selectedFile === filePath ? 'bg-accent text-primary font-medium' : 'text-muted-foreground'
                        } ${isInFolder ? 'ml-4' : ''}`}
                      >
                        📄 {fileName}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Code preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center justify-between">
                  <span>{selectedFile}</span>
                  <span className="text-xs text-muted-foreground">{fileContents[selectedFile]?.length || 0} chars</span>
                </div>
                <pre className="p-4 text-xs overflow-x-auto bg-background max-h-96">
                  <code>{fileContents[selectedFile] || 'File not found'}</code>
                </pre>
              </div>
              
              <div className="text-xs text-muted-foreground text-center py-4">
                Download the ZIP file to get the complete project structure with all configuration files
              </div>
            </div>
          </ScrollArea>
        </div>
      );
    }
    
    return null;
  }
  
  // Desktop: render side-by-side
  return (
    <div className="grid lg:grid-cols-2 gap-4 p-4 h-full">
      {/* Chat Interface */}
      <div className="flex flex-col h-full">
        {conversationId ? (
          <UniversalChatInterface
            conversationId={conversationId}
            projectId={projectId}
            mode="panel"
            persistMessages={true}
            selectedFiles={selectedFiles}
            projectFiles={Object.entries(fileContents).map(([path, content]) => ({
              file_path: path,
              file_content: typeof content === 'string' ? content : ''
            }))}
            context={{
              currentCode: htmlCode,
              projectId,
              conversationHistory: [],
              framework
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading chat...</p>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
        <DevicePreview generatedCode={fileContents['index.html'] || htmlCode} />
      </Card>
    </div>
  );
}
