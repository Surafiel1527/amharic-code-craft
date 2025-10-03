import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Plus, Minus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CodeDiffViewerProps {
  oldCode: string;
  newCode: string;
  oldVersion?: string;
  newVersion?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export const CodeDiffViewer = ({ 
  oldCode, 
  newCode, 
  oldVersion = "Previous", 
  newVersion = "Current" 
}: CodeDiffViewerProps) => {
  
  const diffLines = useMemo(() => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const diff: DiffLine[] = [];
    
    // Simple line-by-line diff algorithm
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        diff.push({ type: 'unchanged', content: oldLine, lineNumber: i + 1 });
      } else {
        if (oldLine && oldLines[i] !== undefined) {
          diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
        }
        if (newLine && newLines[i] !== undefined) {
          diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
        }
      }
    }
    
    return diff;
  }, [oldCode, newCode]);
  
  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length;
    
    return { added, removed, unchanged, total: diffLines.length };
  }, [diffLines]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Code Comparison
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
              <Plus className="h-3 w-3 mr-1" />
              +{stats.added}
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
              <Minus className="h-3 w-3 mr-1" />
              -{stats.removed}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="unified" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="unified">Unified View</TabsTrigger>
            <TabsTrigger value="split">Split View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="unified">
            <ScrollArea className="h-[500px] w-full rounded-md border">
              <div className="font-mono text-xs">
                {diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex px-2 py-0.5 ${
                      line.type === 'added'
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : line.type === 'removed'
                        ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                        : 'bg-background'
                    }`}
                  >
                    <span className="w-12 text-muted-foreground select-none flex-shrink-0">
                      {line.type !== 'removed' && line.lineNumber}
                    </span>
                    <span className="w-6 flex-shrink-0 font-bold">
                      {line.type === 'added' && '+'}
                      {line.type === 'removed' && '-'}
                      {line.type === 'unchanged' && ' '}
                    </span>
                    <pre className="whitespace-pre-wrap break-all flex-1">
                      {line.content || ' '}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="split">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-2 px-2 py-1 bg-muted rounded-t">
                  <span className="text-sm font-semibold">{oldVersion}</span>
                  <Badge variant="secondary" className="text-xs">
                    {oldCode.split('\n').length} lines
                  </Badge>
                </div>
                <ScrollArea className="h-[500px] w-full rounded-md border">
                  <pre className="font-mono text-xs p-2 whitespace-pre-wrap break-all">
                    {oldCode}
                  </pre>
                </ScrollArea>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2 px-2 py-1 bg-muted rounded-t">
                  <span className="text-sm font-semibold">{newVersion}</span>
                  <Badge variant="secondary" className="text-xs">
                    {newCode.split('\n').length} lines
                  </Badge>
                </div>
                <ScrollArea className="h-[500px] w-full rounded-md border">
                  <pre className="font-mono text-xs p-2 whitespace-pre-wrap break-all">
                    {newCode}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Total changes: {stats.added + stats.removed} lines</div>
            <div>Additions: {stats.added} lines | Deletions: {stats.removed} lines</div>
            <div>Unchanged: {stats.unchanged} lines</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};