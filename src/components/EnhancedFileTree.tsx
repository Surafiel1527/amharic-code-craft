import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2, Edit2, Search, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import JSZip from "jszip";

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  size?: number;
  children?: FileNode[];
  modified?: boolean;
}

interface EnhancedFileTreeProps {
  files: Array<{ id: string; file_path: string; file_content: string; updated_at?: string }>;
  selectedFiles: string[];
  onSelectFile: (path: string, multiSelect?: boolean) => void;
  onCreateFile: (path: string, type: 'file' | 'folder') => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onBulkDelete?: (paths: string[]) => void;
}

export function EnhancedFileTree({ 
  files, 
  selectedFiles,
  onSelectFile, 
  onCreateFile, 
  onDeleteFile,
  onRenameFile,
  onBulkDelete
}: EnhancedFileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  // Build hierarchical tree structure
  const buildTree = useMemo(() => {
    const root: FileNode[] = [];
    const folders = new Map<string, FileNode>();

    // First pass: create all folders
    files.forEach(file => {
      const parts = file.file_path.split('/').filter(Boolean);
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!folders.has(currentPath)) {
          const folderNode: FileNode = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: 'folder',
            children: []
          };
          folders.set(currentPath, folderNode);
          
          if (parentPath && folders.has(parentPath)) {
            folders.get(parentPath)!.children!.push(folderNode);
          } else {
            root.push(folderNode);
          }
        }
      }
    });

    // Second pass: add files
    files.forEach(file => {
      const parts = file.file_path.split('/').filter(Boolean);
      const fileName = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      
      const fileNode: FileNode = {
        id: file.id,
        name: fileName,
        path: file.file_path,
        type: 'file',
        content: file.file_content,
        size: file.file_content.length
      };

      if (parentPath && folders.has(parentPath)) {
        folders.get(parentPath)!.children!.push(fileNode);
      } else {
        root.push(fileNode);
      }
    });

    // Sort: folders first, then files, alphabetically
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children) sortNodes(node.children);
      });
    };
    sortNodes(root);

    return root;
  }, [files]);

  // Filter tree based on search
  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
      } else if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const filteredTree = useMemo(() => 
    filterTree(buildTree, searchQuery), 
    [buildTree, searchQuery]
  );

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleRename = (oldPath: string) => {
    if (newName && newName !== oldPath.split('/').pop()) {
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      onRenameFile(oldPath, newPath);
      setEditingPath(null);
      setNewName('');
    }
  };

  const handleExportZip = async () => {
    const zip = new JSZip();
    
    files.forEach(file => {
      zip.file(file.file_path, file.file_content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Project exported as ZIP');
  };

  const handleBulkDelete = () => {
    if (bulkSelected.size === 0) {
      toast.error('No files selected');
      return;
    }
    
    if (confirm(`Delete ${bulkSelected.size} file(s)?`)) {
      onBulkDelete?.(Array.from(bulkSelected));
      setBulkSelected(new Set());
      setBulkMode(false);
    }
  };

  const toggleBulkSelect = (path: string) => {
    const newSelected = new Set(bulkSelected);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setBulkSelected(newSelected);
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return '⚛️';
      case 'ts':
      case 'js':
        return '📜';
      case 'css':
      case 'scss':
        return '🎨';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      default:
        return '📄';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFiles.includes(node.path);
    const isEditing = editingPath === node.path;
    const isBulkSelected = bulkSelected.has(node.path);

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer group ${
            isSelected ? 'bg-accent border-l-2 border-primary' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {bulkMode && !isFolder && (
            <Checkbox
              checked={isBulkSelected}
              onCheckedChange={() => toggleBulkSelect(node.path)}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {isFolder && (
            <button 
              onClick={() => toggleFolder(node.path)} 
              className="p-0 h-4 w-4 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            <span className="text-sm">{getFileIcon(node.name)}</span>
          )}

          {isEditing ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleRename(node.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(node.path);
                if (e.key === 'Escape') setEditingPath(null);
              }}
              className="h-6 text-xs"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-sm truncate"
              onClick={() => !isFolder && onSelectFile(node.path)}
            >
              {node.name}
            </span>
          )}

          {!isFolder && node.size && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {formatSize(node.size)}
            </Badge>
          )}

          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            {!bulkMode && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPath(node.path);
                    setNewName(node.name);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${node.name}?`)) {
                      onDeleteFile(node.path);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-r bg-card">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Files</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleExportZip}
              title="Export as ZIP"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const name = prompt('File name (e.g., src/component.tsx):');
                if (name) onCreateFile(name, 'file');
              }}
              title="New file"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>

        {/* Bulk actions */}
        <div className="flex items-center justify-between">
          <Button
            variant={bulkMode ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setBulkMode(!bulkMode);
              if (bulkMode) setBulkSelected(new Set());
            }}
            className="h-7 text-xs"
          >
            {bulkMode ? 'Cancel' : 'Bulk Edit'}
          </Button>
          {bulkMode && bulkSelected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="h-7 text-xs"
            >
              Delete ({bulkSelected.size})
            </Button>
          )}
        </div>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredTree.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {searchQuery ? 'No files match your search' : 'No files yet'}
            </div>
          ) : (
            filteredTree.map(node => renderNode(node))
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="p-2 border-t text-xs text-muted-foreground">
        {files.length} files • {formatSize(files.reduce((sum, f) => sum + f.file_content.length, 0))}
      </div>
    </div>
  );
}
