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
      <Card className="p-2">
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">No errors</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-xs font-medium">TS Issues</span>
          </div>
          <div className="flex gap-1">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs h-5">{errorCount}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-xs h-5">
                {warningCount}
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {errors.map((error, i) => (
              <Card key={i} className="p-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={error.severity === 'error' ? 'destructive' : 'outline'}
                        className="text-xs h-4"
                      >
                        {error.severity}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        {error.file}:{error.line}
                      </span>
                    </div>
                    <p className="text-xs truncate">{error.message}</p>
                  </div>
                  {error.fixable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFix(error)}
                      disabled={fixing.includes(error.code)}
                      className="h-6 text-xs"
                    >
                      {fixing.includes(error.code) ? (
                        <Wrench className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wrench className="h-3 w-3" />
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
