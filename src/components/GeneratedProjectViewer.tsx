import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileCode, FolderOpen, Download, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedFile {
  path: string;
  content: string;
  description?: string;
}

interface GeneratedProjectViewerProps {
  files?: GeneratedFile[];
  projectTitle?: string;
  projectId?: string; // Allow loading files from project_files table
}

export function GeneratedProjectViewer({ files: propFiles, projectTitle, projectId }: GeneratedProjectViewerProps) {
  const [files, setFiles] = useState<GeneratedFile[]>(propFiles || []);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(files[0] || null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // CRITICAL FIX: Add toast hook

  // Load files from project_files table if projectId provided but no files
  useEffect(() => {
    if (projectId && (!propFiles || propFiles.length === 0)) {
      loadProjectFiles();
    } else if (propFiles && propFiles.length > 0) {
      setFiles(propFiles);
      setSelectedFile(propFiles[0]);
    }
  }, [projectId, propFiles]);

  const loadProjectFiles = async () => {
    setIsLoading(true);
    try {
      console.log('📁 Loading files from project_files table for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_files')
        .select('file_path, file_content, file_type')
        .eq('project_id', projectId)
        .order('file_path'); // CRITICAL FIX: Order files consistently

      if (error) {
        console.error('Error loading project files:', error);
        throw error;
      }

      console.log('📁 Loaded files from database:', data?.length || 0);

      if (data && data.length > 0) {
        const loadedFiles: GeneratedFile[] = (data as any[]).map((file: any) => ({
          path: file.file_path || file.path || 'untitled',
          content: file.file_content || file.content || '',
          description: `${file.file_type || 'unknown'} file`
        }));
        setFiles(loadedFiles);
        setSelectedFile(loadedFiles[0]);
        console.log('✅ Files loaded successfully:', loadedFiles.length);
      } else {
        console.warn('⚠️ No files found in project_files table, falling back to props');
        // CRITICAL FIX: Fallback to props if database has no files
        if (propFiles && propFiles.length > 0) {
          setFiles(propFiles);
          setSelectedFile(propFiles[0]);
        }
      }
    } catch (error) {
      console.error('Error loading project files:', error);
      // CRITICAL FIX: Show user-friendly error
      toast({
        title: "Failed to load files",
        description: "Could not load project files from database. Trying fallback...",
        variant: "destructive"
      });
      // Try props as fallback
      if (propFiles && propFiles.length > 0) {
        setFiles(propFiles);
        setSelectedFile(propFiles[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    
    files.forEach(file => {
      zip.file(file.path, file.content);
    });

    zip.file('package.json', JSON.stringify({
      name: projectTitle?.toLowerCase().replace(/\s+/g, '-') || 'generated-project',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.462.0',
        'zustand': '^4.5.0',
      }
    }, null, 2));

    zip.file('README.md', `# ${projectTitle || 'Generated Project'}

## Installation
\`\`\`bash
npm install
\`\`\`

## Generated Files
${files.map(f => `- ${f.path}${f.description ? ` - ${f.description}` : ''}`).join('\n')}
`);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle?.toLowerCase().replace(/\s+/g, '-') || 'project'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  const getHighlightedCode = (code: string, path: string) => {
    let language = 'typescript';
    if (path.endsWith('.tsx')) language = 'tsx';
    else if (path.endsWith('.ts')) language = 'typescript';
    else if (path.endsWith('.jsx') || path.endsWith('.js')) language = 'javascript';
    else if (path.endsWith('.css')) language = 'css';
    else if (path.endsWith('.html')) language = 'markup';
    
    try {
      return Prism.highlight(code, Prism.languages[language], language);
    } catch {
      return code;
    }
  };

  const getFileIcon = (path: string) => {
    if (path.includes('/components/')) return '🧩';
    if (path.includes('/hooks/')) return '🎣';
    if (path.includes('/lib/')) return '🔧';
    if (path.includes('/types')) return '📝';
    return '📄';
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading project files...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No files found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                Generated Project
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {files.length} file{files.length !== 1 ? 's' : ''} generated • Ready to download
              </p>
            </div>
            <Button onClick={handleDownloadZip} className="gap-2">
              <Download className="h-4 w-4" />
              Download ZIP
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* File Browser & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File Tree */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Project Files
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
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
                            selectedFile?.path === file.path && "bg-accent border border-primary/30"
                          )}
                        >
                          <span>{getFileIcon(file.path)}</span>
                          <span className="flex-1 truncate">{file.path.split('/').pop()}</span>
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
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                <CardTitle className="text-sm">
                  {selectedFile?.path || 'Select a file'}
                </CardTitle>
              </div>
              {selectedFile && (
                <Badge variant="outline" className="text-xs">
                  {selectedFile.content.split('\n').length} lines
                </Badge>
              )}
            </div>
            {selectedFile?.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFile.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {selectedFile ? (
                <pre className="p-4 text-xs overflow-x-auto bg-slate-950">
                  <code
                    className="language-typescript"
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedCode(selectedFile.content, selectedFile.path)
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
    </div>
  );
}
