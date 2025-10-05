import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Wrench, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TSError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

interface TypeScriptErrorPanelProps {
  projectId?: string;
  onAutoFix?: (error: TSError) => void;
}

export function TypeScriptErrorPanel({ projectId, onAutoFix }: TypeScriptErrorPanelProps) {
  const [errors, setErrors] = useState<TSError[]>([]);
  const [fixing, setFixing] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`ts-errors-${projectId}`)
      .on('broadcast', { event: 'error-update' }, ({ payload }) => {
        setErrors(payload.errors || []);
      })
      .on('broadcast', { event: 'error-fixed' }, ({ payload }) => {
        setErrors(prev => prev.filter(e => e.code !== payload.code));
        setFixing(prev => prev.filter(c => c !== payload.code));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const handleFix = async (error: TSError) => {
    setFixing(prev => [...prev, error.code]);
    if (onAutoFix) {
      await onAutoFix(error);
    }
  };

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  if (errors.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">No TypeScript errors</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="font-semibold">TypeScript Issues</span>
          </div>
          <div className="flex gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive">{errorCount} errors</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                {warningCount} warnings
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {errors.map((error, i) => (
              <Card key={i} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={error.severity === 'error' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {error.severity}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {error.file}:{error.line}:{error.column}
                      </span>
                    </div>
                    <p className="text-sm">{error.message}</p>
                    <code className="text-xs bg-muted p-1 rounded block">
                      {error.code}
                    </code>
                  </div>
                  {error.fixable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFix(error)}
                      disabled={fixing.includes(error.code)}
                    >
                      {fixing.includes(error.code) ? (
                        <>
                          <Wrench className="h-3 w-3 mr-1 animate-spin" />
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Wrench className="h-3 w-3 mr-1" />
                          Auto Fix
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
