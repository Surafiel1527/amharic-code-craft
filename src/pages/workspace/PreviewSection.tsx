import { Card } from "@/components/ui/card";
import { DevicePreview } from "@/components/DevicePreview";
import { UniversalChatInterface } from "@/components/UniversalChatInterface";
import { FileTreeSidebar } from "@/components/FileTreeSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Download, FileCode, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import JSZip from "jszip";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { AIThinkingPanel } from "@/components/AIThinkingPanel";
import { useRealtimeAI } from "@/hooks/useRealtimeAI";

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
  
  // Monitor AI activity
  const { status, isActive } = useRealtimeAI({ projectId, conversationId: conversationId || undefined });
  
  // ENTERPRISE LAYER 1: State Validation & Observability
  useEffect(() => {
    if (projectFiles && projectFiles.length > 0) {
      console.log('📊 PreviewSection received project files:', {
        count: projectFiles.length,
        paths: projectFiles.map(f => f.file_path),
        hasContent: projectFiles.filter(f => f.file_content && f.file_content.length > 0).length
      });
    }
  }, [projectFiles]);
  
  // ENTERPRISE LAYER 2: Robust File Contents Generation
  const fileContents = useMemo(() => {
    const files: Record<string, string> = {};
    
    // PRIORITY 1: Use real project files from database if available
    if (projectFiles && projectFiles.length > 0) {
      let validFilesCount = 0;
      projectFiles.forEach(file => {
        if (file && file.file_path && file.file_content !== undefined) {
          files[file.file_path] = file.file_content || '';
          validFilesCount++;
        }
      });
      
      // Enterprise validation: Ensure we actually got files
      if (validFilesCount > 0) {
        console.log('✅ Using real project files:', validFilesCount, 'files processed');
        return files;
      } else {
        console.warn('⚠️ projectFiles exist but no valid content found, using fallback');
      }
    }
    
    // PRIORITY 2: Fallback - Generate structure from htmlCode for legacy projects
    if (framework === 'react') {
      console.log('📝 Using fallback React structure');
      
      // Use html_code as App.tsx if it exists and looks like React code
      const appContent = htmlCode && htmlCode.trim().length > 0
        ? htmlCode 
        : `export default function App() {
  return (
    <div className="p-8">
      <h1>Welcome</h1>
      <p>This project is loading...</p>
    </div>
  );
}`;
      
      files['src/App.tsx'] = appContent;
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
  
  // ENTERPRISE LAYER 3: Auto-sync selectedFile to available files
  useEffect(() => {
    const availableFiles = Object.keys(fileContents);
    if (availableFiles.length > 0 && !fileContents[selectedFile]) {
      // Current selectedFile doesn't exist, auto-select first available file
      const firstFile = availableFiles[0];
      console.log(`🔄 Auto-selecting file: ${firstFile} (${selectedFile} not found)`);
      setSelectedFile(firstFile);
    }
  }, [fileContents, selectedFile]);
  
  // ENTERPRISE LAYER 4: Comprehensive State Logging
  useEffect(() => {
    console.log('📈 PreviewSection State:', {
      framework,
      selectedFile,
      availableFiles: Object.keys(fileContents),
      selectedFileExists: !!fileContents[selectedFile],
      selectedFileSize: fileContents[selectedFile]?.length || 0,
      totalFiles: Object.keys(fileContents).length
    });
  }, [fileContents, selectedFile, framework]);
  
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
        <div className="h-full flex flex-col gap-4 p-4" key="mobile-chat-container">
          {/* AI Thinking Panel - Shows when AI is active */}
          {isActive && (
            <AIThinkingPanel 
              projectId={projectId}
              conversationId={conversationId || undefined}
              workspaceName={projectTitle}
              className="flex-shrink-0"
            />
          )}
          
          {/* Stable container that doesn't switch structure */}
          <div className="flex-1 min-h-0">
            {conversationId ? (
              <UniversalChatInterface
                key={`mobile-chat-${conversationId}`}
                conversationId={conversationId}
                projectId={projectId}
                mode="panel"
                operationMode="enhance"
                persistMessages={true}
                selectedFiles={selectedFiles}
                projectFiles={projectFiles && projectFiles.length > 0 ? projectFiles : Object.entries(fileContents).map(([path, content]) => ({
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
        </div>
      );
    }
    
    if (mobileTab === 'preview') {
      return (
        <div className="h-full">
          <Card className="p-4 h-full border-0 rounded-none">
            {Object.keys(fileContents).length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Loading project files...</p>
                </div>
              </div>
            ) : (
              <DevicePreview 
                generatedCode={fileContents['index.html'] || htmlCode}
                projectFiles={framework === 'react' ? fileContents : undefined}
                framework={framework}
              />
            )}
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
  
  // Desktop: render side-by-side with better spacing and height
  return (
    <div className="grid lg:grid-cols-2 gap-4 p-4 h-full overflow-hidden" key="desktop-workspace">
      {/* Chat Interface - Full height */}
      <div className="flex flex-col h-full min-h-0 gap-4" key="chat-column">
        {/* AI Thinking Panel - Mobile Optimized, Shows when AI is active */}
        {isActive && (
          <div className="overflow-x-hidden">
            <AIThinkingPanel 
              projectId={projectId}
              conversationId={conversationId || undefined}
              workspaceName={projectTitle}
              className="max-w-full"
            />
          </div>
        )}
        
        {/* Stable container that doesn't switch structure */}
        <div className="flex-1 min-h-0">
          {conversationId ? (
            <UniversalChatInterface
              key={`desktop-chat-${conversationId}`}
              conversationId={conversationId}
              projectId={projectId}
              mode="inline"
              operationMode="enhance"
              height="h-full"
              persistMessages={true}
              selectedFiles={selectedFiles}
              projectFiles={projectFiles && projectFiles.length > 0 ? projectFiles : Object.entries(fileContents).map(([path, content]) => ({
                file_path: path,
                file_content: typeof content === 'string' ? content : ''
              }))}
              context={{
                currentCode: htmlCode,
                projectId,
                conversationHistory: [],
                framework
              }}
              className="h-full"
            />
          ) : (
            <Card className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading chat...</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Live Preview - Full height */}
      <Card className="p-4 h-full min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
        <div className="flex-1 min-h-0">
          {Object.keys(fileContents).length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Loading project files...</p>
              </div>
            </div>
          ) : (
            <DevicePreview 
              generatedCode={fileContents['index.html'] || htmlCode}
              projectFiles={framework === 'react' ? fileContents : undefined}
              framework={framework}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
