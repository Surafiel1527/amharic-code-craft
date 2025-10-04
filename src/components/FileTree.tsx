import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface FileNode {
  id: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string, type: 'file' | 'folder') => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

export function FileTree({ 
  files, 
  selectedFile, 
  onSelectFile, 
  onCreateFile, 
  onDeleteFile,
  onRenameFile 
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const buildTree = (files: FileNode[]): FileNode[] => {
    const root: FileNode[] = [];
    const map = new Map<string, FileNode>();

    files.forEach(file => {
      map.set(file.path, { ...file, children: [] });
    });

    files.forEach(file => {
      const parts = file.path.split('/').filter(Boolean);
      if (parts.length === 1) {
        root.push(map.get(file.path)!);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parent = map.get(parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(map.get(file.path)!);
        }
      }
    });

    return root;
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    const isEditing = editingPath === node.path;

    const handleRename = () => {
      if (newName && newName !== node.path.split('/').pop()) {
        const pathParts = node.path.split('/');
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');
        onRenameFile(node.path, newPath);
        setEditingPath(null);
        setNewName('');
      }
    };

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-sm cursor-pointer ${
            isSelected ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isFolder && (
            <button onClick={() => toggleFolder(node.path)} className="p-0 h-4 w-4">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          {isFolder ? (
            <Folder className="h-4 w-4 text-blue-500" />
          ) : (
            <File className="h-4 w-4 text-gray-500" />
          )}

          {isEditing ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditingPath(null);
              }}
              className="h-6 text-xs"
              autoFocus
            />
          ) : (
            <span
              className="flex-1 text-sm truncate"
              onClick={() => !isFolder && onSelectFile(node.path)}
            >
              {node.path.split('/').pop()}
            </span>
          )}

          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setEditingPath(node.path);
                setNewName(node.path.split('/').pop() || '');
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(node.path);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
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

  const tree = buildTree(files);

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Files</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              const name = prompt('File name:');
              if (name) onCreateFile(name, 'file');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1 group">
          {tree.map(node => renderNode(node))}
        </div>
      </ScrollArea>
    </div>
  );
}
