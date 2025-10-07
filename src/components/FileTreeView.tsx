import { useState } from "react";
import { ChevronRight, ChevronDown, FileCode2, Folder, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FileNode {
  path: string;
  content: string;
  type?: string;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: FileNode;
}

interface FileTreeViewProps {
  files: FileNode[];
  onFileClick?: (file: FileNode) => void;
}

export function FileTreeView({ files, onFileClick }: FileTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  // Build tree structure from flat file list
  const buildTree = (files: FileNode[]): TreeNode => {
    const root: TreeNode = { name: 'root', type: 'folder', children: [] };

    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        
        if (!current.children) current.children = [];
        
        let node = current.children.find(n => n.name === part);
        
        if (!node) {
          node = {
            name: part,
            type: isFile ? 'file' : 'folder',
            ...(isFile && { file }),
            ...(!isFile && { children: [] })
          };
          current.children.push(node);
        }
        
        if (!isFile) current = node;
      });
    });

    return root;
  };

  const toggleExpanded = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, path: string = '', depth: number = 0) => {
    const fullPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expanded.has(fullPath);

    if (node.type === 'folder') {
      return (
        <div key={fullPath}>
          <div
            className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => toggleExpanded(fullPath)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-yellow-500" />
            ) : (
              <Folder className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">{node.name}</span>
          </div>
          {isExpanded && node.children?.map(child => renderNode(child, fullPath, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={fullPath}
        className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
        onClick={() => node.file && onFileClick?.(node.file)}
      >
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-mono">{node.name}</span>
        </div>
        {node.file?.type && (
          <Badge variant="secondary" className="text-xs">
            {node.file.type}
          </Badge>
        )}
      </div>
    );
  };

  const tree = buildTree(files);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 border-b">
        <span className="text-sm font-medium">Project Files</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {tree.children?.map(node => renderNode(node, '', 0))}
      </div>
    </div>
  );
}
