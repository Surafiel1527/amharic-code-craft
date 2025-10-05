import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Plus, LayoutGrid } from "lucide-react";
import { CodeEditor } from "@/components/CodeEditor";
import { toast } from "sonner";

interface EditorPane {
  id: string;
  filePath: string | null;
  content: string;
}

interface SplitPaneEditorProps {
  files: Array<{ file_path: string; file_content: string }>;
  onSave: (path: string, content: string) => void;
  initialFile?: string | null;
}

export function SplitPaneEditor({ files, onSave, initialFile }: SplitPaneEditorProps) {
  const [panes, setPanes] = useState<EditorPane[]>([
    { id: '1', filePath: initialFile || null, content: '' }
  ]);

  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  useEffect(() => {
    if (initialFile && panes.length === 1 && !panes[0].filePath) {
      const file = files.find(f => f.file_path === initialFile);
      if (file) {
        setPanes([{ id: '1', filePath: initialFile, content: file.file_content }]);
      }
    }
  }, [initialFile, files]);

  const addPane = () => {
    if (panes.length >= 4) {
      toast.error('Maximum 4 panes allowed');
      return;
    }
    setPanes([...panes, { id: Date.now().toString(), filePath: null, content: '' }]);
  };

  const removePane = (id: string) => {
    if (panes.length === 1) {
      toast.error('Cannot close last pane');
      return;
    }
    setPanes(panes.filter(p => p.id !== id));
  };

  const updatePaneFile = (id: string, filePath: string) => {
    const file = files.find(f => f.file_path === filePath);
    if (file) {
      setPanes(panes.map(p => 
        p.id === id ? { ...p, filePath, content: file.file_content } : p
      ));
    }
  };

  const handleSave = (id: string, content: string) => {
    const pane = panes.find(p => p.id === id);
    if (pane?.filePath) {
      onSave(pane.filePath, content);
      setPanes(panes.map(p => p.id === id ? { ...p, content } : p));
    }
  };

  const getGridClass = () => {
    const count = panes.length;
    if (count === 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) {
      return layout === 'horizontal' ? 'grid-cols-2 grid-rows-1' : 'grid-cols-1 grid-rows-2';
    }
    if (count === 3) {
      return layout === 'horizontal' ? 'grid-cols-3 grid-rows-1' : 'grid-cols-1 grid-rows-3';
    }
    return 'grid-cols-2 grid-rows-2';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-2 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Split Editor</span>
          <span className="text-xs text-muted-foreground">
            {panes.length} pane{panes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout(layout === 'horizontal' ? 'vertical' : 'horizontal')}
            disabled={panes.length === 1}
            className="h-7"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            {layout === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addPane}
            disabled={panes.length >= 4}
            className="h-7"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Pane
          </Button>
        </div>
      </div>

      {/* Editor Panes */}
      <div className={`flex-1 grid gap-1 p-1 ${getGridClass()}`}>
        {panes.map(pane => (
          <Card key={pane.id} className="relative overflow-hidden">
            {/* Pane Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-2 border-b bg-card/95 backdrop-blur flex items-center justify-between">
              <select
                value={pane.filePath || ''}
                onChange={(e) => updatePaneFile(pane.id, e.target.value)}
                className="text-xs bg-background border rounded px-2 py-1 max-w-[200px]"
              >
                <option value="">Select file...</option>
                {files.map(file => (
                  <option key={file.file_path} value={file.file_path}>
                    {file.file_path}
                  </option>
                ))}
              </select>
              {panes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removePane(pane.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Editor */}
            <div className="h-full pt-12">
              <CodeEditor
                filePath={pane.filePath}
                initialContent={pane.content}
                onSave={(content) => handleSave(pane.id, content)}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
