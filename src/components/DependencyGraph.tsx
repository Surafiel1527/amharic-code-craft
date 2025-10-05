import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GitBranch, AlertCircle, CheckCircle2 } from "lucide-react";

interface FileData {
  file_path: string;
  file_content: string;
}

interface Dependency {
  from: string;
  to: string;
  type: 'import' | 'export';
}

interface DependencyGraphProps {
  files: FileData[];
  selectedFile?: string | null;
}

export function DependencyGraph({ files, selectedFile }: DependencyGraphProps) {
  const dependencies = useMemo(() => {
    const deps: Dependency[] = [];
    const fileMap = new Map(files.map(f => [f.file_path, f]));

    files.forEach(file => {
      const content = file.file_content;
      
      // Match import statements
      const importRegex = /import\s+(?:{[^}]*}|[\w*]+)\s+from\s+['"](.+?)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Resolve relative imports
        if (importPath.startsWith('.')) {
          const parts = file.file_path.split('/');
          const dir = parts.slice(0, -1).join('/');
          let resolvedPath = importPath;
          
          // Handle relative path resolution
          if (importPath.startsWith('./')) {
            resolvedPath = `${dir}/${importPath.slice(2)}`;
          } else if (importPath.startsWith('../')) {
            const upCount = (importPath.match(/\.\.\//g) || []).length;
            const pathParts = dir.split('/');
            const newDir = pathParts.slice(0, -upCount).join('/');
            resolvedPath = `${newDir}/${importPath.replace(/\.\.\//g, '')}`;
          }
          
          // Try different extensions
          const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
          for (const ext of extensions) {
            const testPath = resolvedPath + ext;
            if (fileMap.has(testPath)) {
              deps.push({
                from: file.file_path,
                to: testPath,
                type: 'import'
              });
              break;
            }
          }
        }
      }
    });

    return deps;
  }, [files]);

  // Analyze file dependencies
  const fileAnalysis = useMemo(() => {
    const analysis = new Map<string, {
      imports: string[];
      importedBy: string[];
      isLeaf: boolean;
      isRoot: boolean;
    }>();

    files.forEach(file => {
      const imports = dependencies
        .filter(d => d.from === file.file_path)
        .map(d => d.to);
      
      const importedBy = dependencies
        .filter(d => d.to === file.file_path)
        .map(d => d.from);

      analysis.set(file.file_path, {
        imports,
        importedBy,
        isLeaf: importedBy.length === 0,
        isRoot: imports.length === 0
      });
    });

    return analysis;
  }, [files, dependencies]);

  // Detect circular dependencies
  const circularDeps = useMemo(() => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circular: string[][] = [];

    const dfs = (file: string, path: string[]): boolean => {
      visited.add(file);
      recursionStack.add(file);

      const analysis = fileAnalysis.get(file);
      if (analysis) {
        for (const imported of analysis.imports) {
          if (!visited.has(imported)) {
            if (dfs(imported, [...path, file])) return true;
          } else if (recursionStack.has(imported)) {
            circular.push([...path, file, imported]);
            return true;
          }
        }
      }

      recursionStack.delete(file);
      return false;
    };

    files.forEach(file => {
      if (!visited.has(file.file_path)) {
        dfs(file.file_path, []);
      }
    });

    return circular;
  }, [files, fileAnalysis]);

  const currentFileAnalysis = selectedFile ? fileAnalysis.get(selectedFile) : null;

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Dependencies</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <div className="text-2xl font-bold">{dependencies.length}</div>
              <div className="text-xs text-muted-foreground">Total Links</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xl font-bold">{circularDeps.length}</div>
              <div className="text-xs text-muted-foreground">Circular Deps</div>
            </Card>
          </div>

          {/* Circular Dependencies Warning */}
          {circularDeps.length > 0 && (
            <Card className="p-3 border-orange-500">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">Circular Dependencies Detected</div>
                  {circularDeps.slice(0, 3).map((cycle, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {cycle.map(f => f.split('/').pop()).join(' → ')}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Current File Analysis */}
          {currentFileAnalysis && selectedFile && (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">Selected File</h4>
                <div className="text-xs font-mono bg-muted p-2 rounded">
                  {selectedFile.split('/').pop()}
                </div>
              </div>

              {currentFileAnalysis.imports.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    Imports ({currentFileAnalysis.imports.length})
                  </h4>
                  <div className="space-y-1">
                    {currentFileAnalysis.imports.map((imp, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted rounded flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">→</Badge>
                        {imp.split('/').pop()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentFileAnalysis.importedBy.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    Imported By ({currentFileAnalysis.importedBy.length})
                  </h4>
                  <div className="space-y-1">
                    {currentFileAnalysis.importedBy.map((imp, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted rounded flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">←</Badge>
                        {imp.split('/').pop()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentFileAnalysis.isLeaf && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Leaf node (not imported by others)
                </div>
              )}

              {currentFileAnalysis.isRoot && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Root node (no imports)
                </div>
              )}
            </div>
          )}

          {/* All Files Overview */}
          <div>
            <h4 className="text-sm font-medium mb-2">All Files</h4>
            <div className="space-y-1">
              {Array.from(fileAnalysis.entries()).map(([path, analysis]) => (
                <div key={path} className="text-xs p-2 bg-muted rounded">
                  <div className="font-mono mb-1">{path.split('/').pop()}</div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      ↓ {analysis.imports.length}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      ↑ {analysis.importedBy.length}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
