import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileCode, Download, FolderOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/themes/prism-tomorrow.css';

interface GeneratedFile {
  path: string;
  code: string;
  type: string;
}

interface ComponentFileBrowserProps {
  files: GeneratedFile[];
  className?: string;
}

export function ComponentFileBrowser({ files, className }: ComponentFileBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(files[0] || null);

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    
    // Add all files to zip
    files.forEach(file => {
      zip.file(file.path, file.code);
    });

    // Add package.json
    zip.file('package.json', JSON.stringify({
      name: 'generated-react-app',
      version: '1.0.0',
      dependencies: {
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.462.0',
      }
    }, null, 2));

    // Add README
    zip.file('README.md', `# Generated React Components

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
Import the components from their respective files.
`);

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'react-components.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Build file tree structure
  const buildFileTree = () => {
    const tree: Record<string, GeneratedFile[]> = {};
    
    files.forEach(file => {
      const parts = file.path.split('/');
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
      
      if (!tree[folder]) tree[folder] = [];
      tree[folder].push(file);
    });

    return tree;
  };

  const fileTree = buildFileTree();
  const folders = Object.keys(fileTree).sort();

  // Get syntax highlighted code
  const getHighlightedCode = (code: string, path: string) => {
    const language = path.endsWith('.tsx') || path.endsWith('.ts') ? 'typescript' : 'typescript';
    return Prism.highlight(code, Prism.languages[language], language);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'component': return '🧩';
      case 'hook': return '🎣';
      case 'util': return '🔧';
      case 'style': return '🎨';
      case 'config': return '⚙️';
      default: return '📄';
    }
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 h-full", className)}>
      {/* File Tree */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadZip}
              className="gap-2 h-7"
            >
              <Download className="h-3 w-3" />
              ZIP
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="px-3 pb-3">
              {folders.map(folder => (
                <div key={folder} className="mb-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 font-medium">
                    <FolderOpen className="h-3 w-3" />
                    {folder === 'root' ? 'Root' : folder}
                  </div>
                  <div className="space-y-0.5">
                    {fileTree[folder].map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedFile(file)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-accent transition-colors",
                          selectedFile?.path === file.path && "bg-accent"
                        )}
                      >
                        <span>{getFileIcon(file.type)}</span>
                        <span className="flex-1 truncate">{file.path.split('/').pop()}</span>
                        <Badge variant="secondary" className="h-4 text-[10px] px-1">
                          {file.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Code Viewer */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">
                {selectedFile?.path || 'Select a file'}
              </CardTitle>
            </div>
            {selectedFile && (
              <Badge variant="outline" className="text-xs">
                {selectedFile.code.split('\n').length} lines
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {selectedFile ? (
              <pre className="p-4 text-xs overflow-x-auto">
                <code
                  className="language-typescript"
                  dangerouslySetInnerHTML={{
                    __html: getHighlightedCode(selectedFile.code, selectedFile.path)
                  }}
                />
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a file to view its contents
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
