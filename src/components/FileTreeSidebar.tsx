import { useState } from "react";
import { FileCode, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeSidebarProps {
  files: { file_path: string; file_content: string }[];
  selectedFiles: string[];
  onFileSelect: (filePath: string) => void;
}

function buildFileTree(files: { file_path: string }[]): FileNode[] {
  const root: { [key: string]: FileNode } = {};

  files.forEach(file => {
    const parts = file.file_path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // It's a file
        current[part] = {
          name: part,
          path: file.file_path,
          type: 'file'
        };
      } else {
        // It's a folder
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: 'folder',
            children: []
          };
        }
        current = current[part].children!.reduce((acc, child) => {
          acc[child.name] = child;
          return acc;
        }, {} as { [key: string]: FileNode });
      }
    });
  });

  return Object.values(root);
}

function FileTreeNode({ 
  node, 
  selectedFiles, 
  onFileSelect,
  level = 0 
}: { 
  node: FileNode; 
  selectedFiles: string[]; 
  onFileSelect: (path: string) => void;
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedFiles.includes(node.path);

  if (node.type === 'file') {
    return (
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onFileSelect(node.path)}
      >
        <FileCode className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="text-sm truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        {isOpen ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{node.name}</span>
      </div>
      {isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode
              key={child.path}
              node={child}
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTreeSidebar({ files, selectedFiles, onFileSelect }: FileTreeSidebarProps) {
  const fileTree = buildFileTree(files);

  return (
    <div className="h-full border-r bg-card/50 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Project Files</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {fileTree.map(node => (
            <FileTreeNode
              key={node.path}
              node={node}
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
