import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Folder, FolderOpen, Download, Copy, Check, 
  ChevronRight, ChevronDown, Code2 
} from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

interface CodeFilesViewerProps {
  projectCode: string;
  projectTitle: string;
  framework?: 'react' | 'html' | 'vue';
}

export function CodeFilesViewer({ projectCode, projectTitle, framework = 'react' }: CodeFilesViewerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Parse project code into file tree
  useEffect(() => {
    try {
      // Try to parse as JSON (multi-file project)
      const parsed = JSON.parse(projectCode);
      
      if (parsed.files && Array.isArray(parsed.files)) {
        // Multi-file React/Vue project
        const tree = buildFileTree(parsed.files);
        setFileTree(tree);
        // Auto-expand root folders
        setExpandedFolders(new Set(['src', 'public', 'components']));
      } else {
        // Single file
        setFileTree([{
          name: 'index.html',
          path: 'index.html',
          type: 'file',
          content: projectCode
        }]);
      }
    } catch {
      // Plain HTML/text - single file
      const extension = framework === 'html' ? 'html' : 'jsx';
      setFileTree([{
        name: `index.${extension}`,
        path: `index.${extension}`,
        type: 'file',
        content: projectCode
      }]);
    }
  }, [projectCode, framework]);

  const buildFileTree = (files: Array<{ path: string; content: string }>): FileNode[] => {
    const root: Record<string, FileNode> = {};

    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = {
            name: part,
            path: file.path,
            type: 'file',
            content: file.content
          };
        } else {
          // Folder
          if (!current[part]) {
            current[part] = {
              name: part,
              path: parts.slice(0, index + 1).join('/'),
              type: 'folder',
              children: []
            };
          }
          if (!current[part].children) {
            current[part].children = [];
          }
          // Navigate deeper
          const childrenMap: Record<string, FileNode> = {};
          current[part].children?.forEach(child => {
            childrenMap[child.name] = child;
          });
          current = childrenMap;
        }
      });
    });

    // Convert to array
    const convertToArray = (obj: Record<string, FileNode>): FileNode[] => {
      return Object.values(obj).map(node => {
        if (node.children && node.children.length === 0) {
          // Build children from nested structure
          const childrenObj = obj[node.name] as any;
          if (childrenObj && typeof childrenObj === 'object') {
            node.children = convertToArray(childrenObj);
          }
        }
        return node;
      }).sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };

    return convertToArray(root);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              setSelectedFile(node.path);
            }
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors ${
            selectedFile === node.path ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {node.type === 'folder' ? (
            <>
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              {expandedFolders.has(node.path) ? (
                <FolderOpen className="w-4 h-4 text-primary" />
              ) : (
                <Folder className="w-4 h-4 text-primary" />
              )}
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileText className="w-4 h-4 text-muted-foreground" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
          <div>
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  const getAllFiles = (nodes: FileNode[]): Array<{ path: string; content: string }> => {
    const files: Array<{ path: string; content: string }> = [];
    
    const traverse = (node: FileNode) => {
      if (node.type === 'file' && node.content) {
        files.push({ path: node.path, content: node.content });
      } else if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    nodes.forEach(traverse);
    return files;
  };

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      const files = getAllFiles(fileTree);

      if (files.length === 0) {
        toast.error('No files to download');
        return;
      }

      // Add all files to ZIP
      files.forEach(file => {
        zip.file(file.path, file.content);
      });

      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `${projectTitle.replace(/\s+/g, '-').toLowerCase()}.zip`;
      saveAs(blob, filename);
      
      toast.success(`Downloaded ${files.length} files as ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to create ZIP file');
    }
  };

  const selectedFileContent = () => {
    if (!selectedFile) return null;
    
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === selectedFile) return node;
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findFile(fileTree);
  };

  const handleCopyCode = () => {
    const file = selectedFileContent();
    if (file?.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedFile_content = selectedFileContent();
  const totalFiles = getAllFiles(fileTree).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Project Files</h3>
          </div>
          <Button
            onClick={handleDownloadZip}
            size="sm"
            variant="default"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download ZIP
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalFiles} {totalFiles === 1 ? 'file' : 'files'} • {framework.toUpperCase()}
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        <div className="w-64 border-r">
          <ScrollArea className="h-full">
            <div className="p-2">
              {fileTree.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  No files generated yet
                </div>
              ) : (
                renderFileTree(fileTree)
              )}
            </div>
          </ScrollArea>
        </div>

        {/* File Content Preview */}
        <div className="flex-1 flex flex-col">
          {selectedFile_content ? (
            <>
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedFile_content.name}</span>
                </div>
                <Button
                  onClick={handleCopyCode}
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-4 text-xs font-mono leading-relaxed">
                  <code>{selectedFile_content.content}</code>
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div className="space-y-2">
                <Code2 className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Select a file to view its contents
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
